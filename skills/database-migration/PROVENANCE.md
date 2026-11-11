# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| postgres-alter | [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html); inspected 2026-11-11 | 依据具体DDL和数据库版本分析锁、校验和兼容窗口。 | 不把事务回滚当丢弃数据后的恢复方法，不跨版本假定锁行为。 | Reference only; no upstream implementation copied |
| airflow-practices | [Apache Airflow task best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html); inspected 2026-11-11 | 任务按固定分区读取并使重跑得到相同结果。 | 不把重试或UPSERT本身当作完整幂等证明。 | Reference only; no upstream implementation copied |
