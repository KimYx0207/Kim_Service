# 数据库渐进迁移交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "change": "full_name拆为display_name，保留原始值",
  "traffic": "旧客户端仍读full_name",
  "recovery": "快照可恢复，先不删旧列"
}
```

- **sequence**：新增display_name可空；兼容读；回填；新读切换；最后再清理full_name。
- **backfill**：按id分批，仅更新display_name为空的记录；重跑不覆盖用户新值。
- **verification**：核未回填数、空值和旧客户端读取；实际锁耗时在演练库测量。
- **recoveryPlan**：切换前可回旧读；删除列后需备份恢复，故收缩另设明确窗口。

## 为什么退回这一份

先删后改：{"sequence": "DROP full_name，然后等待客户端陆续更新。"}

错误原因：旧客户端读写立即断裂。

## 可以继续的局部结果

回填中断：{"backfill": "前500条已验收，中断后从检查点继续；已新写入值不覆盖。"}

成功分批可复用。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| sequence | 旧新版本共存时先扩展并双读/双写或兼容映射，校验后才删旧。 | artifact_inspection |
| backfill | 固定分批边界、检查点与幂等规则，核行数及业务值。 | behavior_probe |
| verification | 按实际版本检查锁/耗时/约束，数据检查含空值、冲突和消费者读取。 | behavior_probe |
| recoveryPlan | 区分代码回滚、数据恢复及不可逆点，满足条件后清理旧路径。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
