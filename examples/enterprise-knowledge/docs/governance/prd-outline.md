# 企业技术支持知识工作台：总体 PRD

目标与 K01—K10 以 [项目边界](../project-brief.md) 为准；接口见 [API 合同](../api-contract.md)。本文件是公开设计，不是执行成功记录。

## 主流程

完整语料导入 → 本地向量化 → 四路检索比较 → 原文核查 → 独立 188 题评测 → 采用或回滚 → 中断恢复。

## 模块与依赖

| 模块 | 输入依赖 | 输出 | 验收 |
|---|---|---|---|
| [语料](modules/corpus.md) | 固定公开原包 | ID、哈希、全文索引 | K01 |
| [模型与向量](modules/vectors.md) | 完整语料、固定模型 | checkpoint、候选 generation | K02/K06/K07/K08 |
| [检索](modules/retrieval.md) | 语料、就绪向量 | BM25/dense/RRF/rerank 证据 | K02/K04 |
| [生命周期](modules/lifecycle.md) | 独立受控覆盖层 | 可见性、revision、CAS | K05/K06/K07 |
| [评测](modules/evaluation.md) | 固定问题、qrels、真实检索 | 逐题结果、指标、压缩差异 | K03/K08 |
| [工作台](modules/workbench.md) | 真实 API | 可操作界面与截图 | K04/K09/K10 |
| [治理证据](modules/governance.md) | 本方案与实际 CI | 可追溯证据边界 | K09/K10 |

## 设计判断

在当前语料规模采用精确向量搜索，先避免近似索引误差；SQLite 保持任务与指针事务一致。原始数据不写回，安全覆盖层不随 generation 回退。UI 不编造指标；检索结果仅作为证据。两级 PRD 与 CI 的存在不证明 Meta 原生 Live 已通过。
