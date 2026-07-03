# Changelog

## Unreleased

### Added

- Added runtime-native skill package directories for Claude Code and Codex:
  `.claude/skills/agent-teams-playbook/` and `.agents/skills/agent-teams-playbook/`.
- Added Codex config metadata in `.codex/config.toml`.
- Added `NOTICE` for release and package metadata.

### Changed

- Updated the install script to prefer the target runtime package directory when
  installing locally or from GitHub, while keeping the root `SKILL.md` fallback
  for runtimes without a dedicated package tree.
