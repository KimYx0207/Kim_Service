# Changelog

## 0.1.0 - 2026-09-14

首个版本，作为 Kim Service 行业 agent 能力包（`agents/topic-planner`）的自媒体样板发布。

### Added

- `AGENT.md`：选题策划 agent 本体，含角色定位、找我 / 别找我、输入输出、工作步骤、停机规则、完整示例和自查清单。
- `capability.json`：`topic-planner-plan-topics` 能力合同，只读权限，医疗、法律、金融结论触发人工确认。
- `tests/contract.test.mjs`：按 `docs/agent-pack-contract.md` 做结构校验。

### Verification

- `node agents/topic-planner/tests/contract.test.mjs`
- `node scripts/catalog-automation.mjs check`
