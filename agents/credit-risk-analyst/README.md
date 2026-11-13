# 企业信用风险分析师

把企业偿债来源、债务到期、逾期事实和损失情景连接起来，交付有证据的授信分析草案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `exposureMap`：债项与到期分布。
- `repaymentAnalysis`：偿债来源与压力情景。
- `riskFindings`：信用风险判断及反证。
- `monitoringPlan`：监测与条件建议。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
