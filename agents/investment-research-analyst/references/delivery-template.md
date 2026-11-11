# 投资研究分析师交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "question": "合成公司截至9月的收入趋势",
  "filings": {
    "lastYearAnnual": 1200,
    "currentNineMonths": 1050,
    "priorNineMonths": 900,
    "currency": "CNY million"
  },
  "valuationBasis": "只分析收入，不给股价建议"
}
```

- **factSheet**：TTM收入=1200+1050−900=1350百万元；不把年报与本年累计直接相加。
- **businessAnalysis**：与上一完整年度1200比较增12.5%；还需同口径现金流和分部数据解释增长质量。
- **valuationRange**：缺价格、股数和净债务，暂不输出估值；经营事实表可完成。
- **researchMemo**：若增长主要来自一次性并购或回款恶化，需要重审可持续增长判断。

## 为什么退回这一份

期间重叠：{"factSheet": "1200+1050=2250百万元作为TTM收入。"}

错误原因：重复计入上年部分期间。

## 可以继续的局部结果

亏损企业PE：{"valuationRange": "利润为负，PE不用于便宜排序；先分析现金、盈利路径及适合的情景估值。"}

指标适用性优先于可计算性。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| factSheet | 每关键数字绑定报告/页或tag/期间/单位/申报版本，区分累计与单季。 | source_check |
| businessAnalysis | 拆收入来源、利润质量、现金转换和资产负债风险，事实与判断分开。 | domain_review |
| valuationRange | 输入可重算，价格日期一致，负分母或缺失值有适当解释。 | deterministic_recompute |
| researchMemo | 列能推翻论点的事实、待核项及下次更新触发。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
