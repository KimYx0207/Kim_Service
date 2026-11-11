# 按真实任务扩展行业能力

本轮把 Kim Service 从 36 个 Agent、15 个 Skill 扩展到 **48 个 Agent、21 个 Skill**。保留原有 Hook 和 Tool，总计 **71 个组件、86 项可发现能力**。这些目录是可复用工作方法，不要求用户先学习角色名称；从“我要完成什么”选择对应能力即可。

## 这次补在哪里

| 用户常见任务 | 本轮补充 | 与原能力怎样配合 | 可以检查的结果 |
| --- | --- | --- | --- |
| 软件与移动开发 | [移动应用](../../agents/mobile-app-engineer/)、[数据管道](../../agents/data-pipeline-engineer/)、[自动测试](../../agents/test-automation-engineer/)、[API 契约](../../skills/api-contract-review/)、[数据库迁移](../../skills/database-migration/) | 与前端、后端、产品架构和安全审查协作 | 断网后草稿可恢复；重复提交只生效一次；数据重跑不加倍；旧客户端有迁移窗口 |
| AI 应用与搜索 | [应用 AI](../../agents/applied-ai-engineer/)、[检索评估](../../skills/retrieval-evaluation/) | 复用数据质量、来源核查和指标契约 | 同一批问题比较版本；检索与答案分别判分；无样本不宣布成功 |
| 云服务与发布 | [可靠性](../../agents/reliability-engineer/) | 与 SOP、后端及交付验证协作 | 金丝雀有样本、阈值、回退对象；普通小样本继续观察，严重不变量失败单独处理 |
| 产品、视觉与品牌设计 | [设计系统](../../agents/design-system-designer/)、[品牌视觉](../../agents/brand-visual-designer/)、[可访问性](../../skills/accessibility-audit/) | 复用交互设计、前端和用户研究 | 组件有真实状态；多语言图内文字实际翻译；键盘能完成任务；源文件可编辑 |
| 金融、财务与经营 | [财务建模](../../agents/financial-modeler/)、[会计对账](../../agents/accounting-reconciliation-analyst/)、[投资研究](../../agents/investment-research-analyst/)、[财务情景](../../skills/financial-scenario-modeling/) | 与经营现金流、定价成本及量化研究分工 | 原始报表口径明确；DCF、TTM和现金缺口可复算；同总额不同交易不误称对平 |
| 电商、零售与订阅 | [商业订单运营](../../agents/commerce-operations-designer/) | 连接商品文案、客服、店铺经营和供应链 | 订单/支付/发货/退款分开；重复事件不重复退款；退货验收前不加可售库存 |
| 教育与培训 | [教学评价](../../skills/learning-assessment-design/) | 补足课程、概念辅导及题目设计的学习效果检查 | 目标、任务和评分锚点对应；反馈能指导下一次练习 |
| 能源与可持续发展 | [能源项目](../../agents/energy-project-analyst/) | 与现有可持续分析、制造质量及系统工程配合 | kW/kWh分开；自用与外送不重复计收益；简化回本和完整现金流区分 |
| 内容、营销与媒体 | 延续选题、标题封面、脚本、媒体生产、推广与销售运营；增加品牌视觉衔接 | 从内容计划到可编辑物料和效果复盘 | 来源与素材明确，输出能在真实渠道使用 |
| 制造、采购、农业、医疗服务运营与招聘 | 延续已有制造质量、供应商比较、库存、农艺、医疗运营、招聘和系统工程包 | 新的对账、数据管道、SOP及评价能力可按任务组合 | 例如批次缺陷判断、到货前缺货、灌溉情景、服务排班容量和结构化面试 |

这是按实用任务补齐常用领域，没有把目录数量等同于覆盖所有职业。金融研究使用公开资料和明确假设，医疗服务包处理运营而非临床诊断；这些分工让任务能够找到实际方法。

## 每包应达到的制作标准

新增的 18 个包都有任务入口、输入解释、具体操作步骤、领域诊断、条件判断、完整教学交付、错误反例、来源说明和验收方法。新增 **108 项输出检查、54 个作者正反案例**，总计 **512 项输出检查、235 个作者案例**。案例的作用是说明怎么算、怎样判错；它们没有被宣称为模型效果评测。

关键错误按交付内容判断：重复扣款、数据丢失、错误估值公式、现金缺口漏报等，会影响对应成果；产物索引、表达补充和后续交接属于改进项，不会因为一个说明字段没写满就让全部工作停止。标准不是以长清单或统一分数抵消关键错误。

输入不齐时先识别依赖关系。例如财务资料缺价格时点，可以完成经营事实表；品牌颜色未选定，可以继续组件语义与黑白原型；缺屏幕阅读器，可以先做键盘检查。只有依赖缺失条件的结论或动作等待补齐。

## 实际可运行的局部算法

