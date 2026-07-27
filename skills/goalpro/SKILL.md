---
name: goalpro
description: 当用户要写出高质量 Goal Prompt，把模糊、战略性、多步骤、证据不足、持续/自动化或容易跑偏的请求整理成可执行、可验证、可暂停的目标契约时使用。适用于写 goal、优化任务提示词、明确 done/success criteria、deep research 后定战略、大改前 inventory、修复跑偏计划、识别可委托的重复 workflow、为 Codex 或 Claude Code 准备执行任务；默认一次性交付只生成 Goal Prompt，只有存在真实后续迭代需求时才追加 Loop Prompt，不执行 goal 或 loop，也不创建自动化。
---

# Goal Prompt

目标：先区分用户明确表达的意图、AI 推断的潜在意图和需要用户确认的价值判断，再把战略判断、证据标准和成败边界写成 Codex / Claude Code 能执行、能验收、少跑偏的 Goal Prompt。只有存在真实后续迭代需求时，才追加交付后使用的 Loop Prompt。

GoalPro 的交付物是可复制的提示词，不是任务执行结果。默认一次性交付只输出 `Goal Prompt`。只有用户明确要求持续迭代 / LOOP，或任务在本次交付后会持续产生新证据并需要下一轮动作时，才追加 `Loop Prompt`。Loop 不是“一次性返工提示词”，而是每轮都产出 `Next LOOP packet` 的循环控制器；它必须在开头给出 `时间参数`，让用户填写下一轮什么时候继续。除非用户明确说“按这个 goal 执行 / 开始改 / 写入文件 / 提交 / 创建自动化”，否则输出适用的提示词后必须停止。

这不是“让提示词更短”的 Skill。表达经济只在战略完整后处理：删空话，不删判断、边界、证据和验收。

## 先判任务级别

- `Intake`：用户只要更好的 goal / prompt / spec。
- `Strategic`：用户要战略、方案、路线、标准、重要决策或高质量研究结论。
- `Execution`：用户要给 agent 一份按 goal 开始做的执行提示词。
- `Repair`：之前输出跑偏、太粗糙、太复杂、问太多、假完成。
- `Governed`：高风险、多文件、发布、外部事实、生产相邻或会影响真实用户的任务。
- `Workflow`：用户提到每天、每周、自动、持续、发布、运营、监控、队列、复盘等重复性工作时，先判断哪些 Trigger / Checkpoint / Brief 信息应写进 Goal Prompt；这类任务通常存在真实后续迭代需求，可再追加 Loop Prompt。

用能诚实验收的最轻模式；但战略性任务必须先过证据门槛。

## Prompt-only 闸门

- Skill mention 不等于执行授权。用户只说 `goalpro`、`写 goal`、`优化提示词`、`帮我做个目标` 时，只生成可复制的 goal 提示词。
- 默认一次性交付只生成一段 `Goal Prompt`，不为了显得完整而附送 Loop。
- 只有通过“Loop 需求判断门”时才追加 `Loop Prompt`。Loop 只是交付后可粘贴的继续进化提示词，不授权当前回合执行。
- Workflow lens 不新增第三个 `Workflow Prompt`，不把 GoalPro 变成执行器或自动化平台；必要的 workflow 信息写进 Goal，存在真实循环时再写进 Loop。
- Loop Prompt 必须把 `时间参数` 放在最前面：提示用户自行填写 LOOP 时间，如“手动：贴入上一轮结果后继续”或“每天早上 09:00”。
- 定时/自动 Loop 只是自动化设置说明，除非用户明确授权创建或修改自动化；写了时间不等于已经创建后台任务。
- 生成的 goal 必须能指导后续执行者：对象、动作、上下文、范围、非目标、检查点、暂停条件和验收证据都要清楚。
- 生成的 loop 必须能指导后续执行者复盘上一轮真实结果：看最终报告、diff、验证、截图、用户反馈，定位剩余差距，再决定本轮动作、是否已 Done、是否 Pause、按哪个时间参数继续、以及下一轮 `Next LOOP packet`。
- 不要因为 goal 里写了 Execution policy、Verification、Checkpoints，就在当前回合继续执行这些内容。
- 不要因为 loop 里写了 Review evidence、Cycle action、Verification delta，就在当前回合开始复盘或修复。
- 只有用户额外明确授权执行、保存、修改文件、提交或发布时，才进入独立的执行任务；那已经不是 GoalPro 的默认输出模式。

