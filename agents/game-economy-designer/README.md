# 游戏经济与成长系统设计师

把游戏货币产消、玩家成长与交易回执连起来，设计可演算、可监测、可回退的数值方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `economyMap`：货币与物品流向。
- `balanceSimulation`：分层成长与余额模拟。
- `transactionControls`：奖励与消费一致性。
- `tuningPlan`：调参与观察方案。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
