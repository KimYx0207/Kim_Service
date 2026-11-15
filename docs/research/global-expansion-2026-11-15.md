# 出海研究与组件补充：2026-11-15

研究观察日期：2026-11-15 UTC。保留的原始工具返回于 2026-11-15 00:16:03 UTC 保存；原返回未包含精确读取时间的项目保留该缺口，不将页面抓取时间当查询时间。仓库基线 Kim_Service V1.17，commit ed0817eb0fe51bf47e7deaa83d069d184ad05d21。本文是研究和设计记录，不是市场需求已验证或外部服务已安装的证明。

## 1. 结论与现有覆盖

出海需要先判断谁购买什么结果，再确定地区、渠道、交付和回款。不能把跨境实物、SaaS、App、内容/IP、专业服务归成“翻译商品介绍”。当前最值得补一个 global-expansion-strategist：把分散的需求研究、经营指标、销售、财务、内容与技术选择变成可比较的海外进入路线；它交专业方案，不接管宿主调度、批准或账户。

以下为实际读取上述基线的 AGENT.md、method.json与关联脚本入口位置后的覆盖判断。没有运行旧测试，也没有把组件存在认定为真实业务效果。

| 场景 | 已有专业内容与路径（相对仓库） | 可以复用 | 明确缺口 |
| --- | --- | --- | --- |
| 跨境商品 | agents/commerce-operations-designer/method.json；agents/product-listing-writer/method.json | 订单/资金/库存分离、重复事件、部分退款、SKU事实与宣传条件 | 没有完整市场进入、关税/到岸成本、目标国退货与渠道比较；现有方法不能证明跨境履约合规 |
| SaaS/Web | agents/product-architect/method.json；skills/technology-option-evaluation/method.json | 架构取舍、需求证据、真实候选研究的要求与设计映射 | 缺海外获客、激活/留存、收款主体、产品语言与支持联动 |
| 消费 App | agents/user-researcher/method.json；agents/store-performance-analyst/method.json | 任务研究、样本边界、指标分母与可证伪试验 | 商店元数据/二进制分层、地区可用性与渠道归因没有专门方法 |
| 内容/IP | agents/media-production-engineer/method.json；agents/contract-review-analyst/method.json | 素材/时间轴质量、原文条款与商业后果 | 缺语言受众选择、字幕/配音/权利范围、平台分发与授权交易分开建模 |
| 专业服务/获客 | agents/sales-operations-analyst/method.json | 商机去重、阶段证据、签约/开票/回款分开 | 缺海外细分客户、可达渠道、时区/语言支持与先服务后产品的比较 |
| 收益与成本 | agents/pricing-cost-analyst/method.json；agents/financial-modeler/method.json | 现金与时间贡献、容量、经营现金流、压力情景 | 需要绑定各出海路线的收款/平台/物流/翻译/支持成本；不能套同一个CAC/LTV |
| 研究执行 | technology-option-evaluation 脚本与 method；product-architect/references/project-research.md | 方案对照、证据范围、进入同一PRD的原则 | 辅助脚本处理输入，不会代宿主联网；PROVENANCE 有 URL 不等于本次已研究 |

## 2. 本次实际联网搜索

使用 system1_search_query，包含 recency，而非记忆回答。主要查询：
- Tolgee 官方 localization / branching / QA / glossary（180天）
- PostHog 官方 product analytics / data residency / consent（180天）；pricing（90天）
- Apple App Store localization / custom product pages（365天）
- Stripe Managed Payments eligibility / supported business locations（180天）
- YouTube multi-language audio / titles / descriptions（365天）

随后实际 open 官方页面，并跟随 Stripe eligibility 细则。Stripe 的 .md 链接曾不可访问，已用不带 .md 的同一官方路径成功读取；不能把失败回执计入成功材料。

### 对决策有实质影响的发现

