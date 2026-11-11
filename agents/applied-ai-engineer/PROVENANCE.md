# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| mlflow-eval | [MLflow evaluation datasets and scorers](https://mlflow.org/docs/latest/genai/datasets); inspected 2026-11-11 | 固定评价数据，保留已知失败与回归样本，比较同题版本。 | 不把调过的样本充当独立测试集，不强制采用MLflow服务。 | Reference only; no upstream implementation copied |
| ragas-recall | [Ragas ID-based context recall](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/); inspected 2026-11-11 | 按独立相关文档ID计算检索覆盖，分开检索和回答质量。 | 不把文档命中率当作回答正确率。 | Reference only; no upstream implementation copied |
| google-canary | [Google SRE canarying releases](https://sre.google/workbook/canarying-releases/); inspected 2026-11-11 | 用可比较的基线和小流量观察决定推进或回退。 | 不把统一流量比例或观察时长当所有服务通用标准。 | Reference only; no upstream implementation copied |
