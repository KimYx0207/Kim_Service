# 方法来源与取舍

本轮检查日期：2026-11-11。新规范为面向本组件任务重新组织的原创说明；现有实现、知识、许可、联系方式与收款图片保持原包记录。外部方法不构成本包实际执行或专业认证。

| sourceRef | 一手来源 | 在本包采用什么 | 不由此推断什么 |
|---|---|---|---|
| existing-package | https://github.com/KimYx0207/Kim_Service/tree/34ff5ef2361214cdd36cddbdcb67c5dece64ad04/skills/find-skill | 保留已存在的流程、成熟脚本、专业参考与来源声明；修正本轮实证缺陷。 | 历史测试不等于本次新内容的效果验证。 |
| skills-cli | https://github.com/vercel-labs/skills/blob/main/docs/commands.md | 核对 find/add/list 与精确 skill/agent/scope 参数；现场 CLI 版本优先。 | 不复用外部运行结果、专业认证或执行许可；当前任务仍需适用性检查。 |
| agent-skills | https://agentskills.io/specification | 核查入口和渐进加载资源，内容格式不是运行效果证明。 | 不复用外部运行结果、专业认证或执行许可；当前任务仍需适用性检查。 |

## 可评审范围

method.json 的 field/criterion/rejectWhen 说明具体判据，verificationMethod/evidenceRequired/blocking 说明怎么核验、需要什么证据与哪些项不能抵消。references/acceptance.md 包含任务推理、完整交付示例与拒收边界。两者服务同一现有 capability，不另造业务状态。作者案例只记录 expectedAssessment，evaluationStatus 始终 not_evaluated。专业前测应在独立执行后保留原始产物与失败，不把本文件中的预期当实际结果。
