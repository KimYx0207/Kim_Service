# 24 个专业 Agent：差距与本轮知识装配

检查日期：2026-11-10。对照源为扩展前的 `7e0cc4b10c855a24960aac0ea3bd62c4e4bf7e57`。此时仓库有 35 个组件、50 项能力，其中 24 个 Agent、7 个结构化 method、4 个带有界知识资源的方法。下面记录的是资料与接口审计，不是对所有模型的行业能力认证。

## 原有能力与增量

| Agent | 已有实质内容 | 本轮补充重点 | 当前版本 |
| --- | --- | --- | --- |
| product-architect | 架构/决定依赖、两层设计、来源资料与候选结构 helper | 保留核心资料；诊断、字段指导和架构先行反例 | 0.4.0 |
| interaction-designer | 用户旅程、状态、视觉与可访问性核心资料 | 保留核心资料；失败恢复、焦点和未实测边界案例 | 0.4.0 |
| frontend-engineer | 当前框架、接口、状态与行为验证资料 | 保留核心资料；派生状态、取消与构建代行为反例 | 0.3.0 |
| backend-data-engineer | 身份、事务、并发、兼容与迁移资料 | 保留核心资料；客户端 owner、竞争窗口反例 | 0.3.0 |
| source-evidence-analyst | 原始来源、时间、冲突与访问拒绝方法 | 声明拆解、来源独立性、反证与范围 | 0.2.0 |
| quantitative-researcher | 信息时序、成本、复算与真实计算 helper | 评价量、泄漏、参数选择、复利与样本局限 | 0.2.0 |
| media-production-engineer | 授权素材、采样渲染、探测与资源交接 | 容器/媒体流、时间轴、参数与感知质量分离 | 0.2.0 |
| delivery-verifier | 有界读取、哈希、JSON pointer 与回执绑定 helper | 产物身份、标准类型、旧回执和最终验收边界 | 0.2.0 |
| supplier-comparison-analyst | MOQ、到货成本、权重敏感性、四类完整案例与 Python helper | 同单位、费用未知、质量证据与条件短名单 | 0.2.0 |
| store-performance-analyst | 经营口径、核算/交付 helper、四类案例 | 分母诊断、算术拆解与因果解释分离、对照实验 | 0.3.0 |
| topic-planner | 受众场景、素材、五题完整例子与复盘 | 流量环节、样本可比性、无历史数据的合理试验 | 0.2.0 |
| script-writer | 完整文章/口播示例、事实归属与格式边界 | 论证结构、承诺兑现、合成材料与编造成绩反例 | 0.4.0 |
| headline-cover-optimizer | 标题候选、封面方向与一致性检查 | 改正泛化“平台降权”因果；增加CTR构成与实验边界 | 0.2.0 |
| concept-tutor | 卡点、分数单位解释与迁移示例 | 错误差异诊断、表征映射、逐渐减少提示 | 0.2.0 |
| lesson-planner | 可加总课时、教师问题、分层与退出检查 | 目标/证据/活动对齐、个体检查、课堂应变 | 0.2.0 |
| exercise-designer | 题目、完整答案、错因与同分母分数示例 | 目标覆盖、多解、等价答案、独立复算 | 0.2.0 |
| resume-editor | 岗位映射、真实经历与数字归属 | 个人/团队证据、迁移能力、读取格式与隐私 | 0.2.0 |
| interview-coach | 单题模拟、改稿模式、真实行动与 nullable followUp | 岗位能力、行为/情境区别、可追问选择 | 0.3.0 |
| workplace-writer | 状态表、行动请求、供应商预计时间示例 | 读者决定、提交/批准区别、承诺和责任边界 | 0.2.0 |
| product-listing-writer | 商品事实账、完整详情与未测试性能边界 | 显式/隐含声明、SKU与价格条件一致性 | 0.2.0 |
| customer-service-writer | 回复草稿、政策内选项与升级 | 诉求诊断、真实订单状态、最少信息和补偿权限 | 0.2.0 |
| side-business-evaluator | 资源比较、小范围验证与停止信号 | 客户行为与赞美分离、机会成本、风险优先验证 | 0.2.0 |
| pricing-cost-analyst | 时间/现金成本、正负贡献与完整报价算例 | 单位/期间、产能、比例费用和愿付证据边界 | 0.2.0 |
| launch-planner | 首次交付、七天计划、预算与验收 | 可演示切片、真实依赖、局部阻塞和新证据重排 | 0.2.0 |

“没有 method”与“没有专业知识”是两回事。本轮保留原来的有效方法、完整实例、工具代码与许可证，新增 20 份原创专业知识文档和 17 个结构化方法。24 个包均增加同一 expertise 合同与两条有明确判别理由的合成案例，共 48 条；软件四包的核心知识文件不改写。

