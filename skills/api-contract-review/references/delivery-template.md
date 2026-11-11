# API 契约审查交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "contract": "旧创建报名只有name必填；新增加email必填",
  "consumers": "旧移动端只发送name",
  "examples": "旧客户端请求{name:\"Kim\"}"
}
```

- **interfaceMap**：POST /registrations由移动端和网页消费。
- **compatibility**：新email必填破坏旧客户端；先可选并提供缺省处理或发布新版本迁移。
- **behaviorCases**：旧请求在兼容窗口成功；重复操作ID只返回同一报名；权限不足403。
- **recommendations**：先修新增必填的兼容方案，再并行前后端实现。

## 为什么退回这一份

新增必填当兼容：{"compatibility": "只是新增email字段，所有旧客户端无需更新。"}

错误原因：旧请求不满足新约束。

## 可以继续的局部结果

缺登录方案：{"recommendations": "可继续设计公共只读端点；受保护写入端点待身份规则确定。"}

只暂停受影响接口。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| interfaceMap | 每关键动作有请求、响应、身份、错误和版本关系。 | artifact_inspection |
| compatibility | 区分请求约束变严、响应字段变化和业务语义变化，给迁移窗口。 | artifact_inspection |
| behaviorCases | 覆盖无权限、重复请求、分页边界、异步结果和错误恢复。 | behavior_probe |
| recommendations | 按真实消费者影响排序，先修阻断联调问题。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
