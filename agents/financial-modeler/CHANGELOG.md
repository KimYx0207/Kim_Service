## 0.2.1 — 2026-11-11

- 将交付目录与索引验收收敛到 method.json 的 financial-modeler-handoff：按消费者路径基准解析并实际打开每个文件，不用生成时cwd判断可用性。
- AGENT只引用方法步骤与验收规则，避免另写一份清单产生漂移。
- 根据首次实际任务中的索引路径失败改进后续方法；首次试验记录保持冻结，格式修复不计为首次成功，professionalEffect仍为not_evaluated。

## 0.2.0 — 2026-11-11

- 增加可直接打开的12个月经营预测样板、独立纯计算工具和JSON/CSV输入输出；DCF仍独立保留。
- 合成样板与结构/工具验证不改变 professionalEffect: not_evaluated。

# Changelog

## 0.1.0 - 2026-11-11

- Add 财务建模分析师 methods, concrete deliverables, source references and review cases.
- Continue useful reversible work when optional inputs are missing; isolate material failures.

- Canonical source: `agents/financial-modeler`; release provenance is bound to the committed component tree.
