## 4.9.1 — 2026-11-11

- 统一重试与恢复预算；Meta沿用宿主planning-continuity；独立任务保留等价记录；默认继承模型。
- 合成样板与结构/工具验证不改变 professionalEffect: not_evaluated。

# Changelog

## 4.9.0 - 2026-11-11

- 为全部 1 项现有能力补充具体诊断、决策、逐字段验收、所需证据与不可抵消的阻断项。
- 保留成熟工作流与脚本，增加原创专业说明、完整交付示例、真实失败边界与一手来源记录；明确作者案例不是业务实测。
- 入口链接专业方法并准确说明原生/Meta 加载边界；不把结构、字段或篇幅当专业效果。
- 按产物依赖和资源冲突处理并行、人工等待和重试，独立任务不随单点审批停机。
- 修复安装器仅复制入口和 README 的资源缺口；本地与 GitHub 安装携带合同、专业引用、案例、许可和原有联系/支持图片，失败保留上一安装。

## Kim Service V1.0 - 2026-07-15

- Preserved `KimYx0207/agent-teams-playbook` revision `753ff43bd9b1f9aee4d184c4f21e7f494af5a79f` as the repository history base.
- Published the playbook as a self-contained component under `skills/agent-teams-playbook` while repository-level releases move to the Kim Service version line.

## [4.8.0] - 2026-07-10

### Fixed

- Replaced the mandatory Skill fallback ritual with stop-on-match capability resolution. Existing local Agents, Skills, Tools, Commands, and MCP providers now win immediately; external discovery runs only for a proven gap, and degraded mode requires a real host, permission, or owner failure.
- Added explicit native contracts for both primary runtimes: Claude Code keeps its `Agent` / `Task` and optional Team surfaces, while Codex uses only top-level `spawn_agent(task_name, message, fork_turns)` without legacy typed/namespaced fallback.
- Recorded the live Claude Code Agent schema requirement that `prompt` is mandatory; owner/type/name fields do not replace the worker prompt.

### Added

- Added runtime-native skill package directories for Claude Code and Codex:
  `.claude/skills/agent-teams-playbook/` and `.agents/skills/agent-teams-playbook/`.
- Added Codex config metadata in `.codex/config.toml`.
- Added `NOTICE` for release and package metadata.

### Changed

- Updated the install script to prefer the target runtime package directory when
  installing locally or from GitHub, while keeping the root `SKILL.md` fallback
  for runtimes without a dedicated package tree.

### Verification

- `node --test tests/runtime-contracts.test.mjs`
- `bash -n scripts/install.sh`
- Live Claude Code `2.1.196` regression: one Skill call and one Agent call with the required `prompt`, no retry.
- Codex task evidence: three successful native top-level `spawn_agent` calls.
