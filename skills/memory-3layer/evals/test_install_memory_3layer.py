#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Deterministic installer acceptance tests (stdlib only)."""

from __future__ import annotations

import json
import hashlib
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


sys.dont_write_bytecode = True
SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_ROOT = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_ROOT))

from install_memory_3layer import (  # noqa: E402
    HOOK_FILES,
    LEGACY_OWNED_FILES,
    LAUNCHER,
    _file_map,
    _is_managed_handler,
    install,
    resolve_platform,
)


def tree_bytes(root: Path) -> dict[str, bytes]:
    result: dict[str, bytes] = {}
    for path in sorted(root.rglob("*")):
        if path.is_file():
            result[path.relative_to(root).as_posix()] = path.read_bytes()
    return result


def managed_handlers(config: dict, platform: str) -> list[dict]:
    result: list[dict] = []
    for groups in config.get("hooks", {}).values():
        if not isinstance(groups, list):
            continue
        for group in groups:
            if not isinstance(group, dict):
                continue
            for handler in group.get("hooks", []):
                if _is_managed_handler(handler, platform):
                    result.append(handler)
    return result


class InstallerContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="memory-3layer-install-")
        self.project = Path(self.temp.name)
        self.env = mock.patch.dict(os.environ, {"MEMORY_DIR": ""})
        self.env.start()

    def tearDown(self) -> None:
        self.env.stop()
        self.temp.cleanup()

    def test_auto_detection_has_explicit_manual_fallback(self) -> None:
        self.assertEqual(resolve_platform("auto", lambda name: None), "manual")
        self.assertEqual(
            resolve_platform("auto", lambda name: f"/{name}" if name == "claude" else None),
            "claude",
        )
        self.assertEqual(
            resolve_platform("auto", lambda name: f"/{name}" if name == "codex" else None),
            "codex",
        )
        self.assertEqual(resolve_platform("auto", lambda name: f"/{name}"), "both")

    def test_installed_adapter_binds_client_independently_of_the_model(self) -> None:
        install(self.project, "claude")
        config = json.loads((self.project / ".claude" / "settings.json").read_text(encoding="utf-8"))
        self.assertTrue(all(item["command"].endswith(" claude") for item in managed_handlers(config, "claude")))
        script = ".claude/hooks/memory-3layer/memory_extractor.py"
        result = subprocess.run([sys.executable, "-c", LAUNCHER, script, "claude"],
                                input=json.dumps({"model": "MiniMax-M2.5", "memory_fact": "This project keeps client and model separate."}), cwd=self.project,
                                capture_output=True, text=True, encoding="utf-8", check=False,
                                env={**os.environ, "MEMORY_HOST": ""})
        self.assertEqual(result.returncode, 0, result.stderr)
        context = json.loads(result.stdout)["hookSpecificOutput"]["additionalContext"]
        self.assertIn("runtime=claude;", context)
        self.assertIn("runtime_evidence=not-observed", context)

    def test_cli_requires_project_dir_before_any_write(self) -> None:
        installer = SCRIPTS_ROOT / "install_memory_3layer.py"
        result = subprocess.run(
            [sys.executable, str(installer), "--platform", "manual"],
            cwd=self.project,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertFalse((self.project / ".memory-3layer").exists())

    def test_subdirectory_target_normalizes_to_git_root(self) -> None:
        git_project = self.project / "中文项目"
        git_project.mkdir()
        subprocess.run(["git", "init", "-q", str(git_project)], check=True)
        nested = git_project / "子目录" / "b"
        nested.mkdir(parents=True)
        report = install(nested, "manual")
        self.assertEqual(Path(report["project_dir"]), git_project.resolve())
        self.assertTrue((git_project / ".memory-3layer" / "MEMORY.md").is_file())
        self.assertFalse((nested / ".memory-3layer").exists())

    def test_both_platforms_preserve_config_project_full_skill_and_are_idempotent(self) -> None:
        claude_config = self.project / ".claude" / "settings.json"
        codex_config = self.project / ".codex" / "hooks.json"
        claude_config.parent.mkdir(parents=True)
        codex_config.parent.mkdir(parents=True)
        claude_config.write_text(
            json.dumps(
                {
                    "theme": "keep-me",
                    "hooks": {
                        "SessionStart": [
                            {"hooks": [{"type": "command", "command": "echo keep-claude"}]}
                        ]
                    },
                }
            ),
            encoding="utf-8",
        )
        codex_config.write_text(
            json.dumps(
                {
                    "custom": {"preserve": True},
                    "hooks": {
                        "Stop": [{"hooks": [{"type": "command", "command": "echo keep-codex"}]}]
                    },
                }
            ),
            encoding="utf-8",
        )
        (self.project / ".gitignore").write_text("node_modules/\n", encoding="utf-8")

        first = install(self.project, "both")
        first_tree = tree_bytes(self.project)
        second = install(self.project, "both")
        second_tree = tree_bytes(self.project)
        self.assertEqual(first_tree, second_tree)
        self.assertFalse(second["gitignore_changed"])

        claude = json.loads(claude_config.read_text(encoding="utf-8"))
        codex = json.loads(codex_config.read_text(encoding="utf-8"))
        self.assertEqual(claude["theme"], "keep-me")
        self.assertTrue(codex["custom"]["preserve"])
        self.assertIn("echo keep-claude", claude_config.read_text(encoding="utf-8"))
        self.assertIn("echo keep-codex", codex_config.read_text(encoding="utf-8"))

        claude_owned = managed_handlers(claude, "claude")
        codex_owned = managed_handlers(codex, "codex")
        self.assertEqual(len(claude_owned), 3)
        self.assertEqual(len(codex_owned), 3)
        self.assertEqual(len({item["command"] for item in claude_owned}), 3)
        self.assertEqual(len({item["command"] for item in codex_owned}), 3)
        self.assertTrue(all("commandWindows" in item for item in codex_owned))
        self.assertTrue(all("git','rev-parse','--show-toplevel" in item["command"] for item in codex_owned))

        for platform in ("claude", "codex"):
            runtime_hooks = self.project / f".{platform}" / "hooks" / "memory-3layer"
            self.assertEqual({path.name for path in runtime_hooks.glob("*.py")}, set(HOOK_FILES))
            projection = self.project / f".{platform}" / "skills" / "memory-3layer"
            self.assertEqual(_file_map(projection), _file_map(SKILL_ROOT))

        backups = self.project / ".memory-3layer" / "data" / "backups"
        self.assertTrue((backups / "claude-hooks-config.json").is_file())
        self.assertTrue((backups / "codex-hooks-config.json").is_file())
        ignore = (self.project / ".gitignore").read_text(encoding="utf-8")
        self.assertEqual(ignore.count("# >>> memory-3layer runtime state"), 1)
        self.assertIn("/.memory-3layer/data/", ignore)
        self.assertNotIn("/.memory-3layer/backups/", ignore)
        self.assertEqual(first["selected_platform"], "both")

    def test_invalid_second_config_causes_zero_writes(self) -> None:
        claude_config = self.project / ".claude" / "settings.json"
        codex_config = self.project / ".codex" / "hooks.json"
        claude_config.parent.mkdir(parents=True)
        codex_config.parent.mkdir(parents=True)
        claude_config.write_text('{"keep": true}\n', encoding="utf-8")
        codex_config.write_text("{invalid", encoding="utf-8")
        before = tree_bytes(self.project)
        with self.assertRaises(ValueError):
            install(self.project, "both")
        self.assertEqual(tree_bytes(self.project), before)
        self.assertFalse((self.project / ".memory-3layer").exists())

    def test_unrelated_skill_conflict_causes_zero_writes(self) -> None:
        target = self.project / ".claude" / "skills" / "memory-3layer"
        target.mkdir(parents=True)
        (target / "SKILL.md").write_text("---\nname: unrelated\n---\n", encoding="utf-8")
        before = tree_bytes(self.project)
        with self.assertRaises(ValueError):
            install(self.project, "claude")
        self.assertEqual(tree_bytes(self.project), before)
        self.assertFalse((self.project / ".memory-3layer").exists())

    def test_non_git_launcher_falls_back_to_ancestor_scan(self) -> None:
        non_git_project = self.project / "非Git项目"
        non_git_project.mkdir()
        install(non_git_project, "codex")
        config = json.loads(
            (non_git_project / ".codex" / "hooks.json").read_text(encoding="utf-8")
        )
        handler = managed_handlers(config, "codex")[0]
        command = handler.get("commandWindows") if os.name == "nt" else handler["command"]
        nested = non_git_project / "嵌套" / "cwd"
        nested.mkdir(parents=True)
        result = subprocess.run(
            command,
            cwd=nested,
            input='{"hook_event_name":"SessionStart","source":"startup"}',
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            shell=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIsInstance(json.loads(result.stdout), dict)

    def test_legacy_claude_hooks_upgrade_to_one_active_set(self) -> None:
        config_path = self.project / ".claude" / "settings.json"
        config_path.parent.mkdir(parents=True)
        config_path.write_text(
            json.dumps(
                {
                    "keep": True,
                    "hooks": {
                        event: [
                            {
                                "matcher": "",
                                "hooks": [{"type": "command", "command": f"python {marker}"}],
                            }
                        ]
                        for event, marker in {
                            "SessionStart": ".claude/hooks/memory_loader.py",
                            "PostToolUse": ".claude/hooks/memory_extractor.py",
                            "PreCompact": ".claude/hooks/pre_compact.py",
                        }.items()
                    },
                }
            ),
            encoding="utf-8",
        )
        owned = self.project / ".claude" / "hooks" / "memory_loader.py"
        customized = self.project / ".claude" / "hooks" / "session_state.py"
        owned.parent.mkdir(parents=True)
        owned.write_text("legacy-owned\n", encoding="utf-8")
        customized.write_text("user-customized\n", encoding="utf-8")
        legacy_memory = self.project / ".claude" / "memory" / "MEMORY.md"
        legacy_memory.parent.mkdir(parents=True)
        legacy_memory.write_text("preserve me\n", encoding="utf-8")
        owned_hash = hashlib.sha256(owned.read_bytes()).hexdigest()

        with mock.patch.dict(
            LEGACY_OWNED_FILES,
            {
                ".claude/hooks/memory_loader.py": owned_hash,
                ".claude/hooks/session_state.py": "0" * 64,
            },
            clear=True,
        ):
            report = install(self.project, "claude")

        config = json.loads(config_path.read_text(encoding="utf-8"))
        rendered = json.dumps(config)
        self.assertTrue(config["keep"])
        self.assertNotIn(".claude/hooks/memory_loader.py", rendered)
        self.assertEqual(len(managed_handlers(config, "claude")), 3)
        self.assertFalse(owned.exists())
        self.assertTrue(customized.is_file())
        self.assertTrue(legacy_memory.is_file())
        upgrade = report["adapters"]["claude"]["legacy_upgrade"]
        self.assertTrue(upgrade["detected"])
        self.assertIn(".claude/hooks/memory_loader.py", upgrade["removed"])
        self.assertIn(".claude/hooks/session_state.py", upgrade["preserved"])

    def test_powershell_wrapper_requires_and_forwards_project_dir(self) -> None:
        pwsh = shutil.which("pwsh")
        if not pwsh:
            self.skipTest("pwsh is not available")
        wrapper = SKILL_ROOT / "install.ps1"
        missing = subprocess.run(
            [pwsh, "-NoProfile", "-File", str(wrapper), "-Platform", "manual"],
            cwd=self.project,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertNotEqual(missing.returncode, 0)
        self.assertFalse((self.project / ".memory-3layer").exists())
        installed = subprocess.run(
            [
                pwsh,
                "-NoProfile",
                "-File",
                str(wrapper),
                "-ProjectDir",
                str(self.project),
                "-Platform",
                "manual",
            ],
            cwd=self.project,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        self.assertEqual(installed.returncode, 0, installed.stderr)
        self.assertTrue(json.loads(installed.stdout)["success"])

    def test_shell_wrapper_syntax_and_explicit_target_contract(self) -> None:
        wrapper = SKILL_ROOT / "install.sh"
        text = wrapper.read_text(encoding="utf-8")
        self.assertIn('--project-dir is required', text)
        self.assertIn('--project-dir "$project_dir"', text)
        bash = shutil.which("bash")
        if bash and os.name != "nt":
            result = subprocess.run(
                [bash, "-n", str(wrapper)], capture_output=True, text=True, check=False
            )
            self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
