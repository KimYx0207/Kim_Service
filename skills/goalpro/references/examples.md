# Goal Skill 示例

这个文件用于校准输出形状，不要在普通小任务里加载。

## 模糊开发请求

输入：

```text
做个登录功能
```

输出：

Goal Prompt:

```markdown
Goal:
实现用户登录。

User-stated intent:
做一个登录功能。

AI-inferred potential intent:
推断，尚未确认：让已有用户安全进入受保护区域，同时不破坏项目现有认证体系。

Value judgments requiring confirmation:
若项目没有既有认证方案，session/token 选型和本轮是否包含注册需要确认；已有明确方案则沿用。

Strategic outcome:
项目获得一条可维护的基础认证路径，后续权限、账户和审计能力能复用它。

Decision standard:
优先复用现有认证模式；安全和兼容性高于从零设计；不在本轮扩展注册和 OAuth。

Evidence standard:
先读现有用户模型、认证路由、会话中间件和测试命令；用测试和一次手动登录证明行为。

Scope:
登录入口、凭据校验、会话或 token、错误处理、最小测试。

Non-goals:
注册、找回密码、OAuth、角色系统，除非项目已有且本次必须联动。

Context to read first:
项目说明、用户模型、认证路由、会话中间件、测试命令。

Constraints:
不明文存密码；不打印 token；复用现有认证结构。

Execution policy:
如果项目已有认证模式，直接沿用；如果必须在 session 和 token 之间选型且无现有模式，先问。

Verification:
正确账号可登录；错误账号失败；认证测试通过；可运行时手动验证一次。

Stop conditions:
找不到用户模型，或需要新增认证存储决策。

Final report:
改动文件、行为变化、验证结果、剩余风险，并展示一个登录成功/失败路径的样例片段，方便用户判断是否通过。
```

## 战略研究请求

输入：

```text
搜索全网，帮我写一个高质量 goalpro Skill，要支持 Codex 和 Claude Code，必须能分析真实意图，并生成后续 Agent 能执行好的 goal。
```

以下研究内容是提示词中的取证要求，不是已完成检索的证据。研究设计本身不自动触发交付后 Loop：

```markdown
Research required:
这是战略型 Skill 设计任务，依赖当前 Codex / Claude Code / Agent Skills / deep research 最佳实践。没有 deep research 只能给草案，不能给最终战略。

Research question:
判断 goalpro Skill 应该如何同时满足 Codex / Claude Code 触发、战略意图放大、deep research、输出位置、prompt-only 停止和生成 goal 的可执行性要求。

Subquestions:
1. 官方文档如何定义 goal / skill 的触发、完成标准和可验证停止条件？
2. 高质量 GitHub 项目如何组织 skill、references、examples？
3. Reddit / issue 中真实用户在哪些场景里跑偏？
4. X / 社区实践有哪些短循环信号，需要哪些交叉验证？
5. 哪些证据会推翻“默认聊天输出、输出后停止、显式才写文件或执行”的路线？

Evidence Map 待验证:
- Source type: official
  Claim: Codex goal 要写成完成契约，包含结果、约束和可验证 done-when。
  Decision impact: 写入 `Decision standard` 和 `Verification`。
- Source type: official
  Claim: Claude / Agent Skills 的 `description` 是触发表面，必须描述使用场景，不能塞次要优化目标。
  Decision impact: 禁止把表达压缩写进 `description`。
- Source type: method
  Claim: Deep Research / PRISMA / GRADE 要说明来源范围、反证、信心等级和决策影响。
  Decision impact: 增加 `Evidence standard` 和 `Stop conditions`。
- Source type: github / reddit / x
  Claim: 社区高频实践是 plan、inventory、diff、verify 短循环；社区信号只能作候选，必须交叉验证。
  Decision impact: 增加 inventory、社区信号权重和反模式。

Counterevidence:
- 社区帖子可能只适用于作者自己的工具链。
- 过度流程会让小任务变慢。
- 如果用户只是要一个提示词，写文件会降低用户体验。

Confidence:
low。此处只是取证要求；未获得本轮来源与验证前，不能声称研究完成或以候选观点定最终规则。

```

