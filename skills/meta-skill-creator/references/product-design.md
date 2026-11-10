# Meta Skill Creator 产品设计

## 1. 产品定位

`meta-skill-creator` 是一个面向 AI agent 的 Skill 产品工厂。它的价值不是“帮你写一份 SKILL.md”，而是把一个模糊能力需求转成可复用、可评测、可发布、可持续改进的 skill 包。

一句话定位：

> 把“我想要一个 skill”变成“一个有领域研究、用户结果、证据、资产、评测、发布门禁和漂移回写的能力产品包”。

## 2. 目标用户

### 主要用户

- Skill 产品 owner：想批量生产交付级 skill，但不接受“文档完整、产品很弱”。
- 负责执行的 Codex / Claude / agent：需要明确知道先研究什么、何时停、何时评测、何时不能宣称 ready。
- 后续评审者：需要看到证据、合同、门禁、测试结果，而不是只看漂亮总结。

### 非目标用户

- 只想要一次性提示词的人。
- 不愿做 eval、baseline 或版本回归的人。
- 需要立即覆盖系统级 `skill-creator` 的安装管理场景。

## 3. 用户痛点

| 痛点 | 过去弱点 | 本产品处理方式 |
|---|---|---|
| skill 看起来完整但不好用 | 只写 SKILL.md、evidence、rubric | 先研究意图领域，再锁最终品和用户满意标准 |
| agent 瞎猜领域 | 从熟悉平台或例子套结构 | Domain Research Brief 前置，证据不足返回 `research-needed` |
| 触发不稳定 | description 像简介文案 | trigger eval 前置 |
| 质量无法证明 | 没有 baseline | with/without 对照 |
| 越改越复杂 | 主文件堆成百科 | progressive disclosure 和 package plan |
| 多模态质量差 | 只写一段泛图片提示词，不查本地生图/MCP能力 | 先做本地能力盘点，再写结构化 multimodal brief，最后用实图/截图/导出证据验收 |
| 工具路线改变了用户产物 | 把可编辑表格/精确数据图转成图片，或只交静态模拟代替真实图像 | 先按精度、编辑与使用需求选产物原生路线；仅栅格创意图使用 Image2/host-native -> MCP/plugin -> local render -> static preview，并记录降级原因 |
| 外部参考容易变抄袭 | 直接模仿结构或话术 | source abstraction boundary 只抽象机制 |
| ready 宣称过早 | quick validate 被当成质量证明 | release gate 分层验收 |
| 失败不沉淀 | 每次临场补丁 | 闭环运行记录 + 写回/不写回决策 + 回归检查 |

## 3.1 核心修正：先做意图领域研究，不先套平台模型

`meta-skill-creator` 不能先问“要哪些文件”，也不能先问“像不像某个熟悉平台或文档类型”。它必须先问：用户这个意图属于什么领域、这个领域真实工作流是什么、原生产物是什么、哪些输入必须真实、哪些东西绝不能伪造。

元级流程：

```text
用户原始意图
-> 领域假设
-> Domain Research Brief
-> Domain Model: 用户 / 压力场景 / 工作流 / 原生产物 / 工具 / 标准 / 失败模式
-> Experience Surface Discovery
-> Artifact Chain
-> Generation Pipeline
-> Package Plan
-> Eval / Release Gate
-> Loop Decision
-> Writeback / Proposal / None-with-reason
```

如果 Domain Research Brief 证据不足，输出 `research-needed`。但 `research-needed` 不能太早给出：必须先尝试可用证据检索，包括用户材料、本地 skill/domain-rules、Graphify、官方/平台文档、高信号样本、用户失败讨论和反证。不能因为模型熟悉某个平台，就把那个平台的产物链套到新领域上。

体验表面仍然重要，但它是领域研究之后的结果，不是第一步。

## 3.2 例子不是元规则

例如一个社交图文平台，只有在研究确认它是图文内容生产场景后，才进入下面判断：

