# Changelog

## 0.2.0 - 2026-10-02

- 新增「用户提供」来源状态，避免把提供的参数当成亲历或已观察；实测发现并修复该枚举缺口。

- 按口播、分镜、图文正文和公众号文章选择结构；纯正文不强制附口播时长或拍摄清单。
- 主稿合同允许正文 string 与分镜 array，保留现有输出字段。
- 无来源功效不能换成虚构使用感受；亲历口吻必须有用户提供的真实材料。

## 0.1.0 - 2026-09-14

首个版本，作为 Kim Service 行业 agent 能力包（`agents/script-writer`）的自媒体样板发布。

### Added

- `AGENT.md`：脚本文案 agent 本体，含角色定位、找我 / 别找我、输入输出、工作步骤、停机规则、完整示例和自查清单。
- `capability.json`：`script-writer-write-script` 能力合同，只读权限，医疗、法律、金融结论与无来源功效触发人工确认。
- `tests/contract.test.mjs`：按 `docs/agent-pack-contract.md` 做结构校验。

### Verification

- `node agents/script-writer/tests/contract.test.mjs`
- `node scripts/catalog-automation.mjs check`
