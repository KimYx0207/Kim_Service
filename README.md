# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**这是老金（KimYx0207）维护的独立专业能力依赖仓库。**

这里收录可发现、可单独使用、可验证的 Hook、Skill、Tool 与专业 Agent，并为未来合格的 App 保留同一包规范。每个能力包解决一个明确问题；Kim Service 不承担跨组件 Router、任务状态机或最终验收大脑。

## 收录内容

- 面向人的组件目录：[hooks](hooks)、[skills](skills)、[tools](tools)、[行业角色](agents/README.md)。
- 发布库存与来源事实：[catalog.json](catalog.json)。
- 自动生成的 Capability 索引：[generated/capabilities.json](generated/capabilities.json)。

组件总表不再手工复制进 README。新增或修改能力包后，根脚本会从包内 `capability.json` 自动发现、校验并生成索引，避免 README、catalog 和组件目录相互漂移。

## 怎么使用

1. 从自动索引或对应类型目录选择能力包。
2. 按包内 `entrypoint` 阅读入口；常见入口为 Hook/Tool 的 `README.md`、Skill 的 `SKILL.md` 或 Agent 的 `AGENT.md`。
3. 按项目说明安装到你的项目或个人环境中。

当前安装源是 Kim_Service 中选中的组件目录。`catalog.json` 的 `source` 与 `revision` 记录导入来源，不能当作最新安装地址；已收录的能力包不需要再克隆旧独立仓库。若本地已有相同能力，先核对来源和版本，再选择复用或升级一个入口，避免重复安装。

每个项目都带有自己的使用说明、许可证、归属和更新记录。合集的最新版本请查看 [GitHub Releases](https://github.com/KimYx0207/Kim_Service/releases)，本次更新内容见 [CHANGELOG.md](CHANGELOG.md)。

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

Kim Service 仓库级内容采用 MIT License。每个能力包的许可证和来源记录独立生效；涉及改造或迁移的包以其 `LICENSE`、`PROVENANCE` 或同类文件为准。