Draft Goal Prompt:

```markdown
Goal:
重建 goalpro Skill，使它先放大真实意图和战略标准，再生成 Codex / Claude Code 可执行、可验证、可暂停的 Goal Prompt，只在真实迭代需求成立时附带 Loop Prompt；没有执行授权时停止。

User-stated intent:
全网研究后写出支持 Codex 和 Claude Code 的高质量 goalpro Skill，明确意图和可执行目标。

AI-inferred potential intent:
推断，尚未确认：解决 agent 接到模糊任务后跑偏、过度计划、假完成的问题；不是追求短提示词，而是追求战略判断正确。

Value judgments requiring confirmation:
哪些失败模式最重要、研究应覆盖哪些宿主尚需依据；不能把模型自己的优先级当成用户已批准标准。

Strategic outcome:
用户能把高风险、模糊、长期或研究型任务交给 agent 前，先得到一份能约束执行、验收和暂停条件的任务契约。

Decision standard:
意图完成度 > 可执行性 > 证据质量 > prompt-only 停止 > 表达经济。任何表达缩减都不能损害成败标准、边界、反证、验证和授权边界。

Evidence standard:
战略任务必须先 fetch 权威来源和反证；普通项目任务必须先读会改变路线的本地材料；最终报告必须区分未验证、结构检查、本地验证、线上验证和人工验收。

Execution policy:
本次研究设计为有限任务，默认只输出 fenced `markdown` Goal Prompt；不要继续改文件、运行命令或提交。只有用户明确授权执行时，才把生成的 goal 交给后续 agent 执行。

Stop conditions:
来源互相冲突且影响核心规则；关键证据缺失；研究没有改变 Goal / Loop 字段；用户没有授权执行但上下文开始要求继续做事。
```

## 大改或重构请求

输入：

```text
把订单模块重构一下，现在太乱了
```

输出必须先阻止“直接重构”：

```markdown
Goal:
重构订单模块中影响维护性的核心路径，并保持现有业务行为不变。

User-stated intent:
重构订单模块，当前结构太乱。

AI-inferred potential intent:
推断，尚未确认：可能希望降低订单模块后续修改成本，不是追求大面积改写。

Value judgments requiring confirmation:
小范围整理还是更大架构调整、是否允许改变公共接口；若影响修复路线，先确认。

Strategic outcome:
订单模块的职责边界、调用关系和验证入口变清楚，后续改需求能更快定位影响面。

Decision standard:
行为兼容 > 可验证切片 > 结构清晰 > 改动范围。禁止无 inventory 的大面积移动文件。

Evidence standard:
先列 inventory：订单相关入口、调用方、数据库/接口边界、现有测试、手动验证路径。每个重构切片必须绑定一个最小验证。

Context to read first:
- 订单模块入口
- 调用订单模块的 API / service / UI
- 订单相关测试
- 构建和测试命令

Execution policy:
先输出 inventory 和分片计划；用户或当前任务允许后，再按最小切片改。每片后运行对应测试或说明无法验证。

Checkpoints:
1. Inventory：影响文件、调用方、测试入口。
2. Slice 1：无行为变化的命名/抽取，验证相关测试。
3. Slice 2：职责拆分或边界整理，验证订单主流程。
4. Final review：diff、行为风险、未覆盖路径。

Stop conditions:
找不到订单行为验收路径；需要改数据库语义；发现多个互斥架构路线；测试无法运行且无手动验证办法。
```

## 修复跑偏请求

输入：

```text
这个不对，太复杂了
```

输出必须做到：

- 指出被否定的是上一版目标或计划。
- 把“太复杂”当成范围失败，不要继续解释上一版为什么合理。
- 给更小的 Goal Contract。
- 明确删掉了哪些工作。
- 如果旧版把次级目标当核心目标，必须改回用户真实意图。

## 意图错位自检

输入：

```text
帮我优化一下这个项目
```

不合格输出：

