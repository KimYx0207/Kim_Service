# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| airflow-practices | [Apache Airflow task best practices](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html); inspected 2026-11-11 | 任务按固定分区读取并使重跑得到相同结果。 | 不把重试或UPSERT本身当作完整幂等证明。 | Reference only; no upstream implementation copied |
| dbt-data-tests | [dbt data tests](https://docs.getdbt.com/docs/build/data-tests); inspected 2026-11-11 | 把唯一、非空、值域和关联约束转成返回异常行的检查。 | 不把零异常行当作数据存在或业务正确的充分证据。 | Reference only; no upstream implementation copied |
