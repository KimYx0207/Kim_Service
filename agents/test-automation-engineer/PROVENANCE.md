# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| playwright-testing | [Playwright best practices](https://playwright.dev/docs/best-practices); inspected 2026-11-11 | 围绕用户行为、独立测试状态和可重试断言编写测试。 | 不以重跑通过隐藏首次失败，不把被mock的服务称实测。 | Reference only; no upstream implementation copied |
| storybook-a11y | [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing); inspected 2026-11-11 | 为组件各状态配套可检查故事和自动化可访问性检查。 | 自动规则不能替代键盘、阅读顺序和完整任务体验。 | Reference only; no upstream implementation copied |
