# Changelog

Kim Service uses one repository-level two-part public version (`V<major>.<minor>`) and one GitHub Release for the aggregated Hook and Skill collection. Component CHANGELOG files record component provenance; this file is the release-note authority.

## Unreleased - 2026-07-18

### Affected components

- HookPrompt configuration, tests, and documentation.

### User-visible changes

- Added Chinese and English guidance explaining that `{}` is the expected skip result for short text without a clear task.
- Added a positive PowerShell verification command that passes a real task as `UserPromptSubmit` JSON through standard input.
- Clarified that positional arguments such as `node user-prompt-submit.js "test"` do not exercise the HookPrompt input protocol.
- Made Claude Code project hooks independent of the session working directory through `${CLAUDE_PROJECT_DIR}`.
- Made Codex project hooks locate the repository script from nested working directories and documented accurate `MODULE_NOT_FOUND` diagnosis.

### Breaking changes and migration

- No user-facing breaking changes.

### Verification

- HookPrompt tests passed 34/34, including Claude Code and Codex launches from the `docs/` subdirectory.
- The course task sentence returned `hookSpecificOutput` and `additionalContext` through the documented PowerShell route.

### Source revisions

- HookPrompt: `807d4b314dcbfb98baefc42b43fc7085d02ab4ba`.

## V1.1 - 2026-07-15

### Affected components

- Repository documentation and cross-platform checkout rules.
- HookPrompt, Agent Teams Playbook, Find Skill, GoalPro, Kim Decision, and Semgrep Skill packaging metadata.

### User-visible changes

- Rewrote the Chinese and English homepages to state clearly that Kim Service is a collection personally built, adapted, open-sourced, and maintained by Lao Jin (KimYx0207).
- Simplified the public README around what each project does, how to use it, where to get updates, and how to contact or support the maintainer.
- Moved catalog, content-hash, validation-gate, and release-protocol details out of the user-facing README and into `docs/maintenance.md`.
- Added repository-wide LF checkout rules so component snapshots verify consistently on Windows, macOS, and Linux.

### Breaking changes and migration

- No user-facing breaking changes.
- `V1.0` remains immutable, but fresh clones could report component hash drift when Git converted line endings on Windows. Use `V1.1` or later for a reproducible checkout and verification result.

### Verification

- Root repository, shared component runner, and release-contract checks passed after line-ending normalization.
- All six affected component hashes were recalculated from LF-normalized files; the three canonical direct-sync components remained byte-identical.
- A default Windows checkout from the remote `V1.1` tag passed the repository and component gates.
- README layout checks passed with the contact banner centered at `720px` and both `260px` payment codes centered in one row.

### Source revisions

- Component source revisions are unchanged from `V1.0`; this release changes repository documentation, checkout normalization, and packaging hashes only.

## V1.0 - 2026-07-15

### Affected components

- Hook: HookPrompt.
- Skills: Agent Teams Playbook, Memory 3-Layer, Find Skill, GoalPro, Kim Decision, Meta Skill Creator, Semgrep Skill, and Xiaohongshu Skill.

### User-visible changes

- Launched Kim Service as the consolidated public collection for one Hook and eight self-contained Skills.
- Included Agent Teams Playbook as a self-contained Skill under `skills/agent-teams-playbook`.
- Made every Skill directory independently understandable and installable with its own `SKILL.md`, README, LICENSE, CHANGELOG, NOTICE, and required runtime files.
- Standardized component verification behind one catalog-driven runner and removed component-specific validation exceptions from the root README.
- Standardized public README support visuals through one catalog-projected layout contract: the `720px` contact banner is centered independently, while the two `260px` payment codes share one centered row with centered cells.
- Replaced the residual fixed candidate-file checklist in Meta Skill Creator with conditional `core / conditional / release` rules.
- Renamed the Claude-specific memory component to platform-neutral `memory-3layer`, with one shared core, Claude Code and Codex Hook adapters, an explicit manual route, and a non-destructive legacy-data migration.
- Added direct canonical-to-Kim-Service exact projection for Meta Skill Creator, Memory 3-Layer, and Xiaohongshu Skill, with no persistent `SKILL-*` intermediary repository and no wrapper-composition layer.
- Added catalog-pinned component hashes, public-boundary checks, secret and machine-path scanning, nested-Git and runtime-projection checks, and protected QR asset verification.
- Retained the required contact QR, WeChat Pay QR, and Alipay QR assets.
- Established the exact repository release contract: `VERSION`, annotated tag, GitHub Release tag, and GitHub Release title use the same case-sensitive `V<major>.<minor>` string.