## Loop 需求判断门

先判断本次是一次性交付，还是存在真实后续迭代需求：

- `只生成 Goal Prompt`：用户只要 goal / prompt / spec；任务虽复杂或多步骤，但可以在一次执行合同内完成和验收；所谓“后续优化”没有明确的新输入、新证据、触发条件或下一轮动作。
- `Goal Prompt + Loop Prompt`：用户明确要求 LOOP、持续迭代、周期复盘、监控或自动化；或本次交付后会出现可观察的新证据（运行结果、用户反馈、指标、发布状态、审稿意见等），这些证据会决定下一轮动作。
- 复杂、多文件、需要多个 checkpoint、一次执行内反复验证，不自动构成真实后续迭代需求。
- 不确定时默认一次性交付，只生成 Goal Prompt；不要凭 AI 对“持续进化”的偏好擅自追加 Loop。
- 若只要求 Loop，则只输出 Loop Prompt，并要求用户提供上一轮结果或 `Next LOOP packet`。

## 意图对齐质量门

输出任何提示词前，先做一次短自检：

- 对齐链路：用户明确表达的意图 -> AI 推断的潜在意图 -> 待确认价值判断 -> 战略结果 -> 可执行动作 -> 验收证据；链路断开的字段必须重写。
- `User-stated intent` 只记录用户明确说过或上下文中已确认的意图，不替用户补充动机。
- `AI-inferred potential intent` 单独列出基于上下文的推断及依据，明确标记为可修正假设，不冒充用户原意。
- `Value judgments requiring confirmation` 单独列出会影响优先级、质量线、风险容忍、范围或取舍的价值判断。若它会改变路线，先问一个阻塞问题；不得把未确认判断静默写进 Goal。
- `Strategic outcome` 和 `Decision standard` 必须解释为什么这个 goal 符合用户意图，而不是只描述交付物。
- 如果换掉项目名、文件名或用户场景后仍然成立，就太泛；补对象、边界、先读材料、检查点或暂停条件。
- 仅在通过 Loop 需求判断门时检查：`Loop Prompt` 必须绑定上一轮交付物和验证证据，不能写成一个不看结果的新 goal；它必须先给可填写的时间参数，再包含可继承的 loop state 和下一轮 LOOP 生成规则。
- 如果不同解释会改变路线、风险、权限、范围或验收，先问一个阻塞问题，并给出推荐答案；能通过读取上下文解决的问题，不要丢给用户。

## Workflow lens

只有当用户请求看起来是反复发生的工作时，才启用 workflow lens；普通一次性任务不要强行流程化。

- 触发信号：每天、每周、自动、持续、发布、运营、监控、队列、复盘、提醒、审核、同步、巡检、内容日历。
- 先判断这是不是一个可委托的重复模式：是否有稳定输入、触发时机、执行步骤、人工确认点、输出记录和复盘证据。
- 如果是重复 workflow，只把必要信息写进适用的提示词：在 Goal 的 `Decision standard` / `Execution policy` 或可选 `Workflow lens` 段里写清判断；存在真实循环时，再在 Loop 里写清 Trigger、Checkpoint、Brief、source of truth、非目标。
- `Trigger` 说明每轮何时开始：事件触发通常优先于固定时间；固定时间只是时间参数，不等于已创建后台任务。
- `Checkpoint` 要尽量后移：先让执行者把材料准备好，再让用户确认一次关键判断，而不是开头问一串问题。
- `Brief` 是给用户看的决策摘要：做了什么、为什么、证据在哪、推荐动作是什么；不要把原始草稿或日志直接丢给用户审。
- 如果需要问用户，最多问一个会改变路线的阻塞问题，并附推荐答案，例如“我建议默认走人工确认发布，因为官方发布能力未确认；你同意吗？”
- 不强制 AI、不强制定时、不强制 checkpoint；只有 workflow 真的需要时才写，且不单独输出第三段 workflow 交付物。

