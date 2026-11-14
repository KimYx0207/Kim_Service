# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| design-tokens | [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/); inspected 2026-11-11 | 声明token类型与引用，检测循环并把语义映射到组件。 | 这是社区组格式报告，不称为W3C正式标准，不复制全规范。 | Reference only; no upstream implementation copied |
| storybook-a11y | [Storybook accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing); inspected 2026-11-11 | 为组件各状态配套可检查故事和自动化可访问性检查。 | 自动规则不能替代键盘、阅读顺序和完整任务体验。 | Reference only; no upstream implementation copied |
| wcag22 | [W3C WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/); inspected 2026-11-11 | 按适用成功标准检查键盘、焦点、名称、对比度和错误恢复。 | 不以单一扫描分数宣布全面符合标准。 | Reference only; no upstream implementation copied |

## 本地可编辑样板

| 来源ID | 来源与范围 | 采用方式 |
| --- | --- | --- |
| original-editable-sample | 本包原创合成数据、计算或交互示例，2026-11-11 | 数据配置、纯工具与展示分层；不复制第三方源码，不声称客户成果或专业效果已通过。 |

## 项目体验方法来源

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| carbon-disclosure | [Carbon Accordion](https://www.carbondesignsystem.com/building-blocks/core/components/accordion/guidelines); 页面修订 2026-09-09，检索 2026-11-14 | 按用户是否需读全部内容选择展开；次要说明可渐进披露。 | 不把关键状态、必须阅读的内容或购买约束默认隐藏。 | Reference only; original adaptation, no upstream code copied |
| shopify-theme-segments | [Shopify Designing themes](https://shopify.dev/docs/storefronts/themes/best-practices/design); 检索 2026-11-14 | 按购买决定、品牌、受众和库存结构定领域组件与主题；以真实任务验证。 | 不把商店组件或视觉风格机械用于机电、知识库等其他领域。 | Reference only; original adaptation, no upstream code copied |
| uswds-visualization | [USWDS Data visualizations](https://designsystem.digital.gov/components/data-visualizations/); 检索 2026-11-14 | 图表达明确消息，保留文字说明与可访问精确数据；关注真实任务。 | 不以标签存在或图已生成判定语义、用户理解或实际可访问性通过。 | Reference only; original adaptation, no upstream code copied |