```markdown
Goal:
优化项目，提高质量。

User-stated intent:
优化当前项目；尚未点明具体问题。

AI-inferred potential intent:
推断，尚未确认：用户想让项目更好。

Value judgments requiring confirmation:
优化指性能、体验还是维护性尚不明确，不能由“优化”两个字推断优先级。
```

合格输出必须补齐：

- 用户点名项目或当前工作区；如果没有目标对象，先问或写明默认假设。
- 分开记录三类意图；不要仅凭“优化”断言用户不满的是可维护性、体验、性能、文档、交付可信度，还是 Agent 已经跑偏。
- `Strategic outcome` 说明完成后局面怎么变，而不是只说“更好”。
- `Decision standard` 能区分该优先小修、重构、研究、清理还是只写 goal。
- `Context to read first` 只列会改变判断的材料。
- `Verification` 对应用户目标；不能只写“测试通过”。

## 聊天窗口直接输出

输入：

```text
用这套 skill，帮我做个目标，优化这个 skill
```

输出位置必须是聊天窗口，不创建文件：

````markdown
Goal Prompt:

```markdown
Goal:
优化 GoalPro 的 `goal` Skill，使它更稳定地把模糊、战略性、多步骤或证据不足的请求转成可执行、可验证、可暂停的 Goal Contract。

User-stated intent:
用这套 Skill 准备优化当前 Skill 的目标提示词。

AI-inferred potential intent:
推断，尚未确认：用户要的是一份能直接复制给 Codex 或 Claude Code 的目标提示词，不是项目文件。默认在聊天窗口输出，除非用户明确要求保存或提交。

Value judgments requiring confirmation:
先减少误执行还是先改进意图识别，需要既有验收依据或用户确认，不能静默排序。

Strategic outcome:
后续优化能围绕意图完成度、成败标准、证据标准、输出位置和验证规则推进，而不是凭感觉改文案。

Decision standard:
用户体验 > 意图完成度 > 成败可判 > 证据质量 > 执行约束 > 表达经济。

Execution policy:
只在聊天窗口输出 fenced `markdown` 代码块；不创建文件、不提交 git。

Verification:
用户能直接复制这段提示词使用；提示词包含目标、意图、标准、执行策略和验证；输出后停止，不继续优化文件本身。
```
````

## 文件加聊天双输出

输入：

```text
把刚才确认的目标保存到 docs/goals/optimize-goal-skill.md，也在聊天里给我一份可复制版本。
```

只保存用户已确认的那份 Goal Prompt，并在聊天中给出同一份内容及实际路径；保存授权不意味着开始执行目标，也不意味着必须补一段 Loop。只有真实写入并回读成功后，才能报告文件已保存。若原提示词没有 Loop，文件和聊天都不新增 Loop。

## 模糊产品请求（一次性交付）

输入：

```text
帮我做个网站
```

这是有限的网站首版交付，默认只有 Goal Prompt。页面复杂或可以继续优化不自动产生 Loop：

````markdown
Goal Prompt:

```markdown
Goal:
做出一个可本地运行、可截图验收、适配桌面和移动端的网站首版；如果用户没有给品牌、行业或内容，先用最小可逆默认假设交付一个可替换内容的真实页面。

User-stated intent:
做一个网站。

AI-inferred potential intent:
推断，尚未确认：根据请求推测用户要“网站”，真实意图通常是想看到一个能拿来展示、评估或继续迭代的成品，而不是空模板、组件堆叠或营销话术。

Value judgments requiring confirmation:
网站受众、主要用途与首版范围尚未明确；可逆展示假设应标注，不预设营销转化最重要。

Strategic outcome:
交付后用户能打开页面、看到清晰主题、主要内容、关键行动入口和基础响应式体验，并能基于真实截图继续提出修改。

Decision standard:
可见成品 > 用户意图贴合 > 响应式与可用性 > 可维护结构 > 视觉 polish。没有素材时使用明确默认假设，不捏造品牌事实。

Workflow lens:
默认不把“做个网站”当成 workflow；它先是一件交付首版的任务。只有用户提出持续更新、定期收集反馈、每天检查数据或内容运营时，才把后续维护写成 workflow。

Evidence standard:
先读项目现有技术栈、设计约定、运行脚本和资源文件；完成后提供本地运行 URL、桌面/移动截图或等价视觉验证、构建/类型检查结果。

Scope:
首屏、核心内容区、行动入口、基础导航、响应式布局、可替换文案和必要视觉资产。

Non-goals:
登录、支付、后台 CMS、SEO 全量策略、部署、真实品牌事实采集，除非用户明确要求。

Context to read first:
README、package scripts、现有页面入口、样式系统、资源目录、AGENTS/CLAUDE 规则。

Execution policy:
若项目已有前端框架和设计系统，沿用现有模式直接实现；若没有项目上下文，交付一个最小可运行静态站点并说明默认假设。若目标行业、品牌或功能会改变信息架构，最多问一个阻塞问题。

Verification:
页面能本地打开；桌面和移动视口无明显重叠；主要按钮/链接状态清楚；构建或静态检查通过；最终报告包含截图/URL/改动文件/剩余假设。

Stop conditions:
需要购买域名、接入支付、使用真实商标素材、采集个人数据、发布线上或选择互斥业务方向时暂停。

Final report:
用短报告说明默认假设、交付内容、验证证据、未做事项和下一步建议，并展示一个首屏/移动端/按钮状态的验收样例片段，让用户能判断网站是否过关。
```
````

## 平台自动化产品请求完整案例

输入：

```text
我需要小红书自动发布器。交付后请继续根据我提供的真实发布结果和失败记录复盘。
```

这里因用户另外明确要求交付后的持续复盘而生成 Goal + Loop；仅“开发自动发布器”五个字并不授权持续执行或真实发帖：

````markdown
Goal Prompt:

```markdown
Goal:
做出一个合规优先的小红书内容发布辅助器 MVP：支持内容草稿、图片/视频素材、发布时间计划、发布前检查、人工确认发布或官方能力发布，并保留发布记录和失败原因。

User-stated intent:
开发小红书自动发布器；另明确要求交付后按实际发布结果持续复盘。

AI-inferred potential intent:
推断，尚未确认：根据请求推测用户要“小红书自动发布器”，真实意图通常是减少重复发布操作、统一管理内容日历、降低漏发/错发风险，而不是冒着账号风控风险做一个不可控的黑盒发帖机器人。

Value judgments requiring confirmation:
可接受的人工确认程度、目标账号和平台权限需明确；开发产品不等于批准真实发帖。

Strategic outcome:
交付后用户能把一批小红书内容从“散落文案和素材”变成可检查、可排期、可追踪的发布队列；如果平台允许官方发布能力，则走官方能力；如果不允许，则提供半自动发布辅助和人工确认流程，避免账号安全和合规风险。

Decision standard:
账号安全与平台规则 > 内容发布闭环 > 可追踪状态 > 自动化程度 > 界面 polish。不能为了“自动”绕过登录、验证码、风控、平台规则或用户确认。

Workflow lens:
产品内部工作流与 GoalPro 的交付后循环分开判断；此例因明确持续复盘请求才交付 Goal + Loop。每轮从“新增草稿/到达检查时间/用户触发发布准备”开始，经过内容检查、风险提示、排期、发布前人工确认、状态记录和失败复盘；队列状态表是 source of truth。Checkpoint 要尽量后移到发布前，先把决策 Brief 准备好，再让用户做一次关键确认。

Evidence standard:
先核对项目技术栈、现有账号/内容/素材数据结构、目标发布流程，以及小红书官方开放平台/创作中心/平台规则中与发布、授权、内容管理相关的当前能力；完成后提供本地可运行入口、草稿到发布队列的演示数据、发布前检查样例、失败/暂停状态样例和安全边界说明。

Scope:
- 内容草稿管理：标题、正文、话题、图片/视频、封面、发布时间、账号标识。
- 发布队列：待检查、待确认、待发布、已发布、失败、暂停。
- 发布前检查：缺素材、标题过长、正文为空、敏感词占位、图片数量/格式占位检查。
- 发布 Brief：每条内容给出标题、素材状态、计划时间、风险、推荐动作和证据链接。
- 发布方式：优先官方 API/官方工具链；没有官方能力时，生成手动发布清单或半自动复制辅助。
- 发布记录：每条内容的状态、时间、操作者、失败原因、下一步动作。

Non-goals:
不绕过验证码/登录/风控；不模拟真人规避平台检测；不存储明文账号密码；不批量骚扰式发布；不承诺平台未开放的自动发布能力；不直接上线真实账号发布，除非用户明确授权并完成平台合规核对。

Context to read first:
README、package scripts、现有前后端入口、数据模型、任务/队列方案、环境变量示例、认证方案、素材存储目录、现有自动化/定时任务代码、项目里的平台集成约定。

Constraints:
不得打印或提交账号、cookie、token、短信验证码、私信内容或个人数据；所有真实发布动作必须有人工确认或官方授权证据；发布失败不能无限重试；涉及真实账号、真实内容、线上发布、代理或浏览器自动化时必须暂停确认。

Execution policy:
先做 inventory，确认是否已有账号模型、内容模型、队列系统和 UI 框架。若没有官方发布能力证据，默认交付“发布辅助器”：实现草稿、排期、检查、发布 Brief、人工确认和状态记录。若必须确认路线，只问一个阻塞问题并给推荐答案，例如“我建议默认走人工确认发布，因为官方发布能力和账号授权未确认；你同意吗？”只有在官方能力与用户授权都明确后，才接入真实发布动作。

Checkpoints:
1. 画出当前内容从草稿到发布的状态流转。
2. 实现最小数据结构和示例内容种子数据。
3. 实现列表/编辑/排期/检查/状态更新界面或接口。
4. 实现发布前检查、失败原因和发布 Brief 展示。
5. 将人工确认点后移到发布前：用户看到 Brief 后只确认发布、修改或暂停。
6. 真实自动发布能力留在明确授权后的独立步骤。

Verification:
用 2-3 条模拟小红书内容验证：一条检查通过进入待确认，一条因缺图片失败，一条因需要官方授权暂停。提供本地 URL 或命令输出、状态流转截图/表格、关键文件、未接入真实发布的说明和剩余风险。

Stop conditions:
需要真实小红书账号、cookie/token、验证码、代理池、浏览器自动登录、绕过风控、真实发布、批量私信/互动、采集用户数据或调用未确认的第三方灰色接口时暂停。

Final report:
汇报默认假设、实现范围、状态流转、验证结果、未做事项和风险边界，并展示一组完整验收样例：输入的 3 条内容、各自检查结果、发布状态、失败/暂停原因和下一步动作，让用户能判断是否通过。
```

Loop Prompt:

```markdown
时间参数:
请自行填写 LOOP 时间，如“每天早上 09:00 检查发布队列”；如果只想手动继续，填写“手动：贴入上一轮最终报告、截图、状态表、用户反馈或 Next LOOP packet 后继续”。

Loop mission:
持续推进小红书发布辅助器从“能管理草稿和发布队列”走向“安全、可追踪、可授权地减少人工发布成本”；每轮只关闭一个最影响发布闭环或账号安全的差距。

Loop state:
继承原始产品目标、当前轮次、已实现模块、发布方式假设、已验证状态流转、开放风险、用户反馈、平台能力核对状态和下一轮焦点。

Trigger:
优先事件触发：新草稿进入待检查队列、内容到达计划检查时间、用户手动点击准备发布；固定时间如“每天 09:00”只是时间参数，不代表已创建后台任务。

Checkpoint:
发布前只让用户做一次关键确认：确认发布、修改后再审、暂停并补授权。不要在还没准备好内容、素材、风险和推荐动作前打断用户。

Brief:
每条待确认内容必须给用户一个短摘要：标题、素材状态、计划发布时间、检查结果、风险、推荐动作、证据链接或截图位置。用户读 Brief，不读原始草稿堆。

Previous result to inspect:
上一轮最终报告、本地 URL/截图、内容状态表、模拟内容数据、发布 Brief、发布前检查输出、失败日志、平台能力核对结论、用户对自动化程度的反馈。

Review evidence:
区分“草稿管理可用”“发布前检查可用”“人工确认路径可用”“真实发布已授权且可用”和“只是界面写了自动发布”。不能把模拟状态当成真实平台发布成功。

Gap diagnosis:
按账号安全风险、平台能力不明、发布闭环缺口、状态不可追踪、检查规则缺失、界面效率低排序剩余差距。

Cycle action:
本轮只处理最高价值差距。若缺少官方发布能力证据，优先强化发布辅助和人工确认；若用户提供官方授权和测试账号，再单独设计真实发布接入；不要扩展到私信、评论、采集、涨粉或规避风控功能。

Verification delta:
补充上一轮缺失的状态流转、截图、Brief 样例、失败样例、授权边界或发布记录验证，并说明本轮新增证据关闭了哪些差距。

Loop guardrails:
最多连续 3 个 LOOP 周期；若连续 2 轮仍无法确认平台发布能力、真实账号授权不可得、测试发布风险过高、或用户要求绕过风控，则 Pause。

Continuation protocol:
每轮结束判定 `Done`、`Continue` 或 `Pause`。如果仍有影响安全发布闭环的开放差距，输出下一轮 `Next LOOP packet`；如果主要闭环已完成且风险边界清楚，报告 Done；如果需要真实账号、授权、平台规则判断或高风险自动化，报告 Pause。

Stop / escalate conditions:
需要真实账号登录、cookie/token、验证码、代理、浏览器模拟发布、绕过平台限制、真实上线发布、处理个人数据、调用不明第三方接口或批量互动时暂停。

Next LOOP packet:
包含原始小红书发布辅助器目标、当前轮次、已关闭证据、开放差距、时间参数、Trigger、Checkpoint、Brief 要求、下一轮焦点、要读取的状态表/截图/日志/平台能力证据、验证 delta 和暂停条件。
```

验收样例：

```markdown
模拟内容 A：标题、正文、3 张图片齐全 -> 状态：待人工确认发布 -> 下一步：用户确认或复制到官方发布入口。
模拟内容 B：正文齐全但缺图片 -> 状态：检查失败 -> 原因：缺少至少 1 张图片 -> 下一步：补素材。
模拟内容 C：计划每天 09:00 自动发布 -> 状态：暂停 -> 原因：未确认官方发布能力和账号授权 -> 下一步：核对官方能力或改为人工确认。
Brief 示例：内容 A 已通过检查，建议动作：确认发布；证据：3 张图片齐全、标题未超长、发布时间已设置。
```

按 `时间参数` 使用 LOOP 继续进化；如果要定时或后台自动跑，需要单独授权自动化设置。
````

## Codex `/goal` 示例

```markdown
/goal
把项目从 JavaScript 迁移到 TypeScript。

User-stated intent:
将项目从 JavaScript 迁移到 TypeScript。

AI-inferred potential intent:
推断，尚未确认：提升项目长期可维护性和类型安全，同时保持现有用户行为不变。

Value judgments requiring confirmation:
迁移严格程度和兼容范围若未确认，先列为待确认；不得为追求类型覆盖率擅自改变行为。

Strategic outcome:
项目拥有可持续演进的类型基础，后续功能开发能更早暴露接口和数据错误。

Decision standard:
行为兼容高于迁移速度；严格类型高于一次性大改；不为了减少改动而保留无意义 `any`。

Done when:
- 应用能在 strict mode 下编译。
- 不新增显式 `any`，除非有注释说明无法避免。
- 现有用户行为不变。
- 构建和现有测试通过。

Read first:
- AGENTS.md
- package scripts
- tsconfig 或构建配置
- 源码入口

Work in checkpoints:
1. 建立当前 build/test 基线。
2. 转换配置和入口。
3. 小批量转换模块。
4. 每批后运行 build/tests。

Pause if:
- 需要升级依赖。
- 自动重写会碰到无关行为。
- 验证无法运行。
```

