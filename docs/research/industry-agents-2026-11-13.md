# 2026-11-13：专业行业 Agent 扩充与开源吸收

本轮新增10个角色，复用Kim Service已有的capability、method、knowledgeAssets、outputChecks与评审案例合同。它们是原创专业方法包，调用、权限、任务编排和最终验收由宿主掌握。未注册新的业务状态机、后台服务或生产写入接口。

## 新能力与实际专业重点

| 角色 | 独立专业问题 | 本包可复核产物 | 开源参考 |
| --- | --- | --- | --- |
| [企业信用风险分析师](../../agents/credit-risk-analyst/AGENT.md) | 把企业偿债来源、债务到期、逾期事实和损失情景连接起来，交付有证据的授信分析草案。 | 债项与到期分布、偿债来源与压力情景、信用风险判断及反证、监测与条件建议 | Apache Fineract |
| [企业资金与流动性分析师](../../agents/treasury-liquidity-analyst/AGENT.md) | 把现金、收付款、融资到期与受限资金放入同一时间梯度，找出缺口出现在哪一天及可用缓解方案。 | 分期现金滚动表、期限与币种缺口、补缺口的候选办法、更新节奏和偏差说明 | Open Source Risk Engine |
| [保险理赔材料分析师](../../agents/insurance-claims-analyst/AGENT.md) | 把保单责任、事故事实、费用明细和扣减顺序逐项对应，给出可追溯的理赔材料与金额核对草案。 | 责任与证据对应表、赔付金额条件核对、补件及争议事项、供核赔或申诉复核的材料包 | openIMIS claim module, openIMIS claim module scope |
| [商业合同条款分析师](../../agents/contract-review-analyst/AGENT.md) | 从合同原文提取权利、义务、例外与期限，把需要谈判的事项做成有原文定位的条款矩阵。 | 条款证据矩阵、风险与矛盾分析、修改与谈判备选、义务与期限表 | Contract Understanding Atticus Dataset, The Atticus Project CUAD page |
| [设备维护与可靠性工程师](../../agents/maintenance-reliability-engineer/AGENT.md) | 按设备功能、故障模式和维修记录寻找停机原因，形成可追踪的维护任务与恢复验证方案。 | 故障模式与证据图、可靠性和维修指标、维护与备件计划、恢复验证与观察计划 | ERPNext, ERPNext Asset Repair |
| [仓储履约分析师](../../agents/warehouse-operations-analyst/AGENT.md) | 把可用库存、预留、批次期限与订单承诺对应起来，定位缺货、错拣和账实差异并给出履约改善方案。 | 库存可用与短缺表、订单与批次候选分配、拣货复核与异常方案、履约与盘点监测 | ERPNext stock domain, ERPNext Pick List |
| [工程项目进度与成本控制师](../../agents/construction-project-controller/AGENT.md) | 把工程工作包、先后关系、完成量与成本连到同一基线，定位工期与预算偏差并形成可比较的纠偏方案。 | 依赖与工期分析、完成量与成本偏差、变更与基线差异表、纠偏备选与检查计划 | OpenProject, OpenProject baseline comparison |
| [酒店收益管理分析师](../../agents/hospitality-revenue-analyst/AGENT.md) | 按房晚、房型、入住日和渠道比较需求与净贡献，给出有条件的房价和库存方案。 | 房晚与收益基线、需求与预订节奏、渠道与客群贡献、定价与房量候选方案 | QloApps, QloApps statistics guide |
| [游戏经济与成长系统设计师](../../agents/game-economy-designer/AGENT.md) | 把游戏货币产消、玩家成长与交易回执连起来，设计可演算、可监测、可回退的数值方案。 | 货币与物品流向、分层成长与余额模拟、奖励与消费一致性、调参与观察方案 | Nakama |
| [安全事件调查与响应分析师](../../agents/security-incident-responder/AGENT.md) | 把告警、受影响资产和证据按时间连起来，区分已证实影响与调查假设，给出有授权边界的遏制、恢复和复盘方案。 | 带证据的时间线、影响范围与假设、遏制与调查候选动作、恢复与复盘材料 | DFIR-IRIS, NIST SP 800-61 Rev.3 |

## 吸收的内容与未带入的内容

