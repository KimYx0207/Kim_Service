# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| sec-edgar | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces); inspected 2026-11-11 | 保留财报来源、期间、单位、申报日期与版本，回读原文核对口径。 | 不把不同会计期间或时点与累计值直接相加，不把抽取数据视为审计意见。 | Reference only; no upstream implementation copied |
| damodaran-models | [Aswath Damodaran valuation spreadsheets](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/eqspread.htm); inspected 2026-11-11 | 匹配现金流类型和折现率，分开经营价值与股权价值。 | 不复制模型参数为当前市场事实，不把估值区间当收益承诺。 | Reference only; no upstream implementation copied |

## 本地可编辑样板

| 来源ID | 来源与范围 | 采用方式 |
| --- | --- | --- |
| original-editable-sample | 本包原创合成数据、计算或交互示例，2026-11-11 | 数据配置、纯工具与展示分层；不复制第三方源码，不声称客户成果或专业效果已通过。 |

## 消费目录验收修订（0.2.1）

| 来源ID | 来源与范围 | 采用方式 |
| --- | --- | --- |
| observed-consumer-path-feedback | 本次实际经营预测文件任务的消费者反馈：数值正确，但索引把相对于任务根的路径交给以输出目录为根的消费者，造成目录前缀重复。 | 将路径基准与实际打开验收统一写入method.json的financial-modeler-handoff；不改冻结评分器或首次试验记录，不把后续格式修复算作首次成功或专业效果证明。 |
