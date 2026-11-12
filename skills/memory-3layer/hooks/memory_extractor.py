# -*- coding: utf-8 -*-
"""Conservative PostToolUse extractor for the platform-neutral memory core.

Only an explicit top-level ``memory_fact`` supplied by the package's managed
recorder is eligible for persistence. The raw hook payload, transcript, tool
input, and every tool-response field are never used as a fallback fact.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from hook_io import detect_host, emit_json, read_hook_payload, reported_model
from memory_paths import get_memory_dir
from memory_store import atomic_write_json, atomic_write_text, file_lock
from session_state import update_working_files


SECRET_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----", re.I),
    re.compile(r"\b(?:sk|rk|pk)-(?:live-)?[A-Za-z0-9_-]{16,}\b"),
    re.compile(r"\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]{16,}\b", re.I),
    re.compile(r"\b(?:password|passwd|cookie|session_token)\s*[:=]\s*\S{8,}", re.I),
    re.compile(
        r"\b(?:api[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*[\"']?\S{8,}",
        re.I,
    ),
)
_UNIX_USER_ROOT = "(?:" + "Users" + "|" + "home" + ")"
PRIVATE_PATH_PATTERNS = (
    re.compile(r"\b[A-Za-z]:[\\/]" + "Users" + r"[\\/][^\\/\s]+", re.I),
    re.compile(r"/" + _UNIX_USER_ROOT + r"/[^/\s]+/"),
)


def _now_date() -> str:
    # Match the loader's local-calendar lookup at timezone boundaries.
    return datetime.now().strftime("%Y-%m-%d")


def _now_time() -> str:
    return datetime.now().strftime("%H:%M")


def normalize_fact(value: object) -> str:
    return " ".join(str(value or "").split()).casefold()


def contains_sensitive_value(text: str) -> bool:
    return any(pattern.search(text) for pattern in SECRET_PATTERNS + PRIVATE_PATH_PATTERNS)


def _clean_fact(value: object, *, explicit: bool) -> Tuple[str, Optional[str]]:
    if not isinstance(value, str):
        return "", "untrusted"
    cleaned = " ".join(value.replace("\x00", " ").split()).strip()
    if not cleaned:
        return "", "empty"
    if contains_sensitive_value(cleaned):
        return "", "sensitive"
    try:
        configured_maximum = int(os.environ.get("MEMORY_MAX_FACT_CHARS", "500"))
    except ValueError:
        configured_maximum = 500
    maximum = max(80, min(2000, configured_maximum))
    if len(cleaned) > maximum:
        return "", f"too-long:{len(cleaned)}>{maximum}"
    if not explicit and cleaned[:1] in {"{", "["}:
        return "", "untrusted-serialized-output"
    if len(cleaned) < 4:
        return "", "too-short"
    return cleaned, None


def _candidate(payload: Dict[str, Any]) -> Tuple[object, bool, str]:
    """Return only candidates carried by the package's explicit protocol."""
    if "memory_fact" in payload:
        return payload.get("memory_fact"), True, "memory_fact"
    return "", False, ""


def extract_fact_from_payload(payload: Dict[str, Any]) -> Tuple[str, Optional[str], str]:
    candidate, explicit, field = _candidate(payload)
    if not field:
        return "", "no-explicit-fact", ""
    fact, reason = _clean_fact(candidate, explicit=explicit)
    return fact, reason, field


def _topic_slug(value: object) -> str:
    raw = str(value or "general").strip().casefold()
    slug = re.sub(r"[^\w.-]+", "-", raw, flags=re.UNICODE).strip("-._")
    return slug[:80] or "general"


def extract_topics(text: str) -> List[str]:
    custom = os.environ.get("MEMORY_TOPICS", "")
    keywords: Dict[str, str] = {}
    for pair in custom.split(","):
        if ":" in pair:
            key, topic = pair.split(":", 1)
            if key.strip() and topic.strip():
                keywords[key.strip().casefold()] = _topic_slug(topic)
    keywords.update(
        {
            "python": "python",
            "typescript": "typescript",
            "react": "react",
            "docker": "docker",
            "kubernetes": "kubernetes",
            "postgres": "postgres",
            "redis": "redis",
            "api": "api-design",
            "test": "testing",
            "deploy": "deployment",
            "security": "security",
        }
    )
    lowered = text.casefold()
    found: List[str] = []
    for keyword, topic in keywords.items():
        if keyword in lowered and topic not in found:
            found.append(topic)
    return found or ["general"]


def _load_items_strict(items_file: Path) -> List[Dict[str, Any]]:
    if not items_file.exists():
        return []
    try:
        value = json.loads(items_file.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeError) as error:
        raise ValueError(f"invalid items.json: {items_file}") from error
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ValueError(f"items.json must contain an array of objects: {items_file}")
    return value