## 长期目标：代理证据与重审

输入：

```text
根据这个月的 Git 提交判断研发时间花在哪里，以后拿到新的工时记录时继续帮我复盘。
```

这是明确要求以交付后新记录持续复盘的例子；提交数据不足以直接得出时间占比。

Goal Prompt:

```markdown
Goal:
形成可校正的研发投入判断，用足够覆盖实际工作的证据识别主要投入方向。

User-stated intent:
根据本月 Git 提交分析研发时间去向，并在提供新工时记录后继续复盘。

AI-inferred potential intent:
推测用户想改进资源分配；尚未明确，不直接给某类工作设定更高优先级。

Value judgments requiring confirmation:
是否按耗时、产出价值或风险评估投入，需要用户决定；不能用提交数替用户选择评价标准。

Goal / Plan / Output:
Goal 是判断投入并可被证据校正；Plan 是核对提交、补充工时、比较覆盖范围；Output 是分析表。表生成不代表投入判断已经成立。

Evidence standard:
Direct evidence: 经用户核对、覆盖指定时期的实际工时记录；当前尚未提供。
Proxy evidence: Git 提交时间与变更记录，只能证明仓库可见的代码活动。
Proxy target: 实际研发时间投入。
Coverage gap: 未覆盖设计讨论、阅读、线下排障、未提交工作，也无法从提交次数推得持续时间。
Confidence: low；先报告仓库活动分布，不将其写成完整时间占比。
Counterevidence: 新工时记录可能显示低提交频率的工作占用更多时间。

Revalidation trigger:
用户提供覆盖该时期的新工时记录、发现未纳入的工作类别，或两种证据得出相反排序时，先暂停旧投入结论，重审目标标准及证据覆盖，再由用户确认是否修订判断。

Execution policy:
这里只生成提示词；读取私有记录、保存文件、创建自动化或调整资源分配均不由此获得授权。

Verification:
分别展示已有证据支持的结论、未覆盖部分和不能得出的结论；不同证据冲突时保留冲突，不用填完表格代替判断成立。
```

Loop Prompt:

```markdown
时间参数:
手动：用户提供新的工时记录后；未创建后台调度。

Loop mission:
用新增直接证据复核本月投入判断，不为保持连续性而维护已被推翻的结论。

Loop state:
继承已确认目标、待确认价值标准、已有证据范围、覆盖缺口与当前信心；不静默重写原 Goal。

Previous result to inspect:
上一轮活动分布、覆盖说明、新工时记录及用户对评价标准的确认。

Review evidence:
先检查 Revalidation trigger。若新增证据推翻目标前提，先报告 Pause 和需要重审的目标，不继续按旧计划循环。

Cycle action:
只更新新增证据覆盖的判断；证据未新增时不制造一轮空跑。

Verification delta:
说明本轮补足或仍缺少的覆盖范围，以及哪些结论被保持、修订或撤回。

Loop guardrails:
没有新证据、需要未获授权的数据或评价标准尚未确认时 Pause；目标证据足够且没有继续需求时 Done。

Continuation protocol:
Continue 时附 Next LOOP packet，列明下一次需要的具体证据；不因生成该包而执行任务或创建自动化。
```

## Claude Code 任务提示词示例

```markdown
使用 goalpro Skill，把下面请求整理成可执行任务；目标清楚后再实现。

先读 `CLAUDE.md` 和用户点名文件。若请求依赖外部事实、战略判断或高质量研究，先做 deep research 并给证据地图；若存在会改变范围、风险或验收的多条路线，先通过原生提问界面问我。

若请求涉及大改、重构或跨模块行为，先输出 inventory 和分片验证计划，不要直接修改代码。

请求：
[用户请求]
```

只有满足 Loop 需求判断门时才附带交付后循环提示词；生成提示词、执行目标和创建后台自动化分别需要对应授权。
