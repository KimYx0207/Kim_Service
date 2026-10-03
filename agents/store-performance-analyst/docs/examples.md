# 计算API与四类参考成品

所有输入、数字和交付均为完全虚构设计样例，不是客户资料、已发生业务或工具调用证据。实际宿主调用应另记命令、版本、exit、stdout及与输入对应的receipt；没有调用就没有receipt。

## API补充

接口、限制和固定文件名见[README](../README.md)。合法JSON只接受文档字段；额外字段、重复JSON键、重复period/sku/channel、负数、布尔、非整数数量、非有限值、超限数值/字节/行数或CLI参数都会exit2并返回invalid_input，且不回显输入。JSON数字经Decimal直接解析，缺失/null保留未知。definitions省略或缺字段合法但partial，不能跨期比较。comparison省略只列各行。

calculationTable每行含period/sku/channel、definitions、inputs、metrics。comparisons每项含两期标签和SKU/渠道；可比时给deltas和revenueDecomposition，不可比时给not_comparable/reasons/conflictingFields/unknownFields，不提供差值。

| metrics键 | 算式与语义 |
| --- | --- |
| visitorToImpressionPercent | visitors/impressions×100；不是点击率 |
| paidOrdersPerVisitorPercent | paidOrders/visitors×100；不是支付买家率，可超过100% |
| grossRevenuePerPaidOrder | grossRevenue/paidOrders，按声明币种 |
| netRevenue | grossRevenue−refundAmount，按声明退款基准；跨期退款可能使结果为负 |
| refundAmountToGrossRevenuePercent | refundAmount/grossRevenue×100；不是退款订单率 |
| adSpendPerAllPaidOrders | adSpend/全部paidOrders；没有归因含义 |
| contributionAfterListedCosts | netRevenue−adSpend−goodsCost−fulfilmentCost−platformFees；缺任一成本为null，非最终净利润 |

deltas为当前值减基准值，比率差单位为百分点。缺字段与零分母都给null，quality说明缺项或zero_denominator；原始零仍保留在inputs。期长、币种、访客、订单、退款、归因任一不同或未知，都拒绝两期比较；保留逐行指标及其定义。无跨SKU/渠道汇总，不推断去重或订单分配。

收入算术分解以V=访客、O=订单、R=毛收入，下标0/1为基准/当前：trafficEffect=(V1−V0)×R0/V0；conversionEffect=(O1−V1×O0/V0)×R0/O0；basketEffect=R1−O1×R0/O0。顺序是流量→订单/访客→客单，三项合计R1−R0；该顺序会影响贡献分配，不证明原因。refundEffect=F0−F1，netRevenueDelta=(R1−F1)−(R0−F0)。缺V/O/R或任期V/O为零时分解不可用；不把无法识别的客单填零。输出最多6位小数分别half-even舍入，分项可能有微小舍入差。

## 正常可用

**输入**：[normal.json](../fixtures/normal.json)。用户额外约束：新增支出0元，观察7天，库存不可售或支付故障立即停止效果试验。

**参考成品**：

- dataQuality：SKU-A/organic两期均7天、CNY、周期SKU渠道去重访客、支付订单、订单所属期退款；可比较。8单与4单样本小，未证明长期趋势。各项成本明确提供，不代表税费和固定成本齐全。
- metricsTable：访客/曝光均100/2000=5%；订单/访客8/100=8%→4/100=4%，下降4个百分点；客单均60元。净收入480−30=450元→240−20=220元。覆盖所列成本的贡献450−0−200−40−10=200元→220−0−100−20−5=95元，非最终净利润。
- findings：毛收入减少240元；按流量→订单/访客→客单分解为0、−240、0元；退款少10元，净收入少230元。不能据此确认广告增量、平台算法或库存原因。
- hypotheses：是否存在主规格缺货、运费或支付条件变更，需两周库存及变更记录；目前均待验证。
- experiments：先零新增支出核库存和支付；发现不可售或故障即停止效果试验先修复，否则下一7天观察同口径订单/访客和净收入，由用户决定是否继续。未代改广告或业务系统。

