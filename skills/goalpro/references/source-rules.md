# Goal Skill 方法依据

这个文件只在改进 Skill、解释方法来源、做质量复查时读取。普通使用不要加载。

## 采用的规则

- Goal 是完成契约，不只是提示词：必须写清结果、限制、done-when 和验证证据。
- GoalPro 是提示词生成 Skill，不是执行器：默认一次性交付只产出可复制 Goal Prompt；只有存在真实后续迭代需求时才追加 Loop Prompt，执行需要用户另行明确授权。
- Loop Prompt 是交付后的持续进化协议，不是自动化运行时：必须读取上一轮真实结果、验证证据、用户反馈和 loop state，再决定本轮动作、Done / Continue / Pause，并在 Continue 时产出可直接复用的 `Next LOOP packet`；不能授权当前 GoalPro 回合执行。
- Loop Prompt 必须把 `时间参数` 放在最前面：提示用户自行填写 LOOP 时间，如“手动：贴入上一轮结果后继续”“每天早上 09:00”“每次部署后”。这比把触发规则藏在后面更接近真实使用。
- Loop Prompt 必须区分时间入口和自动化运行时：写了“每天 09:00”只是时间参数；只有用户明确授权创建自动化时，才进入自动化设置。
- 自动化设置说明只在用户明确说自动、定时、每天、每周、持续监控或后台运行时写；必须简短说明调度器/平台、频率、时区、输入来源、权限、暂停条件和失败通知，不能暗示提示词本身已经后台运行。
- 生成的 Goal 必须可执行：执行者能看出对象、动作、先读材料、范围、非目标、检查点、暂停条件和完成证据。
- 生成的 Loop 必须可持续且可收敛：后续执行者能看出时间参数怎么填、上一轮要读什么、继承什么状态、本轮修什么、如何证明新增价值、循环预算和无收敛阈值是什么、何时 Done / Continue / Pause、下一轮 LOOP 包怎么生成。
- Workflow lens 只在重复性工作中启用：用户提到每天、每周、自动、持续、运营、发布、监控、队列、复盘、审核、同步等信号时，先判断它是不是可委托 workflow；不是重复工作就不要强行流程化。
- Workflow lens 不新增 `Workflow Prompt`，不要把 GoalPro 写成执行器、调度器或流程图交付工具；必要信息先写进 Goal，存在真实循环时再写进 Loop。
- 重复 workflow 要把 Trigger、Checkpoint、Brief 和 source of truth 写进 Goal / Loop：什么时候开始、在哪里让人确认、给用户看什么决策摘要、以哪个状态表/文件/系统为准。
- 提问要少但要准：如果不同路线会改变风险、权限、范围或验收，最多问一个阻塞问题，并给推荐答案；能通过读取上下文解决的问题，先读上下文。
- 生成的 Goal 必须先过意图对齐质量门：分别写清用户明确表达的意图、AI 推断的潜在意图、需要用户确认的价值判断，再让战略结果、执行策略和验收证据与已确认意图互相支撑。
- Skill 的 `description` 是触发表面：只写“何时使用”和“做什么”，不能把次级优化目标写成触发词。
- 输出位置是用户体验契约：默认聊天窗口给可复制代码块；只有用户明确要求保存或提交时才写文件。
- 完成后的可判断样例是验收契约：最终汇报必须给用户看一个实际样例、案例片段、截图说明或改后输出片段，否则用户无法判断是否通过。
- 输出形状必须清楚：默认用 `Goal Prompt:` 标签引出一个 fenced `markdown` 代码块；只有通过 Loop 需求判断门时才追加 `Loop Prompt:` 和第二个代码块，不把标签放进代码块内，不输出 meta prompt rewrite 包装。
- Skill 正文要短；细节、来源、示例放 `references/`，靠 progressive disclosure 按需加载。
- 战略任务必须先证据后定论：没有 deep research 的战略只能标为草案。
- 复杂研究用 orchestrator-workers 思路拆源、拆观点、拆反证；有清晰评价标准时用 evaluator-optimizer 思路反复修正。Loop Prompt 把这个反复修正封装成可持续的循环协议：每轮执行后都更新 loop state 并产出 `Next LOOP packet`，但不在当前 GoalPro 回合自动运行。
- 评测要拆开：意图识别、证据质量、路线判断、Goal 可执行性、Prompt-only 停止、执行遵守、最终状态不能混在一起。
- 开源与社区资料只作为实践信号：GitHub 优先于 X / Reddit；重复出现且能解释真实失败的信号才吸收。
- Meta_Kim：Critical -> Fetch -> Thinking -> Execution -> Review -> Verification；先取证再定路线；结构检查不能冒充用户目标完成。

