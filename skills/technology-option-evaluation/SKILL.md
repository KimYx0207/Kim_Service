---
name: technology-option-evaluation
description: 技术路线研究与比较（technology options architecture compatibility evidence）。用于新项目选型、关键依赖升级、构建或采购比较，以及需要把当前资料、版本和小型实测转成可审查决定的任务。先核用户价值、数据和已有环境，再比较机制、成本和反例；不承担产品批准、任务编排或部署。
---

# 技术路线研究与比较

先读取 [method.json](method.json) 与 [专业方法](references/professional-method.md)，使用调用方当前项目事实和同一份设计。检查已有研究，更新受变化影响的部分。

## 输入与第一步

`projectContext` 给出项目身份、受益者、可组合价值类型、阶段、场景与验收；`decisionScope` 说明本次需要决定什么；`currentSystem` 提供实际版本、锁文件和现状；`constraints` 给出成本、权限、数据与时限。

可读取的事实自己核实。只有无法取得且会改变方向的未知才问用户；可逆局部工作在明确假设下继续。缺预算可以给区间和翻转条件，不能编一个金额。

## 执行与交付

1. 分清硬约束和可权衡偏好，写本次决定与能推翻建议的观察。
2. 按问题查当前官方文档、作者仓库的实现/测试/迁移记录、原始论文及修订。记录实际来源、版本、适用差异、反例和它改变了哪个判断。
3. 比较机制有实质差异的可行路线，保留最小现有方案。用户已限定路线或局部修复时说明限制，不凑候选数量。
4. 先排除硬约束失败，再比较质量、时延、全周期成本、可维护性和迁移。用最小对照解决会改变选择的剩余未知，保留未参与调参的题。
5. 输出 `projectContext`、`comparisons`、`evidenceLedger`、`decision`、`validationPlan`、`projectCapabilityRequirements`、`facts`、`handoff`。每项选择关联当前设计的决定与需求引用。

`projectCapabilityRequirements` 描述需要由专业宿主创建或原地迭代的**本项目独立** Agent、Skill 和规则，包含全局基底版本、项目差异、职责、工具输入和验收。本包不生成角色壳文件、不授予写入权，也不把需求记录算成创建完成。

## 可选离线检查

需要复算预算/性能硬约束时，按 [helper API](references/helper-api.md) 运行：

```sh
node scripts/assess-options.mjs --input-json - < supplied-observations.json
```

脚本仅消费显式输入，返回约束失败与证据缺口；不联网、不调用模型、不替专业评审选择架构。没有 helper 也可按方法完成比较，说明未复算项。

完整合成案例和边界见 [交付示例](references/delivery-template.md)、[作者正反例](evals/professional-cases.json)。运行 `node --test tests/*.test.mjs` 只验证包合同与确定性检查；真实宿主效果与人审分别留证，不把模拟记录称作用户观察。
