# 专业能力扩展：证据、范围与制作决策

核查日期：2026-11-11（北京时间）。这是本轮专业内容的研究与取舍记录；组件发现、可安装版本和完整性以项目生成清单及各包 capability.json/method.json 为准。本页不另造运行目录或调度器。

## 从原有问题得到的设计判断

基线已有24个专业Agent和9个Skill，具备独立包、接口、宿主交接和作者正反例。问题是覆盖集中，且部分“专业方法”重复JSON字段、诊断条目和同一案例，没有充分解释适用前提、反例、完整产物及实际验收证据。来源可运输、字段可解析，仍不能说明执行者能把行业任务做好。

本轮不通过“你是某行业资深专家”建立能力。每个新增包限定一个可以独立交付和复核的任务，提供领域概念、条件分支、可反驳假设、完整模板和合成完整案例。复杂行业的直接专业决定仍须其真实资料、地区规则和相应负责人；医疗包处理服务运营，建筑Skill处理模型信息交付，农业包处理条件水量分析，均不冒充所有行业资格。

Agent承担一个有边界的专业工作；Skill是可复用方法。MCP是工具连接方式，Hook是生命周期触发机制，均不自动提供领域判断或执行权限。此轮内容包不新建跨组件调度、长期记忆、审批或第二套规则系统。资料读取和动作由当前宿主真实绑定；DSh等宿主支持属于独立适配工作，不以资料包宣称已实测模型。

## 可复用制作规格

| 制作项目 | 具体要求 | 不足时怎样处理 |
| --- | --- | --- |
| 场景与输入 | 当前决定、专业对象、单位/期间、原始来源和关键约束 | 给材料充分部分，关键未知只限制相关结论 |
| 领域知识 | 解释为何这样判断、适用前提、常见错误及可推翻条件 | 不以泛用“遵循最佳实践”占位 |
| 诊断与决策 | 问题关联具体证据；有条件分支和不可采用做法 | 不把缺证据填为事实 |
| 完整产物 | 逐字段合同、可填模板、带上下文完整合成实例 | 空表或建议列表不能冒充任务完成 |
| 质量规则 | field、criterion、rejectWhen，加稳定id、verificationMethod、evidenceRequired、blocking | 关键失败/未知不被总分抵消 |
| 检查方法 | 产物检查、确定性复算、行为观察、来源核对或专业复核 | 规则声明不等于该方法已执行 |
| 作者案例 | 正例、拒收反例、输入缺口、边界/误用；预期与理由可见 | evaluationStatus保持not_evaluated |
| 资料维护 | 一手来源、查看日期/版本、采用与未采用范围、许可记录 | 滚动资料不能伪造固定commit；变化时重核 |
| 宿主交接 | 产物、实际证据、未完成项、责任边界 | 最终验收归调用方，不由worker自批 |

JSON保留可检查合同，专业文档解释方法和条件，交付模板承载完整工作产物。两份资料按选定组件加载，没有把全部行业知识注入每个worker。Skill入口显式链接method.json和资料，检查器可验证其方法；这并不代表每个宿主已自动执行Skill的专业评估。

## 本轮覆盖矩阵

下表按工作成果组织，名称不是资质或效果认证。每个新增组件起步包含4个作者案例，后续根据具体失败边界扩充农田水量、数据质量、需求追踪等包；包含可接受与应拒绝情况。它们是评审教材，不是已经跑过的模型基准，当前数量以各包案例文件为准。