## Deep Research 规则

当任务影响战略、路线、投入、长期标准，或依赖当前外部事实时，必须先做 deep research。

合格的 deep research 不是“搜很多链接”，而是形成可决策的证据地图，并让证据改变 Goal Contract。

执行流程：

1. `定义研究问题`：写清这次研究要改变哪个判断。不要写成宽泛主题。
   - 错误：研究 Claude Code 最佳实践。
   - 正确：判断 goalpro Skill 是否应该默认聊天输出，还是默认写入文件。
2. `拆子问题`：从事实、规范、实践、失败、反证、决策影响里选 3-7 个。
   - 事实问题：当前工具或平台到底支持什么？
   - 规范问题：官方文档建议怎么做？
   - 实践问题：高质量 GitHub 项目怎么组织？
   - 失败问题：用户真实踩坑是什么？
   - 反证问题：什么证据会推翻当前路线？
   - 决策问题：证据会改变 Goal 的哪个字段？
3. `分来源层级`：
   - `official`：最高权重，用于确认能力、规则、限制。
   - `local`：最高相关性，用于决定本项目怎么落地。
   - `github`：高权重，用于观察结构、维护方式、issue / discussion。
   - `paper / standard`：中高权重，用于研究质量、证据等级、报告结构。
   - `reddit`：中权重，用于发现失败模式和用户困惑。
   - `x`：低到中权重，用于发现趋势信号，必须交叉验证。
4. `检索取证`：
   - 每个关键子问题至少找 2 类来源。
   - 当前事实优先官方文档。
   - 本地落地优先项目文件。
   - 实践模式优先 GitHub。
   - 失败模式优先 issue / Reddit。
   - 热门观点必须找反例，不能只找支持材料。
   - 来源冲突时保留冲突，不强行合并。
5. `填写 Evidence Map`：每条证据都必须写成 claim，而不是复制长文。

   ```markdown
   Evidence Map:
   - Source:
     Source type:
     Claim:
     Relevance:
     Confidence:
     Counterevidence:
     Decision impact:
   ```

6. `反证检查`：输出最终 Goal 前必须问：
   - 有没有来源说明这条路线会失败？
   - 有没有用户场景不适合这条规则？
   - 有没有官方文档和社区实践冲突？
   - 有没有本地项目现实让外部最佳实践不适用？
   - 如果反证成立，Goal 哪一部分要改？
7. `信心等级`：
   - `high`：官方/本地证据一致，且社区实践没有明显反例。
   - `medium`：多来源支持，但缺少本地验证或存在部分反例。
   - `low`：主要来自单个帖子、单个项目、推测或未验证经验。
8. `输出形态`：
   - 证据足够：输出 `Research-backed Goal Prompt`；存在真实后续迭代需求时再追加 Loop Prompt。
   - 证据不足但方向清楚：输出 `Draft Goal`，标明缺口；存在真实后续迭代需求时再追加 Draft Loop。
   - 关键证据缺失：输出 `Research Plan`，不要假装已经能定战略。
   - 路线冲突：输出候选路线对比和推荐默认，不直接执行。
9. `写回 Goal / 可选 Loop`：Deep Research 结果必须进入 Goal；若通过 Loop 需求判断门，还要进入 Loop 字段。
   - 进入 `Decision standard`：改变优先级和取舍。
   - 进入 `Evidence standard`：规定后续还要验证什么。
   - 进入 `Scope / Non-goals`：明确做什么、不做什么。
   - 进入 `Execution policy`：决定直接做、先问、先 inventory 还是暂停。
   - 进入 `Verification`：定义怎么证明完成。
   - 进入 `Stop conditions`：定义哪些风险必须停。
   - 若生成 `Loop Prompt`：定义时间参数、上一轮要看哪些结果、如何诊断差距、本轮怎么选动作、如需自动化要单独说明哪些边界、guardrails 怎么防止失控、如何判定 Done / Continue / Pause、下一轮 LOOP 包怎么生成。

如果研究没有改变成败标准、边界、执行策略或验证方式，就不算 deep research。

## GitHub / X / Reddit 吸收规则

三类来源的权重不同：

- `GitHub repo / discussion`：可观察到文件结构、实践约定、issue 讨论和维护方式，适合抽象成规则。
- `Reddit thread`：适合发现真实用户困惑、失败模式和反例，不适合单独作为权威。
- `X post / article`：适合捕捉新实践和短工作流口号，必须用 GitHub、官方文档或本地验证交叉确认。

可吸收的社区信号：

