# -*- coding: utf-8 -*-
"""Shared stdin/stdout helpers for Claude Code and Codex command hooks."""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any, Dict


def read_hook_payload() -> Dict[str, Any]:
    """Read one JSON object from stdin; invalid or empty input becomes ``{}``."""
    if sys.stdin.isatty():
        return {}
    try:
        raw = sys.stdin.read()
    except (OSError, UnicodeError):
        return {}
    if not raw.strip():
        return {}
    try:
        value = json.loads(raw)
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}
    return value if isinstance(value, dict) else {}


def emit_json(value: Dict[str, Any]) -> None:
    """Write exactly one compact JSON object to stdout."""
    sys.stdout.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")))


def context_output(event_name: str, context: str) -> Dict[str, Any]:
    """Build the shared Claude/Codex context envelope."""
    if not context:
        return {}
    return {
        "hookSpecificOutput": {
            "hookEventName": event_name,
            "additionalContext": context,
        }
    }


def detect_host(payload: Dict[str, Any]) -> str:
    """Declared provenance only; model names never identify the client or adapter."""
    aliases = {"claude-code": "claude", "codex-cli": "codex"}

    def label(value: Any) -> str:
        if not isinstance(value, str):
            return ""
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z][a-z0-9._ -]{0,79}", value):
            return ""
        value = re.sub(r" +", "-", value)
        return aliases.get(value, value)

    explicit = label(os.environ.get("MEMORY_HOST"))
    if explicit:
        return explicit
    for key in ("runtime", "host", "client"):
        value = label(payload.get(key))
        if value:
            return value
    return "manual"


def reported_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Keep an optional model label separate from host provenance and authority."""
    value = payload.get("model")
    if isinstance(value, str) and 0 < len(value.strip()) <= 200 and not re.search(r"[\x00-\x1f\x7f]", value):
        return {"name": value.strip(), "source": "payload_unverified"}
    return {"name": None, "source": "not_provided"}
