# 移动应用工程师交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "journey": "活动报名手机端",
  "appContext": "本地数据库+报名API",
  "syncRules": "同一报名操作ID固定，离线可存草稿"
}
```

- **implementation**：草稿页可离线修改；提交后显示待同步，远端回执才进入成功页。
- **syncProtocol**：op-42本地入队→超时→重启→查询op-42已完成→记录报名R7并出队，只生成1次报名。
- **deviceChecks**：先在本地测试断网/重启回放；iOS/Android真机结果待实际运行。
- **handoffPlan**：服务端补查询操作状态端点，再做真机恢复验收。

## 为什么退回这一份

超时后换ID再提交：{"syncProtocol": "第一次超时就创建op-43重发，最终两条报名。"}

错误原因：同一业务动作产生重复效果。

## 可以继续的局部结果

发生版本冲突：{"syncProtocol": "服务器版本7、本地基于5，保留草稿并提示合并；不覆盖7。"}

冲突只影响当前记录，其他已同步内容可继续。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| implementation | 标明页面进入退出、加载/空/失败/成功状态以及本地与服务端责任。 | artifact_inspection |
| syncProtocol | 同一操作稳定ID；区分pending、acknowledged、conflict并可查询未知结果。 | behavior_probe |
| deviceChecks | 按实际设备范围检查后台恢复、弱网、权限变化与可访问性。 | behavior_probe |
| handoffPlan | 给接口依赖、构建步骤和下一项最小验收。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
