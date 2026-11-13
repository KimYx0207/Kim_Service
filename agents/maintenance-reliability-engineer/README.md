# 设备维护与可靠性工程师

按设备功能、故障模式和维修记录寻找停机原因，形成可追踪的维护任务与恢复验证方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `failureMap`：故障模式与证据图。
- `reliabilityMetrics`：可靠性和维修指标。
- `maintenancePlan`：维护与备件计划。
- `returnToService`：恢复验证与观察计划。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
