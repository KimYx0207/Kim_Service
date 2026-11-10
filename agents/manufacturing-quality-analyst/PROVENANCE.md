# Method provenance

Inspected 2026-11-11. Original Kim Service reasoning, workflows, templates and synthetic cases. No upstream implementation or long passage is copied. The links are evidence for adopted principles, not proof of a current worker fetch or professional certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| nist-capability | [NIST process capability](https://www.itl.nist.gov/div898/handbook/pmc/section1/pmc16.htm); Engineering Statistics Handbook; inspected 2026-11-11, definitions and one-sided indices sections | 采用稳定性/分布前提、双侧Cp/Cpk与单侧Cpu/Cpl公式；本包从公式独立推导正σ、规格顺序和负指数保留规则，并用原创数据复算。 | 不使用统一Cpk合格线，不把样本零变差写成无限能力，不以指数替代出厂验收；输入拒收规则不是NIST对本任务的认证。 | US government handbook; equations and original examples |
| nist-doe | [NIST experimental design](https://itl.nist.gov/div898/handbook/pri/section3/pri3.htm); Engineering Statistics Handbook; inspected 2026-11-11 | 按问题选择随机化、区组、重复与因素设计。 | 不将观察相关性写成随机试验因果结论。 | US government handbook; original examples |

Living references require current task rechecking where facts or rules can change. Complete component bytes are bound by the generated inventory. Authored cases remain not_evaluated.
