# Goal / Loop 的完成证据

## 可证伪，而不只是字段齐全

把“优化订单页”改成“无订单时出现准确说明及已有创建入口；有订单时原列表仍可用”。再定义反例：按钮链接不存在、权限不符或有订单时被空状态覆盖。这样执行者能知道去哪验证，审核者也能拒绝貌似完整的结果。

Goal 的证据充分指足以制定当前工作合同，不是业务已经执行成功。用户给定的本地需求可以足够写 Goal；涉及当前技术能力或市场事实时需取证。来源数量没有固定及格线：同源转载十篇仍是一条，缺失决定路线的那一条就保持草案。

## 一次性交付的完整小例

用户：“给我一个 Goal Prompt，只改订单空状态文案和已有创建链接，不改排序权限。”

交付为一个 Goal Prompt 代码块：Goal=修复订单空状态；User-stated intent=用户上述范围；AI-inferred potential intent=减少迷路，仅为推断；Value judgments requiring confirmation=无新的价值取舍；Strategic outcome=零订单用户知道下一步；Decision standard=准确文案、已有入口可达、有订单行为不变；Evidence standard=读取组件、路由和两条状态路径；Scope=空状态；Non-goals=排序、权限、新路由和部署；Context to read first=列表组件与现有创建入口；Constraints=沿用样式与权限；Execution policy=交给后续已授权执行者；Checkpoints=定位现有入口、改文案、核两条路径；Verification=零订单可找到已有入口，有订单显示原列表；Stop conditions=需要新增路由或权限；Final report=实际改动、两条路径结果与截图。

这里不附 Loop，也不开始改代码。完整性来自可以执行与拒收，而非把所有任务都拉成长期工作流。

## 手动 Loop 的完整小例

用户明确要重复订单缺陷的手动 Loop，上轮正常导入通过、重复单失败。交付开头写“时间参数：手动，贴入上轮结果后继续”；Loop mission 保留原目标；Loop state 记录轮次及已验证正常样本；Previous result 指向实际失败样本和 diff；Review evidence 区分已跑与自报；Gap diagnosis 只列重复标识问题；Cycle action 只修导入判重；Verification delta 验证重放不重复写、旧记录不变；Loop guardrails 沿用用户预算，未给预算则在继续前让宿主明确，不能无限循环；Continuation protocol 在 Done/Continue/Pause 中选择；Stop conditions 含无新证据、同样失败不收敛与权限不足；Next LOOP packet 带回原目标、轮次、关闭证据、剩余差距、下一轮输入及停止条件。

两个例子都是作者构造的交付示范，不是运行结果。更长场景继续读已有 references/examples.md；方法背景继续读 source-rules.md。

## 加载与评估边界

执行本能力时按 SKILL.md 读取本文件及 method.json 中当前 capabilityId 的诊断、决策与 outputChecks。使用已有脚本和引用资料，不另造调度或运行状态。每条 blocking 规则缺证据或失败时保持未验收；其他高分不能抵消。作者自报 pass 最多是待独立复核的线索。

本仓库校验器验证合同、引用和示例格式；professionalEffect=not_evaluated。professional-cases.json 是作者合成的教学正反例，没有真实运行或人审发生性。当前 Meta 的 Skill 发现路径不会像 Agent 方法投影一样自动把 method.json 注入 worker；实际加载依赖入口的明确阅读规则和宿主支持，未观察则如实报告。原生宿主是否触发、业务效果是否改善，都必须另取当前版本的实际任务证据。
