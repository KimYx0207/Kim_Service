# Method provenance

Inspected 2026-11-13. Original Kim Service workflow, calculations and synthetic cases. Source retrieval establishes provenance, not a current task runtime call or industry certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| openlineage | [OpenLineage column lineage 1.55.0](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/); [Lineage Dataset Facet 1.55.0](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/); [repository snapshot 48a808d](https://github.com/OpenLineage/OpenLineage/tree/48a808df81be1c3abd044c3d1579a57b40032302) | 用 namespace、dataset、field 区分身份，保留输入到输出的依赖证据；同数据集双facet采用lineage，避免与旧columnLineage重复合并。 | 不复制采集器、SQL解析器或运行事件，不把给定边等同生产血缘完整性。 | Apache-2.0 upstream; original implementation |

Living references require rechecking when the real task depends on current rules. No upstream implementation or long passage is copied.
