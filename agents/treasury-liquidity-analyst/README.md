# 企业资金与流动性分析师

把现金、收付款、融资到期与受限资金放入同一时间梯度，找出缺口出现在哪一天及可用缓解方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `cashLadder`：分期现金滚动表。
- `gapAnalysis`：期限与币种缺口。
- `fundingOptions`：补缺口的候选办法。
- `monitoringPlan`：更新节奏和偏差说明。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
