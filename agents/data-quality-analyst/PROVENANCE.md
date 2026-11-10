# Method provenance

Inspected 2026-11-11. Original Kim Service reasoning, workflows, templates and synthetic cases. No upstream implementation or long passage is copied. The links are evidence for adopted principles, not proof of a current worker fetch or professional certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| frictionless-schema | [Frictionless Table Schema](https://specs.frictionlessdata.io/table-schema/); v1 specification; inspected 2026-11-11 | 类型、缺失语义、唯一键、外键与约束分别检查。 | 不把schema通过当作业务数据真实。 | Open specification; no source code imported |
| frictionless-report | [Frictionless validation guide](https://framework.frictionlessdata.io/docs/guides/validating-data.html); living guide; repository c08fa29cb0708427ae65bb689ded8e2691078a82 inspected 2026-11-11 | 错误定位到数据集、行、字段和规则；保留源数据。 | 不安装依赖、不复制验证器、不以报告格式代替正确性。 | frictionless-py MIT; concepts only |

| dbt-data-tests | [dbt data test properties](https://docs.getdbt.com/reference/resource-properties/data-tests); living official documentation, inspected 2026-11-11 | 分开非空、唯一和引用检查；引用规则可跳过NULL，零失败需同时核覆盖。 | 不把某条规则通过外推为整份业务数据正确；未运行dbt。 | Official docs; original analysis only |
| pandera-lazy | [Pandera lazy validation](https://pandera.readthedocs.io/en/stable/lazy_validation.html); living official docs, inspected 2026-11-11 | 汇总多条规则错误并保留规则、列、值和索引；区分失败事件与记录。 | 不复制验证器或安装依赖，不把错误报告当修复授权。 | Official docs; no source implementation imported |
| dbt-unit-workflow | [dbt-labs unit-test skill](https://github.com/dbt-labs/dbt-agent-skills/blob/b8facde20b7a92c40ce3e6b86b71c4b92aa44040/skills/dbt/skills/adding-dbt-unit-test/SKILL.md); inspected 2026-11-11 | 用限定输入/预期输出解释变换边界，区分逻辑样本与真实数据检查。 | 不复制提示词、YAML或仓库布局，不运行仓库命令；不采用关闭失败测试作为验收修复。 | Apache-2.0 upstream; concepts only |

Living references require current task rechecking where facts or rules can change. Complete component bytes are bound by the generated inventory. Authored cases remain not_evaluated.
