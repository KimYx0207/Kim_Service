# 企业技术支持知识工作台

用完整公开 IBM Cloud 历史语料，实际比较关键词、语义、混合和重排检索。支持工程师可以输入问题、打开原文、核对来源；维护者可以查看导入与向量化进度，运行统一评测，并验证受控权限、删除、重试与索引回滚。

这是一个独立可复现示例，不是 IBM 官方产品，也不是生产知识库部署。返回的是检索证据，不是生成的客户回复；不调用付费生成模型。公开 PRD 和 CI 观察不等于 Meta 原生 Live 认证。

## 一个具体例子

输入 `Kubernetes logging`，先选择 BM25，查看结果的原文、URL 和内容哈希；再选择 Dense、混合 RRF 和混合+重排，比较两路排名与实际耗时。向量索引没就绪时，页面会显示真实错误并保留问题，不会悄悄换成关键词搜索。

五个页面分别用于检索证据、语料与任务、评测比较、受控生命周期、项目工作记录。阶段页面标记的是公开方案准备状态；运行结果以实际 API、报告和 CI artifacts 为准。

## 本机运行

推荐 Linux 或 WSL、Python 3.12、Node 24。脚本使用 POSIX 文件锁；原生 Windows 请使用 WSL。预留数 GB 磁盘，完整模型编码与重排会持续使用 CPU。

从本目录运行：

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/ingest.py
python scripts/audit_documents.py
python scripts/download_models.py
python scripts/build_index.py --generation cloud-minilm-v2 --threads 3 --activate
python -m app.main --port 4180
```

浏览器打开 `http://127.0.0.1:4180`。服务只绑定 localhost。`data/`、`models/` 与 `evidence/` 是本机运行结果，不纳入 Git。

固定包实际含 72,442 段落；文档级包独立计数为 8,578 条。上游 README 的声明数与固定原包不一致，页面和报告始终使用本次导入的实数。语料是历史快照，不保证当前 IBM Cloud 功能适用性。

`audit_documents.py` 是本机与 CI 共用的文档级审计入口：固定 URL/提交/包哈希，真实解析文档 ID、URL、空正文与声明差异，输出统一 `source/actual/archive` 清单并更新同一语料的文档元数据。它不从段落 ID 推导文档数。

## 完整评测与压缩对照

```bash
python -m unittest discover -s tests -v
python scripts/evaluate.py --generation cloud-minilm-v2 --id cloud-lastturn-float32 --methods bm25,dense,hybrid,rerank --vector-kind float32
python scripts/evaluate.py --generation cloud-minilm-v2 --id cloud-lastturn-int8 --methods dense --vector-kind int8
node scripts/verify-service-metrics.mjs --run evidence/evaluations/cloud-lastturn-float32
```

主实验使用全部 188 条官方 lastturn 问题、相同完整语料和候选预算，输出 Recall@5/10/50、nDCG@10、MRR@10、时延和失败题。int8 实验保持模型不变，仅改变输出向量存储，比较真实字节数、top-k 与相关性指标。它不是模型权重量化实验。

qrels 仅用于评价，不能补入检索候选。质量不预填通过率，召回率不等于回答正确率。同一评测 ID 不允许更换执行条件；模型或执行指纹变化时，应新建 generation 与评测 ID。

当前 schema 2 不续接或追写旧 schema 1 generation。已有旧索引时，请使用新名称从零构建，保留旧记录供核查。

## 中断恢复与安全实验

`ingest.py` 与 `build_index.py` 保存检查点，可原命令续接；`--stop-after` 可用于本地受控停止。完整候选 generation 与 active 指针分开，采用时执行 CAS。

生命周期页中的 public/support 是本地受控实验身份，不是生产 SSO。删除和权限覆盖层独立于索引回滚。正式 benchmark 不得混入有效权限覆盖事件；风险测试使用隔离临时数据库，避免污染正式评测。

## 真实教程截图与 GitHub Actions

```bash
python -m pip install playwright==1.62.0
python -m playwright install --with-deps chromium
python scripts/capture-tutorial.py --output evidence/tutorial-captures --resume
```

脚本在同一进程树内启停 API，拍摄实际浏览器页面并绑定真实 HTTP 状态、URL、页面标题、源码与图像 SHA。未就绪记录 blocked，不生成假成绩。详见 [截图说明](docs/screenshot-guide.md)。

仓库工作流 `enterprise-knowledge.yml` 可手动触发；main 分支中只有本示例或该工作流变化才自动触发。它重新下载固定输入、构建全量索引、运行正式评测与压缩对照、执行风险测试并拍摄真实 Chromium 页面。浏览器启动或截图失败会使任务失败。CI artifacts 仅包含报告、清单和截图，不上传原始语料、模型、SQLite 或凭据。

CI 仅缓存固定提交的数据原包和固定 revision 的模型下载，使用精确 key，无宽泛回退。SQLite、generation、评测结果不缓存，每次索引都是新鲜构建；这是当前保守边界，UI 修改仍会重新执行编码和评测。以后如缓存 generation，必须先以模型、encoder 源码、输入规范及 runtime 指纹完整隔离，不能凭目录名复用。

## 结构与验收

- `app/`：HTTP、存储、检索、本地模型运行。
- `scripts/`：下载、导入、构建、评测、独立指标复算和真实截图。
- `public/`：无 npm 依赖的可操作界面。
- `tests/`：受控风险与恢复反例。
- `docs/project-brief.md`：K01—K10 可复核标准。
- `docs/governance/`：总体与七份模块 PRD，以及明确未认证的阶段边界。

公开方案不是执行成功记录；实际下载、模型调用、188 题结果和浏览器运行需查看相应运行的 artifacts。PDF/OCR、企业私有连接器、生产权限、原生 Meta Live 和企业 SLA 不在本示例认证范围内。

## 来源

- [IBM MTRAG benchmark](https://github.com/IBM/mt-rag-benchmark/tree/e0970de1b1207c2a9506adf238e6e1a22037e38a)，固定提交，Apache-2.0。
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/tree/1110a243fdf4706b3f48f1d95db1a4f5529b4d41)，固定 embedding 模型。
- [ms-marco-MiniLM-L6-v2](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2/tree/233902d25c440f23af6f7d6e94d2946bac0bee0a)，固定 reranker。
- [Kim_Service 检索评价方法](../../skills/retrieval-evaluation/)与[前端方法](../../agents/frontend-engineer/)；方法引用不替代本例实测结果。