## Deep Research 门槛

出现任一条件，不得直接给最终战略 Goal，必须先 Fetch：

- 用户要求 `deep research`、`critical and fetch thinking and review`、全网搜索、行业/竞品/方法论研究。
- 任务依赖当前外部事实、最佳实践、规范、产品能力、法律/价格/版本/公开资料。
- 输出会决定路线、投入、架构、发布、长期标准或用户对“什么是好”的判断。
- 现有上下文不足以判断成败标准，且猜错会让执行明显跑偏。

Deep Research 执行顺序：

1. 定义研究问题：写清这次研究要改变哪个 Goal 判断。
2. 拆子问题：事实、规范、实践、失败、反证、决策影响，选 3-7 个。
3. 分来源层级：official / local / github / paper / reddit / x，不同来源权重不同。
4. 检索取证：每个关键子问题至少找 2 类来源；当前能力优先官方，本地落地优先项目文件，实践模式优先 GitHub，失败模式看 issue / Reddit，X 只作趋势信号。
5. 填 Evidence Map：每条证据都必须说明 claim、relevance、confidence、counterevidence、decision impact。
6. 反证检查：主动找能推翻当前路线的证据；冲突保留，不强行合并。
7. 定信心等级：high / medium / low，并说明依据。
8. 选输出形态：证据足够才输出 `Research-backed Goal Prompt`；不足输出 `Draft Goal` 或 `Research Plan`。仅在通过 Loop 需求判断门时追加相应 Loop。
9. 写回 Goal / 可选 Loop：研究结果必须改变 Decision standard、Evidence standard、Scope、Non-goals、Execution policy、Verification、Stop conditions；若生成 Loop，还必须改变其时间参数、Review evidence、Gap diagnosis、Verification delta、自动化设置边界、Continuation protocol 或 Next LOOP packet，否则不算 deep research。

`Evidence Map` 格式：

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

证据不足时，只能输出 `Draft Goal` 或 `Research Plan`，不能把草案说成最终战略。

## 工作顺序

1. Critical：先指出用户真正不满、要推进的局面、最大误伤点。
2. Fetch：只读取会改变战略、边界、验收或执行路线的材料；战略任务先做 deep research。
3. Thinking：比较路线，写清取舍；把反例、未知和信心等级放进判断。
4. Workflow lens：如果请求是重复性工作，先判断它配不配变成 workflow；需要时把 Trigger、Checkpoint、Brief 和 source of truth 写进 Goal Prompt。
5. Inventory：涉及代码库、文档库或复杂系统时，先列会受影响的文件、调用方、测试和验证入口，再允许执行。
6. Contract：写 Goal Prompt，让执行者知道做什么、不做什么、先读什么、何时停。
7. Review：用成败标准反查合同，删掉装饰性流程，保留关键判断。
8. Loop gate：只有存在真实后续迭代需求时，才写 Loop Prompt，让交付结果回来后能按证据复盘、收敛差距、输出下一轮 LOOP 包，直到 Done 或 Pause。
9. Expression economy：最后才压缩表达；不得牺牲意图完成度、执行边界或 Loop 的停止条件。

社区来源只能作为信号：GitHub 项目、X 经验帖、Reddit 讨论可以暴露失败模式和实践趋势，但必须被官方文档、本地证据或多来源重复信号支撑后，才进入最终 Goal。

## 战略标准

一个 Goal 达标，必须回答清楚：

- `用户明确表达的意图`：只写用户明确提出或已确认的目标、限制和不满。
- `AI 推断的潜在意图`：写清推断、依据与不确定性，不冒充已确认事实。
- `需要用户确认的价值判断`：明确哪些优先级、质量线、风险容忍或取舍仍需用户决定。
- `战略结果`：完成后什么会变好，为什么值得做。
- `成败标准`：什么算赢，什么算没做到，必须可判断。
- `可执行性`：后续执行者是否能照着 goal 开始工作、知道先读什么、做到哪一步、何时暂停。
- `证据标准`：需要哪些来源、验证或观察来支撑判断。
- `关键边界`：范围、权限、风险、语言、质量要求和不做事项。
- `取舍逻辑`：速度、范围、质量、表达成本冲突时保什么、舍什么。
- `反证与未知`：哪些证据会推翻当前路线，哪些问题必须暂停。
- `上下文策略`：哪些内容常驻，哪些按需读取，哪些写入可恢复的计划文件。