### Breaking changes and migration

- The public repository identity changes from `KimYx0207/agent-teams-playbook` to `KimYx0207/Kim_Service`. Existing clones should update `origin` to the new repository URL.
- GitHub repository-rename redirects preserve the former `KimYx0207/agent-teams-playbook` web and Git URLs; the old repository name must not be reused because doing so would disable those redirects.
- The historical lowercase `v4.8.0` tag and Release remain part of the preserved Agent Teams Playbook history. Kim Service collection releases use a separate uppercase `V<major>.<minor>` namespace beginning with `V1.0`.
- Users of former component repositories should use the corresponding `hooks/<slug>` or `skills/<slug>` path in Kim Service for current consolidated releases.
- Persistent `SKILL-*` intermediary directories and wrapper-based public export are no longer part of the Meta Skill Creator or Xiaohongshu Skill publication workflow.

### Verification

- `node scripts/check-repository.mjs` passed for 9 components, 242 repository files, and 3 protected QR assets.
- Canonical/runtime/Kim Service direct-sync and full relative-path/SHA-256 gates passed for Meta Skill Creator, Memory 3-Layer, and Xiaohongshu Skill.
- Memory 3-Layer package validation and 27 installer, migration, recording, poisoning-resistance, and loader-preservation tests passed; real Claude Code and Codex Hook smoke remains a separate runtime proof layer.
- All catalog-declared component checks passed through the shared `node scripts/check-components.mjs` runner; components without an independent command remained covered by the same repository root gate.
- The exact `V1.0` release-contract regression passed, including rejection of legacy or malformed collection version forms and empty CHANGELOG sections.
- The release gate accepts the manifest's `owner/repository` identity while still requiring `origin` to resolve to the matching GitHub repository URL.
- README layout regressions passed for incorrect banner width, missing centered containers, uncentered payment tables or cells, and payment codes split across rows.
- `node scripts/check-repository.mjs --release` is required to pass on the clean `main` release commit before tag creation.
- Remote branch, tag, Release metadata, and fresh-tag-clone checks are required after publication and are reported separately from local readiness.
- Superseded by `V1.1` for fresh-clone verification because the original catalog hashes of six imported components reflected a CRLF working tree rather than the LF Git blobs.

### Source revisions

- HookPrompt: `a4c1faac0cc79860308f5553e3be0b0ac32415bb`.
- Agent Teams Playbook history base: `753ff43bd9b1f9aee4d184c4f21e7f494af5a79f`.
- Memory 3-Layer legacy source base: `1d60800c1a34dfe83d8e2b102b24c7d57d87ca53`.
- Memory 3-Layer canonical direct-sync tree: `2592d1f68b3a005355148b5cdccceedeb74d7755e037970087639602537832fb`.
- Find Skill: `cf7635e3755c47b472bfb6dfd854680b5662ee26`.
- GoalPro: `39adc8db765e0e4ad4df8d4ce02e7059fed69f26`.
- Kim Decision: `fbbe41cb6155ffd605c65b5af3f876ec25cfc0ea`.
- Meta Skill Creator canonical direct-sync tree: `294245547c7ce33062926329e361c08dee4218bf0b33ada25d1c66a6cd39319b`.
- Semgrep Skill: `eb6dd5127f5dedc325b9364edf71a2034e5e35b1`.
- Xiaohongshu Skill canonical direct-sync tree: `9464b5dab5222a671b546a5dc1b3e73f45f19f53e4bb54fe3b3b2401a2b537ca`.
