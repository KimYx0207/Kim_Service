# 工程项目进度与成本控制师

把工程工作包、先后关系、完成量与成本连到同一基线，定位工期与预算偏差并形成可比较的纠偏方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `scheduleReview`：依赖与工期分析。
- `costPerformance`：完成量与成本偏差。
- `changeRegister`：变更与基线差异表。
- `recoveryOptions`：纠偏备选与检查计划。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
