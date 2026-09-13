from __future__ import annotations

import json
import os
import shutil
import subprocess
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

        command = [
            semgrep,
            "scan",
            "--config",
            str(ROOT / "rules" / "local-security.yml"),
            "--metrics",
            "off",
            "--disable-version-check",
            "--no-git-ignore",
            "--x-ignore-semgrepignore-files",
            "--json",
            str(ROOT / "tests" / "fixtures"),
        ]
        environment = os.environ.copy()
        environment["SEMGREP_SEND_METRICS"] = "off"
        environment["SEMGREP_ENABLE_VERSION_CHECK"] = "0"
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=60,
            env=environment,
        )
        self.assertIn(completed.returncode, (0, 1), completed.stderr)
        payload = json.loads(completed.stdout)
        findings = payload.get("results", [])
        ids = {finding["check_id"].split(".")[-1] for finding in findings}
        paths = {Path(finding["path"]).name for finding in findings}
        self.assertIn("generic-hardcoded-secret", ids)
        self.assertIn("python-subprocess-shell-true", ids)
        self.assertIn("vulnerable.py", paths)
        self.assertNotIn("safe.py", paths)


if __name__ == "__main__":
    unittest.main()
