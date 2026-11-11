---
name: agent-teams-playbook
metadata:
  version: "4.9.1"
description: |
  Cross-runtime playbook for multi-agent collaboration, agent teams, swarm orchestration, parallel task distribution, capability discovery, and quality gates on Claude Code, Codex, OpenClaw, and Cursor. Use for 多agent、agent协作、agent编排、并行agent、分工协作、拉团队、多代理协作 or complex work needing independent roles and review. Map the six-stage workflow to the active host's actual capabilities; report sequential degradation when parallel agents are unavailable.
---

# Agent Teams 编排手册

## 本能力的验收方法

执行前读取 [method.json](method.json) 中当前 capabilityId 的诊断、决策和逐字段 outputChecks，并读取 [任务验收与完整示例](references/acceptance.md)。按本次能力选择相应规则，不用字段齐全、行数或作者自报代替产物质量。缺少 blocking 证据时保留未验收；既有具体授权与宿主最终决定权不变。

专业引用与工具路线继续按下文渐进读取；[来源记录](PROVENANCE.md) 和 [作者正反例](evals/professional-cases.json) 供评审。当前 Meta Skill 发现不会自动注入 method.json，宿主需按此入口读取；未观察到加载或执行时不得宣称生效。


本 Skill 为调用方提供多 Agent 分工、执行和质量检查建议。宿主协调器负责角色边界、过程与最终交付；在 Meta_Kim 中，Router、跨组件状态机和最终验收仍由 Meta_Kim 负责，本包不接管这些职责。

> **核心理解（铁律）**：Agent Teams 是"并行处理 + 结果汇总"模式，不是扩大单个 agent 的上下文窗口。每个 teammate 是独立的执行单元，拥有独立上下文，可以并行处理大量信息，但最终需要将结果汇总压缩后返回主会话。

## 跨平台兼容层（新增，不替代原流程）

本 Skill 的完整 6 阶段工作流、按需能力解析、Agent → Skill 委派模式、质量把关和故障处理规则仍然保留。四个平台的差异只影响"用什么工具执行"，不影响"是否执行这些阶段"。

先识别当前平台，再把下列抽象动作映射到平台原生能力。不要在非 Claude Code 平台原样承诺 `Task`、`TeamCreate`、`SendMessage` 或 `Skill(...)` 一定存在；也不要因为平台工具名不同而跳过阶段0-5。

| 抽象动作 | Claude Code | Codex | OpenClaw | Cursor |
|------|------|------|------|------|
| 调用 Skill | `Skill(skill="name", args="...")` 或 slash skill | 读取并遵循本地 skill 指令；只有宿主暴露 skill 工具时才称为"调用" | 读取并遵循 `openclaw/skills` 或全局 skill；按 OpenClaw 当前工具执行 | 读取并遵循 `.cursor/skills` 或全局 skill；按 Cursor 当前 agent 能力执行 |
| 启动独立 Subagent | 使用宿主当前暴露的 `Agent` / `Task`，至少携带必填 `prompt`，并按当前 schema 提供 `subagent_type`、`description`/`name` 和边界 | 使用当前宿主暴露的原生 spawn schema（见下方 profiles） | workspace / agent 调度能力；不可用则主线程分阶段执行 | background agent / agent mode；不可用则主线程分阶段执行 |
| 组建 Agent Team | 宿主暴露时使用 `TeamCreate` + `Agent` / `Task(team_name)` | 同一轮并发调用多个宿主原生 spawn 调用，由主线程汇总；不伪装共享团队总线 | team / workspace 能力存在时使用；否则多个任务或主线程 | background agents / team-like workflow 存在时使用；否则多个任务或主线程 |
| 成员通信/进度 | `SendMessage` 或 Agent/Task result | 子任务结果回报；只有宿主暴露 agent I/O 时才中途通信 | 平台消息/日志；不可用时用阶段性文本汇报 | IDE/agent 日志；不可用时用阶段性文本汇报 |
| 规划与续做 | 按阶段0选择宿主已有记录；Meta 使用 `planning-continuity` | 按阶段0选择宿主已有记录；Meta 使用 `planning-continuity` | 使用已有计划或等价任务记录 | 使用已有计划或等价任务记录 |

