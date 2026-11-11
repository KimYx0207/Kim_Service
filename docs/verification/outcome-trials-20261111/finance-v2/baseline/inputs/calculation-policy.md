# 本次预测的统一计算口径

这些是本题明确给定的模型假设，基准与带方法包两组完全相同，不是实际业务事实。

- 月份共12期。第i期从0开始：销量 = round(initialUnits × unitsMultiplier × (1 + monthlyGrowth + growthDelta)^i)，每月直接从首月推导，销量四舍五入为整数，不用上月已取整销量复利。
- 收入 = 销量 × unitPrice × priceMultiplier；变动成本 = 销量 × variableCostPerUnit × costMultiplier。固定费与折旧沿用明确输入。
- 税前利润 = 收入 − 变动成本 − 固定费用 − 折旧；税额 = max(0, 税前利润) × taxRate；净利润 = 税前利润 − 税额。税额当月支付，不做亏损结转。
- 实际回款 = 本月收入 × collectionShare + 上月收入 × (1 − collectionShare)，首月另收全部期初应收。
- 供应商付款 = 本月变动成本 × paymentShare + 上月变动成本 × (1 − paymentShare)，首月另付全部期初应付。
- payments = 供应商付款 + 固定费用 + 当月税额 + 当月capex；financing只使用明确输入，不自动补款。
- 月末现金 = 月初现金 + receipts − payments + financing。应收/应付按期初余额加当月发生额减当月结算额滚动。
- 每行金额计算后保留两位小数；后续计算使用这些金额。等距舍入采用Math.round(x × 100)/100的规则，不把年度合计重复当成现金流。
- summary.endingCash = 12月末现金；summary.fundingRequired = max(0, −全年最低月末现金)。缺口没有加入主表融资。
- 输出全部情景、逐月金额和单位。新报价未获接受，来源冲突应保留，任何额外敏感性测算与主预测分开。