## 一手参考采用边界

每包 PROVENANCE 记录实际链接、修订/读取日期、采用与未采用内容。具体概念、诊断和算例由本项目原创组织；没有将第三方技能正文复制成自己的包，也没有添加外部运行依赖。

| 资料 | 本轮采用 | 明确不采用 |
| --- | --- | --- |
| [IES 学习与教学实践指南](https://ies.ed.gov/ncee/WWC/PracticeGuide/1) | 例题与练习、解释、提取检查和间隔回看的方法线索 | 普适效果保证、固定学习风格或学习障碍诊断 |
| [OPM 结构化面试问题](https://www.opm.gov/frequently-asked-questions/assessment-policy-faq/structured-interviews/how-do-i-create-structured-interview-questions) | 以岗位任务/能力区分行为与情境问题 | 美国招聘制度迁移、自动人员选拔或录用预测 |
| [CareerOneStop 简历工作经历](https://cloudfront.careeronestop.org/JobSearch/Resumes/ResumeGuide/work-experience.aspx) | 相关经历、具体动作与可核结果 | 强制履历长度、统一模板、虚构量化和ATS保证 |
| [YouTube CTR 解释](https://support.google.com/youtube/answer/16767369)、标题和实验说明 | 曝光与来源构成、准确承诺、条件实验 | 所有平台共用算法、单次前后因果、必然降权 |
| [18F Plain language](https://guides.18f.org/content-guide/our-approach/plain-language/) | 读者任务、具体表达 | 英文禁词表直接套中文、统一机构口吻 |
| [FTC 小企业广告指引](https://search.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business) | 声明、上下文与证据的检查方法 | 将美国法域说明当全球合规认证 |
| [CIPS 全周期成本](https://www.cips.org/intelligence-hub/finance/total-cost-of-ownership) | 单价之外的取得、使用与退出成本范围 | 为未知风险编精确金额、自动采购和资质认证 |
| [SBA 业务规划](https://www.sba.gov/counseling/plan-your-business/)、盈亏平衡说明 | 市场证据与单位贡献的适用前提 | 小样本即市场验证、固定缓冲比例、利润保证 |
| [scikit-learn 常见问题](https://scikit-learn.org/stable/common_pitfalls.html) | 数据切分与预处理泄漏 | 复制代码或将机器学习说明当交易策略有效证明 |
| [FFmpeg ffprobe](https://ffmpeg.org/ffprobe.html) | 容器与流的真实参数核对 | 把可读文件/零退出码当视觉听感验收 |
| [W3C PROV](https://www.w3.org/TR/prov-primer/)、[SLSA v1.2](https://slsa.dev/spec/v1.2/build-provenance) | 对象、输入、过程与派生证据分离 | 新RDF/供应链治理器、哈希即真实性、SLSA认证声明 |

软件四包继续沿用此前固定的 GitHub 一手参考与许可记录：Anthropic skills、GitHub spec-kit、Vercel agent-skills、OWASP 等。其核心资料和已有来源未被新的行业统一合同替换。滚动官方网页记录实际读取日，不冒充不可变快照；当前任务若依赖新版本、政策或价格，仍须重新核实。

## 现有依赖方法的吸收范围

从本仓库既有 `kim-decision`、`goalpro`、`agent-teams-playbook` 只吸收和专业交付直接相关的原则：证据缺口改变哪个选择、先查可取得事实、明示意图与推断分离、代理证据不代真实目标、独立上下文传必要材料、宿主成功返回才声称调用。

这些原则固定引用扩展前 Service commit 的实际文件。三个源包、独特提示词交付、完整 LICENSE/NOTICE 都保留。没有复制固定六阶段、复杂度树、历史工具名、第二路由/调度或批准状态。Service 的独立可用内容，与 Meta 是否将某包列入默认安装入口，是两个独立维护决定。

## 校验能证明的范围

根 checker 不硬编码角色名，按同一 schema 检查实际 capability 字段、知识资源、案例文件与诊断/决策 ID。错误输入类型、悬空引用、路径穿越/链接、超预算文件和自称专业 verified 的元数据应拒绝；文字判断的正确性不由这些检查自动裁定。

跨仓装配检查从真实索引发现全部 Agent，经显式测试宿主选择、loadDependencyAgentMethod 和 appendMethodInvocationContext 核对完整知识字节、摘要与 expertise 到达情况。这个检查不会调用真实模型，更不能证明每个行业的输出效果。合成案例与 `professionalEffect` 保持 `not_evaluated`。实际验证命令、计数和未覆盖环境见[验证记录](verification/expert-assembly-2026-11-10.md)。
