# Changelog

## 1.2.0 - 2026-11-12

- Stop inferring clients from model names; bind supported adapters explicitly and report optional model provenance independently. Unknown clients retain manual-core and unverified-runtime boundaries.
- Extend existing governance proposals with company-owned Work evidence, applicability, expiry and reuse feedback.
- Keep private organizational candidates internal and require deidentification and validation before public method publication; storage schema and loaders are unchanged.

## 1.1.0 - 2026-11-11

- 为全部 5 项现有能力补充具体诊断、决策、逐字段验收、所需证据与不可抵消的阻断项。
- 保留成熟工作流与脚本，增加原创专业说明、完整交付示例、真实失败边界与一手来源记录；明确作者案例不是业务实测。
- 入口链接专业方法并准确说明原生/Meta 加载边界；不把结构、字段或篇幅当专业效果。
- 补全读取、追加、长期治理、迁移、安装的证据边界，说明生效字符预算与原生Hook未观察状态。

This component follows the repository-level Kim Service version and tags.

## V1.0 - 2026-07-15

- Published from the canonical `skills/memory-3layer` package; Kim Service records the exact direct-sync tree revision in its root catalog and release changelog.
- Renamed the public component from `claude-memory-3layer` to platform-neutral `memory-3layer`.
- Moved the default data root from `.claude/memory/` to `.memory-3layer/` and added a non-destructive legacy migration path.
- Added shared-core adapters for Claude Code and Codex while keeping other Agent Skills hosts on an explicit manual route.
- Added Codex Hook review/trust instructions and separated artifact, adapter, and runtime evidence.
- Replaced product-specific metadata with Agent Skills standard frontmatter.
- Defined goal, step, transition, failure, and six-boundary contracts.
- Standardized public README image alignment and support-code layout.

## Historical import — 2026-07-14

- Imported `KimYx0207/claude-memory-3layer` revision `1d60800c1a34dfe83d8e2b102b24c7d57d87ca53` as the historical base.