## 字段标准

默认输出一个 fenced `markdown` 代码块，并在代码块外显示标签 `Goal Prompt:`。只有通过 Loop 需求判断门时，才在其后追加第二个独立代码块，并显示标签 `Loop Prompt:`。标签不能放进 fenced block 内；不要合并两个提示词，也不要新增第三个 `Workflow Prompt`。

不要输出 `原始输入 / 优化后的理解 / 优化后的完整提示词` 这类 meta prompt rewrite 包装，除非用户明确要求做 meta-theory 改写；GoalPro 的默认正文就是可复制的 Goal Prompt，以及满足条件时的 Loop Prompt。

Goal Prompt:

```markdown
Goal:
User-stated intent:
AI-inferred potential intent:
Value judgments requiring confirmation:
Strategic outcome:
Decision standard:
Evidence standard:
Scope:
Non-goals:
Context to read first:
Constraints:
Execution policy:
Checkpoints:
Verification:
Stop conditions:
Final report:
```

Loop Prompt:

```markdown
时间参数:
Loop mission:
Loop state:
Previous result to inspect:
Review evidence:
Gap diagnosis:
Cycle action:
Verification delta:
Loop guardrails:
Continuation protocol:
Stop / escalate conditions:
Next LOOP packet:
```

| 字段 | 写什么 | 合格标准 | 常见错误 |
|---|---|---|---|
| `Goal` | 一句话任务 | 有对象、有动作、有方向，执行者能立即知道要做什么 | 写成愿景 |
| `User-stated intent` | 用户明确表达的意图 | 仅包含用户说过或已确认的目标、限制和不满 | 把 AI 猜测写成用户原意 |
| `AI-inferred potential intent` | AI 推断的潜在意图 | 标注推断依据、不确定性和可修正性 | 省略“推断”标签或过度心理揣测 |
| `Value judgments requiring confirmation` | 需要用户确认的价值判断 | 列出会改变优先级、质量线、风险容忍、范围或取舍的判断；无则明确写无 | 静默替用户决定“更重要”“更好”或“可接受” |
| `Strategic outcome` | 最终战略结果 | 能解释为什么这次工作值得做 | 只写交付物 |
| `Decision standard` | 路线判断标准 | 明确优先级、取舍和失败条件 | “高质量”但不可判 |
| `Evidence standard` | 证据要求 | 区分来源、验证、人工验收和信心等级 | 搜到资料就算完成 |
| `Workflow lens` | 可选，重复工作判断 | 只作为 Goal Prompt 内的判断说明；持续/自动/运营/发布等重复任务才写清 Trigger、Checkpoint、Brief、source of truth | 给所有任务都加流程，或输出第三个 Workflow Prompt |
| `Scope` | 本次包含什么 | 只列本轮工作 | 塞未来计划 |
| `Non-goals` | 本次不做什么 | 防止越界 | 写“无”但任务很宽 |
| `Context to read first` | 先读材料 | 只列会改变判断的材料 | 全仓库漫游 |
| `Constraints` | 硬限制 | 权限、安全、兼容、语言 | 写成建议 |
| `Execution policy` | 给后续执行者的直接做/先问规则 | 分清可逆与高风险；不授权当前 Skill 继续执行 | 仪式化提问 |
| `Checkpoints` | 推进节点 | 每点有可检查输出 | 过程流水账 |
| `Verification` | 后续执行者必须交付的完成证据 | 测试、diff、截图、线上状态、人工验收分清 | 命令通过=完成 |
| `Stop conditions` | 必须暂停条件 | 路线、权限、删除、发布、密钥等风险 | 风险出现还继续 |
| `Final report` | 最后汇报 | 改了什么、证据、风险，并给出一个用户可直接判断是否通过的验收样例/案例片段 | 只说“已完成”，不给实际样例 |

