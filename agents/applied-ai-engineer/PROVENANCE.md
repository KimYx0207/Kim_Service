# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| mlflow-eval | [MLflow evaluation datasets and scorers](https://mlflow.org/docs/latest/genai/datasets); inspected 2026-11-11 | 固定评价数据，保留已知失败与回归样本，比较同题版本。 | 不把调过的样本充当独立测试集，不强制采用MLflow服务。 | Reference only; no upstream implementation copied |
| ragas-recall | [Ragas ID-based context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/); inspected 2026-11-11 | 按独立相关文档ID计算检索覆盖，分开检索和回答质量。 | 不把文档命中率当作回答正确率。 | Reference only; no upstream implementation copied |
| google-canary | [Google SRE canarying releases](https://sre.google/workbook/canarying-releases/); inspected 2026-11-11 | 用可比较的基线和小流量观察决定推进或回退。 | 不把统一流量比例或观察时长当所有服务通用标准。 | Reference only; no upstream implementation copied |

## Architecture and lifecycle research, 2026-11-15

| sourceRef | Primary source | Version/date | Adopted | Not inferred |
| --- | --- | --- | --- | --- |
| cag-original | https://github.com/hhhuang/CAG | Author README and pyproject inspected 2026-11-15; Python>=3.10, Transformers>=4.47.1 declarations | Bounded all-relevant-context loading and cache experiments | Declared dependency range is not tested compatibility with every later version |
| microsoft-wiki | https://github.com/microsoft/llmwiki | Rolling author README inspected 2026-11-15; package example 0.1.2, Node20+, VSCode1.109+; current harness differences documented | Raw/wiki/schema layers, search/MCP use, source-derived page handling | No enterprise per-document ACL guarantee; no upstream code copied |
| qdrant-hybrid | https://qdrant.tech/documentation/hybrid-queries/ | Rolling official docs, inspected 2026-11-15; Query API since 1.10.0; installed version must be checked | Hybrid/fusion tradeoffs, comparable evaluation and holdout tuning | No universal winner or automatic compatibility promise |