- 平台表面：手机信息流里的图文笔记。
- 用户第一眼看到：封面图 + 标题。
- 用户继续消费：6-8 页图文卡片、正文、标签、平台安全互动边界。
- 用户真正要的最终品：可发布的图文笔记包，而不是“某平台风格文案”。
- 关键生成链路：主题 -> 角度 -> 封面图策略 -> 内页图脚本 -> 图片提示词或直出图 -> 标题正文标签 -> 发布包 -> 自检。

对此类 skill，下面这种输出直接失败：

```text
10 个标题 + 一段正文 + 标签
```

合格输出必须像这样：

```text
主题输入
-> 目标读者和笔记意图
-> 选题角度
-> 封面承诺和封面字
-> 3:4 封面图提示词或直出图
-> 6-8 页图文页脚本
-> 每页图片提示词或图文卡片
-> 正文、标签、平台安全互动边界
-> 素材缺口、发布 brief、最终自检
```

这才是社交图文类 skill 的核心设计。它不是元规则本身，只是“领域研究 -> 表面发现 -> 产物链”的一个 worked example。

## 4. 产品承诺

### 3 分钟可见结果

用户给出一个技能想法后，先产出一张 `Skill Design Board`，包括：Domain Research Brief、领域模型、平台/工作表面、用户最终品、原生媒介、生成链路、是否值得 skill 化、核心失败模式、杀手机制、初版文件结构、必跑 eval、ready 前缺口。

### 最终交付

最终交付不是固定文件清单，而是按 `core / conditional / release` 风险层级满足结果合同：

- `core`：必须有轻量 `SKILL.md` 入口，并明确目标、触发、输入、最终产物、执行步骤、边界、失败路线和最小验证。具体内容能在一个文件里清楚表达时，不拆目录。
- `conditional`：只有领域陌生、事实易变、面向公开受众、依赖视觉/多模态工具或需要多轮决策时，才增加相应的 research、reference、asset、script、eval 或 example。每个新增文件都要对应一个可复现失败或执行需要。
- `release`：只有准备公开、迁移或销售时，才补公开 README、许可证、变更记录、归属说明，以及与声明强度匹配的真实运行和人工验收证据。

目录数量不是完成标准。通过标准是：用户得到约定产物，步骤可执行，边界能阻断错误路线，验证证据与声明层级一致；不需要的模块必须省略。

## 5. 体验流程设计

### Step 1. Domain Research Brief

目的：防止把陌生领域误写成模型熟悉的平台套路。

必须回答：

- 用户原话是什么？
- 这可能属于哪些领域？置信度是多少？
- 已读证据是什么：用户材料、本地 skill/domain-rules、Graphify、官方文档、高信号项目、用户失败讨论、反证？
- 可用证据检索是否已经尝试？哪些路径不可用？
- 真实用户是谁？压力场景是什么？
- 现有工作流是什么？
- 领域原生产物是什么？
- 常见工具、平台、交付表面是什么？
- 用户第一眼判断什么？
- 哪些输入必须真实？哪些可以生成？哪些绝不能伪造？
- 结论是 `make` / `do-not-make` / `research-needed`？

输出：Domain Research Brief。没有它，不进入 SKILL.md。

### Step 2. Experience Surface Board

目的：把领域研究转成用户实际体验，而不是通用 prompt。

必须回答：

- 这个能力发生在哪个平台、渠道或工作表面？
- 用户最终要拿到什么可见成品？
- 这个表面的原生媒介是什么：图、文、视频、演示文稿、表格、页面、文件包？
- 用户第一眼怎么判断好坏？
- 主题或材料如何变成最终成品？
- 哪些素材必须真实提供，哪些可以生成，哪些不能伪造？

输出：`make` / `do-not-make` / `research-needed`。

### Step 2.5. Local Capability And Multimodal Tooling Board

目的：防止“应该生成图/视频/文件”的 skill 退化成泛提示词、SVG 兜底或空口承诺。

当最终品包含图片、视频、音频、演示文稿、PDF、文档、表格、Dashboard、网页预览、截图、导出文件或任何非纯文本产物时，必须回答：

