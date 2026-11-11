# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| sec-edgar | [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces); inspected 2026-11-11 | 保留财报来源、期间、单位、申报日期与版本，回读原文核对口径。 | 不把不同会计期间或时点与累计值直接相加，不把抽取数据视为审计意见。 | Reference only; no upstream implementation copied |
| damodaran-models | [Aswath Damodaran valuation spreadsheets](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/eqspread.htm); inspected 2026-11-11 | 匹配现金流类型和折现率，分开经营价值与股权价值。 | 不复制模型参数为当前市场事实，不把估值区间当收益承诺。 | Reference only; no upstream implementation copied |
