# Changelog

## 0.3.0 (2026-11-11)

- 增加完整实务交付、专业错误反例和跨情境处理，保持原有专业知识可按需装入。
- 每项输出增加稳定检查ID、验证方法、所需证据和阻断规则；作者样例与实际效果分开。


## 0.2.0 - 2026-11-10

- Allow a content-specific layout description while preserving the previous layout names; remove the unsupported universal platform-demotion claim and use comparable traffic context for CTR review.
- Add contract-bound expertise: domain diagnostics, decision rules, input guidance, output checks and professional review boundaries.
- Add authored positive and failure cases; structural checks and knowledge transport do not claim expert-effect validation.
- Assemble an original bounded professional-method resource with primary-source provenance; preserve existing methods and helpers.

## 0.1.0 - 2026-09-14

首个版本，作为 Kim Service 行业 agent 能力包（`agents/headline-cover-optimizer`）的自媒体样板发布。

### Added

- `AGENT.md`：标题封面优化 agent 本体，含角色定位、找我 / 别找我、输入输出、工作步骤、停机规则、完整示例和自查清单。
- `capability.json`：`headline-cover-optimizer-optimize` 能力合同，只读权限，极限词与医疗、法律、金融结论触发人工确认。
- `tests/contract.test.mjs`：按 `docs/agent-pack-contract.md` 做结构校验。

### Verification

- `node agents/headline-cover-optimizer/tests/contract.test.mjs`
- `node scripts/catalog-automation.mjs check`
