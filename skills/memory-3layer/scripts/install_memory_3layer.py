#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Install the shared memory core and merge Claude/Codex project hooks."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional


PLATFORMS = ("auto", "claude", "codex", "both", "manual")
HOOK_FILES = (
    "hook_io.py",
    "memory_paths.py",
    "memory_store.py",
    "session_state.py",
    "memory_loader.py",
    "memory_extractor.py",
    "pre_compact.py",
)
EVENTS = {
    "SessionStart": ("startup|resume|clear|compact", "memory_loader.py"),
    "PostToolUse": ("*", "memory_extractor.py"),
    "PreCompact": ("manual|auto", "pre_compact.py"),
}
LEGACY_CLAUDE_HANDLERS = {
    "SessionStart": ".claude/hooks/memory_loader.py",
    "PostToolUse": ".claude/hooks/memory_extractor.py",
    "PreCompact": ".claude/hooks/pre_compact.py",
}
LEGACY_OWNED_FILES = {
    ".claude/hooks/memory_extractor.py": "9de73f6ee3043f6e074a8e271277df4982a68c72d7c64a13f2592a02b93539ea",
    ".claude/hooks/memory_loader.py": "23a2bf78deea367ecfca17aaeade9ae31810a441a72f163a07e7b40ce3e31813",
    ".claude/hooks/pre_compact.py": "680e75de53e7334783f17656c9cca8e589898a8a21cd36e56d416be93acebb32",
    ".claude/hooks/session_state.py": "da9a176779b64fce3ec8fa27c421cacfa1df31853f3b4eed1fc689d305eacc94",
    ".claude/commands/memory-review.md": "82c54eed8c866af839c7cfa1ecabd15e0162c668b02bddc8ff670ddf0c8e51c7",
    ".claude/commands/memory-status.md": "28b8f29e093f99f8453a0f3616d2aac7c61ccee7df4f4c6431752b53058312d2",
}
LAUNCHER = (
    "import os,pathlib,runpy,subprocess,sys;"
    "os.environ['MEMORY_HOST']=sys.argv[2] if len(sys.argv)>2 else os.environ.get('MEMORY_HOST','manual');"
    "c=pathlib.Path.cwd();"
    "g=subprocess.run(['git','rev-parse','--show-toplevel'],capture_output=True,text=True,"
    "encoding='utf-8',errors='replace');"
    "r=pathlib.Path(g.stdout.strip()) if g.returncode==0 and g.stdout.strip() else "
    "next((p for p in (c,*c.parents) if (p/sys.argv[1]).is_file()),c);"
    "sys.path.insert(0,str((r/sys.argv[1]).parent));"
    "runpy.run_path(str(r/sys.argv[1]),run_name='__main__')"
)


def resolve_platform(
    requested: str,
    which: Callable[[str], Optional[str]] = shutil.which,
) -> str:
    if requested != "auto":
        return requested
    has_claude = bool(which("claude"))
    has_codex = bool(which("codex"))
    if has_claude and has_codex:
        return "both"
    if has_claude:
        return "claude"
    if has_codex:
        return "codex"
    return "manual"


def _memory_dir(project: Path) -> Path:
    configured = os.environ.get("MEMORY_DIR", "").strip()
    if not configured:
        return project / ".memory-3layer"
    path = Path(configured).expanduser()
    return path.resolve() if path.is_absolute() else (project / path).resolve()


