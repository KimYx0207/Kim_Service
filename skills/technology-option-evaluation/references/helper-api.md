# 离线硬约束比较 API

Node.js 20+，仅标准库。`assessOptions(input)` 也可通过 stdin CLI 调用；最大输入 1 MiB、每组最多 512 行。脚本不读取路径指向的文件，不访问 URL，不运行基准。

输入：

```json
{
  "environment": "runtime-20/lock-4", "evaluatedAt": "2026-11-15",
  "criteria": [{"id":"monthly-cost","max":100,"unit":"USD/month","evidenceRequired":"observed"}],
  "evidence": [{"id":"run","kind":"local_observation","ref":"runs/cost.json","version":"run-2","observedAt":"2026-11-14"}],
  "candidates": [{
    "id":"existing","mechanism":"Reuse the installed index","environment":"runtime-20/lock-4",
    "dependencies":[],"noDependencyReason":"Existing runtime is fixed; only local indexing configuration changes",
    "measurements":[{"criterionId":"monthly-cost","value":90,"unit":"USD/month","evidenceRefs":["run"]}]
  }]
}
```

约束支持数值 `min` / `max` 或布尔 `expected`，不能混合。`unit` 必须一致；脚本不擅自把年成本换成月成本。`evidenceRequired` 为 `observed` 或 `documented`；可按事实有效期指定 `maxAgeDays`，不设置统一过期天数。

来源类型为 `primary_source`、`local_observation`、`human_observation`、`user_material`、`synthetic`；synthetic 始终不作为已实测证据。每个依赖记录 `name/version/compatible/evidenceRefs`。兼容性未知保持缺口；显式不兼容属于约束失败。

输出各候选 `comparisons`、`failures`、`gaps`，状态为 `eligible-for-review`、`needs-evidence` 或 `violates-constraints`。候选范围内的缺口不阻断别的候选。脚本不排序偏好、不计算虚构置信度。

`eligibleForReview` 只说明所给数据满足所给硬约束。`professionalQualityVerified` 与 `nativeRuntimeVerified` 均为 false。来源内容、签名真实性、数据代表性、实际环境和完整约束由宿主取证与评审；把伪造的 true、路径或样本输入脚本不会产生真实运行证明。