1. `Context layering`：常驻文件只放核心规则，细节放 references/docs，按需读取，防止上下文污染。
2. `Inventory before mutation`：大改、重构、复杂代码任务先列影响文件、调用方、测试和验证入口。
3. `Plan as artifact`：复杂计划应写成可编辑、可恢复的 Markdown，而不是只留在对话历史。
4. `Small step verification`：每个阶段都要有最小相关检查，最后再做完整验证。
5. `Skill / command / agent boundary`：Skill 放可复用流程；agent 放独立上下文和工具权限；command 放显式触发动作。
6. `Reload awareness`：运行中的会话可能缓存 skill / agent 定义；修改定义后不能只靠同一会话自测证明新定义生效。
7. `Evidence-bound loops`：迭代提示词必须绑定上一轮产物、验证失败、用户反馈、loop state 和剩余 delta；不能凭模型主观感觉进入下一轮。
8. `Time-parameter-first loops`：持续循环必须先给可填写的时间参数；定时或后台运行属于自动化设置，不能由提示词本身隐式产生。
9. `Next loop packet`：持续循环不能只说“建议继续”，每轮必须产出下一轮可复制输入包，包含原始目标、轮次、已关闭证据、开放差距、时间参数、下一轮焦点、guardrails 和停止条件。
10. `Workflow lens`：持续、自动、发布、运营、监控、队列、复盘类请求先判断是否是重复工作；只有重复工作才把 Trigger / Checkpoint / Brief 写进 Goal Prompt，并在真实循环存在时写进 Loop Prompt。
11. `One question with recommended answer`：阻塞问题一次只问一个，并附推荐答案；不要把产品判断负担成串丢给用户。

`Workflow lens` 字段建议：

- `Trigger`：事件触发还是时间触发；事件触发通常优先，因为它少空跑。
- `Checkpoint`：人工确认点尽量后移，先让执行者准备好材料，再让用户确认关键判断。
- `Brief`：用户看到的是决策摘要，不是原始草稿、日志或未整理输出。
- `Source of truth`：说明队列、状态表、文件、截图、issue、内容日历或系统记录哪个为准。
- `Non-automation boundary`：明确哪些步骤不能自动化，尤其是账号、发布、付款、删除、隐私、平台风控和真实用户影响。

拒绝吸收的社区信号：

- 只是一句流行口号，无法改变成败标准。
- 只对某个作者的私有工具链成立。
- 要求所有任务走重流程，导致小任务过度规划。
- 鼓励把所有东西塞进 `CLAUDE.md` / `AGENTS.md`。
- 用更多 agent、hook、MCP 掩盖意图不清。

## 质量原则

1. 意图区分优先：分别写清用户明确表达的意图、AI 推断的潜在意图、需要用户确认的价值判断；不能把推断或价值判断冒充用户原话。
2. 意图对齐质量门：`User-stated intent`、`AI-inferred potential intent`、`Value judgments requiring confirmation`、`Strategic outcome`、`Decision standard`、`Execution policy`、`Verification` 必须围绕同一个已确认用户目标。
3. 反泛化：把项目名、对象名替换后仍然成立的空话，要删掉或补成具体边界。
4. 可执行性优先：Goal 必须让执行者知道做什么、不做什么、先读什么、如何推进、何时暂停、拿什么验收。
5. Prompt-only 边界：除非用户明确授权执行、保存、修改或提交，否则输出适用的 Goal Prompt / 可选 Loop Prompt 后停止。
6. Loop-only 边界：Loop Prompt 只用于交付后继续进化，不授权当前回合执行、修复或验证。
7. 完成度优先：成败标准、关键边界、证据路径和取舍逻辑必须清楚。
8. 证据优先：战略和外部事实任务必须有来源、反证、信心等级和决策影响。
9. 进化可持续且可收敛：Loop 必须有前置时间参数、上一轮材料、loop state、差距诊断、验证 delta、Loop guardrails、Continuation protocol、Next LOOP packet 和停止条件。
10. Workflow lens 从属：只在重复性工作中把 Trigger、Checkpoint、Brief 写进 Goal Prompt，并在真实循环存在时写进 Loop Prompt；一次性任务不要背工作流包袱，任何任务都不要新增第三段 Workflow Prompt。
11. Loop 按需：复杂、多步骤、多文件或一次执行内多次验证都不自动触发 Loop；只有用户明确要求，或交付后会出现决定下一轮动作的新证据时才生成。
12. 推荐答案优先：不得把可推断的路线选择全丢给用户；阻塞问题要给推荐默认。
13. 表达经济从属：只删空话，不删判断、边界、标准、验证。
14. 每个关键字段必须能判断合格/不合格。
15. 输出位置必须可预期：聊天默认、文件显式、文件模式也给聊天代码块。
16. 完成后必须给样例：最终汇报除了改动和验证，还要展示一个足以让用户判断通过/不通过的样例或案例片段。
17. 上下文读取只列会改变路线或验收的材料。
18. 验证必须区分：未验证、结构检查、本地验证、线上验证、人工验收。
19. 不因“看起来完整”增加机制；只为防真实失败加规则。
20. 社区经验要过来源权重和反证筛选，不能把热闹观点写成标准。

