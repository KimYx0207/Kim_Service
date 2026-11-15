# 已研究技术候选：2026-11-15快照

本材料为作者在本轮实际搜索、打开官方文档、读取GitHub实现后的研究记录。它不是未来任务的当前读取回执。变动事实需要当前宿主复核；工具选择从具体业务问题出发。

## Tolgee JS：多语产品任务

固定commit [1d00678460dc2a0cd77bd4a7201aba8607b88050](https://github.com/tolgee/tolgee-js/tree/1d00678460dc2a0cd77bd4a7201aba8607b88050)，2026-11-11T11:05:34Z，core版本7.3.1。

实际读完整：LICENSE、packages/core/package.json、packages/web/src/package/LanguageDetector.ts、packages/format-icu/src/createFormatIcu.ts及其test、packages/core/src/__test/languages.test.ts。另读BackendFetch.ts超时/取消片段，未据此判断整个加载系统。

语言检测按浏览器偏好匹配；格式器使用intl-messageformat并规范化locale；测试体现语言切换、fallback与namespace。可据此设计代表任务中的缺键/日期金额/语言切换检查。没有运行上游测试，不能称测试通过。MIT是SDK许可，不等于平台每个高级功能免费；官方QA页说明许可/付费条件及语义局限。

采用：已有多语资源管理、发布与术语需求。替代：早期少量内容用版本化资源文件与人工审校。延后：目标需求/语言仍未定时，工具接入不会回答用户是否愿付。未观察：平台部署、RTL/布局/文化语义、完整依赖安全、issue积压。

## PostHog JS：观测价值和渠道

固定commit [ab4d5198a585b9da5ad71a069ab389f08a436d3f](https://github.com/PostHog/posthog-js/tree/ab4d5198a585b9da5ad71a069ab389f08a436d3f)，2026-11-14T08:20:52Z，browser版本1.449.2。

实际读完整：packages/browser/src/consent.ts、utils/request-router.ts；读consent.test.ts测试名称与默认采集/禁采、存储、DNT/GPC及consent前曝光片段；package.json版本/脚本/依赖/许可；LICENSE主声明与组件许可段。浏览器包许可为Apache-2.0与MIT组合；没有复制实现。

重要区别：pending不自动意味着禁止采集；禁采与禁持久化分别配置，DNT/GPC逻辑还取决于respect_dnt。路由有US/EU/custom及独立flags/assets host配置。实际数据路径、同意界面与采集行为仍要在自己的版本验证，源码阅读不能替代抓包。当前定价页说明额度/封顶后的事件丢弃与flag默认响应，必须纳入实验可观测性。

采用：真实产品需要按来源/语言/同群窗口识别激活、留存和试验效果。替代：少量B2B试点先用结构化CRM、客户任务与付款证据。延后：尚无可交付结果或主要靠人工完成的服务，不应先制造大量事件。未观察：上游测试运行、生产安装、真实隐私设置、完整依赖安全与因果效果。

## 其他官方约束带来的路线变化

- [Stripe资格细则](https://docs.stripe.com/payments/managed-payments/eligibility)：自动化数字产品、经营主体和直销条件；实物/专业服务不在该产品支持范围。并非所有Stripe产品都相同，用户资格未核不能推荐开户。费用需核全价，不将MoR附加费当全部支付费。
- [Apple本地化](https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information/)：商店元数据与App二进制独立；[自定义产品页](https://developer.apple.com/help/app-store-connect/create-custom-product-pages/configure-multiple-product-page-versions)是意图/渠道实验工具，不证明留存。
- [YouTube多语言](https://support.google.com/youtube/answer/13338784?hl=en)：上传自己的多语音轨与自动配音不同，功能资格与内容权利分别核实。

这些材料改变候选路线的条件与验收项，没有证明当前用户有付费客户、可用账户、内容权利或成功渠道。全量来源、日期、读取范围见PROVENANCE.md。