| 组件 | 类型 | 限定任务 | 必交领域产物 | 具体拒收问题 |
| --- | --- | --- | --- | --- |
| [经营财务与现金流分析](../../agents/business-finance-analyst/AGENT.md) | agent | 用本次账表说明钱从哪里来、何时要付出去、预算偏差由什么形成，并给出可复算的经营情景。 | cashBridge, varianceAnalysis, scenarios, actions | 把应收收入当作已到账，或把内部转账重复计入现金增长。 |
| [销售管线与预测分析](../../agents/sales-operations-analyst/AGENT.md) | agent | 根据授权商机记录解释销售管线、预测变化与停滞原因，帮助负责人判断下一个跟进动作。 | pipelineAudit, forecast, bottlenecks, nextActions | 把同一客户的同一交易在多个阶段或快照重复计入。 |
| [用户研究与需求证据](../../agents/user-researcher/AGENT.md) | agent | 把模糊的用户痛点变成可检验问题，规划研究并整理本次真实材料中的行为证据和需求判断。 | researchPlan, evidenceMatrix, findings, decisionTests | 只采访内部同事或粉丝却声称覆盖目标总体，或题目提示正确操作。 |
| [数据质量与对账分析](../../agents/data-quality-analyst/AGENT.md) | agent | 证明数据能否支撑当前用途，定位影响结论的记录问题，并给可复核修复路径。 | profile, violations, reconciliation, repairPlan | 悄悄丢弃坏行后只报告剩余行质量。 |
| [应用安全审查员](../../agents/application-security-reviewer/AGENT.md) | agent | 把应用资产、信任边界与实际控制对应起来，交付有位置、有适用条件、可复核的发现和修复验证计划。 | threatModel, findings, verificationPlan, remediation | 只列通用漏洞名称或无关攻击。 |
| [供应与库存计划员](../../agents/supply-chain-planner/AGENT.md) | agent | 将需求、可用库存、确认到货与交期放到同一时间轴，形成可追踪的缺货判断和受约束的补货方案。 | timePlan, riskAssessment, options, decisionRecord | 期末净额掩盖中途缺货，或请求与订单重复计供给。 |
| [制造质量分析员](../../agents/manufacturing-quality-analyst/AGENT.md) | agent | 把质量数据的测量前提、过程变化和缺陷证据分开，给出可验证的异常调查、遏制与纠正措施方案。 | measurementReview, processAssessment, investigation, controlPlan | 把不可比单位、失准量具或重复测量当独立产品直接分析。 |
| [系统工程需求分析员](../../agents/systems-engineering-analyst/AGENT.md) | agent | 将系统目标转成可追踪的要求、接口约束和验证证据，使模块交付能够共同满足真实使用目标。 | requirementSet, interfaceRegister, verificationMatrix, changeImpact | 把快/稳定/智能等形容词当完成标准，或自行编造业务门槛。 |
| [岗位与结构化面试设计员](../../agents/hiring-process-designer/AGENT.md) | agent | 将岗位实际工作转换成可观察能力、共同提问和有行为锚点的评估材料，帮助招聘团队一致地收集证据。 | competencyMap, assessmentKit, ratingRubric, reviewPlan | 只列沟通力/气场/名校等标签，没有工作关联。 |
| [组织碳核算分析员](../../agents/sustainability-analyst/AGENT.md) | agent | 建立有边界、有单位和有因子来源的排放计算草案，识别缺数、重复计算和报告声明的适用范围。 | boundaryRegister, inventory, dataGaps, claimsReview | 为降低总量任意排除设施或混合控制/股权方法。 |
| [医疗服务运营分析员](../../agents/healthcare-operations-analyst/AGENT.md) | agent | 用服务流程和数据定义可控的运营改进试点，同时观察结果、过程和潜在不良影响。 | processMap, measurementPlan, pilotPlan, assessment | 仅凭总平均认定单一根因，或把临床优先级当可任意压缩步骤。 |
| [农田水量与农事计划员](../../agents/agronomy-planner/AGENT.md) | agent | 把地块、作物生育阶段、天气与土壤条件组织成可核算的水量分析和待验证农事计划。 | fieldBasis, waterBalance, scheduleOptions, monitoringPlan | 套其他地区/阶段参数而不披露，或缺土壤条件宣称现场适用。 |
| [实验设计与结果分析](../../skills/experiment-analysis/SKILL.md) | skill | 在讨论效果之前核对实验分配、观测单位和数据质量，以可复核的指标与不确定性支持决策。 | designReview, integrityReview, effectEstimate, decision | 观察性分组、单位不独立或跨组污染被隐藏。 |
| [业务指标口径契约](../../skills/metric-contract/SKILL.md) | skill | 将业务问题转换成单一可追溯的指标定义，防止不同页面、SQL和报告使用同名不同义的数据。 | definitions, lineage, reconciliation, changePolicy | 同名不同分母，订单数冒充买家数或人数与次数混算。 |
| [可执行操作规程与故障手册](../../skills/sop-runbook/SKILL.md) | skill | 把专家隐性步骤转成执行者能判断下一步的操作规程，并明确哪些动作需要权限、观察和人工接手。 | procedure, recovery, validationRecord, maintenance | 只写检查/处理/完成等动作名，或依赖未写出的专家常识。 |
| [需求与验收证据追踪](../../skills/requirements-traceability/SKILL.md) | skill | 把每个交付义务与来源、实现位置和实际验收记录连接，及时暴露遗漏、过期证据与局部阻断。 | traceMatrix, evidenceAssessment, impactMap, acceptancePacket | 缺需求行、用一个笼统完成覆盖所有要求或把额外产物自动当必要。 |
| [建筑模型信息交付审查](../../skills/construction-information-review/SKILL.md) | skill | 把模型信息交付要求与适用对象、属性值和实际验证结果对应，明确机器可检查与专业设计审查的边界。 | scopeMap, informationFindings, validationEvidence, handover | 只按名称猜对象，或把不适用对象混入分母。 |
| [游戏机制与试玩研究](../../skills/game-design-playtest/SKILL.md) | skill | 用明确的机制与观察任务检验玩家体验假设，区分设计意图、实际行为、可复现问题和下一轮调整。 | designModel, testPlan, observations, iterationDecision | 只写爽/沉浸等形容词，无状态和可观察规则。 |

