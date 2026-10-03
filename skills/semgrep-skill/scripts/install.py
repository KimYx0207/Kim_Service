#!/usr/bin/env python3
"""Transactional installer for the semgrep-skill projection.

The installer is intentionally dry-run by default. It installs this Skill only;
it never installs Semgrep, fetches remote rules, or edits scanned projects.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


COMPONENT_ID = "semgrep-skill"
COMPONENT_VERSION = "1.1.0"
RECEIPT_NAME = ".semgrep-skill-receipt.json"
SOURCE_FILES = ("SKILL.md", "capability.json", "scripts/scan.py", "rules/local-security.yml")
BACKUP_DIR_NAME = ".semgrep-skill-backups"


class InstallError(RuntimeError):
    pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def target_hash(files: list[dict[str, str]]) -> str:
    digest = hashlib.sha256()
    for item in sorted(files, key=lambda value: value["path"]):
        digest.update(item["path"].encode("utf-8"))
        digest.update(b"\0")
        digest.update(item["sha256"].encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def is_link(path: Path) -> bool:
    try:
        mode = path.lstat().st_mode
    except FileNotFoundError:
        return False
    return stat.S_ISLNK(mode) or bool(
        getattr(path.lstat(), "st_file_attributes", 0)
        & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0)
    )


def reject_linked_ancestors(base: Path, destination: Path) -> None:
    base = base.resolve(strict=True)
    try:
        destination.relative_to(base)
    except ValueError as exc:
        raise InstallError(f"Target escapes the selected scope root: {destination}") from exc

    cursor = base
    if is_link(cursor):
        raise InstallError(f"Scope root cannot be a symlink or reparse point: {cursor}")
    for part in destination.relative_to(base).parts:
        cursor = cursor / part
        if is_link(cursor):
            raise InstallError(f"Refusing linked target path: {cursor}")


def reject_linked_path(path: Path) -> None:
    """Reject links and reparse points in an existing lexical path chain."""
    if not path.is_absolute():
        raise InstallError(f"Expected an absolute scope path: {path}")
    cursor = Path(path.anchor)
    for part in path.parts[1:]:
        cursor = cursor / part
        if is_link(cursor):
            raise InstallError(f"Scope path cannot contain a symlink or reparse point: {cursor}")


def read_receipt(directory: Path, expected_target: Path) -> dict[str, Any]:
    if is_link(directory):
        raise InstallError(f"Refusing linked installation directory: {directory}")
    receipt_path = directory / RECEIPT_NAME
    if not receipt_path.is_file() or is_link(receipt_path):
        raise InstallError(f"Unknown installation: valid {RECEIPT_NAME} is required")
    try:
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise InstallError(f"Invalid installation receipt: {exc}") from exc

    if receipt.get("schemaVersion") != 1 or receipt.get("id") != COMPONENT_ID:
        raise InstallError("Receipt identity does not match semgrep-skill")
    if receipt.get("target") != str(expected_target):
        raise InstallError("Receipt target does not match the selected installation target")
    files = receipt.get("files")
    if not isinstance(files, list) or not files:
        raise InstallError("Receipt has no file inventory")

    expected: dict[str, str] = {}
    for item in files:
        if not isinstance(item, dict) or set(item) != {"path", "sha256"}:
            raise InstallError("Receipt file inventory is malformed")
        relative = item["path"]
        digest = item["sha256"]
        if (
            not isinstance(relative, str)
            or not relative
            or Path(relative).is_absolute()
            or ".." in Path(relative).parts
            or not isinstance(digest, str)
            or len(digest) != 64
            or relative in expected
        ):
            raise InstallError("Receipt file inventory contains an unsafe entry")
        expected[relative] = digest

    actual: dict[str, str] = {}
    actual_dirs: set[str] = set()
    for path in directory.rglob("*"):
        relative = path.relative_to(directory).as_posix()
        if is_link(path):
            raise InstallError(f"Unknown linked content in installation: {relative}")
        if path.is_dir():
            actual_dirs.add(relative)
        elif path.is_file() and relative != RECEIPT_NAME:
            actual[relative] = sha256_file(path)
        elif not path.is_file():
            raise InstallError(f"Unknown content in installation: {relative}")

    allowed_dirs = {
        parent.as_posix()
        for relative in expected
        for parent in list(Path(relative).parents)[:-1]
        if parent.as_posix() != "."
    }
    if actual_dirs != allowed_dirs or set(actual) != set(expected):
        raise InstallError("Installation contains unknown, missing, or unreceipted content")
    for relative, expected_digest in expected.items():
        if actual[relative] != expected_digest:
            raise InstallError(f"Installed file was modified outside the installer: {relative}")

    inventory = [{"path": key, "sha256": actual[key]} for key in sorted(actual)]
    if receipt.get("targetHash") != target_hash(inventory):
        raise InstallError("Receipt targetHash does not match installed content")
    return receipt


def component_root() -> Path:
    root = Path(__file__).resolve().parent.parent
    for relative in SOURCE_FILES:
        source = root / relative
        if not source.is_file() or is_link(source):
            raise InstallError(f"Required component file is missing or linked: {relative}")
    return root


def resolve_target(args: argparse.Namespace) -> tuple[Path, Path]:
    if args.scope == "project":
        if not args.project_root:
            raise InstallError("--project-root is required for --scope project")
        scope_root = Path(os.path.abspath(Path(args.project_root).expanduser()))
        reject_linked_path(scope_root)
        if not scope_root.is_dir():
            raise InstallError("--project-root must be an existing directory")
    else:
        if args.project_root:
            raise InstallError("--project-root is not valid for --scope user")
        scope_root = Path(os.path.abspath(Path.home()))
        reject_linked_path(scope_root)

    scope_root = scope_root.resolve(strict=True)

    target = scope_root / ".claude" / "skills" / COMPONENT_ID
    reject_linked_ancestors(scope_root, target)
    return scope_root, target


def backup_root(target: Path) -> Path:
    root = target.parent / BACKUP_DIR_NAME
    if root.exists() and (not root.is_dir() or is_link(root)):
        raise InstallError(f"Backup root is not a trusted directory: {root}")
    return root


def validate_backup_path(raw_path: str, target: Path) -> Path:
    path = Path(raw_path)
    root = backup_root(target)
    if not path.is_absolute() or path.parent != root or not path.name.startswith("backup-"):
        raise InstallError("Receipt backupPath escapes the installer-owned backup directory")
    return path


def make_inventory(stage: Path) -> list[dict[str, str]]:
    return [
        {"path": relative, "sha256": sha256_file(stage / relative)}
        for relative in sorted(SOURCE_FILES)
    ]


def write_receipt(
    stage: Path,
    target: Path,
    scope: str,
    inventory: list[dict[str, str]],
    previous: Path | None,
) -> None:
    if os.environ.get("SEMGREP_SKILL_TEST_FAIL_RECEIPT_WRITE") == "1":
        raise OSError("simulated receipt write failure")
    receipt = {
        "schemaVersion": 1,
        "id": COMPONENT_ID,
        "componentVersion": COMPONENT_VERSION,
        "scope": scope,
        "target": str(target),
        "installedAt": datetime.now(timezone.utc).isoformat(),
        "files": inventory,
        "targetHash": target_hash(inventory),
        "backupPath": str(previous) if previous else None,
    }
    receipt_path = stage / RECEIPT_NAME
    with receipt_path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(receipt, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def create_stage(source_root: Path, target: Path, scope: str, previous: Path | None) -> Path:
    stage = target.parent / f".{COMPONENT_ID}.stage-{uuid.uuid4().hex}"
    stage.mkdir()
    try:
        for relative in SOURCE_FILES:
            destination = stage / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source_root / relative, destination)
        inventory = make_inventory(stage)
        write_receipt(stage, target, scope, inventory, previous)
        read_receipt(stage, target)
        return stage
    except Exception:
        shutil.rmtree(stage, ignore_errors=True)
        raise


def next_backup_path(target: Path) -> Path:
    root = backup_root(target)
    return root / f"backup-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex}"


def install(args: argparse.Namespace, target: Path, source_root: Path) -> dict[str, Any]:
    existing = None
    if target.exists():
        if not target.is_dir():
            raise InstallError(f"Target exists and is not a directory: {target}")
        existing = read_receipt(target, target)

    result: dict[str, Any] = {
        "ok": True,
        "action": "install",
        "mode": "apply" if args.apply else "dry-run",
        "scope": args.scope,
        "target": str(target),
        "semgrepAvailable": shutil.which("semgrep") is not None,
        "upgrade": existing is not None,
    }
    if not args.apply:
        return result

    target.parent.mkdir(parents=True, exist_ok=True)
    previous = next_backup_path(target) if existing else None
    stage = create_stage(source_root, target, args.scope, previous)
    moved_old = False
    created_backup_root = False
    try:
        if previous:
            root = previous.parent
            if not root.exists():
                root.mkdir(parents=True)
                created_backup_root = True
            os.replace(target, previous)
            moved_old = True
        os.replace(stage, target)
        if os.environ.get("SEMGREP_SKILL_TEST_FAIL_FINAL_VERIFY") == "1":
            raise InstallError("simulated final verification failure")
        read_receipt(target, target)
    except Exception:
        if target.exists() and target != stage:
            failed = target.parent / f".{COMPONENT_ID}.failed-{uuid.uuid4().hex}"
            try:
                os.replace(target, failed)
                shutil.rmtree(failed, ignore_errors=True)
            except OSError:
                pass
        if moved_old and previous and previous.exists() and not target.exists():
            os.replace(previous, target)
        if stage.exists():
            shutil.rmtree(stage, ignore_errors=True)
        if created_backup_root and previous and previous.parent.exists():
            try:
                previous.parent.rmdir()
            except OSError:
                pass
        raise

    result["receipt"] = str(target / RECEIPT_NAME)
    result["targetHash"] = read_receipt(target, target)["targetHash"]
    result["backupPath"] = str(previous) if previous else None
    return result


def rollback(args: argparse.Namespace, target: Path) -> dict[str, Any]:
    if not target.is_dir():
        raise InstallError(f"No installation to roll back: {target}")
    current = read_receipt(target, target)
    raw_previous = current.get("backupPath")
    if not isinstance(raw_previous, str) or not raw_previous:
        raise InstallError("The current installation has no previous installation to restore")
    previous = validate_backup_path(raw_previous, target)
    if not previous.is_dir():
        raise InstallError("The receipted previous installation is missing")
    read_receipt(previous, target)

    result: dict[str, Any] = {
        "ok": True,
        "action": "rollback",
        "mode": "apply" if args.apply else "dry-run",
        "scope": args.scope,
        "target": str(target),
        "restoreFrom": str(previous),
        "semgrepAvailable": shutil.which("semgrep") is not None,
    }
    if not args.apply:
        return result

    displaced = next_backup_path(target)
    moved_current = False
    moved_previous = False
    try:
        os.replace(target, displaced)
        moved_current = True
        os.replace(previous, target)
        moved_previous = True
        if os.environ.get("SEMGREP_SKILL_TEST_FAIL_FINAL_VERIFY") == "1":
            raise InstallError("simulated final verification failure")
        restored = read_receipt(target, target)
    except Exception:
        if moved_previous and target.exists() and not previous.exists():
            os.replace(target, previous)
        if moved_current and displaced.exists() and not target.exists():
            os.replace(displaced, target)
        raise
    result["targetHash"] = restored["targetHash"]
    result["displacedBackup"] = str(displaced)
    return result


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scope", required=True, choices=("project", "user"))
    parser.add_argument("--project-root")
    parser.add_argument("--apply", action="store_true", help="authorize filesystem changes")
    parser.add_argument("--rollback", action="store_true", help="restore the receipted previous install")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    try:
        args = parse_args(argv)
        source_root = component_root()
        _, target = resolve_target(args)
        result = rollback(args, target) if args.rollback else install(args, target, source_root)
        if not result["semgrepAvailable"]:
            result["runtimeNote"] = (
                "Semgrep is not installed. Install it separately only after explicit approval; "
                "this installer does not run pip or any package manager."
            )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (InstallError, OSError, ValueError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
