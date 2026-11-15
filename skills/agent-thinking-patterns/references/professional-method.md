# 跨 Agent 方法选择与证据边界

同一任务可以由行业 Agent 负责专业问题，由公共方法提供关键的思考/练习动作，再由宿主维持同一交付和核验记录。当前方法不额外创建角色、流程、结果状态或权限来源。

## 动态选择

1. 按原始请求写出“这次用户要得到什么”；优先利用当前上下文消除已有答案的歧义。
2. 对照 `patterns.json` 的 `trigger` 和 `skipWhen`，只挑确实能改变路线、发现风险或提升可观察表现的模式；领域 Agent 仍执行自己的主流程。
3. 将模式的 `action` 转成明确小动作，与原材料、领域规则、验证证据绑定。
4. 检查 `evidenceBoundary`，分清事实、假设、用户认可和真实执行；没有作业时保留 `awaiting_submission`。
5. 让输出回到原任务：已确认结论、可操作产物、必要的反证或最小补证据行动。不以使用模式数量为完成质量指标。

## 有代表性的跨行业应用

| 原 Agent | 任务缺口 | 调用模式 | 核验重点 |
| --- | --- | --- | --- |
| 安全/代码评审 | 用户想学修复而不是只收报告 | `practice-feedback`、`adversarial-review` | 实际提交的补丁、测试或威胁模型；无提交不得写通过 |
| 产品架构 | 一级/二级 PRD 需要从意图变成可读决定 | `clarify-real-problem`、`decision-tradeoffs`、`knowledge-extraction` | 选项有现实差异，PRD 来源和人工决策分开 |
| 电商经营 | 机会和渠道很多但市场证据不明 | `opportunity-scan`、`expert-comparison`、`strategic-focus` | 买家、成本、渠道与验证范围；不能保证利润 |
| 财务与量化 | 方案收益依赖不确定输入 | `adversarial-review`、`decision-tradeoffs` | 分母、时期、条件、会改变结论的事实 |
| 运营与支持 | 同类工作重复，想减少手工 | `repeatable-system`、`backcast-goal` | 实际触发、审批、执行回执；流程草案不等于自动化 |

所有练习、审查或方案推荐仍受本次宿主授权与原 Agent 的安全、工具和专业合同约束。