工具参考状态应为completed，quality为空；实际receipt必须来自真实运行，不能从本段摘造。

## 缺字段部分可用

**输入**：[missing-fields.json](../fixtures/missing-fields.json)。用户额外约束：只做材料核查，新增支出0元，观察7天。

**参考成品**：

- dataQuality：期间和漏斗口径可比；两期缺退款、商品/履约/平台成本，上期也缺广告费。只能复盘毛收入及漏斗，净收入、贡献与投放回报未知。
- metricsTable：访客/曝光均5%，订单/访客8%→4%，下降4个百分点；客单均60元。净收入及覆盖成本后的贡献均未知；本期60/4=15元是广告费/全部订单，不是广告获客成本。
- findings：访客数不变，支付订单少4单，毛收入少240元；流量项0、订单/访客项−240元、客单项0。无法确定退款净收入或利润变化，无法确认广告效果。
- hypotheses：库存、运费或来源构成变化待核；需补两期退款基准记录、成本明细和广告归因订单/收入。
- experiments：先零新增支出补齐退款和成本，核对价格/库存记录；保持7天同口径观察。如数据仍缺，停止利润和投放结论；出现不可售或支付故障先修复，由用户决定后续投入。

工具参考状态为partial，missing_fields标明每行缺项。缺值保持null，不能把计划补数写成已完成。

## 口径冲突不比较

**输入**：[definition-conflict.json](../fixtures/definition-conflict.json)。用户额外约束：新增支出0元，只接受同口径两周比较。

**参考成品**：

- dataQuality：上期访客是周期去重100，本期是每日去重相加120；上期退款按订单所属期，本期按退款发生期。访客和退款定义冲突，拒绝跨期比较/汇总。
- metricsTable：上期订单/周期去重访客8/100=8%，净收入480−30=450元，所列成本贡献200元；本期订单/每日去重相加访客4/120≈3.333333%，发生期退款净额240−20=220元，所列成本贡献95元。各期定义随指标呈现，不报告下降多少或贡献变化。
- findings：仅能确认每期材料中的独立数值，不能交收入归因分解、跨期率差或利润趋势，也不能相加得店铺唯一访客。
- hypotheses：表面差异可能来自口径变更；需同样去重窗口和同样退款归属导出材料，尚未证实业务恶化。
- experiments：零新增支出先请用户提供两期一致口径材料；未对齐时停止两周优劣和投入判断，观察窗口也待材料对齐后由用户确认。

工具参考状态为partial，comparisons.status为not_comparable，conflictingFields包含visitorBasis/refundBasis；无deltas或revenueDecomposition。

## 工具不可用，材料内定性

**输入**：用户提供missing-fields例的数据和“本次宿主未绑定可用计算入口”；新增支出0元，只查可用材料。

**参考成品**：

- dataQuality：未执行计算工具，本次没有calculationReceipt。材料说明曝光与访客相同、订单和毛收入较少；退款和成本未知。
- metricsTable：保留材料中的上期/本期曝光2000/2000、访客100/100、订单8/4、毛收入480/240元；净收入和贡献未知。此处只列材料数，不制造工具结果。
- findings：材料呈现订单与毛收入减少，暂不能判断净收入、利润或广告增量。
- hypotheses：库存、运费或支付条件变化需查看用户明确提供的记录，不能确定原因。
- experiments：先零新增支出核查可用库存/价格/运费记录和缺项；同口径材料齐全且宿主另行授权后可计算，未补齐前停止利润及投放结论。最终动作归用户或Meta_Kim。

tool_unavailable是角色交付的工具可用性说明，不是helper的status值；不可捏造completed/partial执行回执。某次入口ENOENT只能证明该次调用失败，不表示整台设备没有Python。