- 当前宿主有哪些原生工具：Image2/图片生成、编辑、浏览器、文档、表格、演示文稿、PDF、渲染或截图？
- 当前可用 MCP/plugin 有哪些：生图、视频、画布、浏览器、渲染、部署、数据可视化等？
- 项目本地已有脚本、模板、assets、validator、preview 生成器是什么？
- 哪些工具要用户显式许可，因为会付费、发外部请求、发布或改外部状态？
- 当前产物的主路径是什么；若是栅格创意图，什么情况下才允许从 Image2/host-native 降级到 MCP？精确图表、可编辑文件与原生界面应直接选相应工具，不套用图片降级链。
- 什么证据能证明输出真的生成了：文件、widget、截图、URL、validator、原生弹框返回？

输出：Local Capability Inventory + Multimodal Brief Contract。缺这个，不写多模态 skill 的 `SKILL.md`。

### Step 3. Artifact Chain Board

目的：把“用户给一个主题/材料/目标”转成真实生产链。

必须写：

```text
raw intent
-> Domain Research Brief
-> platform/work surface
-> audience/use moment
-> artifact components
-> local capability inventory and primary tool route
-> generation pipeline
-> final package
-> acceptance gate
```

如果研究结果确认是社交图文内容，artifact components 必须包含封面、内容页、正文、标签和发布包；如果确认是演示文稿，必须包含页面、视觉方向、导出或预览；如果确认是长文发布，必须包含标题、封面、正文、排版预览和发布检查。未知领域先研究，不套这些结构。

### Step 4. Evidence Board

目的：防止闭门造车。

每条来源写成 evidence card：source、claim、relevance、confidence、counterevidence、decision impact、translated asset or eval。

输出：哪些机制可抽象，哪些不能复制，哪些宣称不能写。

### Step 5. Contract Board

目的：先定义能力边界，再写文件。

包含 Domain Research Contract、Result Definition、Trigger Contract、Input / Output Contract、Package Contract、Boundary Contract、Eval Contract。

输出：候选 `references/skill-contract.md`。

### Step 6. Package Map

目的：决定文件为何存在。

每个文件必须回答：它服务哪个用户结果？它防哪个失败模式？它什么时候被读取或执行？如果删掉它，skill 会弱在哪里？

输出：Package Plan。

### Step 7. Build Pass

目的：最小可用、可扩展，不写百科。

规则：`SKILL.md` 写运行主干；`references/` 写细节；`scripts/` 写确定性动作；`assets/` 写模板和工作台；`examples/` 写真实输出，不写空模板。

### Step 8. Loop Closure Board

目的：让验收、失败和用户反馈进入下一轮，而不是停在“这次做完了”。

必须回答：

- 本次运行的真实目标是什么？
- 当前证据到了哪一层：structure / contract / artifact / runtime / human？
- 哪些发现已经修复？哪些只是接受风险？
- 有没有重复失败或漂移信号？
- 决策是 `writeback`、`proposal`、`none-with-reason` 还是 `blocked`？
- 如果写回，写到哪个 reference、asset、script、eval 或 example？
- 如果不写回，为什么这次没有可复用学习？
- 下一轮可复用键是什么？

输出：填写后的 `assets/loop-run-record-template.md` 副本，或同字段的运行记录。无闭环记录，不声称 ready。

### Step 9. Eval Board

目的：证明不是自嗨。

四类 eval：Trigger Eval、Output Eval、Baseline Compare、Regression A/B。

对多模态或工具依赖 skill，Output Eval 必须额外覆盖：

- 是否按产物类型选择了保持精度、编辑性和实际使用方式的工具；栅格创意图才检查 Image2/host-native 优先与降级证据，不能让这条规则迫使统计图、文档或界面变成生图。
- 结构化 prompt brief 是否包含构图、文字、工具约束、负面约束、验收标准和 fallback。
- 没有实图/导出/截图证据时，是否诚实标为 `partial` 或 `blocked`。
- 是否跑过新窗口/新进程 acceptance，避免当前线程记忆把缺口盖住。

### Step 9. Review Gate

目的：ready 不是口头判断。

分为 structure gate、domain research gate、trigger gate、output gate、baseline gate、regression gate、asset gate、safety gate、originality gate、visible-test gate、drift gate、loop gate。