### 原有包的深化

- source-evidence-analyst：保留原平台核查/申诉边界，扩充可复查检索、事前纳排、记录/报告/研究去重、全文未取得状态和异质性；报告清单完整不能替代研究质量。原2例加4例，研究触发已加入能力发现字段。
- quantitative-researcher：保留已有算术helper与协议/测试，深化历史可获时间、ST/停牌/退市/行业历史资格、标签窗口、测试复用、分红和持有批次路径。原2例加4例。helper只证明给定收益算术和内部时间顺序，不证明真实行情、成交或策略有效。
- 其余现有Agent与旧Skill的质量规范和专业修订由同轮其他维护工作处理；本页不重复它们的逐包来源。

## 一手来源与采用边界

以下是研究单一总表。独立组件随包保留各自PROVENANCE的必要子集，使复制单包时仍有来源、许可和边界；这些子集不充当另一个全局索引。没有复制第三方完整提示词、实现、图片或长段正文。

| sourceRef | 原始来源/版本与查看范围 | 采用 | 不采用 | 权利与使用方式 |
| --- | --- | --- | --- | --- |
| sec-statements | [SEC financial statements guide](https://www.sec.gov/about/reports-publications/beginners-guide-financial-statements); 2014 guide; inspected 2026-11-11 | 区分期间利润、资产负债时点和现金收付。 | 不把美国披露口径替代当地会计/税务标准。 | US government guidance; reference only |
| sba-break-even | [SBA break-even point](https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point); living page; inspected 2026-11-11 | 仅采用固定成本、售价、单位变动成本的盈亏平衡关系。 | 不采用该页面季度成本换月除4的错误示例；不复制经验缓冲百分比。 | US government guidance; reference only |
| salesforce-forecast | [Salesforce forecast configuration](https://trailhead.salesforce.com/content/learn/modules/sales-forecasting/configure-sales-forecasting-in-salesforce); living documentation; inspected 2026-11-11 | 区分商机阶段、预测类别与单类/累计汇总，按本业务校准。 | 不照搬示例阶段概率，不要求使用Salesforce。 | Salesforce copyright; original method, no copied implementation |
| salesforce-practice | [Salesforce forecasting practices](https://help.salesforce.com/s/articleView?id=forecasts3_best_practices.htm&language=en_US&type=5); living documentation; inspected 2026-11-11 | 保留商机级证据、日期和历史概率校准。 | 不把销售人员承诺当作已收款。 | Salesforce copyright; reference only |
| 18f-methods | [18F research methods](https://guides.18f.org/methods/); public methods; inspected 2026-11-11 | 分开研究问题、原始观察、设计假设和用户任务验证。 | 不套用固定样本数或声称小样本代表总体。 | US government methods; original synthesis |
| 18f-fundamentals | [18F research fundamentals](https://guides.18f.org/methods/fundamentals/); public methods; inspected 2026-11-11 | 按目标用户招募，说明知情同意与材料范围。 | 不复制美国机构专用法律流程。 | US government methods; original synthesis |
| frictionless-schema | [Frictionless Table Schema](https://specs.frictionlessdata.io/table-schema/); v1 specification; inspected 2026-11-11 | 类型、缺失语义、唯一键、外键与约束分别检查。 | 不把schema通过当作业务数据真实。 | Open specification; no source code imported |
| frictionless-report | [Frictionless validation guide](https://framework.frictionlessdata.io/docs/guides/validating-data.html); living guide; repository c08fa29cb0708427ae65bb689ded8e2691078a82 inspected 2026-11-11 | 错误定位到数据集、行、字段和规则；保留源数据。 | 不安装依赖、不复制验证器、不以报告格式代替正确性。 | frictionless-py MIT; concepts only |
| owasp-asvs | [OWASP ASVS](https://github.com/OWASP/ASVS/tree/62981c68fd06206e8afa161653943935de9a5047/5.0); ASVS 5.0.0; repository revision inspected 2026-11-11 | 按版本化控制要求做有范围的应用安全验证。 | 不复制标准条文，不宣称审计认证或全站安全。 | CC-BY-SA-4.0 upstream; links and original analytical method only |
| nist-ssdf | [NIST SSDF](https://csrc.nist.gov/Projects/SSDF); SP 800-218 v1.1 public page; inspected 2026-11-11 | 把安全需求、实现证据和漏洞响应连起来。 | 不把自查当作合规证明或扫描授权。 | US government guidance; original synthesis |
| erpnext-stock | [ERPNext projected quantity](https://docs.frappe.io/erpnext/projected-quantity); living documentation; repository 9a7e27e312555857f7c3c6841990f3ccfc1c6cec inspected 2026-11-11 | 区分现货、已确认供给、需求与关联单据，避免重复计入。 | 不搬GPL实现，不自动创建采购单。 | ERPNext GPL-3.0; original reasoning only, no code imported |
| mit-inventory | [MIT OCW logistics inventory notes](https://ocw.mit.edu/courses/esd-260j-logistics-systems-fall-2006/pages/lecture-notes/); ESD.260J Fall 2006; inspected 2026-11-11 | 区分确定/波动需求、交期、库存策略与易腐品约束。 | 不把课程例题参数作为客户补货阈值。 | MIT OCW CC BY-NC-SA; links and brief principles only |
| nist-capability | [NIST process capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm); Engineering Statistics Handbook; inspected 2026-11-11 | 过程稳定、分布及测量适用性是过程能力解释的前提。 | 不使用统一Cpk合格线，也不以指数替代出厂验收。 | US government handbook; equations and original examples |
| nist-doe | [NIST experimental design](https://itl.nist.gov/div898/handbook/pri/section3/pri3.htm); Engineering Statistics Handbook; inspected 2026-11-11 | 按问题选择随机化、区组、重复与因素设计。 | 不将观察相关性写成随机试验因果结论。 | US government handbook; original examples |
| nasa-verification | [NASA requirements verification matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/); Systems Engineering Handbook appendix; inspected 2026-11-11 | 需求唯一标识、来源、验证方法与证据可追踪。 | 不把NASA流程视为本地建筑法规或工程签章。 | NASA guidance; original templates |
| nasa-validation | [NASA systems engineering handbook appendix](https://www.nasa.gov/reference/system-engineering-handbook-appendix/); handbook appendices D/E; inspected 2026-11-11 | 区分符合要求的验证与满足使用目标的确认。 | 不以文档完备替代真实系统验证。 | NASA guidance; original templates |
| opm-interview | [OPM structured interviews](https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews); living guidance; inspected 2026-11-11 | 基于岗位胜任任务，使用共同问题和有行为锚点的评分。 | 不导入美国岗位法律、不使用无依据人格推断。 | US government guidance; original interview cases |
| opm-job-analysis | [OPM competency selection](https://www.opm.gov/frequently-asked-questions/assessment-policy-faq/structured-interviews/how-do-i-select-the-competencies-or-content-areas-i-want-to-assess-with-the-structured-interview/); living guidance; inspected 2026-11-11 | 先确认关键任务与入职必须具备的能力，再选择测量方法。 | 不把简历学校、年龄等替代工作证据。 | US government guidance; original synthesis |
| ghg-corporate | [GHG Protocol Corporate Standard](https://ghgprotocol.org/corporate-standard); 2004 corporate standard with 2015 scope 2 guidance referenced by official page; inspected 2026-11-11 | 组织边界、运营范围、活动数据和因子来源必须分开记录。 | 不据此核发碳信用、审定抵消或作碳中和认证。 | GHG Protocol copyright; original worksheet, no standard copied |
| epa-boundaries | [EPA organizational boundaries](https://www.epa.gov/climateleadership/determine-organizational-boundaries); living inventory guidance; inspected 2026-11-11 | 按一致的股权/控制边界处理组织、设施和租赁。 | 不把网页例表当作所有司法辖区报告要求。 | US government guidance; original cases |
| ahrq-pdsa | [AHRQ PDSA improvement cycle](https://www.ahrq.gov/cahps/improvement-guide/improvement-models/plan-do-study-act.html); living improvement guidance; inspected 2026-11-11 | 小范围改变、事先测量、观察后调整，保留患者体验与运营影响。 | 不将流程建议转为诊断、处方或临床分诊。 | US government guidance; original operations cases |
| ihi-measures | [IHI quality improvement measures](https://www.ihi.org/library/tools/quality-improvement-project-measures-worksheet); living guidance; inspected 2026-11-11 | 结果、过程和平衡指标形成配套观察，避免局部优化。 | 不复制工作表或默认医疗阈值。 | IHI copyright; links and original measures |
| fao-water | [FAO irrigation water requirement](https://www.fao.org/aquastat/en/data-analysis/irrig-water-use/irrig-water-requirement/); living water-balance explanation; inspected 2026-11-11 | 蒸散、有效降雨、土壤储水和生育阶段共同决定水量分析。 | 不把国家尺度长期模型直接当作地块当日灌水指令。 | FAO copyright; original calculations, no tables copied |
| fao-net-irrigation | [FAO irrigation water needs](https://www.fao.org/4/s2022e/s2022e08.htm); training manual chapter4; independently inspected 2026-11-11 | 在适用简化模型中需水不为负，雨量充分时为零；同系统效率必须有效。 | 不把简化盈余当实际排水，不套水稻或地区默认参数。 | FAO copyright; original boundary cases, no tables copied |
| fao-56 | [FAO Irrigation and Drainage Paper 56](https://www.fao.org/4/x0490e/x0490e00.htm); 1998 paper contents and official method context; inspected 2026-11-11 | 区分参考蒸散与作物蒸散，系数需要作物/阶段/地区依据。 | 未导入系数表，不推断农药、肥料或产量处方。 | FAO copyright; citation and original method only |
| ms-experiments | [Microsoft Research SRM diagnosis](https://www.microsoft.com/en-us/research/publication/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments-a-taxonomy-and-rules-of-thumb-for-practitioners/); KDD 2019 paper page; inspected 2026-11-11 | 先检查分流与数据可信度，再解释实验效果。 | 不照搬平台阈值，不将合成例当生产实验。 | Microsoft/ACM copyright; original teaching examples |
| google-slo | [Google SRE alerting on SLOs](https://sre.google/workbook/alerting-on-slos/); SRE Workbook chapter; inspected 2026-11-11 | 指标必须绑定统计窗口和用户影响；区分症状与可行动响应。 | 不复制默认告警阈值，不自动变更生产监控。 | Google SRE book licence retained upstream; original procedure only |
| buildingsmart-ids | [buildingSMART IDS](https://www.buildingsmart.org/standards/bsi-standards/information-delivery-specification-ids/); IDS1.0 official description; repo870f9c4e6e8f414e737b4d84ca1aa9b46fc6c8f3 inspected 2026-11-11 | 模型信息要求可机器检查；区分规范文件审计与模型数据符合性。 | IDS不覆盖几何；不宣称结构/消防/碰撞合格。 | buildingSMART rights; original checklist, no schema/code imported |
| unity-playtest | [Unity USC Games Unlocked playtesting](https://learn.unity.com/course/design-and-publish-your-original-game-unity-usc-games-unlocked/unit/playtesting); living course page; inspected 2026-11-11 | 围绕具体设计问题收集可观察行为，再安排下一轮验证。 | 不把一次试玩意见或主观好玩当作留存/付费预测。 | Unity copyright; original game scenarios |
| cochrane-search | [Cochrane searching and selecting studies](https://www.cochrane.org/authors/handbooks-and-manuals/handbook/current/chapter-04); chapter updated March2025; handbook6.5.1 cited by source; inspected 2026-11-11 | 检索可复现、预先纳排、区分研究与报告、保留缺全文与排除原因。 | 不声称搜索引擎检索等同完整Cochrane系统综述。 | Cochrane copyright; original review workflow |
| prisma-report | [PRISMA2020](https://www.prisma-statement.org/prisma-2020); 2020 reporting guideline; inspected 2026-11-11 | 公开检索筛选流程、排除与报告范围。 | 不将报告清单通过等同研究质量或临床结论。 | PRISMA rights; link and original traceability table |
| google-incident | [Google SRE incident response](https://sre.google/workbook/incident-response/); SRE Workbook chapter; inspected 2026-11-11 | 明确响应角色、现场记录、交接与演练，把方案和实际执行区分。 | 不照搬Google规模与流程，不把演练当真实事故恢复。 | Google SRE book rights; original runbook template and case only |
| agent-skills-authoring | [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices); living official guide; inspected 2026-11-11 | 把具体领域上下文、真实项目材料、按需加载和实际任务反馈作为制作依据。 | 不把大而全背景文字或角色名当专业能力；未执行任务不称效果验证。 | Official documentation; original method, no template copied |
| anthropic-agent-evals | [Anthropic agent evaluations](https://www.anthropic.com/research/demystifying-evals-for-ai-agents); published 2026-01-09; inspected 2026-11-11 | 区分任务、尝试、评分和最终环境结果；保存可检查产物。 | 不从自报完成推断真实状态，不引入付费模型评审服务。 | Anthropic copyright; short principle synthesis only |
| skillsbench | [SkillsBench](https://arxiv.org/abs/2602.12670v4); v4 2026-06-14; inspected 2026-11-11 | 采用同任务有/无Skill的配对评估与确定性验证思路。 | 不把论文中的模型/任务平均收益当作Kim项目实测效果。 | Research paper; no benchmark data or code imported |
| nvidia-skillevaluator | [NVIDIA SkillEvaluator](https://docs.nvidia.com/skills/skillevaluator); Experimental rolling official documentation; inspected 2026-11-11 | 区分静态质量、内容重叠和真实Agent任务效果三类检查。 | 未安装库、未跑其评分或实时评测，不声称NVIDIA认证。 | NVIDIA documentation; conceptual reference only |
| sklearn-time-series | [scikit-learn TimeSeriesSplit](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit); 1.9.1 as retrieved; inspected 2026-11-11 | 按可获得时间评价未来资料并声明分隔窗口和数据间隔。 | 不复制默认参数，不把切分API当已排除所有泄漏。 | Official documentation; original method only |
| sklearn-validation | [scikit-learn cross validation](https://scikit-learn.org/stable/modules/cross_validation.html); 1.9.1 as retrieved; inspected 2026-11-11 | 模型选择和最终评价分开，保留测试复用影响。 | 不复制代码，不把ML评价当投资认证。 | Official documentation; original method only |

## GitHub参考的版本与依赖决定

| 项目 | 检查的定位 | 借鉴内容 | 本轮处理 |
| --- | --- | --- | --- |
| [frictionlessdata/frictionless-py](https://github.com/frictionlessdata/frictionless-py) | main，c08fa29cb0708427ae65bb689ded8e2691078a82；MIT | 字段/行/规则错误定位和schema不等于真实数据 | 原创数据核对方法；未安装或复制验证器 |
| [OWASP/ASVS](https://github.com/OWASP/ASVS) | master，62981c68fd06206e8afa161653943935de9a5047；CC-BY-SA-4.0 | 有版本的控制要求、验证范围和证据 | 链接标准并原创审查任务；不复制条文或声称认证 |
| [buildingSMART/IDS](https://github.com/buildingSMART/IDS) | development，870f9c4e6e8f414e737b4d84ca1aa9b46fc6c8f3；API未给可明确判定的许可证标识 | 要求文件、模型解析、信息满足分层 | 未导入schema/代码；不推定无许可就是可任意复制 |
| [frappe/erpnext](https://github.com/frappe/erpnext) | develop，9a7e27e312555857f7c3c6841990f3ccfc1c6cec；GPL-3.0 | 库存位置与关联请求/订单状态 | 原创时序/去重方法；未搬实现或加入ERP依赖 |
| [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 由旧claude-scientific-skills地址重定向确认；main，MIT；此项未固定commit | 研究能力拆分和来源组织的参考候选 | 未复制包、未把宣传数量/用户数当效果证据、未加入依赖 |
| [NVIDIA/SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator) | 官方滚动文档标Experimental；本项未固定commit | 静态、重叠与真实任务效果分开 | 未安装、未调用LLM评审、未声称运行其分数 |

这不是对上述整个仓库的安全或质量审计；已记录的commit定位用于研究可追溯，也不保证所有引用滚动网页都与同一commit内容相同。

## 一个不能盲从官方的例子

SBA盈亏平衡页面的季度成本折月示例使用了除4，这与时间单位不一致。本轮只采用固定成本/单位贡献的盈亏平衡关系，拒绝该换算例。若9000元是一个季度的成本，等额分摊为月值是9000÷3=3000元；实际月份不均匀则应使用各月实际数据。保留这个反例是为了说明“官方来源”仍需单位、公式与适用性复核，不能把引用当免检。

同样，FAO区域水量方法不能直接变地块日处方；本包分开ETc、有效雨、储水与未计项、净深度、体积和毛供水/效率。0.8效率只出现在显式合成输入中；没有默认灌水量，没有把水稻特殊参数写成通用值。

## 验证记录与仍然未知的部分

本轮新18包通过严格checkAgentPack/checkComponentMethod以及每包独立Node合同测试。两个深化旧包通过严格方法检查；原有合同与量化算术/CLI测试共14项通过，计算helper和绑定协议未改。这些结果验证目录、字段、来源引用、案例结构、质量合同以及已测试的算术/CLI行为。

还做了公式、单位和场景的人工复核；作者示例包括现金不等于利润、交期前缺货、连接后重复汇总、控制界限不同于规格、分流质量先于效果、kg/t与mm/ha/m³换算、报告数不同于研究数等容易产生真实损失的问题。项目的独立同行复核和完整集成检查记录在本轮交付与版本记录中，不在本页伪造回执。

本内容编写与合同检查未通过外部API或Codex/Claude CLI发起额外付费模型请求，也未执行这些新包在真实客户任务上的配对评测。当前会话另做的独立合成试题见本轮验证记录，不外推为所有行业效果。因此所有professionalEffect仍为not_evaluated，真实宿主状态须由对应适配/运行证据决定。后续效果评测应使用未泄露作者答案的新任务、固定输入/环境、实际产物与独立判定，再比较有无方法包；不能把本文引用的SkillsBench等外部成绩移植成本项目成绩。

后续更新优先根据真实失败样本补领域规则和删无作用重复内容，不按目录数量排名。发现同一能力多包重复时，先核任务边界、消费者和来源责任，合并为一个可复用方法；不能为减少数量删除仍被使用的专业路径或必要许可/联系信息。

## 续作审查：让方法能够执行、证据不能假通过

2026-11-11重新检查18个新增包后发现，`method.json.steps` 的中间步骤原先主要重复诊断问题。它们能提示思考方向，却没有说明实际操作及中间产物。现将诊断问题保留在diagnosticSequence，steps按各领域改成具体输入、操作、合同输出和失败处理，入口显式读取这些步骤。例如库存先匹配单据，再按可用日期重算逐期缺口，再用MOQ/交期/容量约束比较方案；财务先分开真实流水与计划，再对账、排收付日历和核最早缺口。没有扩大组件数量和权限。

补充研究只采用会改变工作方法的做法：

| 一手来源及核查定位 | 本地改动 | 明确未采用 |
| --- | --- | --- |
| [dbt data tests](https://docs.getdbt.com/reference/resource-properties/data-tests)与[dbt-labs单元测试Skill](https://github.com/dbt-labs/dbt-agent-skills/blob/b8facde20b7a92c40ce3e6b86b71c4b92aa44040/skills/dbt/skills/adding-dbt-unit-test/SKILL.md)，2026-11-11读取；后者Apache-2.0 | 数据质量包分开NULL必填、引用和检查覆盖；用合成输入/期望结果解释变换边界，真实数据检查另有范围 | 不安装dbt、不复制Skill/示例、不把关闭失败测试视为修复 |
| [Pandera lazy validation](https://pandera.readthedocs.io/en/stable/lazy_validation.html)，2026-11-11读取的滚动官方资料 | 保留规则级问题位置，区分多个失败事件与去重受影响记录；缺列、类型和执行错误单列 | 不复制或安装验证器，不以格式化错误报告代替正确修复 |
| [Playwright best practices](https://playwright.dev/docs/best-practices)及[assertions](https://playwright.dev/docs/test-assertions)，2026-11-11读取的滚动官方资料 | 前端方法要求实际入口、隔离数据、等待异步条件和mock边界；受控200不证明真实保存；验证随实际风险选择 | 不为小改动堆测试，不以模拟响应冒充后端持久化和鉴权，不宣称已经跑浏览器 |
| [OpenLineage代码位置](https://openlineage.io/docs/1.54.0/spec/facets/job-facets/source-code-location/)及[官方schema](https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/SourceCodeLocationJobFacet.json)，schema blob `a303cb73dcad254a432c8e0696a1e002e1ee2a21`，2026-11-11读取 | 需求追踪分开不可变代码修订与分支名；本地增加输入、规则、工作区差异和真实运行核对 | 未集成OpenLineage，不以哈希或元数据证明执行发生 |
| [dbt state selection](https://docs.getdbt.com/reference/node-selection/methods#state)，2026-11-11读取的滚动官方资料 | 先保留旧基线再比较，考虑上游共享实现与下游消费者；关系未知单列待核 | 不照搬仓库选择器，不假设静态关系覆盖全部动态加载，不覆盖旧基线后自比 |

本轮增加8个原创作者案例，重点是能够区分“看起来通过”与“真的有适用证据”：NULL被引用查询跳过、空提取零失败、一个订单多个错误、模拟保存、共享依赖变化、可移动分支名和旧基线被覆盖。全部仍为`authored_examples / not_evaluated`。本轮修改不把包的来源表当当前工作者联网记录，不把行业数、合同通过或作者反例数写成模型效果提升。