| 来源 | 已检查版本 | 吸收 | 未带入与许可边界 |
| --- | --- | --- | --- |
| [Apache Fineract](https://github.com/apache/fineract/tree/4ffa6cda5cc7538318941b67e0782a9794bd22ca) | 4ffa6cda5cc7538318941b67e0782a9794bd22ca | 还款计划、借款主体与逾期状态分别记录。 | 不复制贷款引擎，不照搬任何产品的宽限、利率或授信审批规则。 Apache-2.0; method reference only |
| [Fineract 1.15.0 documentation](https://fineract.apache.org/docs/1.15.0/) | 1.15.0 / read 2026-11-13 | 核对观察日、未付金额、逾期分层和回款分配。 | 不是中国监管口径或机构授信标准。 Official documentation; no text or code copied |
| [Open Source Risk Engine](https://github.com/OpenSourceRisk/Engine/tree/3d75a69087911a7e2cf1e6882da7bc27135c0762) | 3d75a69087911a7e2cf1e6882da7bc27135c0762 | 把数据、配置、情景和结果分开，使风险计算可重跑核对。 | 不引入XVA/衍生品定价器，不宣称完成LCR/NSFR监管计算。 Modified BSD / license.txt; no implementation copied |
| [ORE project documentation](https://opensourcerisk.org/) | rolling page / read 2026-11-13 | 显式说明方法、输入假设及可复核结果。 | 复杂风险引擎功能不冒充本包已运行能力。 Official documentation; reference only |
| [openIMIS claim module](https://github.com/openimis/openimis-be-claim_py/tree/77b197ecb4322d99a9268d02766c4e1658999d20) | 77b197ecb4322d99a9268d02766c4e1658999d20 | 费用行、调整理由及评审状态分开留痕。 | 仅方法参考，不复制AGPL代码或特定医疗保险核赔规则。 AGPL-3.0 per LICENSE.md; no code copied |
| [openIMIS claim module scope](https://openimis.atlassian.net/wiki/spaces/OP/pages/807632949) | rolling page / read 2026-11-13 | 区分核查、估值和财务支付，不把估值视为实际付款。 | 不把上游状态机强加给用户保险公司。 Official documentation; reference only |
| [Contract Understanding Atticus Dataset](https://github.com/The-Atticus-Project/cuad/tree/67faa0e6023b04fcaae6cc09497ab00e5d63a2a2) | 67faa0e6023b04fcaae6cc09497ab00e5d63a2a2 | 条款类别与实际文本证据分别保存。 | 不复制合同、标注、模型或训练代码，不把研究标签当法律意见。 Dataset CC BY 4.0; repository code license not asserted; reference only |
| [The Atticus Project CUAD page](https://www.atticusprojectai.org/cuad/) | rolling page / read 2026-11-13 | 保持法律审阅基准的任务范围与解释边界。 | 不外推为所有法域或交易类型的完整审查规则。 Official project documentation; reference only |
| [ERPNext](https://github.com/frappe/erpnext/tree/0993447543070749000f2b243d976e166e98156e) | 0993447543070749000f2b243d976e166e98156e | 资产身份、维护与故障修理记录分离。 | 不复制GPL实现、生产写入流程或自动资本化逻辑。 GPL-3.0; method reference only |
| [ERPNext Asset Repair](https://docs.frappe.io/erpnext/asset-repair) | rolling page / read 2026-11-13 | 维修事件保留失效、成本、停机和完成证据。 | 工单完成不代替现场功能或安全验收。 Official documentation; reference only |
| [ERPNext stock domain](https://github.com/frappe/erpnext/tree/0993447543070749000f2b243d976e166e98156e/erpnext/stock) | 0993447543070749000f2b243d976e166e98156e | 库存预留、拣选和出库责任分离。 | 不复制GPL库存引擎，不把账面状态当现场事实。 GPL-3.0; method reference only |
| [ERPNext Pick List](https://docs.frappe.io/erpnext/pick-list) | rolling page / read 2026-11-13 | 执行前刷新库存、扫描核对品项和数量。 | 不假定扫码等于质量、批次或客户条件已验收。 Official documentation; reference only |
| [OpenProject](https://github.com/opf/openproject/tree/5faf70ea8435fad6bb9d912009de6552e8a175f3) | 5faf70ea8435fad6bb9d912009de6552e8a175f3 | 工作包稳定身份、依赖和基线版本各司其职。 | 不复制GPL代码、不引入Enterprise功能，也不声称自动完成施工排程。 GPL-3.0; method reference only |
| [OpenProject baseline comparison](https://www.openproject.org/docs/user-guide/work-packages/baseline-comparison/) | rolling page / read 2026-11-13 | 让当前状态与历史基线的差异可回读。 | 状态变化不自动等于批准变更或真实完成量。 Official documentation; reference only |
| [QloApps](https://github.com/Qloapps/QloApps/tree/e502b63f83a3b1d9d40caea4993a5fe817b96396) | e502b63f83a3b1d9d40caea4993a5fe817b96396 | 酒店库存、预订、房型和统计保持同一日期口径。 | 不复制OSL核心或商业模块，不声称已有渠道管理集成。 Core OSL-3.0; modules vary; method reference only |
| [QloApps statistics guide](https://docs.qloapps.com/stats/) | rolling page / read 2026-11-13 | 比较房晚、可用房量、收入与客户/酒店分组。 | 原站的平均收入标签不能代替本任务明确的ADR/RevPAR公式。 Official documentation; reference only |
| [Nakama](https://github.com/heroiclabs/nakama/tree/37618ad4b927a9dd0671599ffc7387a7386f70fa) | 37618ad4b927a9dd0671599ffc7387a7386f70fa | 持久钱包状态与服务端交易明细分开审计。 | 不复制后端或自动注册支付/钱包接口；不假定事务等于业务幂等。 Apache-2.0; method reference only |
| [Nakama virtual wallet documentation](https://heroiclabs.com/docs/nakama/concepts/user-accounts/) | rolling page / read 2026-11-13 | 钱包变更来自服务器运行时，保留交易及前后余额。 | 不采纳客户端可任意提交余额或重复奖励的设计。 Official documentation; reference only |
| [DFIR-IRIS](https://github.com/dfir-iris/iris-web/tree/37c5521ac009bd018a2fac7bc01d70735d130c6c) | 37c5521ac009bd018a2fac7bc01d70735d130c6c | 案件、资产、证据与时间线统一关联，报告可追溯。 | 不复制LGPL实现，不采用beta部署说明作为生产建议。 LGPL-3.0; method reference only |
| [DFIR-IRIS reports documentation](https://docs.dfir-iris.org/latest/operations/reports/) | rolling page / read 2026-11-13 | 报告保留证据哈希、事件来源、资产与任务关系。 | 报告模板完整不代表司法可采或响应完成。 Official documentation; reference only |
| [NIST SP 800-61 Rev.3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) | Final April 2025 / read 2026-11-13 | 响应与恢复通过现有风险管理、权限和持续改善衔接。 | 不把通用建议当作本组织的自动授权或合规认证。 US government publication; reference only |

开源项目只提供特定设计启发，不作为当前任务的事实证据、模型认证或工具运行证明。原始源码、合同数据集与品牌素材均未复制；不同项目许可证分别记录在每包PROVENANCE，原创方法与示例使用仓库MIT条款。

## 内容结构与验收

每包包含短AGENT入口、完整输入输出合同、领域方法与诊断分支、可操作步骤、完整7字段合成交付、正反例、来源与独立包检查。每个输出字段有检查方式、证据要求和拒收条件；无金额或审批阈值被写成行业通用硬规则。

- 10个新增包共70个输出检查；领域检查40个，事实、未核范围与交接检查30个。
- 34个合成评审案例覆盖正确示例、实质错误和材料缺失时的有界推进；金额、日期或授权缺口只限制相关判断。
- 金融案例补了周末净额与周内最低现金、免赔顺序被限额遮蔽、赔款非负、EAD币种单位错配等反例。
- 所有案例均标明`inputProvenance: synthetic`、`evaluationStatus: not_evaluated`，结构检查与算术复算不冒称真实行业任务效果。

## 已执行检查与观察范围

- `node scripts/check-agent-pack.mjs agents/<本轮10个目录>`：10个完整专业合同，无legacy_incomplete。
- 每个新增目录的`node tests/contract.test.mjs`：独立文件、来源引用、字段覆盖和合成案例状态检查。
- 同一输入对照独立复算：信用DSCR1.20/1.00与情景EL8；现金周末70/-10/50、周内资金需求20至40；保险650以及720/700顺序边界和0赔款下界；维修120/2/6小时与95.24%；仓储60件一般可配与20件约束可配；工程CPI0.889/SPI0.80；酒店ADR500/RevPAR400/贡献29000；游戏总金币10500。

这些检查证明方法包能被装配且所列合成计算可复查。未调用付费模型，未接入真实贷款、保险、ERP、PMS、游戏钱包或安全事件系统；实际效果由具体任务的原始材料与独立评审决定。
