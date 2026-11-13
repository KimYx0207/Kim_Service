# API 与模块合同 v1

根目录：当前示例目录。Python `app` 包；启动 `python -m app.main --port 4180`。UI 为 `public/index.html`, `public/app.js`, `public/styles.css`。API JSON 使用 snake_case；数据来自实际 DB/files；未完成字段用 null/status，禁止占位成功。

## 层与所有权

- 模型维护者: `app/embedding.py`、`scripts/download_models.py`、依赖、集成、截图。
- 存储与检索维护者: `app/storage.py`, `app/retrieval.py`, `app/main.py`，`scripts/ingest.py`, `scripts/build_index.py`, `scripts/evaluate.py` 等以及 tests。
- 界面维护者: `public/` only。
- 文档维护者: `docs/governance/`, 公开方案与 CI 证据。
- 原始输入 `data/source/`；持久状态 `data/workbench.sqlite`；索引 `data/indexes/<generation>/`；模型 `models/embedding/`, `models/reranker/`；结果 `evidence/`。

## 模型 Python 接口

`from app.embedding import EmbeddingModel, Reranker`

- `EmbeddingModel(model_dir=None, threads=3)`，默认根 models/embedding；`.encode(texts: list[str], batch_size=32) -> np.ndarray[N,384]`，float32, mask mean pool + L2 normalize，`.metadata` 有 model/source info；`.truncated_count` 累积截断计数。
- `Reranker(model_dir=None, threads=3)`，默认根 models/reranker；`.score(query: str, texts: list[str], batch_size=16) -> np.ndarray[N]`，原始 logits，按降序；`.metadata`。
- tokenizer 最大 256，模型实际 ONNX CPU；异常向上抛，不退化为假分数。

## HTTP

`GET /api/status`

```json
{"corpus":{"documents":null,"passages":0,"source_commit":"...","sha256":null,"source_kind":"public_benchmark"},"index":{"generation":null,"active_generation":null,"embedded":0,"dimension":384,"status":"not_started","model":null},"jobs":[],"evaluations":[],"events":[],"native_meta":{"verified":false,"status":"unverified_transcript"}}
```

已完成 corpus 数不得混入 test fixture；documents 无法证明时 null+字段说明，官方57,638单列 declared_documents。

`GET /api/corpus?offset=0&limit=20&q=` 返回 `{total,items:[{id,text,title,url,sha256,source_revision}]}`，limit≤100；内容 text 为完整原文，可只在列表返回 excerpt，detail 必须可读。

`GET /api/passages/{id}?principal=public` URL encode ID。存在且授权才返回正文及 source；删除/无权 404，避免泄露标题。

`POST /api/search` `{query,mode:"bm25"|"dense"|"hybrid"|"rerank",top_k:10,principal:"public",generation:null}`。top_k≤50；返回 `{query,mode,generation,elapsed_ms,candidate_count,results:[{id,text,title,url,sha256,score,bm25_rank,dense_rank,rerank_score,source_revision}],answer_status:"evidence_only"}`。无生成式自动答案功能时明确 evidence_only，不能编造已回答。没有模型/索引则 409 index_not_ready，不能悄悄变BM25。使用相同权限覆盖层过滤两分支和取原文。

`GET /api/evaluations` 返回 `{reports:[...]}` 读取真实evidence评测；每份至少 `{id,status,query_count,corpus_count,created_at,methods:[{mode,recall_5,recall_10,recall_50,ndcg_10,mrr_10,p50_ms,p95_ms}],limitations,failures}`；支持未完成方法与未执行/无值。

`GET /api/evaluations/{id}` 返回报告；另提供逐题JSON/JSONL下载路径，UI不可自己造指标。

`GET /api/jobs` `{jobs:[{id,kind,status,processed,total,checkpoint,error,updated_at}]}`。进度来自数据库持久记录。

`POST /api/events` `{event_id,passage_id,revision,operation:"restrict"|"delete"|"restore",allowed_principals:["support"],label:"controlled_experiment"}`。只覆盖派生可见性，不修改原始文件；重复event_id同内容幂等，不同内容409；旧revision409 stale_revision。恢复需更高revision。返回 `{event,applied,idempotent}`。受控管理操作限定本地服务，本演示principal选择器不是生产SSO。

`POST /api/generations/activate` `{generation,expected_active}`。按active CAS，未完成generation拒绝；成功 `{active_generation,previous_generation}`；重复同active幂等。回滚同入口。权限覆盖层全局单一不随generation回退。

`GET /api/project` 返回主 brief / governance PRD 文件与实际stage证据索引，UI显示为本项目工作记录，不叫Meta原生Live。

错误统一 `{error:{code,message,details?}}`；空查询400，未授权/被删除passage404，状态冲突409。CORS不向任意站点开放，写操作检查Origin为本机与JSON类型。只绑定127.0.0.1。

## CLI/测试与评测

存储与检索维护者实现可恢复的download/ingest/build/evaluate入口，写清--help与复现命令。索引默认generation `cloud-minilm-v1`。qrels永不进入检索/重排候选补充逻辑；仅评价阶段读取。

第一轮完整188题lastturn，预先固定参数：BM25 top50、dense top50、RRF常数60、rerank对融合top50真实打分。所有方案返回/保存top50。失败案例按确定规则呈现（例如最低recall），不是挑最好看的案例。若改参数，要另存结果和原因，不覆盖原始结果。官方rewrite是额外条件，不叫本系统改写。
