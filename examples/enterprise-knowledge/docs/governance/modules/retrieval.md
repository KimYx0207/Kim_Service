# 检索与可核查证据

任务 `T-retrieval`；负责人：存储与检索维护者；准则：K02, K04。

同一完整语料的BM25/dense/RRF/rerank与原文引用。

## 输入与依赖

固定brief/API；上游：corpus, vectors。范围：app/retrieval.py, app/main.py。

## 状态和异常恢复

- ready：明确generation和模式
- index_not_ready：409，不能悄换模式
- empty：零命中真实呈现
- evidence_only：未生成自动回答

## 业务规则

- BM25与dense各top50，RRF常数60，融合top50重排
- 所有结果保留原文ID/URL/hash/版本、两路rank与重排score
- qrels/gold positives不可进召回补充
- top_k上限50；空query400

## 真实验收

- K02：按 docs/project-brief.md K02 和 docs/api-contract.md 实际执行，检查 同一完整语料的BM25/dense/RRF/rerank与原文引用；证据：模型与索引 manifest、任务 checkpoint、逐 query top-k 与时延。
- K04：按 docs/project-brief.md K04 和 docs/api-contract.md 实际执行，检查 同一完整语料的BM25/dense/RRF/rerank与原文引用；证据：API 回执、真实界面截图、引用读取测试。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
