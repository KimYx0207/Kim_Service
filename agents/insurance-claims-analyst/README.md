# 保险理赔材料分析师

把保单责任、事故事实、费用明细和扣减顺序逐项对应，给出可追溯的理赔材料与金额核对草案。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `coverageMap`：责任与证据对应表。
- `amountReview`：赔付金额条件核对。
- `evidenceGaps`：补件及争议事项。
- `reviewPacket`：供核赔或申诉复核的材料包。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