**平台适配底线**：
1. 写计划时使用抽象动作名；执行时使用当前平台真实工具名。
2. Claude Code 使用宿主当前暴露的 `Agent` / `Task`；只有宿主确实暴露 `TeamCreate` / `SendMessage` 时才承诺共享团队语义。不要把 Codex 参数复制到 Claude Code。
3. Codex 以当前宿主实际暴露的工具 schema 和权限为准，再选择匹配的 profile；不能只凭产品名或版本猜参数。只有工具调用成功且有返回的 Agent 标识，才报告已启动。
4. OpenClaw/Cursor 的 team 能力可能来自项目插件、workspace 或 IDE 能力；先探测，再承诺。
5. 若平台不支持真正并行或团队通信，明确降级为"主线程分阶段执行"，但仍执行阶段0-5的治理流程。

## Codex 宿主 profiles（薄适配）

当前宿主 schema 优先于以下已知示例。先读取工具名、必填字段、可选字段、返回标识、并发与通信权限；只提交当前 schema 允许的字段。宿主未暴露工具时不要猜名字，也不要为适配自行实现执行引擎。`agent_type`、`model`、`reasoning_effort` 可能受 feature flags 隐藏；即便暴露，也要遵循宿主的选择/继承规则，不自动覆盖。

- **codex-v1**：已知上游 namespace 为 `multi_agent_v1.spawn_agent`，任务用 `message` 或 `items`，历史继承用布尔 `fork_context`；`agent_type` 仅在当前 schema 暴露并允许选择时可用。
- **codex-v2**：已知上游顶层 `spawn_agent` 必填 `task_name` 和 `message`，历史继承用字符串 `fork_turns`（`none`、`all` 或正整数字符串）；不能向它传 V1 的 `fork_context`。
- **codex-v2-limited**：工具名和必填字段同 V2，但宿主可隐藏 `agent_type`、`model`、`reasoning_effort`；不能照搬其他 profile 的可选字段。
- **no-capability**：没有可用 spawn，或权限不允许并发时，明确采用主线程分阶段执行，仍保留阶段0-5；不得报告真实并行、团队通信或子 Agent 成功。通信工具也必须单独探测。

以下最小调用样例只展示静态协议，不承诺真实宿主已实测。测试夹具验证文档与已知 schema 的一致性；新的宿主 schema 有差异时，以现场发现为准并记录差异。

<!-- contract: codex-v1 -->
```json
{"tool":"multi_agent_v1.spawn_agent","arguments":{"message":"Review the bounded task and return evidence.","fork_context":false}}
```
<!-- contract: codex-v2 -->
```json
{"tool":"spawn_agent","arguments":{"task_name":"review_task","message":"Review the bounded task and return evidence.","fork_turns":"none"}}
```
<!-- contract: codex-v2-limited -->
```json
{"tool":"spawn_agent","arguments":{"task_name":"review_task","message":"Review the bounded task and return evidence."}}
```
<!-- contract: no-capability -->
```json
{"tool":null,"arguments":null,"mode":"sequential","parallel":false}
```

