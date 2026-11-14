---
name: knowledge-architecture-evaluation
description: 知识库架构评估（RAG LLM Wiki CAG KV cache GraphRAG agentic retrieval）。用于选择或重评知识问答、长期知识复用、跨文档研究方案，比较原文检索、编纂知识、缓存和图检索的任务适配、版本、权限撤回、质量及全周期成本；不把检索命中当答案正确，不代替实现或发布批准。
---

# 知识库架构评估

先读 [method.json](method.json) 与 [专业方法](references/professional-method.md)，再读取调用方当前项目上下文和数据事实。术语“LLM-KV”不明确时分别说明 LLM Wiki 与 KV cache 的含义，结合材料消歧；其余可完成工作继续。

## 输入

`projectContext`：使用者、任务、价值类型、阶段、预算；`corpus`：来源、语言、token/规模、更新、权限和撤回要求；`currentSystem`：真实模型/索引/运行时版本与现有路线；`evaluationEvidence`：问题集、原文、轨迹、成本、时延及尚未观察项。

## 执行

1. 将任务分为定位事实、精确术语、跨文档综合、整体关系、持续知识复用等真实类别；核资料和身份变化。
2. 按类别比较混合检索、长上下文/CAG、LLM Wiki、图检索和分解检索。区分层次，只组合能解决已观察问题的机制。
3. 查当前作者仓库、官方文档、论文修订和兼容限制。记录每个来源改变的决定，不用旧对照分数宣称普遍胜出。
4. 固定基线、数据/权限快照、问题与预算后做小对照；答案正确、引用支撑、权限、撤回、延迟和成本分开判断。
5. 输出 `projectContext`、`comparisons`、`evidenceLedger`、`decision`、`lifecyclePlan`、`validationPlan`、`projectCapabilityRequirements`、`facts`、`handoff`，并入现有设计。项目独立专业能力由宿主创建或原地迭代，保留全局基底与领域差异。

## 可选检查

按 [轨迹检查 API](references/helper-api.md) 对原文—切块—Wiki/图—缓存的实际依赖与权限快照做离线一致性审查：

```sh
node scripts/audit-knowledge-trace.mjs --input-json - < supplied-trace.json
```

它不执行删除、不确认真实用户身份、不验证答案语义；实际系统须提供完整暴露轨迹并运行更新/撤回/权限变更测试。真实操作与人工复核缺失时保留未观察。检索 ID 指标交现有 `retrieval-evaluation`；完整架构与用户结果由当前项目负责人验收。

阅读 [交付示例](references/delivery-template.md)、[作者正反例](evals/professional-cases.json)。`node --test tests/*.test.mjs` 验证本包结构与确定性反例，不代表本项目架构已实测胜出。
