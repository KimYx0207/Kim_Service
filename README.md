# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**让 AI 知道这项工作怎么做、交什么、怎样算做好。**

Kim Service 是老金（KimYx0207）维护的专业能力库。这里的每个 Agent 和 Skill 都围绕具体任务提供方法、专业资料、完整示例和交付标准。你可以让客户端直接读取一个包，也可以配合 [Meta_Kim](https://github.com/KimYx0207/Meta_Kim) 自动选择和组织执行。

**48 个专业 Agent，21 个 Skill**，另有 Hook 和 Tool。当前版本：**[V1.11](https://github.com/KimYx0207/Kim_Service/releases/tag/V1.11)**。

## 找到你要做的事

| 领域 | 典型任务与能力入口 |
| --- | --- |
| **软件开发** | [前端](agents/frontend-engineer/)、[后端与数据](agents/backend-data-engineer/)、[移动应用](agents/mobile-app-engineer/)、[数据管道](agents/data-pipeline-engineer/)、[自动测试](agents/test-automation-engineer/)、[可靠性](agents/reliability-engineer/) |
| **AI 应用** | [AI 产品实现与评测](agents/applied-ai-engineer/)、[检索质量评估](skills/retrieval-evaluation/) |
| **产品与设计** | [产品架构和 PRD](agents/product-architect/)、[交互设计](agents/interaction-designer/)、[设计系统](agents/design-system-designer/)、[品牌视觉](agents/brand-visual-designer/)、[可访问性](skills/accessibility-audit/) |
| **金融与经营** | [财务建模](agents/financial-modeler/)、[会计对账](agents/accounting-reconciliation-analyst/)、[投资研究](agents/investment-research-analyst/)、[经营财务](agents/business-finance-analyst/)、[定价成本](agents/pricing-cost-analyst/) |
| **电商与销售** | [订单运营](agents/commerce-operations-designer/)、[商品文案](agents/product-listing-writer/)、[销售运营](agents/sales-operations-analyst/)、[门店分析](agents/store-performance-analyst/) |
| **内容与营销** | [选题](agents/topic-planner/)、[脚本](agents/script-writer/)、[标题封面](agents/headline-cover-optimizer/)、[媒体制作](agents/media-production-engineer/) |
| **教育与人才** | [课程设计](agents/lesson-planner/)、[学习评价](skills/learning-assessment-design/)、[招聘流程](agents/hiring-process-designer/) |
| **工业与能源** | [制造质量](agents/manufacturing-quality-analyst/)、[供应链](agents/supply-chain-planner/)、[系统工程](agents/systems-engineering-analyst/)、[能源项目](agents/energy-project-analyst/)、[碳核算](agents/sustainability-analyst/) |
| **更多行业** | [医疗运营](agents/healthcare-operations-analyst/)、[农业规划](agents/agronomy-planner/)、[建筑信息](skills/construction-information-review/)、[游戏试玩](skills/game-design-playtest/) |

完整目录：[专业角色](agents/README.md) · [任务浏览器](docs/start.html) · [能力索引](generated/capabilities.json)。下载仓库后，`docs/start.html` 可以直接在浏览器中离线打开。

## 交出来的应该是什么？

| 任务 | 可检查的交付 |
| --- | --- |
| 做一个报名产品 | 系统方案、模块 PRD、完整交互状态、前后端契约和演示路径 |
| 上线一个 API | 请求与错误定义、权限行为、测试结果、发布观察项和回退步骤 |
| 做财务方案 | 标明币种和期间的模型、可复算的公式、情景比较和敏感因素 |
| 建设计系统 | 设计变量、组件状态、键盘操作和可访问性检查 |
| 管库存和订单 | 按时间追踪库存、缺货点、订单异常与恢复动作 |

每个包都说明所需输入、操作步骤、判断依据和验收方法。普通资料缺项可以先写明假设、形成草稿；影响金额、权限、发布或专业结论的关键未知，需要在对应动作前补齐。

## 三步使用

1. 从上面的任务入口选择一个包，让你的 AI 客户端读取它的 `AGENT.md` 或 `SKILL.md`。
2. 提供目标、当前项目或业务资料，以及希望拿到的结果。
3. 按包里的交付标准检查结果；使用 Meta_Kim 时，方法与资料会随任务一起交给执行者。

例如：

> “读取 `agents/financial-modeler/`，把这份销售、成本和回款数据做成未来 12 个月的经营模型。说明假设，给出基础、乐观、保守三个情景，并检查现金缺口。”

安装源就是本仓库中选定的组件目录。Codex、Claude Code、Cursor、Gemini CLI 和 ZCode 的路径与调用方式由客户端或 Meta_Kim 的适配层处理。更新仓库使用 `git pull --ff-only`，再按所用客户端更新能力包。

### DSH（DeepSeek Harness）

DSH 需要 Node.js 24.9.0+；当前适配按 `0.2.2-rc.1` 检查。构建完整原生 Skills，再通过 Meta_Kim 安装：

```sh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh
node /path/to/Meta_Kim/bin/meta-kim.mjs dsh install --service-package /path/to/kim-service-dsh
node /path/to/Meta_Kim/bin/meta-kim.mjs dsh check
dsh --profile meta-kim
```

把 `/path/to/Meta_Kim` 换成你的 Meta_Kim 仓库路径；已全局安装 CLI 时可以直接使用 `meta-kim`。选择一个尚不存在的输出目录。更新与项目安装见 [DSH 指南](docs/dsh.md)；ZCode 使用 [完整内容包指南](docs/zcode-beta.md)。

## 与 Meta_Kim 配合

<p align="center">
  <img src="docs/images/intent-to-delivery.zh-CN.svg" alt="Meta_Kim 组织整体工作，Kim Service 提供专业方法和资料" width="760">
</p>

**Meta_Kim 负责研究、决策、编排和连续性；Kim Service 提供专业方法。** 先确定系统方案，再细化模块。执行者按当前项目需要读取资料，模块按实际依赖协作。

## 一个专业包里有什么？

| 内容 | 作用 |
| --- | --- |
| `AGENT.md` / `SKILL.md` | 入口、适用任务和操作方法 |
| `capability.json` / `method.json` | 输入、输出、方法和逐项交付检查 |
| `references/` | 按需读取的专业知识与出处 |
| 完整案例与正反例 | 展示合格结果和需要修正的问题 |
| `scripts/` / `tests/` | 计算、校验或可复现的组件检查 |
| `PROVENANCE.md` / `LICENSE` | 来源与许可证 |

测试分别覆盖文件合同、确定性工具、安装加载和实际任务表现。案例帮助理解标准，实际效果由当前产物评价。研究来源、行业范围和验证结果见[行业覆盖说明](docs/research/industry-coverage-2026-11-11.md)及[验证记录](docs/verification/dsh-professional-quality-2026-11-11.md)。

## 维护与参与

修改组件后，重新生成目录并运行检查：

```bash
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
```

[Agent](agents/) · [Skill](skills/) · [Hook](hooks/) · [Tool](tools/) · [能力包约定](docs/agent-pack-contract.md) · [作者指南](docs/expert-package-authoring.md) · [中文更新日志](CHANGELOG.zh-CN.md)

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