参考：[OpenAI Codex schema 快照](https://github.com/openai/codex/blob/ca466061d64f0b44f416135c7fd06aa7af850bbc/codex-rs/core/src/tools/handlers/multi_agents_spec.rs)（2026-10-02 核验，V1/V2 与字段开关并存）；[Agent Skills 格式规范](https://agentskills.io/specification)（自定义版本放在 `metadata.version`，包事实以 `capability.json` 为准）。

## 适用 vs 不适用

| 适用 | 不适用 |
|------|--------|
| 跨文件重构、多维度审查 | 单文件小修改 |
| 大规模代码生成、并行处理 | 简单问答、线性顺序任务 |
| 需要多角色协作的复杂任务 | 单agent可完成的任务 |

**边界处理**：用户输入模糊时，先引导明确任务再决策；任务太简单时，主动建议使用单agent而非组建团队。

## 用户可见性铁律

1. 每个阶段启动前输出计划，完成后输出结果
2. 子agent在后台执行，但进度必须汇报给用户
3. 沿用当前任务授权执行拆分；需要新的范围、关键取舍或额外权限时，先给具体方案与证据再请用户决定
4. 失败时报告原因与受影响范围，按阶段4的任务预算和进展规则处理；无关分支继续
5. 全部完成后输出汇总报告（见阶段5格式），并说明真实使用的平台工具和任何降级路径

## 场景决策树

**执行顺序**：先执行阶段0和阶段1（强制），再根据任务复杂度选择场景（影响阶段2-5）。

| 问题 | 路径 |
|------|------|
| Q0: 阶段1找到可完整解决任务的现有 provider（Agent / Skill / Tool）？ | 是 → 场景2 / 否 → Q1 |
| Q1: 任务复杂度？ | 简单(1-2步) → 场景1 / 中等(3-5步) → 场景3 / 复杂(6+步) → Q2 |
| Q2: 需要明确团队分工？ | 是 → 场景4 / 否 → 场景5 |

- 用户直接指定场景编号时,跳过决策树直接执行
- 未指定场景时，默认用**场景3（计划+评审）**
- **注意**：阶段0（规划）和阶段1（本地能力发现）是所有场景的前置步骤；外部 `find-skills` 只在本地能力确有缺口时触发

## 5大编排场景

| # | 场景 | 适用条件 | 核心策略 |
|---|------|---------|---------|
| 1 | 提示增强 | 简单任务，1-2步 | 优化单agent提示词，不拆分不组队 |
| 2 | Provider直接复用 | 任务可由单个现有 Agent / Skill / Tool 完全解决 | 直接绑定已发现 provider，无需外部搜索或组建Agent Teams |
| 3 | 计划+评审 | 中等/复杂任务（**默认**） | 出计划 → 沿用授权执行 → Review验收；新增关键决定才询问 |
| 4 | Lead-Member | 需要明确团队分工 | Leader协调分配，Member并行执行，通过TaskList协同 |
| 5 | 复合编排 | 复杂任务，无固定模式 | 动态组合上述场景，按阶段切换策略 |


**模型分工**（所有场景通用）：默认继承当前宿主模型和推理设置。只有用户、项目或宿主已明确要求差异化模型且当前 schema 允许时才选择其他模型；不按角色名自动降级，也不承诺平台未提供的模型。

## 协作模式

| 模式 | 通信方式 | 适用场景 | Claude Code 启动方式 | Codex 启动方式 | OpenClaw / Cursor 启动方式 |
|------|---------|---------|---------|---------|---------|
| Subagent | 子agent → 主协调器单向汇报 | 并行独立任务 | 宿主当前的 `Agent` / `Task` | 当前宿主原生 spawn schema | 平台 agent/background/workspace 能力；不可用则主线程分阶段执行 |
| Agent Team | 成员间可双向通信(SendMessage) | 需要协作的复杂任务 | `TeamCreate` + `Agent` / `Task(team_name)`（仅宿主暴露时） | 多个宿主原生 spawn 调用 + 主线程协调；仅在宿主暴露 agent I/O 时中途交互 | 平台 team/workspace/background-agent 能力；没有则降级 |

选择原则：任务间无依赖用Subagent（简单高效），任务间需要协调用Agent Team（功能更强但成本更高）。如果当前平台没有真正的 team bus，只能称为"多个独立 subagent + 主线程汇总"，不能伪装成成员间双向协作。

## 6阶段工作流（含强制规划和按需能力发现）

**重要说明**：阶段0和阶段1是**所有场景的强制前置步骤**，场景选择（1-5）只影响阶段2-5的执行方式。

### 阶段0：规划准备（Planning Setup）**【硬性标准 - 所有场景必经】**

先读取已有任务目标、约束、进度、产物位置与未解决事项，继续当前记录，不另建相互漂移的计划真源。

- **在 Meta_Kim 中**：使用宿主已提供的 `planning-continuity` 能力及当前任务记录；其具体路径和操作由宿主发现并绑定。本包不重新寻找、安装或优先调用已退休的外部 `planning-with-files`。
- **独立使用本包时**：优先复用当前宿主已有计划机制。若项目已采用 `planning-with-files` 且本地实际可用，可以继续原记录；无需为本包额外安装。没有文件型工具时用平台计划或内联记录，明确说明采用的方式。
- **需要文件续做且尚无记录时**：按获准任务范围维护等价的 `task_plan.md`（目标、当前阶段、验收）、`findings.md`（事实、来源与决定）、`progress.md`（已做、回执、下一步）。这些是任务材料，不是本包新增的规划组件。

阶段开始或恢复时读取当前检查点；有实质发现、决定、失败、交接或上下文将切换时更新对应记录，不按浏览次数制造重复日志。失败记录沿用阶段4的预算和进展规则，不另设固定三次升级线。小任务可用一段可见计划，不强迫创建三个空文件。

### 阶段1：任务分析 + 能力发现（Discovery）**【硬性标准 - 所有场景必经】**

先质疑再执行：
- 需求不合理时主动挑战假设，建议更好的方案
- 区分"现在必须做"和"以后再说"，排除非核心范围
- 任务太大时建议更聪明的起点
- 先描述所需能力，再匹配 agent / skill / tool，避免 name-first 调度

输出任务总览：

| 字段 | 内容 |
|------|------|
| 任务目标 | [一句话描述] |
| 预期结果 | [具体交付物] |
| 验收标准 | [可量化的通过条件] |
| 范围界定 | [must-have vs add-later] |
| 当前平台 | [Claude Code / Codex / OpenClaw / Cursor / Unknown] |
| 预计Agent数 | [按任务 DAG、冲突边界与宿主并发能力确定，不写死数量] |
| 选定场景 | [场景编号+名称] |
| 协作模式 | [Subagent/Agent Team/Degraded] |

**能力解析链（命中即停止，不是每次必跑的回退仪式）**：

1. **本地多类型能力扫描**：读取当前运行时可见的 Agents、Skills、Tools、Commands、MCP 和 capability index。只要已有专业 provider 覆盖子任务，就绑定该 provider 并停止搜索。
2. **外部能力搜索（仅真实缺口时）**：只有本地所有相关 provider 都无法覆盖，而且该能力值得复用或安装时，才调用 `find-skills` 或平台等价搜索。安装仍需用户/宿主授权。
3. **运行时原生绑定**：Claude Code 将选中的 owner 绑定到 `Agent` / `Task`；Codex 将它写入 bounded `message`，再按当前宿主原生 spawn schema 调用。
4. **最后降级**：只有宿主 Agent surface 缺失、权限阻断，或完整发现后仍无可用 owner，才允许进入显式 degraded mode。通用临时 Subagent 仅在项目策略允许时使用；主线程分阶段执行只用于明确降级，不能冒充正常编排。

> **铁律**：找不到“完全匹配的 Skill”不等于能力失败。已有 Agent、Tool、Command 或 MCP 能完成任务时，不得继续外部搜索，也不得称为回退。`find-skills` 没有安装结果时，也不能把随后成功的原生 Agent 调用标成 fallback。

### 阶段2：团队组建

输出团队蓝图：

| 编号 | 角色 | 职责 | 模型 | ownerAgent / subagent_type | Capability Binding | 平台工具/降级 |
|------|------|------|------|---------------|------------|---------------|
| 1 | [角色名] | [具体职责] | [继承当前模型，或已获准的选择] | [已发现 owner] | [Agent / Skill / Tool / Command / MCP] | [Claude Agent/Task、Codex spawn_agent、其他原生表面或显式 degraded] |

> **说明**：最后两列标注已匹配的专业 provider/capability，以及当前平台真实使用的工具或有证据的降级路径。

### 阶段3：并行执行

- **Skill任务**：用当前平台的 Skill 调用机制调用本地已安装的skill；Claude Code 示例：`Skill(skill="skill-name", args="任务描述")`
- **Agent任务**：使用当前平台原生 subagent 工具；Claude Code 使用宿主暴露的 `Agent` / `Task`，Codex 使用当前宿主暴露的原生 spawn schema（见下方 profiles）
- 混合编排时skill和subagent可并行运行；平台不支持并行时按阶段顺序执行并说明降级
- 按实际产物依赖、资源冲突和宿主容量分发就绪任务；A 等待人工只暂停 A 及其依赖者，无关的 B/C 继续。批准绑定具体产物版本，状态由宿主单一维护。
- 每个agent/skill完成后汇报：`✅ [角色名] 完成: [一句话结果]`
- 例行且已授权的可逆修复直接继续；只有会改变范围、关键取舍或越过当前授权时，把具体方案与证据交用户决定。

**Agent → Skill 委派**（子agent调用skill的3种模式）：

选中的专业 owner 在 Claude Code 中能否继续调用 `Skill`，取决于当前 Agent/Task schema 和工具权限；其他平台同样必须先确认宿主是否给子 Agent 开放等价 skill/tool 权限。不要为了获得 Skill 工具而把已有专业 owner 换成 `general-purpose`。

| 模式 | 流程 | 适用场景 |
|------|------|---------|
| 协调器直调 | 协调器 → `Skill(skill="name")` 或平台等价调用 → 结果 | 单步Skill任务，无需并行 |
| 委派式调用 | 协调器 → subagent prompt="请使用 /skill-name 完成 X" → subagent → Skill/tool 或内联执行 → 汇报 | 并行多个Skill，或Skill耗时较长 |
| 团队成员调用 | team/subagents → 分配任务 → member → Skill/tool 或内联执行 → 汇报 | 需要成员间协调的复杂任务 |

委派式调用关键点：Task/subagent prompt 中写明要调用的Skill名称和参数；只有平台支持 skill 工具时才承诺自动调用，否则按 Skill 文档内联执行并说明。

### 阶段4：质量把关 & 产品打磨

**验收检查**：对照阶段1的验收标准逐项检查。

**产品打磨**（不仅功能完整，更要用户体验优秀）：
- 边界处理：异常输入、空值、极端情况是否覆盖
- 专业度：命名规范、代码风格、错误提示是否友好
- 完整性：文档、配置说明、使用示例是否齐全
- 平台诚实性：是否准确说明了真实调用的工具和降级行为

全部必需条件通过 → 进入阶段5。未通过时，以下规则是本包唯一的重试依据，故障表和规划记录引用本节：

1. 记录失败原因、实际副作用、当前产物版本、已用资源和下一次可改变的条件。
2. 在当前授权与宿主的时间、费用、次数预算内，有新证据或可验证的改动才继续；普通可逆修复不重复审批。不重试同一输入和条件来凑轮数。
3. 每次尝试后更新同一进度记录：尝试结果、是否有进展、剩余预算与下一步。恢复任务沿用已用预算，不清零计数；宿主未给数值预算时说明这一事实，不虚构固定额度。
4. 无新进展、预算耗尽或遇到明确拒绝时停止受影响分支，交回可恢复检查点、失败证据和具体待决定项；没有通过的验收不记为成功。其他独立任务继续。

本包不机械规定两轮或三次，也不把失败自动升级为增加权限、换工具绕过拒绝或重跑全部检查。

### 阶段5：结果交付 & 部署移交

输出执行报告：

| 项目 | 内容 |
|------|------|
| 总任务数 | X个，成功Y个，失败Z个 |
| 实际平台工具 | 使用了哪些真实工具 / 是否降级 |
| 各Agent结果 | [角色]: [状态] - [关键产出] |
| 汇总结论 | [综合所有结果的最终结论] |
| 后续建议 | [当前未覆盖但值得做的改进方向] |

**部署移交**（按需提供）：
- 运行方式：启动命令、环境要求、配置说明
- 验证步骤：用户可自行验证的操作清单
- 已知限制：当前版本的边界和约束

## 执行底线

**【硬性标准】**：
0. **沿用阶段0的规划与续做规则**：Meta 使用已绑定的 `planning-continuity`；独立使用保留现有计划或等价记录，不重新引入外部规划依赖
1. **强制执行能力命中即停止**：本地多类型 provider 命中后直接使用；仅真实能力缺口才外部搜索；仅真实宿主/权限/owner 缺口才显式降级

**【其他原则】**：
2. 先目标，后组织结构——任务不清晰时先澄清，再决定是否组建团队
3. 队伍规模由任务 DAG、冲突边界与宿主并发能力决定，不写死统一数量上限
4. 关键里程碑必须有质量闸门和回滚点
5. 不默认任何外部工具可用；本地多类型能力先验证，`find-skills` 仅在真实缺口时验证/调用
6. 浏览器多窗口默认互相独立，不共享上下文
7. 成本只是约束，不是固定承诺——不做不切实际的成本预估
8. 危险操作、大规模变更必须先获得用户确认或遵守宿主平台审批规则
9. 不承诺平台没有的能力；尤其不要在 Codex/OpenClaw/Cursor 中直接承诺 Claude Code 的 `TeamCreate`

## 故障处理

| 故障类型 | 处理策略 |
|---------|---------|
| Agent执行失败 | 报告受影响范围，按阶段4的进展与预算规则修复或交接；独立分支继续 |
| Skill不可用 | 先检查现有 Agent/Tool/Command/MCP 是否已覆盖；只有真实能力缺口才外部搜索，只有真实执行表面缺失才显式降级 |
| 平台工具缺失 | 改用该平台可用工具，并明确说明降级路径 |
| 模型超时 | 调整任务复杂度或拆分为更小的子任务 |
| 质量不达标 | 按阶段4的唯一重试规则处理，保留已用预算与真实失败，不设另一套轮数上限 |
| 上下文溢出 | 拆分为更小的子任务，分批执行 |