| Loop 字段 | 写什么 | 合格标准 | 常见错误 |
|---|---|---|---|
| `时间参数` | 下一轮何时继续 | 放在 Loop Prompt 最前面，提示用户填写“手动：贴入上一轮结果后继续”或“每天早上 09:00”；若要真实后台运行，说明需另行创建 automation | 把时间入口藏到后面；写了时间就假装已自动运行 |
| `Loop mission` | 持续进化使命 | 绑定原始意图、目标质量线和可持续循环，不只描述下一轮 | 写成一次性返工目标 |
| `Loop state` | 跨轮继承状态 | 保留原始目标、当前轮次、已关闭证据、开放差距、下一轮焦点 | 每轮重新开始 |
| `Trigger / Checkpoint / Brief` | 可选，workflow 继续规则 | 只作为 Loop Prompt 字段；重复流程里写清触发时机、人工确认点和给用户看的决策摘要 | 把它当成第三段交付，或把原始输出、日志、草稿直接丢给用户 |
| `Previous result to inspect` | 必须读取的上一轮材料 | 最终报告、diff、验证、截图、用户反馈、失败日志按需列出 | 只看聊天结论 |
| `Review evidence` | 证据复盘规则 | 区分真实通过、结构检查、人工验收和无证据声明 | 把“说完成”当完成 |
| `Gap diagnosis` | 剩余差距 | 按交付阻塞、体验影响、表达整理排序 | 无限扩范围 |
| `Cycle action` | 本轮动作选择 | 每轮只选最高价值差距执行；修复、验证、收敛或暂停必须有依据 | 看到问题就大改 |
| `Verification delta` | 新增或补充验证 | 说明本轮比上一轮多证明了什么 | 重复跑无关检查 |
| `Loop guardrails` | 循环预算和防失控边界 | 写清最大尝试、时间预算、无收敛阈值、可改范围、验证失败、暂停调度和人工审查触发 | 持续变成无限自动循环 |
| `Continuation protocol` | 循环继续规则 | 每轮结束必须判定 Done / Continue / Pause；Continue 时产出下一轮 LOOP 包 | 只写“建议继续” |
| `Stop / escalate conditions` | Loop 必须暂停或升级条件 | 权限、发布、删除、路线冲突、验证不可得、连续无收敛等风险停下 | 风险出现还继续 |
| `Next LOOP packet` | 下一轮可直接复用的输入包 | 包含 loop state、已关闭证据、开放差距、下一轮焦点和继续/暂停判断 | 下一轮还靠聊天记忆 |

字段未知但不影响路线时，写默认假设。会改变路线、权限、风险、范围或验收时，先问。

## 输出位置规则

- 默认位置：聊天窗口。用户要求写 goal、优化提示词、准备 `/goal`、准备 Claude Code 任务时，直接在聊天窗口输出可复制的 fenced `markdown` 代码块。
- 文件位置：只有用户明确要求保存、写入文件、生成文档、提交 git、更新项目资料，才把适用的 Goal Prompt / Loop Prompt 写入文件。
- 双输出：一旦写入文件，聊天窗口仍必须同步输出同一份可复制提示词代码块，并说明文件路径。
- 不确定时：默认聊天窗口输出，不要为了“完整”自动创建文件。
- 文件建议路径：目标文档优先用 `docs/goals/<topic>.md`；示例、方法依据或 Skill 本体改动仍放回对应 `references/` 或 `SKILL.md`。
- 代码块要求：可复制提示词必须放在 fenced `markdown` code block 内；默认只有 `Goal Prompt`，通过 Loop 需求判断门时再追加独立的 `Loop Prompt`；每个块前有代码块外的同名标签，不要只给文件链接或摘要。

## 输出模式

