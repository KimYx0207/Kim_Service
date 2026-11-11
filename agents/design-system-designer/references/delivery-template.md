# 设计系统设计师交付示例与工作单

## 已完成的教学示例

以下输入为合成案例，数字和状态用于演示复核方法。

```json
{
  "surfaces": "报名表与管理表格",
  "identity": "浅/深主题，中英双语",
  "constraints": "现有React组件"
}
```

- **tokens**：color.action.primary→palette.blue.600；深色主题改语义绑定，组件名保持。
- **components**：Submit包含idle/loading/success/error/disabled；loading阻止重复提交但保留可读反馈。
- **examples**：长英文按钮可换行；键盘焦点可见；错误后输入保留。
- **migration**：先替换报名页两个按钮并测试，再迁移管理页。

## 为什么退回这一份

token循环：{"tokens": "color.a引用color.b，color.b引用color.a；直接发布。"}

错误原因：无法解析真实值，组件输出不确定。

## 可以继续的局部结果

品牌未定仍可推进：{"tokens": "先定义action/text/surface语义名，用临时调色板试用；品牌色确定后替换映射。"}

局部审美未知不阻断结构设计。

## 用于当前任务的工作单

| 交付项 | 本次应填内容 | 检查方法 |
| --- | --- | --- |
| tokens | 原始值、语义角色、组件引用分层，类型明确且无循环引用。 | artifact_inspection |
| components | 按钮、输入等组件有状态、键盘、错误和内容长度规则。 | behavior_probe |
| examples | 在至少一个真实任务上验证层级、长文本、缩放和浅深主题。 | artifact_inspection |
| migration | 现有组件映射到替代项，渐进迁移并记录变化。 | artifact_inspection |

用真实输入替换示例并保存产物位置。关键业务错误只阻断受影响的结论或操作；格式和解释完善不要求全任务停下。
