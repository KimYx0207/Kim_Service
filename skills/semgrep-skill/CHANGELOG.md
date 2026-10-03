# Changelog

This component is released with the repository-level Kim Service version and tags.

## 1.1.0 - 2026-10-03

- Added a fixed stdin/stdout JSON local CLI invocation on the existing scan capability, with explicit authorized root and target, runtime versions and source/effective rule hashes.
- Extract two non-secret rules before executing the installed CLI; never run the bundled credential rule or return source excerpts through this route.
- Isolate subprocess settings/environment, enforce path and resource bounds, verify selected-file coverage, and distinguish completion, partial execution, invalid input, unavailable runtime and failure.
- Preserve the computed trusted installed Python user base/site bootstrap when an upstream host isolates APPDATA; caller Python configuration is not inherited.
- Project capability.json and scripts/scan.py with receipted Skill installations; retain dry-run and rollback behavior.
- Replace the former direct scan/default-current-project guidance with the sole wrapper entry. Real behavior tests scan synthetic fixtures only.

## 1.0.0 - 2026-08-09

- Unified the frontmatter, directory, and capability identifier as `semgrep-skill`.
- Replaced network-backed default rules with a bundled offline baseline.
- Removed automatic Semgrep installation and automatic source-fix guidance.
- Added explicit-scope, dry-run-first transactional installers with receipts,
  unknown-content refusal, retained upgrade backups, and rollback.
- Added capability, behavior, and installer transaction tests.

## Kim Service V1.0 - 2026-07-15

- No component-specific changes since the imported snapshot.

## Imported — 2026-07-14

- Imported `KimYx0207/SkillSemgrep` revision `eb6dd5127f5dedc325b9364edf71a2034e5e35b1` as a self-contained Kim Service component.
