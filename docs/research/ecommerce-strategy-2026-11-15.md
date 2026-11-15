# 电商专业能力：真实研究与缺口记录

研究日期：2026-11-15 UTC。只读调查 Kim_Service 与公开资料；以下是本轮工具观察的人工研究笔记，不是商家运行结果、模型效果评测或专业验收回执。源码首批抓取时间记录为 `2026-11-15T00:05:24.672Z`，补充正文/代码阅读发生于同日 00:08–00:12 UTC。没有运行上游项目、购买服务、联系商家或改动生产数据。

## 1. 本地基线与专业覆盖

基线为已发布 V1.17。读取既有组件的 capability、method、专业方法、案例与相关计算入口；没有把目录名称当作已验证能力。

| 电商环节 | 现有组件与实际深度 | 尚缺的专业判断 |
| --- | --- | --- |
| 经营路线/渠道组合 | `launch-planner` 是通用上线计划；`product-architect` 管产品取舍 | 受众、价值、选品、平台/内容/自营路线与商业模式的联动比较；用户未决定时的选择卡 |
| 商品信息与购买决策 | `product-listing-writer` 区分规格事实、用途与未经证实的卖点，检查型号/价格一致 | 渠道可行性、需求证据、退货结构与真实单位经济，不应由商品页文案替代 |
| 店铺经营复盘 | `store-performance-analyst/scripts/calculate.py` 实现同口径 SKU/渠道指标、退款净收入、列示成本贡献及流量/转化/客单的算术分解；缺项保留 null，不伪造 CAC/ROAS | 跨路线的资源投入、现金缺口、广告/达人费用完整映射、成熟退款队列与复购窗口选择 |
| 支付/订单/退款 | `commerce-operations-designer` 专业方法分状态、事件幂等、未知结果先查询；`scripts/replay-money-events.mjs` 实际仅做单订单/单币种的支付与退款事件回放 | 多渠道库存/履约与经营扩量之间的可兑现约束，不应把资金 helper 称为完整订单系统 |
| 备货/仓配 | `warehouse-operations-analyst`、`supply-chain-planner` 有仓位/状态、批次、时序库存和采购限制方法；`skills/inventory-replenishment` 有稳定需求、固定提前期、定期盘点模型 helper | 爆款脉冲、新品、间歇需求、缺货导致的需求截断、需求与供货不确定性；超出模型假设需换方法 |
| 采购 | `supplier-comparison-analyst` 有规格可比与总拥有成本计算/交付 | 选择何种商品组合、渠道毛利与现金约束共同约束采购 |
| 售后 | `customer-service-writer` 约束话术事实与授权；`skills/customer-case-operations` 实现案件事件与材料版本追踪 | 当前地域/平台/品类的处理期限和实际事件定义；退款成功不能自动推定已收货或可再售 |
| 内容电商 | `skills/xiaohongshu-skill` 提供选题、正文和图文素材生产 | 内容→商品→成交→履约→退款后贡献的证据链，达人佣金、样品与素材工时成本 |
| 分析与实验 | `metric-contract`、`experiment-analysis` 有口径、随机化单位、SRM、效果区间等方法 | 从经营瓶颈选择试验并约束预算、库存与归因，不用播放量代替利润 |

上述专业方法的 `runtimeStatus` 仍为 `needs_probe`；专业案例明确是 `authored_examples` / `not_evaluated`。本次只读代码和案例，不将它们称为商家效果验证。

### 品类不是服装的同义词

