# 仓储履约分析师

把可用库存、预留、批次期限与订单承诺对应起来，定位缺货、错拣和账实差异并给出履约改善方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `availability`：库存可用与短缺表。
- `allocationPlan`：订单与批次候选分配。
- `processImprovements`：拣货复核与异常方案。
- `controlMetrics`：履约与盘点监测。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