1. **收款方式按产品和主体分支。** Stripe Managed Payments 当前资格页把专业服务与实物排除在支持范围外；自动化数字产品仍需主体/产品/销售方式资格。官方网页没有核实用户自己的主体资格，因此服务出海路线不能直接复用 SaaS 的 MoR 推荐。[S1]
2. **外包交易支持不等于外包产品交付。** 官方说明用户仍负责产品支持，部分未覆盖交易的税务责任仍留给商家。方案要核支持责任和目标交易范围，不能称“一次接入解决全部国家”。[S2]
3. **App 商店翻译与产品本地化分开。** Apple 明确元数据语言不等于 Xcode 二进制本地化。当前自定义产品页可按不同意图配置并分析页面转化，页面也需经过审核；不能用页面安装转化代替产品留存。[A1][A2]
4. **内容语言实验有不同生产成本。** YouTube 多语音轨功能上传自己的配音，和自动配音是不同能力；本轮读取页写明 Advanced features 资格。不能声称打开开关即可自动完成翻译、权利、音画检查。[Y1]
5. **本地化工具与增长工具解决不同问题。** Tolgee QA 的技术检查不能证明文化语义或需求正确，且该平台功能属于付费能力；PostHog 支持漏斗与留存观测，但读到的 SDK 默认采集逻辑需要实际配置和测试，不能以选了 EU 区作业务合规结论。[T1][T2][P1][P2]
6. **成本与观测有边界。** PostHog 当前免费额度/上限存在事件丢弃和 feature flag 默认响应行为。预算上限不是纯账单事项，会改变验证数据完整性；Stripe 当前 Managed Payments 额外3.5%不能当全部支付成本。[P3][S3]

## 3. 两个外部 GitHub 项目的实际读取

### Tolgee JS：产品语言适配候选

- 仓库：https://github.com/tolgee/tolgee-js
- 固定 commit：1d00678460dc2a0cd77bd4a7201aba8607b88050
- commit 时间：2026-11-11T11:05:34Z；message v7.3.1；@tolgee/core 7.3.1。
- 实际读取：完整 LICENSE、packages/core/package.json、packages/web/src/package/LanguageDetector.ts、packages/format-icu/src/createFormatIcu.ts、createFormatIcu.test.ts、packages/core/src/__test/languages.test.ts；BackendFetch.ts 阅读了超时/取消实现片段，未据此评价全部加载容错。
- 行为依据：语言检测先精确匹配再匹配语言子标签，依据浏览器偏好；ICU格式器有 locale 规范化；语言测试含切换、fallback、多语言namespace和缺语言错误。这证明代码处理这些技术分支，不证明目标国文案自然、RTL布局通过或需求成立。
- 权利/依赖：SDK MIT；读取 core devDependencies 的 intl-messageformat、Jest/jsdom，格式器实际导入 intl-messageformat。本轮未审计传递依赖漏洞。平台 QA 与 SDK 许可是不同范围。
- 采用条件：已有多语界面、术语/发布分支需求，允许维护翻译资源。放弃/延后：只有一页验证意图且尚无目标用户，手工两种文案与有界测试可能足够；不把翻译平台当市场选择工具。
- 未观察：没有 clone/build/运行上游测试、没有部署 Tolgee、没有审阅整个平台授权实现或当前 issues backlog。只凭近期 commit 不宣称维护质量与安全性。

### PostHog JS：产品价值与渠道实验观测候选

- 仓库：https://github.com/PostHog/posthog-js
- 固定 commit：ab4d5198a585b9da5ad71a069ab389f08a436d3f
- commit 时间：2026-11-14T08:20:52Z；browser package posthog-js 1.449.2。
- 实际读取：完整 packages/browser/src/consent.ts、utils/request-router.ts；consent.test.ts 的测试名及默认采集/禁采、存储、DNT/GPC、授权前feature-flag曝光相关测试片段；package.json 版本、license、test scripts和dependencies；LICENSE 主声明及各组件许可段标题。
- 行为依据：ConsentManager 将 pending 与 denied 分开；默认采集测试期望 opted-in，但 explicit status 仍 pending；默认禁采和默认禁持久化是不同配置。DNT/GPC取决于 respect_dnt。RequestRouter 根据配置区分 US/EU/custom，允许 flags/asset host 独立配置。
- 决策影响：验证计划必须明确 consent前后事件、身份去重、完整路径地域、预算封顶后的缺数；不能把导入SDK当已测量、把所有用户加入实验而没核曝光。
- 权利/依赖：browser package声明 (Apache-2.0 AND MIT)，仓库LICENSE保留多个组件许可；dependencies包含 workspace包、core-js、dompurify、fflate、preact、web-vitals等。没有复制上游源码。
- 采用条件：产品已经能交付一个真实结果，需要按来源/语言/版本看激活、回访与付费。放弃/延后：只需少量B2B访谈/付费试点时，CRM记录与账单可先完成主要验证；不为一次性服务强加整套产品分析。
- 未观察：没有执行上游测试、网络抓包、真实 consent CMP联调、完整依赖审计、生产数据或因果效果；不是合规认证。

