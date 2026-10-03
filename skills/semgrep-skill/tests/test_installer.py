from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import unittest
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
RECEIPT = ".semgrep-skill-receipt.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class InstallerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_root = ROOT / "tests" / ".tmp"
        self.temporary_root.mkdir(exist_ok=True)
        self.temp = self.temporary_root / f"case-{uuid.uuid4().hex}"
        self.temp.mkdir()
        self.source = self.temp / "component"
        (self.source / "scripts").mkdir(parents=True)
        (self.source / "rules").mkdir()
        for relative in ("SKILL.md", "capability.json", "rules/local-security.yml", "scripts/install.py", "scripts/scan.py"):
            destination = self.source / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, destination)
        self.project = self.temp / "project"
        self.project.mkdir()
        self.target = self.project / ".claude" / "skills" / "semgrep-skill"

    def tearDown(self) -> None:
        shutil.rmtree(self.temp, ignore_errors=True)
        try:
            self.temporary_root.rmdir()
        except OSError:
            pass

    def run_installer(
        self, *extra: str, env: dict[str, str] | None = None
    ) -> subprocess.CompletedProcess[str]:
        command = [
            sys.executable,
            str(self.source / "scripts" / "install.py"),
            "--scope",
            "project",
            "--project-root",
            str(self.project),
            *extra,
        ]
        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env=env,
        )

    def install(self) -> dict[str, object]:
        completed = self.run_installer("--apply")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(completed.stdout)

    def test_default_is_dry_run_and_does_not_create_target(self) -> None:
        completed = self.run_installer()
        self.assertEqual(completed.returncode, 0, completed.stderr)
        result = json.loads(completed.stdout)
        self.assertEqual(result["mode"], "dry-run")
        self.assertFalse(self.target.exists())
        self.assertFalse((self.project / ".claude" / "skills" / "code-security").exists())

    def test_apply_receipts_actual_target_hashes(self) -> None:
        result = self.install()
        receipt = json.loads((self.target / RECEIPT).read_text(encoding="utf-8"))
        self.assertEqual(result["targetHash"], receipt["targetHash"])
        self.assertEqual(receipt["target"], str(self.target))
        self.assertEqual(receipt["scope"], "project")
        self.assertEqual(receipt["componentVersion"], "1.1.0")
        self.assertTrue((self.target / "scripts" / "scan.py").is_file())
        completed = subprocess.run([sys.executable, str(self.target / "scripts" / "scan.py"), "--input-json", "-"], input="{}", capture_output=True, text=True)
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(json.loads(completed.stdout)["status"], "invalid_input")
        for item in receipt["files"]:
            self.assertEqual(item["sha256"], sha256(self.target / item["path"]))
        self.assertNotIn("code-security", str(self.target))

    def test_upgrade_keeps_previous_install_and_can_roll_back(self) -> None:
        first = self.install()
        original_hash = first["targetHash"]
        with (self.source / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\nupgrade-test\n")
        second = self.install()
        self.assertNotEqual(second["targetHash"], original_hash)
        backup = Path(str(second["backupPath"]))
        self.assertTrue(backup.is_dir())
        self.assertEqual(
            json.loads((backup / RECEIPT).read_text(encoding="utf-8"))["targetHash"],
            original_hash,
        )

        rolled_back = self.run_installer("--rollback", "--apply")
        self.assertEqual(rolled_back.returncode, 0, rolled_back.stderr)
        result = json.loads(rolled_back.stdout)
        self.assertEqual(result["targetHash"], original_hash)

    def test_receipt_failure_leaves_previous_install_unchanged(self) -> None:
        first = self.install()
        before = first["targetHash"]
        with (self.source / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\nreceipt-failure-test\n")
        environment = os.environ.copy()
        environment["SEMGREP_SKILL_TEST_FAIL_RECEIPT_WRITE"] = "1"
        failed = self.run_installer("--apply", env=environment)
        self.assertEqual(failed.returncode, 2)
        after = json.loads((self.target / RECEIPT).read_text(encoding="utf-8"))["targetHash"]
        self.assertEqual(after, before)
        self.assertFalse((self.target.parent / ".semgrep-skill-backups").exists())

    def test_final_install_verification_failure_restores_previous_install(self) -> None:
        first = self.install()
        before = first["targetHash"]
        with (self.source / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\nfinal-verification-failure-test\n")
        environment = os.environ.copy()
        environment["SEMGREP_SKILL_TEST_FAIL_FINAL_VERIFY"] = "1"
        failed = self.run_installer("--apply", env=environment)
        self.assertEqual(failed.returncode, 2)
        after = json.loads((self.target / RECEIPT).read_text(encoding="utf-8"))["targetHash"]
        self.assertEqual(after, before)

    def test_final_rollback_verification_failure_restores_both_versions(self) -> None:
        first = self.install()
        original_hash = first["targetHash"]
        with (self.source / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\nrollback-verification-failure-test\n")
        second = self.install()
        current_hash = second["targetHash"]
        backup = Path(str(second["backupPath"]))

        environment = os.environ.copy()
        environment["SEMGREP_SKILL_TEST_FAIL_FINAL_VERIFY"] = "1"
        failed = self.run_installer("--rollback", "--apply", env=environment)
        self.assertEqual(failed.returncode, 2)
        self.assertEqual(
            json.loads((self.target / RECEIPT).read_text(encoding="utf-8"))["targetHash"],
            current_hash,
        )
        self.assertEqual(
            json.loads((backup / RECEIPT).read_text(encoding="utf-8"))["targetHash"],
            original_hash,
        )

    def test_unknown_content_refuses_upgrade(self) -> None:
        self.install()
        rogue = self.target / "unknown.txt"
        rogue.write_text("do not overwrite", encoding="utf-8")
        failed = self.run_installer("--apply")
        self.assertEqual(failed.returncode, 2)
        self.assertIn("unknown", failed.stderr.lower())
        self.assertEqual(rogue.read_text(encoding="utf-8"), "do not overwrite")

    def test_broken_link_at_target_is_refused(self) -> None:
        self.target.parent.mkdir(parents=True)
        outside = self.temp / "missing-outside-target"
        try:
            os.symlink(outside, self.target, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            self.skipTest(f"directory symlinks are unavailable: {exc}")

        failed = self.run_installer("--apply")
        self.assertEqual(failed.returncode, 2)
        self.assertIn("linked target path", failed.stderr.lower())
        self.assertFalse(outside.exists())

    def test_semgrep_is_never_installed_by_installer(self) -> None:
        sources = "\n".join(
            (ROOT / relative).read_text(encoding="utf-8")
            for relative in ("install.ps1", "install.sh", "scripts/install.py")
        )
        self.assertNotIn("pip install", sources)
        self.assertNotIn("subprocess", (ROOT / "scripts" / "install.py").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
