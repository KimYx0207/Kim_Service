# 正式语料与来源

任务 `T-corpus`；负责人：存储与检索维护者；准则：K01。

完整导入、真实ID与qrels覆盖，不因评测标签筛语料。

## 输入与依赖

固定brief/API；上游：无任务产物前置；读取已存在的项目合同。范围：data/source/, scripts/ingest.py, app/storage.py。

## 状态和异常恢复

- source_declared：等待下载与hash
- staging：批量校验尚不可作为完整语料
- ready：计数/ID/qrels检查有证据
- failed：保留异常批次并允许定点恢复

## 业务规则

- 原始zip不改写；去重不删除有效同源记录
- qrels仅用于覆盖核对与评价，不进入检索候选
- documents无法证明时null，declared_documents单列

## 真实验收

- K01：按 docs/project-brief.md K01 和 docs/api-contract.md 实际执行，检查 完整导入、真实ID与qrels覆盖，不因评测标签筛语料；证据：下载 manifest、导入清单、SQL 实数与覆盖检查。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