## 4. 可比较的市场 × 产品 × 渠道路线

以下是供用户选择的条件路线，尚不知道用户资产、预算和目标，不宣布其中某条已被选定。地区从本次客户行为、可触达受众、支付与服务条件产生；语言并不等于国家，不维护固定国家排行榜。

| 路线 | 首个可交付结果与候选市场依据 | 渠道与最小落地 | 主要成本/衡量口径 | 选择条件/放弃理由与未知 |
| --- | --- | --- | --- | --- |
| A 专业服务先成交 | 给某一海外细分职业完成明确任务；候选地区由现有可信关系/案例语言/时区支持产生 | 公开需求研究→示范案例→宿主获授权后客户访谈/付费试点；伙伴渠道或明确细分客户接触，不能自动发信 | 销售/交付小时、获客现金、重做、付款周期；每个付费项目现金与含时间贡献、按期交付 | 有领域能力而需求仍不明时可优先探索；不适合需要极高交付规模且没有专业能力的人。客户愿付和回款未知；Stripe MoR数字品方案不直接适用[S1] |
| B 垂直SaaS/Web | 为特定岗位反复减少某项成本；先从实际需求语言与可达细分用户挑市场 | 行业内容/演示/相关开源生态→一个可用闭环→激活、复访、付费；先一个locale，再扩展 | 工程、云/AI、支付/退款、本地化、产品支持；按同群每付费账户月贡献，不拿访问量当价值 | 有重复任务、可自助交付和留存迹象时推进；若用户每次都需重定制，先保留服务。MoR资格、CAC、留存期限未知；先比较自营收款与合格MoR而非默认开户[S1][T1][P1] |
| C 消费App按意图切入 | 有本机设备/通知等确实需要App的任务；候选市场由真实搜索/评论/试用信号产生 | 本地商店元数据和截图→独立二进制体验→审核→小范围页面/来源对照→激活/留存 | 商店条款、工程/审核、素材与投放、支持；安装到任务完成、付费及留存队列分开 | 确有App必要性、能承担审核时合适；网页可完整交付时先比较Web降低前期成本。当前目标storefront规则和付款方案待核，不能套Web支付建议[A1][A2] |
| D 内容/IP先验受众 | 已有版权明确内容/人物/教程；候选语言来自作品原有观众与检索需求 | 一段代表内容字幕/配音→审核听感和权利→单平台小批次分发；B2B授权另建交易路线 | 翻译/配音/字幕、配乐/肖像权、编辑、分成；完播/回访与授权收入分开 | 已有内容资产和可达受众适合；没有权利或只有热度就不扩大生产。多语音轨不自动生成配音，频道资格与权利仍待核[Y1] |
| E 跨境实物小批验证 | 明确SKU、产品适用与可交付优势；按客户需求和到岸履约条件筛市场 | 平台/独立站/分销择一做样品和小批；退货与物流报价先入账 | 售价减退款、货、运、税、平台、支付、售后、获客及资金占用；同币种单订单贡献 | 有供货/履约优势才推进；贡献为负或退货无法处理时先调价格/渠道/产品。不能由“英文文案完成”推断可跨境销售；具体地区规则另查 |

一条方案只换国旗、语言或渠道名字，价值提供/交付方式/单位经济完全相同，不能称作实质不同策略。对同一用户应筛出多个实质不同且可行的路线，通常以3条展开；实际只剩更少时说明证据和淘汰原因，不凑数。