| 细分场景 | 必须改变的经营判断 | 可复用基底/当前限制 |
| --- | --- | --- |
| 标准耗材/清洁替换件 | 补货周期、复购队列、运费占比、组合装与真实耗用 | 补货/店铺分析可复用；不能用首购优惠队列推永久复购率 |
| 尺码/适配型商品（服装、配件） | 尺码/兼容性退货、SKU 深度、季节库存、逆向物流 | 商品资料/仓配可复用；需品类退货原因和可再售率 |
| 食品/鲜活/易耗期品 | 批次、保质期、温控、临期损耗、可达区域 | 时序库存方法有基础；资质与配送要求须当前一手来源，本轮未作法律判断 |
| 消费电子/耐用品 | 序列号、保修、维修/换新成本、兼容性证据 | 客服与订单状态有基础；不能用低频商品硬套月复购 |
| 大件/定制家居 | 预约交付、安装、生产产能、定金尾款、取消损失 | 供应链方法有基础；不能承诺一般现货同样的交付时间 |
| 数字商品/订阅 | 权益交付、续费、取消与已履行期间的退款关系 | 订单专业方法覆盖概念；实物库存和实物退款规则不直接适用 |
| 企业批发/门店协同 | 阶梯价、审批、账期、渠道库存分配、回款 | sales-operations 与仓配可复用；普通 DTC 漏斗不足以评价账期风险 |

## 2. 本轮真实外部研究

### 检索与阅读方法

使用 `mcp__codex_apps__search_service_web_run` 的 **system1_search_query + recency:90** 检索 Shopify / TikTok Shop 官方文档及 Medusa / Saleor 资料，随后用 `open` 读原文。另以同样方法检索抖音电商与淘宝官方规则。`recency` 是检索约束，不保证每条命中都是新发布；旧公告、意见征集和失效条目没有当作现行规则。

源码通过 `mcp__codex_apps__github_fetch` 请求 GitHub commit API、目录 API 和 **固定 SHA 的 raw 文件**。已读具体实现、断言和依赖，未使用 stars 或 README 替代评估。Web `open` raw GitHub 地址返回 DisabledError，但 GitHub connector 成功返回源文件；不能引用失败的 web ref 作为源码已读取证据。

### 官方规则与变更

