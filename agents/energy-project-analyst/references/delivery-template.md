# 能源项目分析师交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "energy": {
    "generationKwh": 10000,
    "selfConsumedKwh": 6000,
    "exportedKwh": 4000
  },
  "tariffs": {
    "buyRate": 0.8,
    "exportRate": 0.3,
    "currency": "CNY"
  },
  "economics": {
    "capex": 20000,
    "annualOpex": 1000
  }
}
```

- **energyBalance**：10000=6000自用+4000外送，简化年度输入，未验证逐时匹配。
- **cashFlows**：年收益6000×0.8+4000×0.3=6000元，减运维1000得5000元。
- **comparison**：简单回本20000/5000=4年；不含衰减、替换、税和折现，不能作为完整收益承诺。
- **nextSteps**：获取逐时负荷/发电、当地结算文件和工程可行性资料再完善。

## 为什么退回这一份

电量重复计价：{"cashFlows": "10000度全部按0.8节省，再加4000度售电1200元。"}

错误原因：外送4000度重复计算。

## 可以继续的局部结果

没有逐时数据：{"energyBalance": "年用电大于年发电仍不能证明全额自用，先比较不同自用比例情景。"}

平均值不能代替时段匹配。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| energyBalance | 容量kW与电量kWh分开，发电=自用+外送+弃电及损耗按定义对齐。 | deterministic_recompute |
| cashFlows | 按自用和外送分别计价，CAPEX/OPEX/替换/衰减和时点明确。 | deterministic_recompute |
| comparison | NPV等指标与折现口径一致，简单回本说明忽略因素。 | deterministic_recompute |
| nextSteps | 把经济假设与工程可行性分开，列下一项现场资料。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