## 6. 信息架构

下面描述的是 `meta-skill-creator` 自身的能力分区，不是候选 Skill 的文件模板：

```text
meta-skill-creator/
  SKILL.md       # 轻入口与路由
  references/    # 按触发条件加载的规则
  assets/        # 确实需要复用时才使用的工作材料
  scripts/       # 确定性检查与准备器
  evals/         # 触发和回归用例
  examples/      # 少量真实示例，不是默认模板
```

## 7. 产品质量分层

| 层级 | 名称 | 标准 |
|---|---|---|
| L0 | prompt helper | 只能输出提示词，没有包结构 |
| L1 | design candidate | 有领域研究、产品设计、contract、package plan |
| L2 | operating candidate | 有 SKILL.md、模板、evals、检查脚本、闭环治理契约 |
| L3 | evaluated candidate | 跑过 trigger/output/baseline/regression，并通过本地能力/多模态门禁和闭环记录检查 |
| L4 | ready | 有可见线程、clean-session 验收、人工反馈、漂移回写、闭环决策和发布包 |

当前版本目标：L2 operating candidate。它可以用于设计候选 skill，但还不能宣称已通过真实 with/without baseline。

## 8. 关键产品原则

1. Research before assumption：先研究意图领域，不从熟悉例子瞎猜。
2. Outcome first：先定义用户最终品，再设计文件。
3. Surface after domain：先理解领域，再定义平台/工作表面。
4. Artifact chain before SKILL.md：先写主题到最终产物的生成链，再写运行主干。
5. Trigger is product routing：description 是路由合同，不是简介。
6. Assets prevent failure：非文档资产必须防一个具体失败模式。
7. Evidence changes design：来源必须改变某个设计决策。
8. Baseline or no claim：没对照，就不能说更强。
9. Version discipline：每次核心改动都要和上一版比。
10. No source leakage：内部可以记录参考，面向用户的输出不能露出“参考某项目”。
11. Drift is fuel：失败样本不是污点，是下一版 eval。

## 9. 详情产品设计：一次运行如何展开

用户输入：

```text
我想做一个客户支持跟进 skill，聊天记录和工单备注很散，想让它生成可发送回复和内部交接清单。
```

处理：

1. 先写 Domain Research Brief：这是客户支持跟进和内部交接领域，不是泛写作。
2. 判断这是重复高频任务，适合 skill 化。
3. 写用户最终品：可发送回复、内部交接清单、升级判断、缺失信息列表。
4. 查证据：客户支持流程、服务承诺边界、隐私处理规则、用户失败点、反证。
5. 写合同：trigger、输入材料、输出文件、缺信息追问、不可承诺未验证解决状态。
6. 写 package plan：语气规则、交接模板、验证器、示例输入输出、模糊测试。
7. 写 SKILL.md：只保留执行主干。
8. 写 eval：记录缺失、客户情绪强、内部备注冲突、隐私信息处理、升级不确定。
9. 做 baseline：普通 prompt 生成的回复 vs skill 生成的回复 + 交接清单。
10. release gate：没有 clean-session acceptance 和 baseline 优势，不准 ready。

未知领域处理：

```text
用户：做一个宠物医院复诊提醒 skill。
正确：先研究宠物医院复诊工作流、宠物/主人信息边界、医疗建议风险、提醒渠道、诊后材料、升级规则。
错误：套用熟悉平台、文档类型或普通客服话术。
若证据不足：research-needed。
```

## 10. 当前边界

- 当前包是项目内候选，不是已安装到系统的全局 skill。
- 当前包提供产品设计、模板、检查器和 eval 计划；还没有完成真实多线程 with/without 测试。
- 多模态或工具依赖 skill 必须新增本地能力盘点、结构化 multimodal brief、实图/导出证据和 clean-session acceptance，才能算 ready。
- 当前版本已把领域研究前置，但还没有跑跨领域真实 blind tests。
- 如果要替换系统级 `skill-creator`，必须先基于本包跑一次真实候选创建，再做 A/B 和用户确认。
