# Frontend method provenance

Inspected 2026-11-10. The package contains original Chinese method prose and original synthetic examples. No upstream code or template text is bundled. These references are research inputs, not tool permissions, installed skills or evidence that a worker fetched them during its task. The original source inspection remains dated above; behavior-proof references were inspected 2026-11-11. Local content is versioned with component 0.4.1; actual project framework versions must be read from the supplied repository.

| sourceRef | Source and revision | Adopted | Not adopted |
| --- | --- | --- | --- |
| anthropic-frontend | [Anthropic frontend-design](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/frontend-design/SKILL.md), Apache-2.0 | Brief-specific visual choices, concise interface copy, real screenshot critique | A mandatory aesthetic, font replacement, unrelated memory access or automatic confirmation prompts |
| vercel-react | [Vercel React guidance](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/SKILL.md), metadata 1.0.0, MIT; also inspected [async-parallel](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/rules/async-parallel.md) | Profile dependency waterfalls; parallelize independent reads only | Assuming React/Next.js, installing performance libraries, copying performance multiplier claims or deployment workflows |
| react-effects | [React Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects), retrieved 2026-11-10; page then identified v19.3 | Separate events from synchronization and handle stale async results | Applying latest APIs to a project whose installed version is unknown; making Effects the universal fetching strategy |
| w3c-dialog | [W3C APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), retrieved 2026-11-10, living guidance | Focus entry, containment and recovery when the UI actually is modal | Treating ARIA attributes or an APG example as proof of browser/assistive-technology compatibility |

| playwright-behavior | [Playwright best practices](https://playwright.dev/docs/best-practices), official living guide, inspected 2026-11-11 | User-visible outcomes, independent test state, controlled external responses and scoped diagnostics | Assuming mocked responses establish real persistence or authorization; duplicating tests for implementation details |
| playwright-assertions | [Playwright assertions](https://playwright.dev/docs/test-assertions), official living guide, inspected 2026-11-11 | Await asynchronous, condition-based checks and preserve actual failure | Treating fixed sleeps or unawaited checks as successful behavior proof |

The included MIT LICENSE covers this package's original material. Referenced licenses do not turn cited upstream files into bundled content. Validate applicability against the current task before use; a pinned source can still be unsuitable or outdated for that project.

## 项目体验方法来源

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| carbon-disclosure | [Carbon Accordion](https://www.carbondesignsystem.com/building-blocks/core/components/accordion/guidelines); 页面修订 2026-09-09，检索 2026-11-14 | 按用户是否需读全部内容选择展开；次要说明可渐进披露。 | 不把关键状态、必须阅读的内容或购买约束默认隐藏。 | Reference only; original adaptation, no upstream code copied |
| shopify-theme-segments | [Shopify Designing themes](https://shopify.dev/docs/storefronts/themes/best-practices/design); 检索 2026-11-14 | 按购买决定、品牌、受众和库存结构定领域组件与主题；以真实任务验证。 | 不把商店组件或视觉风格机械用于机电、知识库等其他领域。 | Reference only; original adaptation, no upstream code copied |
| uswds-visualization | [USWDS Data visualizations](https://designsystem.digital.gov/components/data-visualizations/); 检索 2026-11-14 | 图表达明确消息，保留文字说明与可访问精确数据；关注真实任务。 | 不以标签存在或图已生成判定语义、用户理解或实际可访问性通过。 | Reference only; original adaptation, no upstream code copied |
| wcag22 | [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/); 检索 2026-11-14 | 按适用标准检查键盘、焦点、对比、重排和错误恢复，保留具体适用条件。 | 不将单一扫描、合成模型或来源读取当全面符合声明。 | Reference only; original adaptation, no upstream code copied |