def save_to_items_json(
    memory_dir: Path,
    topic: str,
    fact: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> Tuple[Path, bool]:
    topic = _topic_slug(topic)
    items_file = Path(memory_dir) / "areas" / "topics" / topic / "items.json"
    items_file.parent.mkdir(parents=True, exist_ok=True)
    normalized = normalize_fact(fact)
    with file_lock(items_file):
        items = _load_items_strict(items_file)
        if normalized in {normalize_fact(item.get("fact")) for item in items}:
            return items_file, False
        digest = hashlib.sha256(f"{topic}\0{normalized}".encode("utf-8")).hexdigest()[:16]
        fact_data: Dict[str, Any] = {
            "id": f"fact-{digest}",
            "fact": fact,
            "timestamp": _now_date(),
            "status": "active",
            "category": "fact",
            "source": "manual",
        }
        for key in ("category", "source", "runtime", "tool_name", "tool_use_id"):
            if metadata and metadata.get(key) not in (None, ""):
                fact_data[key] = str(metadata[key])[:200]
        items.append(fact_data)
        atomic_write_json(items_file, items)
    return items_file, True


def update_daily_note(memory_dir: Path, fact: str, topics: List[str]) -> Tuple[Path, bool]:
    note_file = Path(memory_dir) / "memory" / f"{_now_date()}.md"
    note_file.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(normalize_fact(fact).encode("utf-8")).hexdigest()[:16]
    marker = f"<!-- memory-id:{digest} -->"
    with file_lock(note_file):
        try:
            content = note_file.read_text(encoding="utf-8")
        except FileNotFoundError:
            content = f"# {_now_date()}\n"
        if marker in content:
            return note_file, False
        entry = f"\n## {_now_time()}\n{marker}\n{fact}\nTopics: {', '.join(topics)}\n"
        atomic_write_text(note_file, content.rstrip() + "\n" + entry)
    return note_file, True


def _working_files(payload: Dict[str, Any]) -> List[str]:
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return []
    values: List[str] = []
    for key in ("file_path", "filePath", "path"):
        value = tool_input.get(key)
        if isinstance(value, str) and value.strip():
            values.append(value.strip())
    return values


def extract_and_save(payload: Dict[str, Any]) -> Dict[str, Any]:
    runtime = detect_host(payload)
    memory_dir = get_memory_dir()
    files = _working_files(payload)
    if files:
        update_working_files(files)
    fact, skip_reason, source_field = extract_fact_from_payload(payload)
    report: Dict[str, Any] = {
        "memory_root": str(memory_dir),
        "runtime": runtime,
        "model": reported_model(payload),
        "loaded": {"payload": "whitelist-only"},
        "written": [],
        "skipped": [],
        "runtime_evidence": "not-observed",
        "event_envelope_present": bool(payload.get("hook_event_name")),
        "next": "Review the stored fact before promoting it to Layer 3.",
    }
    if not fact:
        report["skipped"].append(skip_reason or "no-explicit-fact")
        return report

    explicit_topic = payload.get("memory_topic")
    topics = [_topic_slug(explicit_topic)] if explicit_topic else extract_topics(fact)
    topic = topics[0]
    tool_name = str(payload.get("tool_name", "manual"))
    metadata = {
        "category": str(payload.get("memory_category", "fact")),
        "source": f"{runtime}:PostToolUse:{tool_name}:{source_field}",
        "runtime": runtime,
        "tool_name": tool_name,
    }
    items_file, item_written = save_to_items_json(memory_dir, topic, fact, metadata)
    note_file, note_written = update_daily_note(memory_dir, fact, topics)
    if item_written:
        report["written"].append(str(items_file.relative_to(memory_dir)))
    else:
        report["skipped"].append("duplicate-layer1")
    if note_written:
        report["written"].append(str(note_file.relative_to(memory_dir)))
    else:
        report["skipped"].append("duplicate-layer2")
    return report


def main() -> int:
    payload = read_hook_payload()
    if not payload:
        emit_json({})
        return 0
    try:
        report = extract_and_save(payload)
    except Exception as error:  # Fail open; the host tool has already completed.
        emit_json({"systemMessage": f"[Memory 3-Layer] write skipped: {type(error).__name__}"})
        return 0
    if report["written"]:
        detail = (
            "Memory 3-Layer write report: "
            f"runtime={report['runtime']}; written={','.join(report['written'])}; "
            f"skipped={','.join(report['skipped']) or 'none'}; "
            f"runtime_evidence={report['runtime_evidence']}."
        )
        emit_json(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": detail,
                }
            }
        )
    else:
        # Empty JSON is a valid no-op response in both Claude Code and Codex.
        emit_json({})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