## 来源地图

- YAO Meta Skill: https://github.com/yaojingang/yao-meta-skill
- Agent Skills spec: https://agentskills.io/specification
- Agent Skills best practices: https://agentskills.io/skill-creation/best-practices
- OpenAI Codex prompting and goals: https://developers.openai.com/codex/prompting
- OpenAI Codex follow goals: https://developers.openai.com/codex/use-cases/follow-goals
- OpenAI Codex automations: https://developers.openai.com/codex/app/automations
- OpenAI Codex skills best practices: https://developers.openai.com/codex/skills
- OpenAI ChatGPT tasks: https://help.openai.com/en/articles/10291617-tasks-in-chatgpt
- OpenAI Deep Research API: https://developers.openai.com/api/docs/guides/deep-research
- OpenAI Deep Research cookbook: https://developers.openai.com/cookbook/examples/deep_research_api/introduction_to_deep_research_api
- OpenAI Academy Deep Research guide: https://academy.openai.com/public/clubs/work-users-ynjqu/resources/integrating-deep-research-into-your-workflow-2026-05-29
- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Agent Skills overview: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Claude Agent Skills best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Anthropic skill-creator: https://docs.anthropic.com/en/docs/claude-code/skill-creator
- Anthropic Building Effective Agents: https://www.anthropic.com/engineering/building-effective-agents
- Anthropic agent evaluation: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- OpenAI iterative repair loops: https://developers.openai.com/cookbook/examples/codex/build_iterative_repair_loops_with_codex
- OpenAI agent improvement loop: https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop
- Reflexion paper: https://arxiv.org/abs/2303.11366
- Self-Refine: https://selfrefine.info/
- PRISMA 2020: https://www.prisma-statement.org/prisma-2020
- GRADE approach: https://www.gradeworkinggroup.org/
- AGENTS.md format: https://github.com/agentsmd/agents.md
- Addy Osmani agent-skills: https://github.com/addyosmani/agent-skills
- mgechev skills-best-practices: https://github.com/mgechev/skills-best-practices
- ykdojo Claude Code tips: https://github.com/ykdojo/claude-code-tips
- ching-kuo claude-codex workflow: https://github.com/ching-kuo/claude-codex
- shinpr codex-workflows: https://github.com/shinpr/codex-workflows
- OpenAI Codex plan/spec discussion: https://github.com/openai/codex/discussions/7355
- Reddit AGENTS.md practice thread: https://www.reddit.com/r/ChatGPTCoding/comments/1nwe5nz/my_agentsmd/
- Reddit large-codebase agent workflow thread: https://www.reddit.com/r/ClaudeCode/comments/1rwojpn/best_approach_to_use_ai_agents_claude_code_codex/
- Reddit Claude.md / skills / agents structure thread: https://www.reddit.com/r/ClaudeCode/comments/1qub3fm/best_practices_project_structure_ie_interplay/
- Reddit goal-driven CLAUDE.md thread: https://www.reddit.com/r/ClaudeAI/comments/1t89g1j/best_claudemd_files_for_claude_code/
- X workflow signal, scoped workflows: https://x.com/trq212/status/2061907538741006796
- X plan artifact signal: https://x.com/derrickcchoi/status/2031023512534634758
- X smallest verification signal: https://x.com/PaulSolt/article/2040132557983936772
- X plan-validate-execute signal: https://x.com/nurijanian/article/2060672098050490380

## 来源抽象

