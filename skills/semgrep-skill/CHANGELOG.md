# Changelog

## 1.2.0 - 2026-11-11

- 为全部 4 项现有能力补充具体诊断、决策、逐字段验收、所需证据与不可抵消的阻断项。
- 保留成熟工作流与脚本，增加原创专业说明、完整交付示例、真实失败边界与一手来源记录；明确作者案例不是业务实测。
- 入口链接专业方法并准确说明原生/Meta 加载边界；不把结构、字段或篇幅当专业效果。
- 安装投影携带完整方法、参考、案例与许可，回执覆盖新增资源；区分扫描覆盖与安全结论。

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