| 来源/真实 URL | 页面日期/读取状态 | 工具 ref | 本次采用与限制 |
| --- | --- | --- | --- |
| [Shopify 库存状态变更](https://shopify.dev/changelog/posts/draft-order-and-transfer-shipment-inventory-is-moving-from-reserved-to-committed) | 2026-08-05；已读正文 | `turn476899682search3` → `turn227468564view0` | 草稿单和调拨/运送的部分在途占用从 reserved 转至 committed，可售与实物总量不变。采用：库存字段必须绑定 API/平台语义，不能按同名字段跨系统相加。未采用：将此迁移当成可售库存增长。 |
| [Shopify 2026-10 release notes](https://shopify.dev/changelog/release-notes/2026-10) | 2026-10 版本；已读订单、库存与事件段落 | `turn476899682search2` → `turn227468564view1` | 订单地址变更可能重算税额，取消需确认异步结果；库存到货取消有对应数量。采用：经营与对账要确认最终状态及金额。未采用：把最新 API 直接当作商家已安装版本。 |
| [TikTok Shop US Affiliate Marketing Policy](https://seller-us.tiktok.com/university/essay?knowledge_id=2244964886103809) | 正文 **2026-10-21**；已读 | `turn476899682search7` → `turn227468564view2` | 佣金合作与店铺/商品资格是不同条件。采用：内容路线要列资格、佣金、样品与可履约商品。未采用：照搬 US 门槛到中国抖店，或因店铺合格就假定所有 SKU 合格。 |
| [TikTok Shop US Fulfillment Policy](https://seller-us.tiktok.com/university/essay?anchor_link=EB8600D0&course_type=1&from=search%7BcontentIdParams%7D&identity=1&knowledge_id=3995852763301633&role=1) | 正文 **2026-09-28**；已读 | `turn476899682search5` → `turn227468564view3` | 现货、定制、预售、虚拟商品有不同履约事件与时间口径；普通单的发货判断包含承运商扫描。采用：增长计划受真实可履约能力与事件证据限制。未采用：把运单生成当作一律发货完成，或把 US SLA 全域化。 |
| [抖店商家发货行为管理规则](https://school.jinritemai.com/doudian/web/articlev0/101706?from=shop_default) | 搜索抽取可读；open 为零行 | `turn317903835search0` / `turn776240588view0` | 发现不同履约模式及承诺时点。仅作待核查入口；本轮不能据此给具体商家确定时限。 |
| [抖店商家售后服务管理规范](https://school.jinritemai.com/doudian/web/articlev0/104600?from=web_znx&from_school=1&should_full_screen=1&should_hide_bottom_nav=1) | 搜索抽取显示近月更新；open 为零行 | `turn317903835search2` / `turn776240588view1` | 发现不同售后类型、商品范围、商家承诺影响；未读完整现行规则，数字与资格待核。 |
| [秋冬服饰预售权益细则](https://school.jinritemai.com/doudian/web/articlev0/aJqjbvEndQAR) | 搜索正文抽取日期 2026-09-30；open 为零行 | `turn317903835search5` / `turn776240588view2` | 只证明检索有品类/时段专属条件。不能外推到食品、家电或全年预售；本包不固化该门槛。 |
| [已失效极速退款规范](https://school.jinritemai.com/doudian/web/articlev0/aJnLBxo1N9UM?from=0313h5&from_school=1&should_full_screen=1&should_hide_bottom_nav=1) | 搜索标题明确 2026-07-09 失效；open 为零行 | `turn317903835search4` / `turn776240588view3` | **不采纳为当前规则**。作为真实反例说明“今天搜得到”不等于“今天有效”。 |

搜索发现的淘宝 API 接入说明（`turn317903835search6/7`）未继续读完整原文，不作为已评估实现或当前商家政策。未采用第三方新闻与卖家博客作专业技术依据。

### 两个 GitHub 项目的实现比较

| 项目/固定 revision | 实际阅读路径与关键点 | 采用/不采用 |
| --- | --- | --- |
| [Medusa](https://github.com/medusajs/medusa/commit/01de0be27a7c228795d5cfc31662ca144781fbfc) — `01de0be27a7c228795d5cfc31662ca144781fbfc`，提交 2026-11-13T14:56:08Z | `packages/core/core-flows/src/cart/workflows/complete-cart.ts`：cart lock、查询既有 order link、有条件建单、预留库存、末段授权支付；`cart/steps/compensate-payment-if-needed.ts`：补偿前查看后来是否已有订单，避免对成功重试退款；`packages/modules/inventory/src/services/inventory-module.ts`：按地点检查可用量、事务创建 reservation，显式 backorder 例外；`integration-tests/__tests__/inventory-module-service.spec.ts`：超量预留拒绝且占用不变、backorder 例外、提高预留超可用量报错；`packages/modules/inventory/package.json`：模块2.22.7、Node >=22.22.0。 | 采用业务不变量：支付/订单/库存/履约分别确认；补偿前核对当前事实；预售是需经营承诺的例外。**不移植源码，不把 `idempotent:false` 当业务完全无幂等，不将注释当并发正确性证明，不因模块存在就推荐换平台。** |
| [Saleor](https://github.com/saleor/saleor/commit/5e1679b1e91f76ac9fd553a62adeffb6e9acf5c3) — `5e1679b1e91f76ac9fd553a62adeffb6e9acf5c3`，提交 2026-11-13T14:55:51Z | `saleor/warehouse/reservations.py`：按 channel/country/warehouse 查库存、锁定对象，扣除订单 allocation 与未到期 reservation，再分仓预留；不足抛 InsufficientStock；`saleor/warehouse/tests/test_stock_reservations_management.py`：预留5后实物10仍为10、跨仓3+2、旧预留替换、既有订单 allocation 与其他 reservation 造成不足；`pyproject.toml`：main 为3.24.0-a.0、Python >=3.12,<3.13、Django~=5.2.19。 | 采用业务不变量：实物、订单占用、临时预留、到期释放分开；店铺可售量取决于渠道与地域。**不采用“开源免费=总成本低”，不把仓库main alpha当稳定推荐，不把测试文件存在当本轮测试已通过。** |

源码路径均可用 `https://github.com/{repo}/blob/{完整SHA}/{上表路径}` 复查。实际工具为 GitHub connector fetch；未产生可引用的成功 web ref，失败 ref `turn122521909view0`–`view3` 只记录抓取通路限制。

GitHub `releases/latest` 实际返回：[Medusa v2.22.7](https://github.com/medusajs/medusa/releases/tag/v2.22.7)，发布2026-11-13T12:27:45Z；[Saleor 3.23.49](https://github.com/saleor/saleor/releases/tag/3.23.49)，发布2026-11-12T12:31:59Z。这里只记录稳定版本与研究快照不同，没有安装或部署建议。

**未读/未验证**：完整安全审计、全部 checkout/退款/税务/支付适配器、生产并发负载、迁移、运维成本、商家真实账单/客户队列、国内平台登录态当前资格与通知。没有跑第三方测试。仓库方法和两套源码可形成研究假设，不能证明商家收益或平台百分百正确。

## 3. 可比较的经营路线

| 路线 | 用户结果与适用前提 | 成本/约束 | 应观察什么 | 何时反转 |
| --- | --- | --- | --- | --- |
| 平台店经营修复/聚焦 SKU | 已有平台流量与订单，先增加可留存的履约后贡献 | 平台费、广告、退款、仓配、库存资金；依赖规则与搜索位置 | 同口径订单队列、退货原因、可售率、所列成本贡献、回款时点 | 修复后贡献仍为负；品类/资格不匹配；平台获客的经济上限长期不足 |
| 内容/达人带货 | 商品价值可演示，有持续内容能力或合适达人；用有限 SKU 验证真实需求 | 佣金、样品、制作工时、内容审核、脉冲需求、履约产能 | 内容→商品访问→支付→交付→成熟退款队列的贡献，素材和达人分开核 | 只有播放量；佣金/退货吃掉贡献；产能无法承接；重复素材无新购买证据 |
| 独立品牌/自营站复购 | 有差异价值、可触达客户与合理复购机制；自营站服务关系/复购 | 获客、支付、站点与插件、客服、数据治理；开源另有开发运维升级成本 | 新老客分队列、首次贡献、复购毛利与间隔、留存、现金回收 | 没有自有触达能力；回收期越过资金耐受；低频耐用品硬套月复购；定制成本无对应用户收益 |
| 企业/门店补货协同（适用才展开） | 企业重复采购、账期/审批/组合交付比短期流量更关键 | 信用与回款、分仓占用、合同服务、销售周期 | 可履行订单、按期足量、回款、客户集中度 | 销售增长却逾期应收扩大；定制交付成本超过合同贡献 |

这些是实质不同的业务选择，不是 Shopify / Medusa / Saleor 三个技术名字。实际任务不固定方案数量；已有决定不重问；排除的路线解释与当前事实的冲突。技术方案仅在业务路线和必要差异明确后比较。

## 4. 最值得补的专业包

建议新增 `agents/ecommerce-strategy-planner`，负责“受众/价值/选品/渠道/商业模式/成本的选择与反证”，连接既有店铺计算、商品、库存、订单与客服能力。它不接管发布、投放、改价、退款或最终选择。

可检查交付：事实与缺口诊断；用户未决定时的选择卡；按结果/前提/成本/风险/反转条件比较的路线；来源→发现→采用/不采用→决定记录；同币种同队列的列示成本贡献与现金时间表；履约/退款/复购的约束；带条件推荐；有预算上限、观察成熟期、停止/重开条件的最小验证。采用真实外部资料的方法，但每轮搜索/读取由 host 实际执行并保存记录；包内 PROVENANCE 和合成 worked example 不冒充本轮研究或真实经营结果。

中国规则无法完整读取只限制相关 SLA/资格决定，其余路线分析与用户现有数据仍继续。缺成本不得填零；首购队列未成熟不能算长期 LTV；GMV、退款净收入、贡献和可用现金分别报告。

## 5. 本轮落地

已新增 `agents/ecommerce-strategy-planner/`：只读角色、capability/method、四份渐进加载专业资料、完整合成输入输出、九个专业边界评审案例与独立契约检查。采用来源与决定映射见包内 PROVENANCE；当前任务研究和作者案例仍严格区分。一般方法不固定方案数量：示例展示三条业务路线，实际都不成立时允许没有可行路线并说明排除依据和重开条件。没有复制第三方实现、改业务系统、发布或运行上游项目。