def _project_root(path: Path) -> Path:
    """Normalize an install target to its Git root when it has one."""
    candidate = Path(path).expanduser().resolve()
    try:
        result = subprocess.run(
            ["git", "-C", str(candidate), "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return Path(result.stdout.strip()).resolve()
    except (FileNotFoundError, OSError, subprocess.SubprocessError):
        pass
    return candidate


def _update_gitignore(project: Path, memory_dir: Path) -> bool:
    """Merge the runtime-state ignore block without touching user entries."""
    ignore_file = project / ".gitignore"
    try:
        original = ignore_file.read_text(encoding="utf-8")
    except FileNotFoundError:
        original = ""
    except (OSError, UnicodeError) as error:
        raise ValueError(f"Unable to safely merge .gitignore: {ignore_file}") from error

    entries = ["/.memory-3layer/data/"]
    try:
        relative_memory = memory_dir.relative_to(project).as_posix().strip("/")
    except ValueError:
        relative_memory = ""
    custom_entry = f"/{relative_memory}/data/" if relative_memory else ""
    if custom_entry and custom_entry not in entries:
        entries.append(custom_entry)
    begin = "# >>> memory-3layer runtime state"
    end = "# <<< memory-3layer runtime state"
    block = begin + "\n" + "\n".join(entries) + "\n" + end
    pattern = re.compile(
        rf"(?ms)^{re.escape(begin)}\r?\n.*?^{re.escape(end)}(?:\r?\n)?"
    )
    if pattern.search(original):
        updated = pattern.sub(block + "\n", original, count=1)
    else:
        updated = original.rstrip() + ("\n\n" if original.strip() else "") + block + "\n"
    if updated == original:
        return False
    ignore_file.write_text(updated, encoding="utf-8")
    return True


def _preflight_path(project: Path, path: Path, label: str) -> None:
    """Reject symlink/reparse escapes before touching a managed target."""
    project = project.resolve()
    for parent in path.parents:
        if parent == project.parent:
            break
        if parent.exists() and not parent.is_dir():
            raise ValueError(f"Refusing {label}; parent is not a directory: {parent}")
        if parent == project:
            break
    existing = path
    while not existing.exists() and existing != existing.parent:
        existing = existing.parent
    attributes = 0
    if existing.exists():
        try:
            attributes = getattr(os.lstat(existing), "st_file_attributes", 0)
        except OSError:
            attributes = 0
    if existing.exists() and (
        existing.is_symlink()
        or bool(attributes & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0))
    ):
        raise ValueError(f"Refusing {label} through a symlink: {existing}")
    resolved = path.resolve()
    try:
        resolved.relative_to(project)
    except ValueError as error:
        raise ValueError(f"Managed {label} escapes the project root: {path}") from error


def _skill_frontmatter_name(path: Path) -> Optional[str]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (FileNotFoundError, OSError, UnicodeError):
        return None
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        match = re.fullmatch(r"name:\s*([^#]+?)\s*", line)
        if match:
            return match.group(1).strip().strip("\"'")
    return None


def _preflight_skill_target(package_root: Path, project: Path, platform: str) -> None:
    target = project / f".{platform}" / "skills" / "memory-3layer"
    _preflight_path(project, target, f"{platform} skill projection")
    if target.resolve() == package_root.resolve() or not target.exists():
        return
    skill_file = target / "SKILL.md"
    identity = _skill_frontmatter_name(skill_file)
    if identity not in {"memory-3layer", "claude-memory-3layer"}:
        raise ValueError(f"Refusing to replace an unrelated skill directory: {target}")


def _preflight_install(
    package_root: Path,
    project: Path,
    memory_dir: Path,
    platforms: List[str],
) -> None:
    """Resolve every known conflict before the first filesystem write."""
    for name in HOOK_FILES:
        source = package_root / "hooks" / name
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Missing safe hook source: {source}")
    for source in package_root.rglob("*"):
        if source.is_symlink():
            raise ValueError(f"Skill package contains a symlink: {source}")
        if source.is_file() and "__pycache__" not in source.parts and source.suffix != ".pyc":
            try:
                source.read_bytes()
            except OSError as error:
                raise ValueError(f"Unreadable Skill package file: {source}") from error
    ignore_file = project / ".gitignore"
    if ignore_file.exists():
        try:
            ignore_file.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            raise ValueError(f"Unable to safely merge .gitignore: {ignore_file}") from error
    if memory_dir == project:
        raise ValueError("MEMORY_DIR must not be the project root")
    if project in memory_dir.parents:
        _preflight_path(project, memory_dir, "memory runtime directory")
    else:
        raise ValueError("MEMORY_DIR must stay inside the project root")
    for platform in platforms:
        config_path = (
            project / ".claude" / "settings.json"
            if platform == "claude"
            else project / ".codex" / "hooks.json"
        )
        _preflight_path(project, config_path, f"{platform} hook config")
        config = _read_json_object(config_path)
        _merge_hooks(copy.deepcopy(config), platform)
        _preflight_path(
            project,
            project / f".{platform}" / "hooks" / "memory-3layer",
            f"{platform} hook runtime",
        )
        for name in HOOK_FILES:
            hook_target = project / f".{platform}" / "hooks" / "memory-3layer" / name
            _preflight_path(
                project,
                hook_target,
                f"{platform} hook file",
            )
            if hook_target.exists() and not hook_target.is_file():
                raise ValueError(f"Managed hook target is not a file: {hook_target}")
        _preflight_skill_target(package_root, project, platform)


def _initialize_tree(memory_dir: Path, package_root: Path) -> List[str]:
    created: List[str] = []
    for directory in (
        memory_dir / "memory",
        memory_dir / "areas" / "topics",
        memory_dir / "data",
    ):
        if not directory.exists():
            created.append(str(directory))
        directory.mkdir(parents=True, exist_ok=True)
    templates = package_root / "templates"
    for source_name, relative in (
        ("MEMORY.md", Path("MEMORY.md")),
        ("session_state.json", Path("data") / "session_state.json"),
    ):
        destination = memory_dir / relative
        if not destination.exists():
            destination.write_text((templates / source_name).read_text(encoding="utf-8"), encoding="utf-8")
            created.append(str(destination))
    return created


def _read_json_object(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, UnicodeError) as error:
        raise ValueError(f"Refusing to replace invalid JSON: {path}") from error
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def _atomic_write_json(path: Path, value: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    with temporary.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    os.replace(str(temporary), str(path))


def _python_command(windows: bool) -> str:
    if windows:
        if shutil.which("python"):
            return "python"
        if shutil.which("py"):
            return "py -3"
    else:
        if shutil.which("python3"):
            return "python3"
        if shutil.which("python"):
            return "python"
    executable = str(Path(sys.executable).resolve())
    return f'"{executable}"' if " " in executable else executable


def _hook_command(platform: str, script: str, *, windows: bool) -> str:
    relative = f".{platform}/hooks/memory-3layer/{script}"
    return f'{_python_command(windows)} -c "{LAUNCHER}" {relative} {platform}'


def _is_managed_handler(handler: object, platform: str) -> bool:
    if not isinstance(handler, dict):
        return False
    marker = f".{platform}/hooks/memory-3layer/"
    for key in ("command", "commandWindows"):
        command = str(handler.get(key, "")).replace("\\", "/")
        if marker in command:
            return True
    return False


def _handler_commands(config: Dict[str, Any]) -> List[str]:
    commands: List[str] = []
    hooks = config.get("hooks", {})
    if not isinstance(hooks, dict):
        return commands
    for groups in hooks.values():
        if not isinstance(groups, list):
            continue
        for group in groups:
            if not isinstance(group, dict) or not isinstance(group.get("hooks"), list):
                continue
            for handler in group["hooks"]:
                if not isinstance(handler, dict):
                    continue
                for key in ("command", "commandWindows"):
                    value = handler.get(key)
                    if isinstance(value, str):
                        commands.append(value.replace("\\", "/"))
    return commands


def _has_complete_legacy_claude_hooks(config: Dict[str, Any]) -> bool:
    commands = _handler_commands(config)
    return all(any(marker in command for command in commands) for marker in LEGACY_CLAUDE_HANDLERS.values())


def _is_legacy_handler(handler: object, platform: str, enabled: bool) -> bool:
    if platform != "claude" or not enabled or not isinstance(handler, dict):
        return False
    for key in ("command", "commandWindows"):
        command = str(handler.get(key, "")).replace("\\", "/")
        if any(marker in command for marker in LEGACY_CLAUDE_HANDLERS.values()):
            return True
    return False


def _merge_hooks(config: Dict[str, Any], platform: str) -> Dict[str, Any]:
    remove_legacy = _has_complete_legacy_claude_hooks(config) if platform == "claude" else False
    hooks = config.setdefault("hooks", {})
    if not isinstance(hooks, dict):
        raise ValueError("Existing 'hooks' value must be an object")
    for event, (matcher, script) in EVENTS.items():
        groups = hooks.setdefault(event, [])
        if not isinstance(groups, list):
            raise ValueError(f"Existing hooks.{event} value must be an array")
        cleaned: List[Any] = []
        for group in groups:
            if not isinstance(group, dict):
                cleaned.append(group)
                continue
            handlers = group.get("hooks")
            if not isinstance(handlers, list):
                cleaned.append(group)
                continue
            kept = [
                item
                for item in handlers
                if not _is_managed_handler(item, platform)
                and not _is_legacy_handler(item, platform, remove_legacy)
            ]
            if kept:
                copied = dict(group)
                copied["hooks"] = kept
                cleaned.append(copied)
        handler: Dict[str, Any] = {
            "type": "command",
            "command": _hook_command(
                platform,
                script,
                windows=(platform == "claude" and os.name == "nt"),
            ),
            "timeout": 10,
        }
        if platform == "codex":
            handler["commandWindows"] = _hook_command(platform, script, windows=True)
        cleaned.append({"matcher": matcher, "hooks": [handler]})
        hooks[event] = cleaned
    return config


def _cleanup_exact_legacy_files(project: Path, legacy_detected: bool) -> Dict[str, List[str]]:
    report: Dict[str, List[str]] = {"removed": [], "preserved": []}
    if not legacy_detected:
        return report
    for relative, expected_hash in LEGACY_OWNED_FILES.items():
        path = project / relative
        if not path.exists():
            continue
        try:
            if not path.is_file() or path.is_symlink():
                report["preserved"].append(relative)
                continue
            actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            if actual_hash != expected_hash:
                report["preserved"].append(relative)
                continue
            path.unlink()
            report["removed"].append(relative)
        except OSError:
            report["preserved"].append(relative)
    return report


def _copy_runtime_hooks(package_root: Path, project: Path, platform: str) -> List[str]:
    source_root = package_root / "hooks"
    target_root = project / f".{platform}" / "hooks" / "memory-3layer"
    target_root.mkdir(parents=True, exist_ok=True)
    updated: List[str] = []
    for name in HOOK_FILES:
        source = source_root / name
        target = target_root / name
        if not source.is_file() or source.is_symlink():
            raise ValueError(f"Missing safe hook source: {source}")
        if not target.exists() or source.read_bytes() != target.read_bytes():
            shutil.copy2(source, target)
            updated.append(str(target))
    return updated


def _file_map(root: Path) -> Dict[str, bytes]:
    result: Dict[str, bytes] = {}
    if not root.is_dir():
        return result
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(
            part in {".git", "__pycache__", ".pytest_cache", "test-results"}
            for part in relative.parts
        ) or path.suffix == ".pyc":
            continue
        if path.is_file() and not path.is_symlink():
            result[relative.as_posix()] = path.read_bytes()
    return result


def _project_skill_package(package_root: Path, project: Path, platform: str) -> Dict[str, Any]:
    """Project the complete Skill package into the selected runtime root."""
    target = project / f".{platform}" / "skills" / "memory-3layer"
    source = package_root.resolve()
    if target.resolve() == source:
        return {"path": str(target), "changed": False, "source_is_target": True}
    if target.exists():
        skill_file = target / "SKILL.md"
        identity = _skill_frontmatter_name(skill_file)
        if identity not in {"memory-3layer", "claude-memory-3layer"}:
            raise ValueError(f"Refusing to replace an unrelated skill directory: {target}")
        if _file_map(source) == _file_map(target):
            return {"path": str(target), "changed": False, "source_is_target": False}

    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.parent / f".memory-3layer-{uuid.uuid4().hex}.tmp"
    rollback = target.parent / f".memory-3layer-{uuid.uuid4().hex}.rollback"
    ignore = shutil.ignore_patterns(
        ".git",
        "__pycache__",
        "*.pyc",
        ".pytest_cache",
        "test-results",
    )
    shutil.copytree(source, temporary, ignore=ignore)
    moved_old = False
    try:
        if target.exists():
            os.replace(str(target), str(rollback))
            moved_old = True
        os.replace(str(temporary), str(target))
    except Exception:
        if moved_old and rollback.exists() and not target.exists():
            os.replace(str(rollback), str(target))
        if temporary.exists():
            shutil.rmtree(temporary)
        raise
    if rollback.exists():
        shutil.rmtree(rollback)
    return {"path": str(target), "changed": True, "source_is_target": False}


def _merge_platform_config(
    package_root: Path,
    project: Path,
    memory_dir: Path,
    platform: str,
) -> Dict[str, Any]:
    config_path = (
        project / ".claude" / "settings.json"
        if platform == "claude"
        else project / ".codex" / "hooks.json"
    )
    original_bytes = config_path.read_bytes() if config_path.exists() else None
    config = _read_json_object(config_path)
    legacy_detected = platform == "claude" and _has_complete_legacy_claude_hooks(config)
    merged = _merge_hooks(copy.deepcopy(config), platform)
    changed = config != merged
    backup = None
    if changed:
        if original_bytes is not None:
            backup_dir = memory_dir / "data" / "backups"
            backup_dir.mkdir(parents=True, exist_ok=True)
            backup = backup_dir / f"{platform}-hooks-config.json"
            backup.write_bytes(original_bytes)
        _atomic_write_json(config_path, merged)
    copied = _copy_runtime_hooks(package_root, project, platform)
    skill_projection = _project_skill_package(package_root, project, platform)
    legacy_cleanup = _cleanup_exact_legacy_files(project, legacy_detected)
    return {
        "config": str(config_path),
        "config_changed": changed,
        "backup": str(backup) if backup else None,
        "copied_hooks": copied,
        "skill_projection": skill_projection,
        "legacy_upgrade": {
            "detected": legacy_detected,
            **legacy_cleanup,
            "legacy_memory_preserved": str(project / ".claude" / "memory") if legacy_detected else None,
        },
    }


def install(project_dir: Path, requested_platform: str = "auto") -> Dict[str, Any]:
    package_root = Path(__file__).resolve().parents[1]
    supplied_project = Path(project_dir).expanduser().resolve()
    if not supplied_project.is_dir():
        raise ValueError(f"Project directory does not exist: {supplied_project}")
    project = _project_root(supplied_project)
    selected = resolve_platform(requested_platform)
    platforms: List[str] = []
    if selected in {"claude", "both"}:
        platforms.append("claude")
    if selected in {"codex", "both"}:
        platforms.append("codex")
    memory_dir = _memory_dir(project)
    _preflight_install(package_root, project, memory_dir, platforms)
    created = _initialize_tree(memory_dir, package_root)
    gitignore_changed = _update_gitignore(project, memory_dir)
    adapters = {
        platform: _merge_platform_config(package_root, project, memory_dir, platform)
        for platform in platforms
    }
    return {
        "requested_platform": requested_platform,
        "selected_platform": selected,
        "memory_dir": str(memory_dir),
        "project_dir": str(project),
        "initialized": created,
        "gitignore_changed": gitignore_changed,
        "adapters": adapters,
        "manual": selected == "manual",
        "next": (
            "Run /hooks in Codex and review/trust the three Memory 3-Layer commands."
            if "codex" in platforms
            else "Start a new host session and verify a real SessionStart event."
            if platforms
            else "No supported host executable was detected; wire the three core scripts manually."
        ),
    }


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--platform", choices=PLATFORMS, default="auto")
    parser.add_argument("--project-dir", required=True)
    args = parser.parse_args(argv)
    try:
        report = install(Path(args.project_dir), args.platform)
    except (OSError, ValueError) as error:
        print(json.dumps({"success": False, "error": str(error)}, ensure_ascii=False, indent=2))
        return 1
    print(json.dumps({"success": True, **report}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
