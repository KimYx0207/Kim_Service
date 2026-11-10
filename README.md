# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**给 AI Agent 配上做事的方法、专业资料和明确的交付标准。**

Kim Service 是老金（KimYx0207）维护的专业能力库。每个 Agent、Skill、Hook 或 Tool 解决一个明确问题，带有入口、方法、输入输出约定、示例和验证方式。你可以单独使用，也可以由 [Meta_Kim](https://github.com/KimYx0207/Meta_Kim) 发现和调用。

**Meta_Kim 管整件事怎么往前走，Kim Service 提供每项工作需要的专业方法。** 例如，前端包要说明页面出错后怎么恢复；库存包要找出哪一天会缺货；成本包要让每一步计算都能复算。

## 先从你要做的事开始

> “我有一个报名产品的想法。请先帮我比较系统方案，再细化用户流程、异常状态、前后端接口和验收。沿用当前项目已经合适的技术，不要只列岗位名字。”

打开[中文任务入口](docs/start.html)，按关键词找到能力，查看所需资料与交付内容，然后复制请求。下载完整仓库后，可以直接在浏览器打开 `docs/start.html` 离线浏览；GitHub 文件页显示的是源码。浏览目录本身不会安装或执行任何组件。

| 你要做的事 | 可以先看 |
| --- | --- |
| 从模糊想法走到系统方案和模块 PRD | [产品架构](agents/product-architect/) |
| 把用户动机变成流程、界面状态与恢复路径 | [交互设计](agents/interaction-designer/) |
| 把设计落实到当前前端技术和可用界面 | [前端工程](agents/frontend-engineer/) |
| 定义数据、接口、事务、权限和迁移行为 | [后端与数据工程](agents/backend-data-engineer/) |
| 核对交付物和实际检查证据 | [交付验证](agents/delivery-verifier/) |
| 内容、教学、运营、分析等其他任务 | [完整专业角色目录](agents/README.md) |

## 一个专业包里有什么？

| 文件 | 用途 |
| --- | --- |
| `AGENT.md` / `SKILL.md` / `README.md` | 入口、适用任务、执行方法与边界 |
| `capability.json` | 可发现的能力、输入、输出、权限和副作用约定 |
| `method.json`（所有专业 Agent 与 Skill 均提供） | 领域步骤、工具需求、交接方式；`expertise` 绑定诊断、决策与现有输入输出 |
| `references/`（按需） | 实际专业资料；由 `knowledgeAssets` 声明适用范围和来源 |
| `example.json` / `AGENT.md` 内示例 | 按包提供的完整示例；示例数据与真实回执分开 |
| `evals/professional-cases.json`（Agent） | 合成正例、失败反例与评审依据；不是模型运行结果 |
| `tests/`、`scripts/`（按包提供） | 组件检查或范围明确的确定性工具 |
| `PROVENANCE.md`、`LICENSE` | 资料来源、改造边界与许可证 |

专业包覆盖软件、产品、研究、内容、电商、采购、教育和职场；这次继续扩展经营财务、销售运营、用户研究、数据质量、应用安全、库存供应、制造质量、系统工程、招聘、碳核算、医疗运营和农业水量分析。另有实验分析、指标口径、SOP、需求追踪、建筑信息核验与游戏试玩等可组合 Skill。具体覆盖范围以[自动能力目录](generated/capabilities.json)为准，角色边界写在每个包里。

每包都要讲清领域知识、如何诊断、怎样选择、完整交付长什么样、哪些错误必须拒收。比如库存不能只看期末总量，成本不能混用月份与年份，安全扫描不能替代真实漏洞验证，课程不能只交活动清单。旧包的可用方法和工具保留，失实的通用规则修正；详细来源和采用范围见[本轮研究记录](docs/research/professional-expansion-2026-11-11.md)。

选中的 Agent 资料会随 Meta_Kim 工单进入实际执行上下文，并校验完整字节。Skill 入口显式链接对应方法与资料。每项输出有通过条件、拒收条件、验证方法、所需证据和是否阻断；关键错误不能靠其他项得分抵消。自报“通过”不会替代独立核验。

合成正反例用于解释标准，保持 `not_evaluated`；结构检查只能证明合同和文件一致。实际专业效果须以当前任务产物评审。本轮的检查、独立试题和未测范围见[验证记录](docs/verification/dsh-professional-quality-2026-11-11.md)。

## 与 Meta_Kim 的关系

<p align="center">
  <img src="docs/images/intent-to-delivery.svg" alt="Meta_Kim 与 Kim Service 的职责，以及从意图到交付的关系" width="1000">
</p>

*架构示意图。Meta_Kim 负责决策、编排和连续性，Kim Service 提供专业方法与能力。*

系统和技术栈先形成基线，再细化模块、接口、状态和验收。两层设计属于同一份 PRD。模块对应实际交付任务；能否并行由调用方的依赖、资源和权限决定。Kim Service 不另建调度器、权限系统或最终验收状态。

## 使用与更新

1. 从任务入口或索引选包，阅读其入口和必要资料。
2. 提供当前目标、项目事实、验收条件和相关上游产物。单独使用时，让你的客户端读取选中的组件目录；集成使用时由 Meta_Kim 校验并绑定该来源。
3. 宿主提供真实可用工具及已授权范围。缺少工具时，组件交付可用材料和明确缺口，不宣称已写入、已部署或已通过验收。

当前组件安装源就是 **Kim_Service 内选中的目录**。`catalog.json` 的 `source` / `revision` 记录历史来源，不是要求重新克隆旧独立仓库。已有同类能力先核对来源与版本，复用或升级一个入口。

已发布基线：[V1.10](https://github.com/KimYx0207/Kim_Service/releases/tag/V1.10)。[Unreleased](CHANGELOG.md#unreleased) 与各包 CHANGELOG 记录这次源码变化和组件版本；尚未作为新的合集 Release 发布。

这些包采用可移植内容与显式合同。**Codex、Claude Code、Cursor、Gemini CLI、ZCode 的路径、工具和 Hook 由各宿主或 Meta_Kim 适配层处理。** ZCode 构建会从当前能力目录发现全部专业 Agent 与 Skill，并带上每个包的完整方法、资料、样例和许可。更新路径见 [ZCode 指南](docs/zcode-beta.md)。

### 用在 DSH（DeepSeek Harness）

在本仓库构建原生 Skills，再通过 Meta_Kim 安装：

```sh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh
meta-kim dsh install --service-package /path/to/kim-service-dsh
meta-kim dsh check
dsh --profile meta-kim
```

输出目录须尚不存在。DSH 本身要求 Node >=24.9.0；本适配核对 `0.2.2-rc.1`。包内保留完整方法、参考、验证脚本和许可证，较长正文分段读取。实际子 Agent 继承宿主当前 preset，专业角色以 Skill 装入。更新、项目安装与能力边界见 [DSH 使用指南](docs/dsh.md)。原生配置、Skill 加载和 MCP 连接与模型业务表现分别验收。

## 维护与目录

[Agent](agents/) · [Skill](skills/) · [Hook](hooks/) · [Tool](tools/) · [组件目录](catalog.json) · [自动能力索引](generated/capabilities.json)

修改包内源文件后，用同一套生成器维护目录，不手工维护第二份能力总表：

```bash
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
```

深入阅读：[任务交付指南](docs/task-agent-delivery.md) · [能力包约定](docs/agent-pack-contract.md) · [专家资料作者指南](docs/expert-package-authoring.md) · [上一轮角色审计](docs/expertise-coverage-2026-11-10.md) · [变更记录](CHANGELOG.md)。

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

仓库级内容采用 [MIT License](LICENSE)。每个能力包的许可证及来源记录独立生效，以包内 `LICENSE`、`PROVENANCE` 或同类文件为准。