- 普通 goal：只输出 `Goal Prompt`；不附加“为什么这样写”、摘要、使用说明或 Loop。
- 战略/研究 goal：只输出 `Research-backed Goal Prompt`，把 Evidence Map 摘要、反证和未知写进 Goal 的对应字段；仅在存在真实后续迭代需求时追加 Loop。
- Codex 执行场景：给 `/goal` block，包含 done-when、read-first、checkpoints、pause-if；仅在存在真实后续迭代需求时另给交付后的 `Loop Prompt`。
- Claude Code 执行场景：给任务提示词，包含先读材料、执行策略、验证和暂停条件；仅在存在真实后续迭代需求时另给交付后的 `Loop Prompt`。
- 大改/重构场景：把 inventory、影响面、分片计划和每片验证写进 Goal Prompt；不得另行输出计划包。
- Repair 场景：在内部先定位旧目标错位点，最终只交付修正版 Goal Prompt；防跑偏规则写进 Goal 字段。
- Workflow 场景：如果用户请求是重复性工作，在 Goal Prompt 中补充 workflow lens、Trigger、Checkpoint、Brief；由于存在后续周期，通常追加 Loop Prompt。若需要确认路线，只问一个阻塞问题并给推荐答案。
- Loop-only 场景：如果用户只要 LOOP，要求用户贴入上一轮结果或 `Next LOOP packet`；若结果已在上下文中，输出一个可持续复用的 Loop Prompt。
- 自动化 Loop 场景：如果用户明确说自动、定时、每天、每周、持续监控或后台运行，在 `时间参数` 和 guardrails 中写清自动化设置要求；不另行输出设置说明，除非用户授权创建或修改自动化，否则不实际创建。

所有输出模式在适用的提示词交付后停止；不要追加解释、摘要、提醒或“我现在开始执行”。

## 验收清单

- 意图区分：`User-stated intent`、`AI-inferred potential intent`、`Value judgments requiring confirmation` 三类边界清楚，未把推断或价值判断伪装成用户原意。
- 对齐：三类意图字段、`Strategic outcome`、`Decision standard`、`Execution policy`、`Verification` 能解释为什么这个 goal 符合已确认意图。
- 反泛化：把项目名、对象名替换后仍然成立的空话已经删掉或补成具体边界。
- 可执行：执行者能看出对象、动作、先读材料、推进顺序、暂停条件和验收证据。
- Workflow：只有重复性工作才启用 workflow lens；启用时能看出 Trigger、Checkpoint、Brief、source of truth 和不该自动化的边界。
- Loop 判断：一次性交付只生成 Goal Prompt；复杂或多步骤本身不触发 Loop；真实后续迭代需求才追加 Loop Prompt。
- Loop：若生成，开头有可填写 `时间参数`，并能看出上一轮结果要读什么、如何找差距、本轮做什么、何时 Done / Continue / Pause、下一轮 `Next LOOP packet` 如何生成。
- 战略：说明结果价值、成败标准、证据标准和关键取舍。
- Deep Research：战略或外部事实任务有来源、反证、信心等级和决策影响。
- Community Signal：GitHub / X / Reddit 只当候选证据，已说明来源类型和采纳理由。
- Inventory：复杂代码任务先有影响面地图，再进入实现。
- 边界：保留用户限制，明确不做什么。
- 标准：每个关键字段能判断合格/不合格。
- 位置：默认聊天窗口给 fenced `markdown` 代码块；写文件时也要同步给代码块和文件路径。
- 标签：默认输出必须有 `Goal Prompt:` 可见标签；只有生成 Loop 时才增加 `Loop Prompt:` 标签。
- 停止：没有明确执行授权时，输出 goal 后停止，不继续读仓库、改文件、运行命令或提交。
- 进化：不得为了“持续进化”口号默认生成 Loop；若真实需要 Loop，它不授权当前回合执行，只作为交付后可复制的持续循环提示词，每轮必须产出可继承的 `Next LOOP packet` 或明确 Done / Pause。
- 自动化：`时间参数` 是用户填写入口，不是自动化创建结果；若写定时/后台自动化，必须说明需要另行授权创建。
- 工具：只要求读取会改变判断的上下文。
- 证据：区分未验证、结构检查、本地验证、线上验证、人工验收。
- 样例：完成后必须展示一个实际样例、案例片段、截图说明或改后输出片段，让用户能判断是否通过。
- 表达：压缩只删空话，不删意图、边界、标准和验证。

## 需要更多细节时

- 方法依据：读 `references/source-rules.md`。
- 示例校准：读 `references/examples.md`。其中旧示例若仍使用单一 `Intent` 或默认双提示词，只能参考任务内容；输出形态与字段必须以本文件当前的三类意图区分和 Loop 需求判断门为准。
