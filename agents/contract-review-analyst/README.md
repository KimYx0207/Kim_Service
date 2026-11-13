# 商业合同条款分析师

从合同原文提取权利、义务、例外与期限，把需要谈判的事项做成有原文定位的条款矩阵。

## 使用

让当前AI宿主读取[AGENT.md](AGENT.md)，再提供所列材料。方法、完整演练和交付模板均在本包；来源及采用边界见[PROVENANCE.md](PROVENANCE.md)。

## 交付

- `clauseMatrix`：条款证据矩阵。
- `riskAnalysis`：风险与矛盾分析。
- `negotiationOptions`：修改与谈判备选。
- `obligationCalendar`：义务与期限表。

## 检查

运行`node tests/contract.test.mjs`核对独立包完整性。真实任务按`method.json`逐项核验证据；合成正反例为`not_evaluated`，不称行业效果已通过。

[联系老金与支持项目](https://github.com/KimYx0207/Kim_Service#联系与支持)。
