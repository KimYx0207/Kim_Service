# 安全事件调查与响应分析师

把告警、受影响资产和证据按时间连起来，区分已证实影响与调查假设，给出有授权边界的遏制、恢复和复盘方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `incidentTimeline`：带证据的时间线。
- `scopeAssessment`：影响范围与假设。
- `containmentPlan`：遏制与调查候选动作。
- `recoveryReview`：恢复与复盘材料。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