## 5. 最值得新增的专业包与验收

新增 agents/global-expansion-strategist/，沿用 caller-only 接受和 host-bound-task-method-v1。它接收一句意图也可以先交市场×产品×渠道比较：没有关键价值信息就保留条件建议，实际执行和用户选择仍由当前宿主负责。

交付应包含 researchLedger、marketRoutes、economics、localizationOperations、validationPlan、decisionMemo、handoff。可变事实每次复核；GitHub候选必须记录commit、日期、代码/测试/许可阅读范围与未执行范围。已有来源只算历史知识，不能填写为本次搜索回执。

专业验收重点：
- 出海类型、目标任务、购买者、国家/语言/主体、渠道/交付模式分开；
- 多个实质不同且可行的方案，通常以3条展开；实际更少时说明证据和淘汰原因，不凑数；未知价值不伪装推荐已确认；
- 同币种/同期间/同业务单位计算现金与时间贡献；无有限盈亏平衡、缺成本、缺成熟留存不补假数字；
- SaaS与服务不能共享未经资格核实的收款建议；平台能力与当前账户资格分开；
- App元数据与产品体验、本地化技术与文化语义、内容分发与IP权利分开验收；
- 每条候选方案有可逆验证、负责人/时间/预算假设、观察窗口、成功/停止/转向条件，实际投放/开户/消息不由组件自动触发；
- 回写同一PRD中的需求、决定、技术选择和项目专业能力，不新建调度器；
- 合成例子和本地数学/结构检查不宣称真实市场、原生模型或运营成功。

## 6. 来源台账与阅读边界

| ID | 官方来源或不可变源码URL | 当前会话ref / 实际阅读范围 |
| --- | --- | --- |
| S1 | https://docs.stripe.com/payments/managed-payments/eligibility | turn128891577view0；账号、主体地点、数字产品、实物/专业服务排除、自动化要求 |
| S2 | https://docs.stripe.com/payments/managed-payments/how-it-works | turn128891577view1；税务范围、产品支持、交易支持与费用字段；未核用户合同 |
| S3 | https://stripe.com/managed-payments | turn611132684search8、turn886994830search0；3.5%附加服务费与基础支付费用区分；价格是检索快照 |
| A1 | https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/ | turn819836653view1、turn661670516view3；元数据/二进制区别、语言fallback |
| A2 | https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions | turn661670516view1、turn733753732view2、turn733753732view3；当前70页、展示/审核/分析条件；不是账户实操 |
| Y1 | https://support.google.com/youtube/answer/13338784?hl=en | turn819836653view2；人工上传音轨、资格、元数据发现；未读取账户 |
| T1 | https://github.com/tolgee/tolgee-js/tree/1d00678460dc2a0cd77bd4a7201aba8607b88050 | GitHub connector实际raw读取，文件范围见第3节；上游测试未执行 |
| T2 | https://docs.tolgee.io/platform/translation_process/qa_checks | turn819836653view0；占位符/ICU等检查、付费条件、语言与语义局限 |
| P1 | https://github.com/PostHog/posthog-js/tree/ab4d5198a585b9da5ad71a069ab389f08a436d3f | GitHub connector实际raw读取，文件范围见第3节；测试只阅读未执行 |
| P2 | https://posthog.com/docs/privacy/data-storage ; https://posthog.com/dpa | turn684772837search0、turn819836653view3；turn684772837search4；存储选择与处理边界，未给跨法域法律结论 |
| P3 | https://posthog.com/pricing | turn661670516view2、turn733753732view4；免费/封顶丢数和默认响应边界 |
| P4 | https://posthog.com/docs/product-analytics | turn684772837search5；指标取决于实际事件、身份与属性输入 |

未做：用户的海外客户访谈、关键词商业需求定量、投放、账户资格核验、支付测试、真实SDK安装、上游测试运行、RTL/无障碍/机型测试、著作权链核验、海关与目标国法律专项研究。不能用以上官方工具资料补成这些已经完成。当前足以改进方法和交付边界，尚不足以替用户选国家、承诺收益或证明行业效果。
