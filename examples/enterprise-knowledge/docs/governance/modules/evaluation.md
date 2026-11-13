# 固定评测与压缩比较

任务 `T-evaluation`；负责人：存储与检索维护者；准则：K03, K08。

188题同预算逐题评价并保留失败与原始结果。

## 输入与依赖

固定brief/API；上游：retrieval, vectors。范围：scripts/evaluate.py, evidence/。

## 状态和异常恢复

- not_started：指标null
- running：记录已做问题与版本
- partial：失败方法不填成绩
- complete：188题逐题结果可查

## 业务规则

- lastturn/rewrite/history明确条件分别报告
- Recall@5/10/50、nDCG@10、MRR@10与时延均从逐题结果计算
- 不读generation reference当人工gold答案
- int8对照记录真实字节与对float32 top-k/qrels差异

## 真实验收

- K03：按 docs/project-brief.md K03 和 docs/api-contract.md 实际执行，检查 188题同预算逐题评价并保留失败与原始结果；证据：固定评测协议、逐题结果、Recall@5/10/50、nDCG@10、MRR@10、失败题。
- K08：按 docs/project-brief.md K08 和 docs/api-contract.md 实际执行，检查 188题同预算逐题评价并保留失败与原始结果；证据：量化 manifest、Recall 相对 float32 及 qrels 指标、实测时延。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
