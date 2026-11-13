# 专业方法与 MCP / Hook 补充记录

核对日期：2026-11-13。六个包均为原创组织、脚本、模板与合成案例；没有复制上游实现，没有自动安装外部服务。以下来源是本轮实际读取的原项目或官方资料，引用不意味着调用方在每个任务中已经联网，也不构成专业效果认证。

## 采用了什么

| 本次能力 | 主来源与固定范围 | 吸收的方法 | 实际交付 |
| --- | --- | --- | --- |
| `data-lineage-impact` | [OpenLineage 1.55.0 列血缘](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)；[源码快照 48a808d](https://github.com/OpenLineage/OpenLineage/tree/48a808df81be1c3abd044c3d1579a57b40032302) | 以命名空间/数据集/字段身份和来源关系描述依赖 | 有界图遍历、间接影响、可能/已观察路径、循环、未匹配对象与证据缺口 |
| `inventory-replenishment` | [frePPLe community 8809507](https://github.com/frePPLe/frepple/tree/8809507a072b8a067c2df491f3641581b4354178) README / COPYING | 将需求、供给、提前期和批量限制分别建模，显式处理计划例外 | 原创单SKU周期复核计算；保护期、安全库存、MOQ、整箱、容量与未满足量 |
| `incident-postmortem` | [Google SRE Workbook 复盘章节](https://sre.google/workbook/postmortem-culture/) | 系统改进、事实时间线、具体责任与可验证行动 | 时间复算、逾期、无责任人、无验证条件、无证据关单识别；根因仍需来源审查 |
| `tender-compliance` | [OCDS 1.1.5 Reference](https://standard.open-contracting.org/latest/en/schema/reference/)；[源码快照 eb57a46](https://github.com/open-contracting/standard/tree/eb57a46e69efead6ae62144fe1b7cefc53d07ff2) | 资料有身份、版本与关联，变更保留依据 | 招标条款/响应/证据矩阵，补遗漂移、失效证据、截止与强制缺口识别 |
| `mcp-contract-auditor` | [MCP Tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)；[官方 TypeScript SDK 919bb8e](https://github.com/modelcontextprotocol/typescript-sdk/tree/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c) | 发现清单、schema和注解分开；不把服务自述当权限 | 离线快照比较、字段/哈希差异、分页不全时降级为可能增删、已批准范围对照 |
| `evidence-receipt` | [Claude Code PostToolUse 官方接口](https://code.claude.com/docs/en/hooks#posttooluse) | 用明确事件与结构化附加上下文记录事实 | 显式产物白名单的本地不可覆盖字节快照，失败不阻塞，无外发、不覆盖宿主设置 |

## 没有引入什么

没有引入OpenLineage采集器、frePPLe求解器或企业版、OCDS发布系统、MCP SDK运行时、自动宿主注册器。五个helper复用仓库已有 `kim-service-helper-v1` 协议、规范化哈希、容量规则和schema验证运行时；该运行时从单一源生成到独立包。Hook有不同的宿主stdio合同，保留为独立事件适配器，不伪装成业务helper。

MCP审计不是完整JSON Schema验证器。组合、引用及有限检查不能确定的根形式报告需检查，不判断官方协议违规。输出schema不强行限制为object。`readOnlyHint`等注解始终是服务声明，不能自动扩大调用权限。

库存公式只适用于独立稳定的日需求及固定提前期的单SKU周期复核近似；不把周期服务水平等同填充率。可用库存与欠单按订单/预留去重，防止同一需求重复扣减。

## 权利与证据

OpenLineage仓库为Apache-2.0，frePPLe社区版为MIT，OCDS仓库LICENSE为Apache-2.0。MCP官方SDK当前LICENSE记录Apache-2.0新代码/规范、保留原许可的MIT贡献以及CC-BY-4.0文档；未假称整个上游只有MIT。Google SRE与Anthropic文档保留原权利，本包仅吸收有限方法并原创实现。逐包 `PROVENANCE.md` 与 `NOTICE` 保留采用/未采用范围。

独立行为测试覆盖实际计算和边界，合成专业案例则用于发现错误判断，不是模型或专家评测。所有包的 `professionalEffect` 均为 `not_evaluated`，宿主状态为 `needs_probe`。真实行业效果、连接服务器及真实宿主启用不能由本次离线结果代替。
