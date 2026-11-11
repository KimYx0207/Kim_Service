先读取 method/AGENT.md，按当前任务使用包内方法与实际可用工具。

请用给定的已确认预算和供应商补充，做未来12个月的经营预测与三情景对照。对矛盾报价说明采用哪一个、哪个尚待决定；不要把提议当作已批准事实。交实际文件，不只写方法。
输出到output/：forecast.json（schemaVersion:1，currency，scenarios，逐情景包含id、months的12行，月行至少含month/revenue/netIncome/receipts/payments/financing/endingCash，以及summary）；decision.md（用人话解释利润、现金缺口和未确定项）；facts.json（conflicts数组，每项包含issue、sources、status、appliedValue、alternateValue、unit）。最后写submission.json，artifacts映射forecast、decision、facts到以上相对文件路径。没有实际发生的调用和验收不要写成通过。
明确机器合同：summary必须包含数值fundingRequired和endingCash；facts.conflicts中的status使用pending、approved或rejected，未决提议使用pending；sources为来源文件路径字符串数组；appliedValue和alternateValue为数字；unit使用CNY/order。计算口径见inputs/calculation-policy.md，两组均使用同一口径。

原始材料位于 inputs/。只能在 output/ 交付成果，保留输入与运行记录不变。
