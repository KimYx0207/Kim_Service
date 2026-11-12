# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**给 AI 一套专业方法，把你的需求做成能打开、修改、继续用的成果。**

做一份经营预测、设计一组页面、复盘一家店铺，或把资料写成一篇文章——Kim Service 把这些工作的做法、参考资料和检查方法整理成能力包。选好任务，补上目标与材料，交给你常用的 AI 接着做。

**[打开在线任务浏览器](https://kimyx0207.github.io/Kim_Service/?lang=zh-CN)** · [先看两个可操作的成果](#先看两个可以修改的成果) · [下载仓库](https://github.com/KimYx0207/Kim_Service/archive/refs/heads/main.zip)

<p align="center">
  <img src="docs/images/task-browser.png?v=V1.13" alt="Kim Service 中文任务浏览器：搜索想做的事，查看任务卡和可操作的成果示例" width="900">
</p>
<p align="center">从“我想做什么”开始，选好方法，再把工作带回自己的 AI 客户端。</p>

## 用一个任务，走完整个过程

> “我想看看未来 12 个月的利润和现金，提前知道哪几个月可能缺钱。”

先用仓库自带的合成经营数据跑一遍。你会看到需要准备什么，也能打开一个可修改、可下载的经营预测样板。

<p align="center">
  <img src="docs/images/intent-to-delivery.zh-CN.svg?v=V1.13" alt="经营预测使用流程：选择财务建模，填写目标和样例材料，复制给 AI，查看模型与月表" width="900">
</p>

### 1. 选一项任务

在任务浏览器搜索“经营预测”，打开[财务建模](https://kimyx0207.github.io/Kim_Service/?lang=zh-CN#capability=financial-modeler-deliver)。先看它要用哪些材料、会交付什么，再选择你正在使用的 AI 客户端。

### 2. 填上你的目标与材料

目标可以直接写：“比较基础、乐观、保守三种情景，解释现金缺口，交付可编辑输入、月表 CSV 和一份说明。”

第一次体验，把材料指向仓库里的 `agents/financial-modeler/examples/operating-forecast/sample-data.js`。用于自己的业务时，再换成实际的收入、成本、回款与资金安排。

<p align="center">
  <img src="docs/images/task-request.png?v=V1.13" alt="填写好的财务建模任务：目标、合成样例资料、使用环境，以及可编辑和复制的完整请求" width="900">
</p>
<p align="center">页面把入口、材料和交付要求整理好；你还可以在复制前补充自己的要求。</p>

### 3. 复制给你常用的 AI

[下载仓库](https://github.com/KimYx0207/Kim_Service/archive/refs/heads/main.zip)并在 AI 客户端中打开，点击页面上的“复制请求”，粘贴到当前对话。AI 就能读取选中的方法、资料和计算脚本，处理这次任务。

草稿会按任务分别保存。刷新后可以继续写，也能下载草稿带到另一台设备；重新生成请求后，可以恢复上一版。

### 4. 打开成果，亲手改一次

在下面的经营预测示例里，试着修改售价或回款假设，观察现金曲线，再下载月表。实际任务完成后，也这样打开、修改、复算交付文件，核对它是否回答了最初的问题。

## 先看两个可以修改的成果

这两个示例都使用合成数据，可以直接在线操作，也可以下载源码继续改。

### 经营预测：利润增长，现金够用吗？

把销量、价格、成本与回款假设放到同一个模型里，比较三种情景，查看每个月的现金变化。修改一项输入，就能看到结果怎样变化；月表可以下载后在表格软件里继续用。

<p align="center">
  <img src="docs/images/operating-forecast-example.png?v=V1.13" alt="12 个月经营预测成果：可编辑的经营假设、三种情景和月末现金曲线" width="900">
</p>

**[打开经营预测](https://kimyx0207.github.io/Kim_Service/agents/financial-modeler/examples/operating-forecast/index.html?lang=zh-CN)** · [查看模型源码](agents/financial-modeler/examples/operating-forecast/)

可以带走：输入与计算结果 JSON、每月明细 CSV，以及可继续修改的模型。

### 预约台：改一次设计，整页保持一致

切换浅深主题、品牌色、字号和信息密度，看表单、按钮与预约列表一起变化。填写一次预约，还能体验输入报错、提交失败后的恢复和新增记录。

<p align="center">
  <img src="docs/images/design-system-example.png?v=V1.13" alt="可编辑的预约台设计系统：主题与密度控制、预约表单和示例预约列表" width="900">
</p>

**[打开预约台](https://kimyx0207.github.io/Kim_Service/agents/design-system-designer/examples/service-console/index.html?lang=zh-CN)** · [查看页面源码](agents/design-system-designer/examples/service-console/)

可以带走：当前设计变量的 tokens JSON，以及能接着开发的页面代码。

## 你的任务，也可以这样开始

- **做产品和软件：** 把想法整理成可开发的方案，再做页面、接口和测试。从[产品架构](agents/product-architect/)或[前端实现](agents/frontend-engineer/)开始。
- **看清经营和财务：** 预测现金、核对账目、分析成本，给下一步决策准备依据。看看[财务建模](agents/financial-modeler/)与[定价成本分析](agents/pricing-cost-analyst/)。
- **经营店铺和销售：** 找出店铺变化的原因，改商品文案，比较供应商。看看[店铺复盘](agents/store-performance-analyst/)与[商品文案](agents/product-listing-writer/)。
- **做内容和营销：** 从选题、资料到正文、口播、分镜和封面。看看[脚本与写作](agents/script-writer/)与[标题封面](agents/headline-cover-optimizer/)。
- **处理工作和教学：** 改简历、练面试、写工作沟通、准备课程。看看[简历修改](agents/resume-editor/)与[课程设计](agents/lesson-planner/)。
- **推进专业项目：** 整理供应链计划、制造质量或能源项目资料。更多入口在[完整专业角色目录](agents/README.md)。

想找别的任务，直接在[任务浏览器](https://kimyx0207.github.io/Kim_Service/?lang=zh-CN#catalog)搜索。完整的 Agent、Skill、Hook 与工具索引放在文末，按需要查阅。

## 接到你正在使用的 AI

Codex、Claude Code、Cursor、Gemini CLI 等能够读取项目文件的客户端，都可以打开仓库并使用上面的请求。喜欢命令行，也可以这样准备：

```sh
git clone https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service
```

如果 AI 已经在另一个项目里工作，把 Kim_Service 的实际目录位置告诉它，让它能找到方法包和你的材料。下载后，直接打开 `docs/start.html` 也能离线浏览目录和示例。

常用包的安装与更新，按包内 README 操作；DSH 用户看 [DSH 指南](docs/dsh.md)，ZCode 用户看 [ZCode 插件指南](docs/zcode-beta.md)。更新源码可用 `git pull --ff-only`。

## 和 Meta_Kim 配合，接着做完整个任务

**Kim Service 提供具体工作的专业方法；[Meta_Kim](https://github.com/KimYx0207/Meta_Kim)把这些方法放进整个任务的推进过程。**

<p align="center">
  <img src="docs/images/service-and-meta.zh-CN.svg?v=V1.13" alt="Kim Service 与 Meta_Kim 的关系：用户提出任务，Kim Service 提供专业方法，AI 执行，Meta_Kim 组织任务、检查成果并接续工作" width="900">
</p>

比如把预约台做成一个产品，需要先明确方案，再设计页面、开发功能、检查交付。Meta_Kim 可以选择和衔接这些工作，把前一步的项目上下文和成果带给下一步。Kim Service 为每一项工作提供相应的方法与资料。

只需要改一份简历、写一篇稿或做一次分析时，也可以直接选用一个能力包。[从 Meta_Kim 开始](https://github.com/KimYx0207/Meta_Kim#readme)。

## 完整入口与扩展使用

- 找能力：[专业角色目录](agents/README.md) · [全部 Agent](agents/) · [Skills](skills/) · [Hooks](hooks/) · [工具](tools/)。
- 深入使用：[任务浏览器指南](docs/task-browser.md) · [能力包编写指南](docs/expert-package-authoring.md) · [组件约定](docs/agent-pack-contract.md)。
- 查看依据与维护：[行业任务与来源](docs/research/industry-coverage-2026-11-11.md) · [仓库维护](docs/maintenance.md) · [历史验证记录](docs/verification-history.md) · [更新日志](CHANGELOG.zh-CN.md)。

每个包保留自己的方法、参考资料、案例和检查脚本。需要了解一份成果怎样做出来，可以沿着包内说明继续读。

## 联系与支持

<p align="center">
  <img src="docs/images/contact-qr.png" alt="老金联系方式" width="720">
</p>

<table align="center">
  <tr>
    <th align="center">微信收款码</th>
    <th align="center">支付宝收款码</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" alt="微信收款码" width="260"></td>
    <td align="center"><img src="docs/images/alipay.jpg" alt="支付宝收款码" width="260"></td>
  </tr>
</table>

如果这些开源项目帮到了你，欢迎 Star、分享，或者请老金喝杯咖啡。

## 开源说明

仓库级内容采用 [MIT License](LICENSE)。每个能力包保留自己的许可证及来源记录，详见包内 `LICENSE`、`PROVENANCE` 或同类文件。
