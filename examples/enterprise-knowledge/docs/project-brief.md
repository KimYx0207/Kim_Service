# 企业技术支持知识工作台：公开案例 PRD

## 场景与用户结果

支持工程师处理 IBM Cloud 技术问题时，需要从大规模历史资料中找到可核查证据；知识管理员维护语料、索引与访问边界；评测负责人用同一套公开问题比较检索方案。本案例提供完整可运行源码与 CI 复现入口，输出检索证据，不自动生成客户回复。

## 固定输入与规模口径

输入为 IBM/mt-rag-benchmark 固定提交 `e0970de1b1207c2a9506adf238e6e1a22037e38a`，Apache-2.0。正式索引必须包含 `corpora/passage_level/cloud.jsonl.zip` 的全部有效记录，不按 qrels 筛选语料。

README 声明的 57,638 文档 / 61,022 段落与该固定文件实际计数存在差异。文档级原包独立计数为 8,578 条，段落级原包为 72,442 条；每次复现仍必须记录下载哈希、文件行数、唯一 ID 与实际导入数，界面使用本次实数。不能用段落 ID 推导并宣称已核实文档总数。

使用全部 188 条 `cloud_lastturn.jsonl` 和 494 行 `qrels/dev.tsv`。这些是公开人工构造和审阅的 benchmark 问题，不是私有客户工单。history 与 rewrite 是另外的输入条件，不混入主评测。生成参考文件不是人工标准答案。

## 技术与边界

Python 3.12、SQLite/FTS5、NumPy、ONNX Runtime 和 Tokenizers。关键词 BM25、384 维精确向量检索、RRF 融合与真实 cross-encoder 重排共享同一语料。输出向量逐行 int8 压缩是单独实验，与模型权重量化分开报告。

Embedding 固定 `sentence-transformers/all-MiniLM-L6-v2@1110a243fdf4706b3f48f1d95db1a4f5529b4d41`；reranker 固定 `cross-encoder/ms-marco-MiniLM-L6-v2@233902d25c440f23af6f7d6e94d2946bac0bee0a`。默认下载官方 float32 ONNX；不调用付费生成模型。模型和执行指纹用于阻止不同执行条件混合恢复。

原始公开快照不改写。ACL/删除/乱序/幂等使用隔离受控覆盖层；不声称生产 SSO、私有连接器、PDF/OCR、当前厂商功能适用性或企业 SLA。应用、存储、检索、UI 分层。界面只显示 API 实数，未运行即待运行。

## 可复核标准

| ID | 条件 | 必须保留的证据 |
|---|---|---|
| K01 | 完整正式 Cloud 语料导入，ID 唯一；qrels 全覆盖；固定来源、许可、大小与 SHA-256 | 下载 manifest、导入清单、SQL 实数与覆盖检查 |
| K02 | 全语料真实向量化、BM25、dense、RRF 与 reranker 均有实际调用 | 模型与索引 manifest、任务 checkpoint、逐 query top-k 与时延 |
| K03 | 全部 188 条 lastturn 问题按同一语料和候选预算比较；不注入 gold positives | 固定评测协议、逐题结果、Recall@5/10/50、nDCG@10、MRR@10、失败题 |
| K04 | 原文、段落 ID、来源 URL、快照和内容 hash 可回查，显示检索结果的两路排名与重排分数 | API 回执、真实界面截图、引用读取测试 |
| K05 | 受控撤权/删除后所有检索分支及直接读取均不泄露受限内容；旧事件不能复活删除 | 隔离测试数据标记、事件日志、拒绝/过滤结果、回归 |
| K06 | 导入/向量任务中断后按持久 checkpoint 继续；重复请求不重复副作用；乱序与 CAS 冲突明确 | 实际进程停启记录、前后 SQL/哈希、幂等与并发检查 |
| K07 | 候选 generation 与 active pointer 分离，采用/回滚为原子操作且保留可复查旧版；覆盖层不随回滚撤销安全删除 | generation 记录、采用/回滚回执、同题对照 |
| K08 | 向量 int8 存储压缩真实运行并报告字节/检索差异，不借用厂商成绩 | 量化 manifest、Recall 相对 float32 及 qrels 指标、实测时延 |
| K09 | 同一任务有总体/模块 PRD、依赖、负责人、逐项结果、失败修正与截图 | 实际项目材料与 stage 工作记录；Meta 原生 gate 单独记录 |
| K10 | 本地可重现安装/运行/评测；教程截图覆盖关键步骤，代码和数据来源不漂移 | README、依赖锁定、启动脚本、截图索引和文件 hash |


检索质量不预设虚构通过率。执行完整与质量优劣分别报告，召回率不等于回答正确率。K09 的阶段材料是公开方案与 CI 观察，不代表原生 Meta Live、用户批准或独立专业认证。

## 工作分解

见 [总体 PRD](governance/prd-outline.md) 与七份模块 PRD。候选索引与 active 指针分开；采用/回滚使用 CAS；安全覆盖层不随索引回滚撤销。评测失败与浏览器失败必须保留真实状态。
