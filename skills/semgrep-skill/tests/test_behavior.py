from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class BehaviorContractTests(unittest.TestCase):
    def test_skill_contract_is_offline_read_only(self) -> None:
        text = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("name: semgrep-skill", text)
        self.assertIn('rules/local-security.yml', text)
        self.assertIn("--metrics off", text)
        self.assertIn("--disable-version-check", text)
        self.assertIn("Do not use `--config auto`", text)
        self.assertIn("Do not use `--autofix`", text)
        self.assertNotIn("pip install semgrep", text)

    def test_bundled_rules_find_vulnerable_fixture_only(self) -> None:
        semgrep = shutil.which("semgrep")
        if not semgrep:
            self.skipTest("Semgrep is not installed")

        target = ROOT / "tests" / "fixtures"
        before = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in target.iterdir()}
        command = [sys.executable, str(ROOT / "scripts" / "scan.py"), "--input-json", "-"]
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=150,
            input=json.dumps({"schemaVersion": 1, "workspaceRoot": str(ROOT), "target": "tests/fixtures"}),
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["status"], "completed")
        self.assertTrue(payload["completed"])
        self.assertFalse(payload["networkUsed"])
        self.assertFalse(payload["filesModified"])
        self.assertRegex(payload["runtime"]["semgrepVersion"], r"^\d+\.\d+\.\d+")
        findings = payload["findings"]
        ids = {finding["checkId"].split(".")[-1] for finding in findings}
        paths = {Path(finding["path"]).name for finding in findings}
        self.assertEqual(ids, {"python-subprocess-shell-true", "javascript-eval"})
        self.assertEqual(paths, {"vulnerable.py", "vulnerable.js"})
        self.assertNotIn("safe.py", paths)
        self.assertNotIn("dummy-password-for-test-only", completed.stdout)
        self.assertNotIn("generic-hardcoded-secret", completed.stdout)
        self.assertEqual(payload["rules"]["sourceSha256"], hashlib.sha256((ROOT / "rules" / "local-security.yml").read_bytes()).hexdigest())
        self.assertEqual(before, {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in target.iterdir()})


if __name__ == "__main__":
    unittest.main()