| 包 | 参考程序 | 验证重点 |
| --- | --- | --- |
| 财务建模 | [model.mjs](../../agents/financial-modeler/scripts/model.mjs) | 期末FCFF折现、终值条件、企业到股权桥接、下行和单因素敏感性 |
| 财务情景 | [calculate.mjs](../../skills/financial-scenario-modeling/scripts/calculate.mjs) | t0投入不折现；期末正余额仍可能有途中缺口 |
| 会计对账 | [reconcile.mjs](../../agents/accounting-reconciliation-analyst/scripts/reconcile.mjs) | 按币种和稳定ID逐笔匹配；重复与等额异笔不误配 |
| 检索评价 | [score-retrieval.mjs](../../skills/retrieval-evaluation/scripts/score-retrieval.mjs) | 重复ID不增加命中；空结果与无标签区别；宏平均分母明确 |
| 数据管道 | [replay-partition.mjs](../../agents/data-pipeline-engineer/scripts/replay-partition.mjs) | 固定分区重跑、版本更新、同版本冲突可见 |
| 订单运营 | [replay-money-events.mjs](../../agents/commerce-operations-designer/scripts/replay-money-events.mjs) | 重复与乱序事件不改变真实净收；无法解释退款保留差异 |
| 可靠性 | [evaluate-canary.mjs](../../agents/reliability-engineer/scripts/evaluate-canary.mjs) | 比例阈值需足够样本；明确关键失败信号可单独触发回退 |
| 能源项目 | [economics.mjs](../../agents/energy-project-analyst/scripts/economics.mjs) | 自用/外送独立计算；重复能量拒绝；无正净收入不算有限回本 |

这些程序都在包内，独立复制后可运行相应 `tests/calculation.test.mjs`。它们是范围明确的计算或状态参考，不是生产服务和第三方平台的替代实现。

## 清理了什么运行阻力

发现 `scripts/check-agent-pack.mjs` 原来要求**每个 Agent**的人工处理条件与边界段都出现“医疗、法律、金融、停”等关键词。移动开发或视觉设计即使没有这些任务，也必须加入同一警告才能通过。这会把无关的停机话术传播到专业上下文。

本轮将其改为检查实际角色边界和非空的触发条件，继续核对真实工具权限、声明的副作用和完整交付规则；内容是否合理由领域案例与审查判断。已有 40 个组件同步清理通用停机条款或调整检查级别，67 项背景/局限/交接检查改为提示改进；领域核心判断仍按其实际错误处理。没有扩大任何组件的工具权限。

## 参考项目和采用的做法

查阅日期：2026-11-11。这里只提炼适用原则与验收方法；每包 `PROVENANCE.md` 记录对应来源、采用部分及未采用内容，没有复制上游长篇文案或实现。

| 一手资料与项目 | 本轮采用的做法 |
| --- | --- |
| [Flutter 离线架构](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)、[官方源码](https://github.com/flutter/website) | 分清读、写、同步；用户看见本地草稿和远端确认的区别 |
| [Apache Airflow](https://github.com/apache/airflow)、[任务实践](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)、[dbt data tests](https://docs.getdbt.com/docs/build/data-tests) | 固定输入分区、可重跑结果和返回具体异常行的质量检查 |
| [MLflow](https://github.com/mlflow/mlflow)、[评价集](https://mlflow.org/docs/latest/genai/datasets)、[Ragas ID recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/) | 固定版本/题目、独立留出、分开检索和回答评价 |
| [Google SRE canarying](https://sre.google/workbook/canarying-releases/) | 小范围观察、基线比较、明确推进与回退 |
| [Playwright](https://github.com/microsoft/playwright)、[测试实践](https://playwright.dev/docs/best-practices) | 围绕用户可见结果、隔离测试数据、保存首跑失败 |
| [Design Tokens 2025.10](https://www.designtokens.org/tr/2025.10/format/)、[Storybook](https://storybook.js.org/docs/writing-tests/accessibility-testing)、[Penpot](https://github.com/penpot/penpot) | 语义token、组件状态故事和可编辑设计资产；不照搬工具或品牌 |
| [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)、[Carbon typography](https://www.carbondesignsystem.com/building-blocks/foundations/typography/overview) | 真实内容、语言字形、键盘焦点和阅读层级 |
| [SEC EDGAR API](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)、[Damodaran模型](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/eqspread.htm) | 原始报表期间/单位/版本；现金流与折现率匹配 |
| [Beancount](https://github.com/beancount/beancount)、[记账语言](https://beancount.github.io/docs/beancount_language_syntax/) | 按账户、币种和记录核对；余额相等不是逐笔一致 |
| [Shopify事件](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries)、[Stripe幂等](https://docs.stripe.com/api/idempotent_requests) | 重复投递和业务操作分开，回执未知时先查状态 |
| [SAM官方源码](https://github.com/NatLabRockies/SAM)、[财务模型](https://sam.nlr.gov/financial-models) | 性能、时段匹配和现金流分层，避免重复计收益 |
| [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html)、[PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html) | 接口版本与实际消费者检查，迁移锁和恢复依实际版本验证 |
| [CAST UDL](https://udlguidelines.cast.org/) | 目标、任务、表达方式和可行动反馈相互对应 |

GitHub 仓库用于查方法归属和实现组织。没有以 star 数、热度榜或引用数量证明专业有效；这批领域是按用户明确提出的开发、设计、金融以及现有实际任务缺口选择。
