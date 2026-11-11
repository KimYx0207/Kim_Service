# Changelog

## 0.1.3 - 2026-11-11

- Use task-specific handling for material unknowns and existing authorization.
- Treat context and handoff refinements as advisory while keeping core delivery checks.

## 0.1.2 — 2026-11-11

- 补齐能力指数的有限值、正变差、有效规格顺序和单侧规格边界；保留越界均值导致的负Cpk，不用绝对值或截断掩盖风险。
- 新增零观测变差、单侧Cpu和负Cpk的原创评审案例，明确公式复算与实际过程认证的区别。

## 0.1.1 — 2026-11-11

- 将诊断问题与执行步骤分开：步骤明确本领域输入、具体操作、交付字段、进入条件和缺失/失败处理。
- 入口显式读取步骤与质量规则；保持既有能力合同、调用方授权和未评测边界。

## 0.1.0 — 2026-11-11

- 新增原创专业方法、完整交付模板、来源边界及四类有判别力作者案例。
- 每项输出绑定可检查条件、拒收条件、方法和证据要求，仍需实际任务复核。
- 本包原始方法在 `canonical:agents/manufacturing-quality-analyst` 维护；完整来源绑定由仓库目录生成器在源码提交后记录。
