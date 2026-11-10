# Method provenance

Inspected 2026-11-11. Original Kim Service reasoning, workflows, templates and synthetic cases. No upstream implementation or long passage is copied. The links are evidence for adopted principles, not proof of a current worker fetch or professional certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| nasa-verification | [NASA requirements verification matrix](https://www.nasa.gov/reference/appendix-d-requirements-verification-matrix/); Systems Engineering Handbook appendix; inspected 2026-11-11 | 需求唯一标识、来源、验证方法与证据可追踪。 | 不把NASA流程视为本地建筑法规或工程签章。 | NASA guidance; original templates |
| nasa-validation | [NASA systems engineering handbook appendix](https://www.nasa.gov/reference/system-engineering-handbook-appendix/); handbook appendices D/E; inspected 2026-11-11 | 区分符合要求的验证与满足使用目标的确认。 | 不以文档完备替代真实系统验证。 | NASA guidance; original templates |

| openlineage-code-version | [OpenLineage source code location](https://openlineage.io/docs/1.54.0/spec/facets/job-facets/source-code-location/), docs 1.54.0 and [facet schema](https://github.com/OpenLineage/OpenLineage/blob/main/spec/facets/SourceCodeLocationJobFacet.json) blob a303cb73dcad254a432c8e0696a1e002e1ee2a21 inspected 2026-11-11 | 分开代码路径、不可变修订与可移动分支；本包追加输入/规则/实际运行核对。 | 未集成OpenLineage，不将元数据或哈希当运行发生证明。 | Original analysis; no schema/code copied |
| dbt-state-selection | [dbt state selection](https://docs.getdbt.com/reference/node-selection/methods#state); living official docs, inspected 2026-11-11 | 旧新基线分开保存，考虑上游共享实现与下游依赖。 | 不照搬数据仓库命令或假定所有动态依赖都可静态推知，不复制dbt选择器。 | Official docs; principles only |

Living references require current task rechecking where facts or rules can change. Complete component bytes are bound by the generated inventory. Authored cases remain not_evaluated.
