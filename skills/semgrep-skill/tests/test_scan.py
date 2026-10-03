from __future__ import annotations

import importlib.util
import io
import json
import os
import tempfile
import subprocess
import sys
import time
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("scan", ROOT / "scripts" / "scan.py")
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)


class ScanTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.target = self.root / "fixtures"
        self.target.mkdir()
        (self.target / "sample.py").write_text("print('synthetic')\n", encoding="utf-8")
        self.data = {"schemaVersion": 1, "workspaceRoot": str(self.root), "target": "fixtures"}

    def test_escape_missing_or_unbounded_input_never_starts_cli(self) -> None:
        cases = [{}, [], {**self.data, "schemaVersion": True}, {**self.data, "target": "../outside"},
                 {**self.data, "target": str(self.root.parent)}, {**self.data, "target": "missing"},
                 {**self.data, "rules": "https://remote.invalid/rules"}, {**self.data, "extra": "value"},
                 {**self.data, "workspaceRoot": str(self.root.anchor)}, {**self.data, "target": "//remote/share"}]
        with patch.object(scan, "invoke") as invocation:
            for data in cases:
                with self.subTest(data=data):
                    self.assertEqual(scan.scan(data)["status"], "invalid_input")
            invocation.assert_not_called()

    def test_linked_target_is_rejected(self) -> None:
        link = self.root / "linked"
        try:
            link.symlink_to(self.target, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("Host does not permit directory symlinks")
        self.assertEqual(scan.scan({**self.data, "target": "linked"})["status"], "invalid_input")

    def test_coverage_bound_does_not_return_clean_when_no_files_or_oversized(self) -> None:
        (self.target / "sample.py").unlink()
        self.assertEqual(scan.scan(self.data)["errors"][0]["code"], "no_eligible_files")
        (self.target / "large.py").write_bytes(b"#" * (scan.MAX_BYTES + 1))
        self.assertEqual(scan.scan(self.data)["errors"][0]["code"], "file_limit")

    def test_effective_config_never_contains_secret_rule(self) -> None:
        source, effective, messages = scan.effective_rules()
        self.assertIn(b"generic-hardcoded-secret", source)
        self.assertNotIn(b"generic-hardcoded-secret", effective)
        self.assertNotIn(b"pattern-regex", effective)
        self.assertEqual(set(messages), set(scan.RULE_IDS))

    def test_temporary_runtime_files_cannot_be_written_inside_target(self) -> None:
        with patch.object(scan.tempfile, "gettempdir", return_value=str(self.target)), patch.object(scan, "invoke") as invocation:
            self.assertEqual(scan.scan(self.data)["errors"][0]["code"], "temporary_scope")
            invocation.assert_not_called()

    def test_child_environment_drops_host_tokens_proxies_and_custom_config(self) -> None:
        polluted = {"SEMGREP_APP_TOKEN": "synthetic-token", "SEMGREP_SETTINGS_FILE": "user-settings",
                    "HTTP_PROXY": "http://example.invalid", "PYTHONPATH": "untrusted", "AWS_SECRET_ACCESS_KEY": "synthetic"}
        with patch.dict(os.environ, polluted):
            env = scan.child_environment(Path("/trusted/bin/semgrep"), self.root)
        for key in ("SEMGREP_APP_TOKEN", "HTTP_PROXY", "AWS_SECRET_ACCESS_KEY"):
            self.assertNotIn(key, env)
        self.assertNotEqual(env.get("PYTHONPATH"), "untrusted")
        self.assertEqual(env["SEMGREP_SEND_METRICS"], "off")
        self.assertEqual(env["SEMGREP_ENABLE_VERSION_CHECK"], "0")
        self.assertEqual(env["SEMGREP_SETTINGS_FILE"], str(self.root / "settings.yml"))

    def mock_run(self, response: dict, code: int = 0) -> tuple[dict, list]:
        commands = []
        def invoke(command, scratch, env):
            commands.append(command)
            self.assertFalse(any("--autofix" in arg or "--config=auto" in arg for arg in command))
            self.assertEqual(env["SEMGREP_ENABLE_VERSION_CHECK"], "0")
            if "--version" in command:
                return 0, "1.168.0\n"
            effective = Path(command[command.index("--config") + 1]).read_text(encoding="utf-8")
            self.assertNotIn("generic-hardcoded-secret", effective)
            self.assertNotIn("--error", command)
            self.assertIn("--disable-version-check", command)
            return code, json.dumps({"paths": {"scanned": [str(self.target / "sample.py")]}, **response})
        with patch.object(scan, "executable", return_value=Path("/trusted/bin/semgrep")), patch.object(scan, "invoke", side_effect=invoke):
            return scan.scan(self.data), commands

    def test_findings_are_not_execution_failure_and_source_is_not_returned(self) -> None:
        finding = {"check_id": "python-subprocess-shell-true", "path": str(self.target / "sample.py"),
                   "start": {"line": 1, "col": 1}, "end": {"line": 1, "col": 20},
                   "extra": {"severity": "ERROR", "message": "raw-source-synthetic", "lines": "raw-source-synthetic", "metavars": {}}}
        output, commands = self.mock_run({"results": [finding], "errors": []})
        self.assertEqual(output["status"], "completed")
        self.assertTrue(output["completed"])
        self.assertEqual(len(commands), 2)
        self.assertEqual(output["findings"][0]["path"], "fixtures/sample.py")
        self.assertNotIn("raw-source-synthetic", json.dumps(output))

    def test_errors_skips_bad_results_and_nonzero_are_not_clean(self) -> None:
        for response, code, expected in [({"results": [], "errors": [{"message": "private-source"}]}, 0, "partial"),
                                        ({"results": [], "errors": [], "paths": {"scanned": []}}, 0, "partial"),
                                        ({"results": [], "errors": [], "paths": {"skipped": ["private-path"]}}, 0, "partial"),
                                        ({"results": [], "errors": []}, 2, "failed"), ({"results": [{}], "errors": []}, 0, "failed"),
                                        ({"results": [], "errors": [], "paths": None}, 0, "failed"),
                                        ({"results": [], "errors": [], "paths": []}, 0, "failed"),
                                        ({"results": [], "errors": [], "paths": {"skipped": "private-path"}}, 0, "failed")]:
            output, _ = self.mock_run(response, code)
            self.assertEqual(output["status"], expected)
            self.assertFalse(output["completed"])
            self.assertNotIn("private-", json.dumps(output))

    def test_unavailable_has_null_runtime_and_no_fabricated_hashes(self) -> None:
        with patch.object(scan.shutil, "which", return_value=None):
            output = scan.scan(self.data)
        self.assertEqual(output["status"], "unavailable")
        self.assertIsNone(output["runtime"]["semgrepVersion"])
        self.assertIsNone(output["rules"]["effectiveSha256"])

    def test_output_limit_stops_a_running_process(self) -> None:
        started = time.monotonic()
        with patch.object(scan, "MAX_OUTPUT", 1024):
            with self.assertRaises(scan.ScanError) as error:
                scan.invoke([sys.executable, "-c", "import sys,time; sys.stdout.write('x'*4096); sys.stdout.flush(); time.sleep(10)"],
                            self.root, dict(os.environ))
        self.assertEqual(error.exception.code, "semgrep_output_limit")
        self.assertLess(time.monotonic() - started, 5)

    def test_windows_taskkill_failure_still_kills_and_waits(self) -> None:
        process = Mock(pid=12345)
        os_adapter = Mock(wraps=os)
        os_adapter.name = "nt"
        with patch.object(scan, "os", os_adapter), patch.object(scan.subprocess, "run", side_effect=subprocess.TimeoutExpired("taskkill", 10)):
            scan.stop_process(process, {"SystemRoot": os.environ.get("SystemRoot", "/trusted/windows")})
        process.kill.assert_called_once()
        process.wait.assert_called_once_with(timeout=10)

    def test_json_transport_rejects_duplicates_mixed_modes_and_trailing_flags(self) -> None:
        for raw in (b'{"schemaVersion":1,"schemaVersion":1}', b'{invalid', b'"' + b'x' * 32768 + b'"'):
            with patch.object(scan.sys, "stdin", io.TextIOWrapper(io.BytesIO(raw), encoding="utf-8")):
                with self.assertRaises(scan.ScanError):
                    scan.input_data(["--input-json", "-"])
        for args in (["--input-json", "-", "--target", "fixtures"], ["--autofix"], ["--help"]):
            with self.assertRaises(scan.ScanError):
                scan.input_data(args)


if __name__ == "__main__":
    unittest.main()
