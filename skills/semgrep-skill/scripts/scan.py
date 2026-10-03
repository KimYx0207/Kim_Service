#!/usr/bin/env python3
"""Bounded local Semgrep invocation; stdout is one sanitized JSON result."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import signal
import site
import stat
import subprocess
import sys
import tempfile
import time
from pathlib import Path


PACKAGE = Path(__file__).absolute().parent.parent
COMPONENT_VERSION = "1.1.0"
RULE_IDS = ("python-subprocess-shell-true", "javascript-eval")
EXTENSIONS = {".py", ".js", ".jsx", ".ts", ".tsx"}
SKIP_DIRS = {"node_modules", "__pycache__", "venv", "vendor"}
MAX_FILES, MAX_BYTES, MAX_OUTPUT = 512, 1024 * 1024, 8 * 1024 * 1024


class ScanError(Exception):
    def __init__(self, status: str, code: str, message: str):
        self.status, self.code, self.message = status, code, message


def result() -> dict:
    return {
        "schemaVersion": 1, "componentVersion": COMPONENT_VERSION,
        "status": "failed", "completed": False, "findings": [], "errors": [],
        "runtime": {"pythonVersion": sys.version.split()[0], "semgrepVersion": None},
        "rules": {"source": "canonical:skills/semgrep-skill/rules/local-security.yml",
                  "sourceSha256": None, "effectiveSha256": None,
                  "includedRuleIds": list(RULE_IDS)},
        "networkUsed": False, "filesModified": False,
    }


def invalid(code: str, message: str) -> None:
    raise ScanError("invalid_input", code, message)


def no_links(path: Path) -> None:
    """Check lexical ancestors before resolve, including Windows junctions."""
    for ancestor in [*reversed(path.parents), path]:
        info = ancestor.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 1024:
            invalid("linked_path", "Links and reparse points are not allowed.")


def local_path(raw: object) -> Path:
    if not isinstance(raw, str) or not raw or any(ord(c) < 32 for c in raw):
        invalid("path_format", "Paths must be nonempty local strings without control characters.")
    if raw.startswith(("\\\\", "//")) or "://" in raw:
        invalid("path_format", "Network, URI and device paths are not allowed.")
    path = Path(raw)
    if ".." in path.parts:
        invalid("path_escape", "Parent traversal is not allowed.")
    for part in path.parts:
        if part == path.anchor:
            continue
        if ":" in part or part.endswith((".", " ")) or re.fullmatch(
            r"(?i)(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?", part
        ):
            invalid("path_format", "Ambiguous or device path components are not allowed.")
    return path


def selected_files(data: dict) -> tuple[Path, list[Path]]:
    if not isinstance(data, dict) or set(data) - {"schemaVersion", "workspaceRoot", "target", "rules"}:
        invalid("input_shape", "Only schemaVersion, workspaceRoot, target and rules are accepted.")
    if type(data.get("schemaVersion")) is not int or data["schemaVersion"] != 1:
        invalid("schema_version", "schemaVersion must be 1.")
    if data.get("rules", "rules/local-security.yml") != "rules/local-security.yml":
        invalid("rules_selection", "Only the bundled rules/local-security.yml is accepted.")
    root = local_path(data.get("workspaceRoot"))
    if not root.is_absolute() or root == Path(root.anchor):
        invalid("workspace_root", "workspaceRoot must be an explicit absolute local directory, not a drive root.")
    target = local_path(data.get("target"))
    target = target if target.is_absolute() else root / target
    try:
        target.relative_to(root)
    except ValueError:
        invalid("path_escape", "target must be contained by workspaceRoot.")
    try:
        no_links(root)
        no_links(target)
    except OSError:
        invalid("target_unreadable", "workspaceRoot and target must be existing readable directories.")
    if not root.is_dir() or not target.is_dir():
        invalid("target_directory", "workspaceRoot and target must be existing directories.")
    files: list[Path] = []
    def walk_error(_error: OSError) -> None:
        invalid("target_unreadable", "The selected target could not be enumerated.")
    for directory, directories, names in os.walk(target, followlinks=False, onerror=walk_error):
        # Reject linked entries even when they would otherwise be excluded.
        for name in directories + names:
            no_links(Path(directory) / name)
        directories[:] = sorted(d for d in directories if not d.startswith(".") and d not in SKIP_DIRS)
        for name in sorted(names):
            if name.startswith(".") or Path(name).suffix.lower() not in EXTENSIONS:
                continue
            candidate = Path(directory) / name
            info = candidate.stat()
            if not stat.S_ISREG(info.st_mode) or info.st_size > MAX_BYTES:
                invalid("file_limit", "Eligible files must be regular files of at most 1 MiB.")
            files.append(candidate)
            if len(files) > MAX_FILES:
                invalid("file_limit", "The bounded scan accepts at most 512 eligible files; narrow the target.")
    if not files:
        invalid("no_eligible_files", "No visible Python/JavaScript/TypeScript source files were selected.")
    return root, files


def effective_rules() -> tuple[bytes, bytes, dict[str, str]]:
    path = PACKAGE / "rules" / "local-security.yml"
    no_links(path)
    source = path.read_bytes()
    chunks = re.split(r"(?m)^  - id: ", source.decode("utf-8"))
    if chunks[0].strip() != "rules:":
        raise ScanError("failed", "rules_format", "Bundled rule format was not recognized.")
    chosen, messages = {}, {}
    for chunk in chunks[1:]:
        rule_id = chunk.splitlines()[0].strip()
        if rule_id in RULE_IDS:
            if rule_id in chosen:
                raise ScanError("failed", "rules_format", "Duplicate bundled rule identifier.")
            chosen[rule_id] = "  - id: " + chunk
            match = re.search(r"(?m)^    message: (.+)$", chunk)
            if not match:
                raise ScanError("failed", "rules_format", "Bundled rule message is missing.")
            messages[rule_id] = match[1].strip()
    if set(chosen) != set(RULE_IDS):
        raise ScanError("failed", "rules_format", "The two required local rules are missing.")
    return source, ("rules:\n" + "".join(chosen[key] for key in RULE_IDS)).encode("utf-8"), messages


def executable(root: Path) -> Path:
    raw = shutil.which("semgrep")
    if not raw:
        raise ScanError("unavailable", "semgrep_unavailable", "Semgrep is not installed on the host PATH; no installation was attempted.")
    binary = Path(raw).absolute()
    if binary.is_relative_to(root) or binary.is_relative_to(PACKAGE):
        raise ScanError("unavailable", "semgrep_executable", "Project-local Semgrep executables are not accepted.")
    # Normal system executable symlinks are supported, never project-local code.
    binary = binary.resolve(strict=True)
    if binary.suffix.lower() in {".cmd", ".bat", ".ps1"} or not binary.is_file():
        raise ScanError("unavailable", "semgrep_executable", "A directly executable installed Semgrep CLI is required.")
    if binary.is_relative_to(root) or binary.is_relative_to(PACKAGE):
        raise ScanError("unavailable", "semgrep_executable", "Project-local Semgrep executables are not accepted.")
    return binary


def child_environment(binary: Path, scratch: Path, root: Path | None = None) -> dict[str, str]:
    # Retain only OS bootstrap variables. APPDATA locates Windows Python's already
    # installed user-site package; Semgrep settings and logs use explicit scratch paths.
    env = {key: os.environ[key] for key in ("SystemRoot", "WINDIR", "APPDATA", "LANG", "LC_ALL") if key in os.environ}
    paths = [str(binary.parent), str(Path(sys.executable).parent)]
    if os.name == "nt":
        paths.append(str(Path(os.environ.get("SystemRoot", "C:\\Windows")) / "System32"))
    else:
        paths.extend(["/usr/bin", "/bin"])
    env.update({"PATH": os.pathsep.join(paths), "HOME": str(scratch), "USERPROFILE": str(scratch),
                "LOCALAPPDATA": str(scratch), "TMP": str(scratch), "TEMP": str(scratch), "TMPDIR": str(scratch),
                "XDG_CONFIG_HOME": str(scratch), "XDG_CACHE_HOME": str(scratch),
                "SEMGREP_SETTINGS_FILE": str(scratch / "settings.yml"),
                "SEMGREP_LOG_FILE": str(scratch / "semgrep.log"),
                "SEMGREP_VERSION_CACHE_PATH": str(scratch / "version-cache"),
                "SEMGREP_SEND_METRICS": "off", "SEMGREP_ENABLE_VERSION_CHECK": "0",
                "PYTHONDONTWRITEBYTECODE": "1", "PYTHONUTF8": "1"})
    # A user-site Python CLI on POSIX must still find its installed package after
    # HOME isolation. Compute this runtime path; never inherit caller PYTHONPATH.
    user_site = Path(site.getusersitepackages())
    if (user_site / "semgrep" / "__init__.py").is_file():
        user_site = user_site.resolve(strict=True)
        user_base = Path(site.getuserbase()).resolve(strict=True)
        if user_site.is_relative_to(PACKAGE) or (root is not None and user_site.is_relative_to(root)):
            raise ScanError("unavailable", "semgrep_runtime", "A trusted host Python installation outside the scan workspace is required.")
        if user_base.is_relative_to(PACKAGE) or (root is not None and user_base.is_relative_to(root)):
            raise ScanError("unavailable", "semgrep_runtime", "A trusted host Python installation outside the scan workspace is required.")
        # Let Python process this installed site's .pth bootstrap (e.g. pywin32),
        # even when an upstream caller isolates APPDATA. PYTHONPATH alone only
        # adds a directory; it does not initialize installed runtime dependencies.
        env["PYTHONUSERBASE"] = str(user_base)
        env["PYTHONPATH"] = str(user_site)
    return env


def stop_process(process: subprocess.Popen, env: dict[str, str]) -> None:
    try:
        if os.name == "nt":
            taskkill = Path(env.get("SystemRoot", env.get("SYSTEMROOT", "C:\\Windows"))) / "System32" / "taskkill.exe"
            subprocess.run([str(taskkill), "/PID", str(process.pid), "/T", "/F"],
                           shell=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                           timeout=10, env=env)
        else:
            os.killpg(process.pid, signal.SIGKILL)
    except (OSError, subprocess.SubprocessError):
        pass
    finally:
        process.kill()
        process.wait(timeout=10)


def invoke(argv: list[str], scratch: Path, env: dict[str, str]) -> tuple[int, str]:
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        process = subprocess.Popen(argv, cwd=scratch, env=env, shell=False,
                                   stdin=subprocess.DEVNULL, stdout=stdout, stderr=stderr,
                                   start_new_session=os.name != "nt")
        deadline = time.monotonic() + 60
        while True:
            if max(os.fstat(stdout.fileno()).st_size, os.fstat(stderr.fileno()).st_size) > MAX_OUTPUT:
                stop_process(process, env)
                raise ScanError("failed", "semgrep_output_limit", "Semgrep output exceeded the result limit.")
            if process.poll() is not None:
                break
            if time.monotonic() >= deadline:
                stop_process(process, env)
                raise ScanError("failed", "semgrep_timeout", "Semgrep exceeded the bounded invocation time.")
            try:
                process.wait(timeout=0.1)
            except subprocess.TimeoutExpired:
                pass
        stdout.seek(0)
        return process.returncode, stdout.read(MAX_OUTPUT).decode("utf-8", errors="strict")


def normalize(payload: dict, root: Path, files: list[Path], messages: dict) -> list[dict]:
    if not isinstance(payload, dict) or not isinstance(payload.get("results"), list) or not isinstance(payload.get("errors"), list):
        raise ValueError("invalid Semgrep response")
    selected = set(files)
    findings = []
    for item in payload["results"]:
        check_id = item["check_id"]
        if not isinstance(check_id, str) or len(check_id) > 512:
            raise ValueError("invalid rule id")
        rule_id = check_id.split(".")[-1]
        if rule_id not in RULE_IDS:
            raise ValueError("unexpected rule")
        try:
            path = local_path(item["path"])
        except ScanError as exc:
            raise ValueError("invalid finding path") from exc
        path = path if path.is_absolute() else root / path
        if path not in selected:
            raise ValueError("unexpected target")
        span = {}
        for label in ("start", "end"):
            span[label] = {key: item[label][key] for key in ("line", "col")}
            if any(type(value) is not int or value < 1 for value in span[label].values()):
                raise ValueError("invalid span")
        severity = item["extra"]["severity"]
        if severity not in {"INFO", "WARNING", "ERROR"}:
            raise ValueError("invalid severity")
        findings.append({"checkId": check_id, "path": path.relative_to(root).as_posix(), **span,
                         "severity": severity, "message": messages[rule_id]})
    return findings


def scan(data: dict) -> dict:
    output = result()
    try:
        root, files = selected_files(data)
        target = Path(data["target"])
        target = target if target.is_absolute() else root / target
        if Path(tempfile.gettempdir()).resolve().is_relative_to(target):
            invalid("temporary_scope", "The selected target must not contain the host temporary directory.")
        binary = executable(root)
        source, effective, messages = effective_rules()
        output["rules"].update(sourceSha256=hashlib.sha256(source).hexdigest(), effectiveSha256=hashlib.sha256(effective).hexdigest())
        # Keep scratch names short: Windows Semgrep's OCaml socketpair can
        # exceed its native path bound under an already nested host TEMP.
        with tempfile.TemporaryDirectory(prefix="sg-") as temporary:
            scratch = Path(temporary)
            env = child_environment(binary, scratch, root)
            code, version = invoke([str(binary), "--version", "--metrics", "off", "--disable-version-check"], scratch, env)
            version = version.strip()
            if code != 0 or not re.fullmatch(r"\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.]+)?", version):
                raise ScanError("unavailable", "semgrep_version", "The installed Semgrep version could not be read; raw diagnostics were withheld.")
            output["runtime"]["semgrepVersion"] = version
            config = scratch / "local-security.yml"
            config.write_bytes(effective)
            command = [str(binary), "scan", "--config", str(config), "--metrics", "off", "--disable-version-check",
                       "--no-git-ignore", "--x-ignore-semgrepignore-files", "--json", "--jobs", "1", "--", *map(str, files)]
            code, raw = invoke(command, scratch, env)
            payload = json.loads(raw)
            output["findings"] = normalize(payload, root, files, messages)
            if code != 0:
                raise ScanError("failed", "semgrep_exit", "Semgrep failed; raw diagnostics were withheld.")
            coverage = payload.get("paths", {})
            if not isinstance(coverage, dict) or not isinstance(coverage.get("skipped", []), list):
                raise ValueError("invalid Semgrep coverage")
            if payload["errors"] or coverage.get("skipped"):
                raise ScanError("partial", "semgrep_incomplete", "Semgrep reported errors or skipped selected files; findings are incomplete.")
            scanned = coverage.get("scanned")
            if not isinstance(scanned, list) or len(scanned) != len(files) or set(scanned) != set(map(str, files)):
                raise ScanError("partial", "semgrep_coverage", "Semgrep did not confirm scanning every selected file; findings are incomplete.")
            output.update(status="completed", completed=True)
    except ScanError as exc:
        output["status"] = exc.status
        output["errors"] = [{"code": exc.code, "message": exc.message}]
    except (OSError, ValueError, KeyError, TypeError, UnicodeError, subprocess.SubprocessError):
        output["errors"] = [{"code": "scan_failed", "message": "The local scan could not complete; raw paths, code and diagnostics were withheld."}]
    return output


class Parser(argparse.ArgumentParser):
    def error(self, _message: str) -> None:
        invalid("arguments", "Use --input-json - or explicit --workspace-root and --target, without extra arguments.")


def input_data(argv: list[str]) -> dict:
    parser = Parser(add_help=False)
    parser.add_argument("--input-json", choices=["-"])
    parser.add_argument("--workspace-root")
    parser.add_argument("--target")
    parser.add_argument("--rules")
    args = parser.parse_args(argv)
    if args.input_json:
        if any((args.workspace_root, args.target, args.rules)):
            invalid("arguments", "JSON and named input modes cannot be combined.")
        raw = sys.stdin.buffer.read(32769)
        if len(raw) > 32768:
            invalid("input_size", "Input JSON must be at most 32 KiB.")
        def unique(pairs: list) -> dict:
            value = {}
            for key, item in pairs:
                if key in value:
                    invalid("input_shape", "Duplicate JSON keys are not accepted.")
                value[key] = item
            return value
        try:
            return json.loads(raw, object_pairs_hook=unique)
        except (ValueError, UnicodeError):
            invalid("input_json", "Input must be valid UTF-8 JSON.")
    data = {"schemaVersion": 1, "workspaceRoot": args.workspace_root, "target": args.target}
    if args.rules is not None:
        data["rules"] = args.rules
    return data


def main(argv: list[str]) -> int:
    try:
        output = scan(input_data(argv))
    except ScanError as exc:
        output = result()
        output["status"] = exc.status
        output["errors"] = [{"code": exc.code, "message": exc.message}]
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(output, ensure_ascii=False))
    return 0 if output["completed"] else 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
