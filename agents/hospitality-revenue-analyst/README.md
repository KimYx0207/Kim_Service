# 酒店收益管理分析师

按房晚、房型、入住日和渠道比较需求与净贡献，给出有条件的房价和库存方案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `revenueBaseline`：房晚与收益基线。
- `demandSignals`：需求与预订节奏。
- `channelContribution`：渠道与客群贡献。
- `pricingOptions`：定价与房量候选方案。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
