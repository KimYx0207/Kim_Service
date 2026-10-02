"""Offline installer regressions. No real user home, network, or model calls.

Bash behavior runs on Linux/macOS. Native Windows explicitly skips it; the
cross-platform Node suite still checks the package/host contract on Windows.
"""
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import tempfile
import time
import unittest

PACKAGE = Path(__file__).resolve().parents[1]
NAME = "agent-teams-playbook"


@unittest.skipIf(os.name == "nt", "Bash installer behavior is tested on Linux/macOS, not native Windows")
class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="playbook-installer-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.package = self.root / "checkout"
        shutil.copytree(PACKAGE, self.package)
        self.home = self.root / "home"
        self.home.mkdir()
        self.skills = self.home / "skills with spaces"
        self.target = self.skills / NAME
        self.bin = self.root / "bin"
        self.bin.mkdir()
        self.env = {**os.environ, "HOME": str(self.home), "CODEX_SKILLS_DIR": str(self.skills),
                    "CLAUDE_SKILLS_DIR": str(self.home / ".claude/skills"),
                    "OPENCLAW_SKILLS_DIR": str(self.home / ".agents/skills"),
                    "CURSOR_SKILLS_DIR": str(self.home / ".cursor/skills"),
                    "PATH": str(self.bin) + os.pathsep + os.environ["PATH"]}
        self.old = b"---\nname: agent-teams-playbook\n---\nUser-edited old skill\n"
        self.script = self.package / "scripts/install.sh"

    def existing(self):
        self.target.mkdir(parents=True)
        (self.target / "SKILL.md").write_bytes(self.old)
        (self.target / "README.md").write_text("old readme\n")
        (self.target / "personal-notes.txt").write_text("keep my notes\n")

    def run_install(self, args=(), answer="y\n", target="codex", env=None):
        return subprocess.run(["bash", str(self.script), "--target", target, *args],
                              input=answer, capture_output=True, text=True, timeout=30,
                              env={**self.env, **(env or {})})

    def mock(self, name, body):
        path = self.bin / name
        path.write_text("#!/usr/bin/env bash\nset -e\n" + body + "\n")
        path.chmod(0o755)

    def assert_old(self):
        self.assertEqual((self.target / "SKILL.md").read_bytes(), self.old)
        self.assertEqual((self.target / "personal-notes.txt").read_text(), "keep my notes\n")

    def assert_clean(self):
        self.assertEqual(list(self.skills.glob(f".{NAME}.stage.*")), [])
        self.assertFalse((self.skills / f".{NAME}.install-lock").exists())

    def test_missing_second_file_leaves_existing_install_unchanged(self):
        self.existing()
        (self.package / "README.md").unlink()
        result = self.run_install()
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assert_old()
        self.assert_clean()

    def test_failed_download_leaves_existing_install_unchanged(self):
        self.existing()
        self.mock("curl", "exit 22")
        result = self.run_install(["--from-github"])
        self.assertNotEqual(result.returncode, 0)
        self.assert_old()
        self.assert_clean()

    def test_second_download_failure_cleans_partial_stage(self):
        self.existing()
        self.mock("curl", 'if [[ "$4" == */README.md ]]; then exit 22; fi\nprintf "%s\\n" "---" "name: agent-teams-playbook" "---" > "$3"')
        result = self.run_install(["--from-github"])
        self.assertNotEqual(result.returncode, 0)
        self.assert_old()
        self.assert_clean()

    def test_empty_or_wrong_package_never_replaces_old_install(self):
        for text in ["", "<html>gateway error</html>\n"]:
            with self.subTest(content=text):
                if not self.target.exists():
                    self.existing()
                (self.package / "SKILL.md").write_text(text)
                self.assertNotEqual(self.run_install().returncode, 0)
                self.assert_old()
                self.assert_clean()

    def test_repeated_install_preserves_user_edits_and_additions_in_backup(self):
        self.existing()
        result = self.run_install()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        backups = list(self.skills.glob(f".{NAME}.backup.*/previous"))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / "SKILL.md").read_bytes(), self.old)
        self.assertTrue((backups[0] / "personal-notes.txt").is_file())
        self.assertEqual((self.target / "SKILL.md").read_bytes(), (self.package / "SKILL.md").read_bytes())
        self.assertEqual(self.run_install().returncode, 0)
        self.assertEqual(len(list(self.skills.glob(f".{NAME}.backup.*/previous"))), 2)
        self.assert_clean()

    def test_decline_or_eof_preserves_user_changes(self):
        self.existing()
        for answer in ["n\n", ""]:
            self.assertNotEqual(self.run_install(answer=answer).returncode, 0)
            self.assert_old()
            self.assert_clean()
        self.assertEqual(list(self.skills.glob(f".{NAME}.backup.*")), [])

    def test_failed_promotion_restores_old_install(self):
        self.existing()
        real_mv = shlex.quote(shutil.which("mv"))
        self.mock("mv", f'if [[ "$1" == *.stage.* ]]; then exit 71; fi\nexec {real_mv} "$@"')
        result = self.run_install()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("restored", result.stderr)
        self.assert_old()
        self.assert_clean()

    def test_failed_final_verification_restores_old_install(self):
        self.existing()
        real_mv = shlex.quote(shutil.which("mv"))
        self.mock("mv", f'{real_mv} "$@"\nif [[ "$1" == *.stage.* ]]; then : > "$2/README.md"; fi')
        result = self.run_install()
        self.assertNotEqual(result.returncode, 0)
        self.assert_old()
        self.assert_clean()

    def test_first_install_final_failure_does_not_leave_broken_target(self):
        real_mv = shlex.quote(shutil.which("mv"))
        self.mock("mv", f'{real_mv} "$@"\nif [[ "$1" == *.stage.* ]]; then : > "$2/README.md"; fi')
        self.assertNotEqual(self.run_install().returncode, 0)
        self.assertFalse(self.target.exists())
        self.assert_clean()

    def test_symlink_target_or_ancestor_is_rejected_without_touching_external_files(self):
        external = self.root / "external"
        external.mkdir()
        marker = external / "keep.txt"
        marker.write_text("untouched")
        self.skills.mkdir()
        self.target.symlink_to(external, target_is_directory=True)
        self.assertNotEqual(self.run_install().returncode, 0)
        self.target.unlink()
        self.skills.rmdir()
        self.skills.symlink_to(external, target_is_directory=True)
        self.assertNotEqual(self.run_install().returncode, 0)
        self.assertEqual(list(external.iterdir()), [marker])
        self.assertEqual(marker.read_text(), "untouched")

    def test_relative_traversal_and_filesystem_root_are_rejected(self):
        for root in ["relative", str(self.home / ".." / "escape"), "/"]:
            with self.subTest(root=root):
                result = self.run_install(env={"CODEX_SKILLS_DIR": root})
                self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / "escape").exists())

    def test_symlink_source_is_rejected(self):
        self.existing()
        (self.package / "README.md").unlink()
        (self.package / "README.md").symlink_to(self.target / "README.md")
        self.assertNotEqual(self.run_install().returncode, 0)
        self.assert_old()
        self.assert_clean()

    def test_concurrent_installer_lock_does_not_touch_existing_install(self):
        self.existing()
        lock = self.skills / f".{NAME}.install-lock"
        lock.mkdir()
        self.assertNotEqual(self.run_install().returncode, 0)
        self.assert_old()
        self.assertTrue(lock.exists())

    def test_all_targets_only_write_selected_sandbox_paths(self):
        result = self.run_install(target="all", answer="n\n")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        for root in [self.skills, self.home / ".claude/skills", self.home / ".agents/skills", self.home / ".cursor/skills"]:
            self.assertTrue((root / NAME / "SKILL.md").is_file())
        self.assertEqual(sorted(p.name for p in self.home.iterdir()), [".agents", ".claude", ".cursor", "skills with spaces"])

    def test_claude_fork_configuration_occurs_before_promotion(self):
        result = self.run_install(target="claude", answer="y\n")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("context: fork", (self.home / ".claude/skills" / NAME / "SKILL.md").read_text())

    def test_signal_immediately_after_backup_or_promotion_restores_old_install(self):
        self.existing()
        real_mv = shlex.quote(shutil.which("mv"))
        for signal in ["TERM", "INT"]:
            for phase, condition in [("backup", '"$2" == */previous'), ("promotion", '"$1" == *.stage.*')]:
                with self.subTest(phase=phase, signal=signal):
                    self.mock("mv", f'{real_mv} "$@"\nif [[ {condition} ]]; then kill -{signal} "$PPID"; fi')
                    result = self.run_install()
                    self.assertNotEqual(result.returncode, 0)
                    self.assert_old()
                    self.assert_clean()

    def test_signal_at_commit_boundary_keeps_a_complete_active_install(self):
        self.existing()
        original = self.script.read_text()
        marker = "    TX_COMMITTED=1\n"
        self.assertEqual(original.count(marker), 1)
        # Instrument only this temporary test copy, at deterministic boundaries.
        for phase in ["before", "after"]:
            with self.subTest(phase=phase):
                signal = '    kill -TERM "$$"\n'
                replacement = signal + marker if phase == "before" else marker + signal
                self.script.write_text(original.replace(marker, replacement))
                result = self.run_install()
                self.assertNotEqual(result.returncode, 0)
                if phase == "before":
                    self.assert_old()
                else:
                    self.assertEqual((self.target / "SKILL.md").read_bytes(), (self.package / "SKILL.md").read_bytes())
                    backups = list(self.skills.glob(f".{NAME}.backup.*/previous"))
                    self.assertEqual(len(backups), 1)
                    self.assertEqual((backups[0] / "SKILL.md").read_bytes(), self.old)
                    self.assertTrue((backups[0] / "personal-notes.txt").exists())
                self.assert_clean()

    def test_two_real_processes_cannot_replace_or_unlock_each_other(self):
        self.existing()
        ready, release = self.root / "ready", self.root / "release"
        self.mock("curl", 'touch "$PROBE_READY"\nwhile [ ! -e "$PROBE_RELEASE" ]; do sleep 0.05; done\nexit 22')
        first = subprocess.Popen(["bash", str(self.script), "--target", "codex", "--from-github"],
                                 stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, env={**self.env, "PROBE_READY": str(ready), "PROBE_RELEASE": str(release)})
        try:
            deadline = time.monotonic() + 10
            while not ready.exists() and time.monotonic() < deadline:
                if first.poll() is not None:
                    self.fail("first installer exited before acquiring the lock")
                time.sleep(0.02)
            self.assertTrue(ready.exists(), "first installer did not reach blocked download")
            self.assertNotEqual(self.run_install().returncode, 0)
            self.assertTrue((self.skills / f".{NAME}.install-lock").is_dir())
            self.assertIsNone(first.poll())
            self.assert_old()
        finally:
            release.touch()
            first.communicate(timeout=15)
        self.assertNotEqual(first.returncode, 0)
        self.assert_old()
        self.assert_clean()

    def test_signal_during_download_preserves_old_install(self):
        self.existing()
        self.mock("curl", 'kill -TERM "$PPID"\nexit 1')
        self.assertNotEqual(self.run_install(["--from-github"]).returncode, 0)
        self.assert_old()
        self.assert_clean()


if __name__ == "__main__":
    unittest.main(verbosity=2)