- OpenAI Codex goal 文档：goal 要像“完成条件”一样写，包含具体结果、可测标准和验证面。
- OpenAI iterative repair / improvement loop：高质量迭代要把输出、验证失败、剩余 delta、最大尝试、无收敛、人类审查和停止条件闭环；validation feedback 应成为下一轮修复依据。
- OpenAI Codex Automations / ChatGPT Tasks：定时、周期性和后台触发是独立的自动化/任务能力，需要明确频率、触发条件和运行上下文；GoalPro 可以给时间参数和自动化设置说明，但不能靠“继续循环”隐式创建调度器。
- OpenAI / Agent Skills / Claude Skills：Skill 触发主要依赖 frontmatter description；description 必须描述使用场景，不能塞次要目标。
- OpenAI Deep Research：适合陌生、高风险、证据密集的任务；输出应带引用、来源元数据和中间检索过程。
- Anthropic agents：复杂研究可拆成多个子问题；有明确评价标准时，应让评估反过来改进结果。
- Reflexion / Self-Refine：语言反馈和自我修正只有在保留历史、定位问题、给出可操作改进指令、并有停止条件时才有价值。
- PRISMA / GRADE：高质量研究要说明为什么做、怎么找、证据有多可靠，以及证据如何支持建议强度。
- GitHub 社区项目：高质量 Skill 倾向于单一职责、可验证退出条件、短正文和按需 references；复杂工作流常见 plan -> implement -> review 或 plan -> diff -> verify。
- mattpocock loop-me / grilling：loop 是可重复、值得委托的活动；workflow 是 loop 的规格；问询一次只问一个问题且附推荐答案；Trigger、Checkpoint、Brief 只在 workflow 需要时出现，并且只服务 Goal Prompt / Loop Prompt，不应变成第三个输出。
- Reddit 真实反馈：用户最常遇到的是上下文污染、计划文件缺失、过度使用 agent/hook/MCP、先改后盘点、验证不连续。
- X 实践信号：新工作流常把计划、diff、验证、最小测试和隔离上下文当作短循环，但这些只能作为候选模式，必须交叉验证。
- Meta_Kim：Critical/Fetch/Thinking/Review 是路线约束；没有 Fetch 的战略判断不能假装完成。

## 反模式

- “做得更好”但没有用户、目标和验收。
- 把 AI 推断的潜在意图或价值判断写进 `User-stated intent`，冒充用户已经表达或确认。
- 用单一 `Intent` 混合用户原话、AI 推断和价值判断，导致责任边界不清。
- Goal Prompt 字段齐全，但互相不支撑：战略结果、执行策略和验收证据各说各话。
- 把项目名、对象名替换后仍然成立，说明它只是通用好话。
- 把“写 goal”误当成“开始执行 goal”。
- 把“写 loop”误当成“当前回合继续修复或验证”。
- 给一次性交付、复杂任务或多步骤执行默认附送 Loop Prompt，却没有交付后新证据和下一轮动作。
- Loop Prompt 不看上一轮真实结果和 loop state，只泛泛要求“继续优化”。
- Loop Prompt 只写 Continue / Next，却不给用户可填写的时间参数。
- 把时间参数当成已经创建的后台自动化，没有调度器、频率、时区、输入来源、权限和暂停规则。
- 把 workflow lens 当成第三个交付物，输出 `Workflow Prompt`、流程图或执行计划，反而弱化了适用的 Goal Prompt / 可选 Loop Prompt。
- 把所有任务都当 workflow，给一次性任务硬塞 Trigger、Checkpoint、Brief。
- 问用户一串开放问题，却不给推荐答案；或者明明能读上下文解决，仍把问题甩给用户。
- Checkpoint 太早，用户还没看到准备好的材料就被迫做判断。
- Brief 只是原始草稿、日志或长 diff，没有推荐动作和证据。
- Loop Prompt 只像一次性返工提示词，没有 `Next LOOP packet`，下一轮还要靠聊天记忆。
- Loop Prompt 没有 Loop guardrails、Done / Continue / Pause 判定、停止条件或人类介入条件。
- Goal 看起来完整，但执行者不知道先读什么、做哪一片、何时暂停、交付什么证据。
- 不做 deep research 就给战略结论。
- 把表达成本写进 `description`，污染触发判断。
- 把缩短提示词当核心目标，牺牲意图放大和战略完成度。
- 列任务很多，却没有最终状态。
- 把 Reddit/X 单帖当权威结论。
- 先重构再补 inventory。
- 把计划只留在聊天历史，导致恢复和验收不可见。
- 用户只要 goal / prompt，却默认写文件、更新图谱或提交 git。
- 用户只要 goal / prompt，却继续读仓库、改文件、运行命令或提交。
- 写了文件后，只给路径不给聊天窗口可复制代码块。
- 不区分 Skill、command、agent，把所有能力混成一个大提示词。
- 用户给了文件/错误/截图，却先问一堆问题。
- 小任务要求全仓库阅读。
- 测试通过就说完成，但用户要的行为没有证据。
- 只说改了什么和验证命令，不给用户看改后的样例/案例，导致用户无法判断是否通过。
- 为了显得高级创建 Skill、agent、command、eval。
