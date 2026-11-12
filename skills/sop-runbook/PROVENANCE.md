# Method provenance

Inspected 2026-11-11. Original Kim Service reasoning, workflows, templates and synthetic cases. No upstream implementation or long passage is copied. The links are evidence for adopted principles, not proof of a current worker fetch or professional certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| google-incident | [Google SRE incident response](https://sre.google/workbook/incident-response/); SRE Workbook chapter; inspected 2026-11-11 | 明确响应角色、现场记录、交接与演练，把方案和实际执行区分。 | 不照搬Google规模与流程，不把演练当真实事故恢复。 | Google SRE book rights; original runbook template and case only |
| google-slo | [Google SRE alerting on SLOs](https://sre.google/workbook/alerting-on-slos/); SRE Workbook chapter; inspected 2026-11-11 | 指标必须绑定统计窗口和用户影响；区分症状与可行动响应。 | 不复制默认告警阈值，不自动变更生产监控。 | Google SRE book licence retained upstream; original procedure only |

Living references require current task rechecking where facts or rules can change. Complete component bytes are bound by the generated inventory. Authored cases remain not_evaluated.

## 2026-11-12 事项与经验闭环

本次新增内容为本项目根据业务需求编写的方法、字段约束和虚构案例，沿用 existing-package 来源及原有许可。没有复制第三方文章正文、公司内部记录或把文章中的自述成效当作本仓库实测。合成案例验证结构与指定本地行为；真实组织使用、身份来源、业务效果和原生宿主运行保持未验证。
