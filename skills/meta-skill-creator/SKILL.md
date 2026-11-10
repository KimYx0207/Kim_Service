---
name: meta-skill-creator
description: 创建、重构或验收可复用技能包。适用于把重复工作流做成跨宿主能力包，并明确触发规则、第一动作、渐进加载、资产模板、脚本校验、触发评测、基线对比、验收证据、闭环治理、公开交付边界和不可伪造的运行证明；也适用于清理冗余参考、拆分人读模板与机器结构数据、补齐首次公开前的验收记录、记录运行反馈、生成写回或不写回决定。当用户提到"做一个 skill / 改 skill / 优化 skill / 评审 skill / 加 trigger eval / 加 release gate / 加 baseline / 准备开源 / 做闭环 / 写回改进"时，必须使用本技能；不要用普通提示词改写 SKILL.md。一旦涉及 skill 设计、改写、评审、对比、验收、量化打分、冗余清理、frontmatter 加字段、加 license、加 compatibility、闭环复盘，立刻调用本 skill。
compatibility: Requires Python 3.10+. Use python, py -3, or python3 according to the host; offline evidence fetch only requires local files, online fetch requires network access.
allowed-tools: Read Glob Grep Bash(python:*) Bash(py:*) Bash(python3:*) Write Edit
license: MIT
---

# 元技能创建器

## 本能力的验收方法

执行前读取 [method.json](method.json) 中当前 capabilityId 的诊断、决策和逐字段 outputChecks，并读取 [任务验收与完整示例](references/acceptance.md)。按本次能力选择相应规则，不用字段齐全、行数或作者自报代替产物质量。缺少 blocking 证据时保留未验收；既有具体授权与宿主最终决定权不变。

专业引用与工具路线继续按下文渐进读取；[来源记录](PROVENANCE.md) 和 [作者正反例](evals/professional-cases.json) 供评审。当前 Meta Skill 发现不会自动注入 method.json，宿主需按此入口读取；未观察到加载或执行时不得宣称生效。


用这个技能把可重复工作流做成能运行、能验收、能迁移的技能包。产物不是“更长的提示词”，而是一个默认入口很轻、细节按需加载、校验方法可复现的能力包。

## 核心契约

- 从用户真实工作流出发，不从个人偏好的模板出发。
- 写文件前先证明这件事值得技能化；一次性任务不要硬做成技能包。
- `SKILL.md` 只保留路由面：触发、第一动作、渐进加载、硬停止和验证。
- 详细研究、产品设计、包计划、触发评测、验收方法和模板放到 `references/`、`assets/`、`evals/`、`scripts/`。
- 需要补全模糊意图、让用户多次选择或先锁 MVP 再批量生成的 skill，必须设计 Codex `request_user_input` / Claude Code `AskUserQuestion` 等宿主原生决策面；Markdown 选择卡只能是降级等待界面，不能冒充真实确认。
- 先按最终产物选择工具：栅格创意图片优先 Image2 / 宿主原生生图；精确图表用数据与绘图库，可编辑文档/表格保留原生格式，界面用代码与真实预览。后几类不是生图降级。只有已确定需要栅格创意图时，才按多模态参考的主路径与降级证据规则选择 MCP 或替代路线。
- 外部材料只能抽象成质量原则；不要复制别人的命名、页面结构、视觉系统、提示词、示例或商业话术。
- 当候选 Skill 要影响公开受众的理解、偏好或行动，或要生成多页视觉内容时，必须先让 Skill 自己研究受众需求、公开讨论和同类供给，再形成“机会研究 -> 受众决策 -> 创意系统”。不要把流量研究变成用户必填问题，也不要把单一平台的标题/封面套路抽到通用层。
- 每次交付都要闭环：记录运行证据、评审发现、`writeback` / `proposal` / `none-with-reason` / `blocked` 决策，并把可复用学习写回对应 reference、template、validator、eval 或 example。

## 能力分层

完整包是能力库，不是所有候选 Skill 的固定模板。按任务风险和交付阶段选择强度：

1. `core`：所有候选都要明确目标、触发、输入、输出、执行步骤契约、边界和最小验证。目标必须说明谁在什么压力下得到什么最终产物以及如何验收；每个步骤必须有输入、动作、可观察输出、进入下一步的条件和失败路线；边界必须覆盖非目标、权限、事实来源、副作用、停止与降级。
2. `conditional`：只有领域陌生、事实会变化、产物可视化、面向公开受众、需要多轮决策或依赖宿主工具时，才加载深度研究、内容机会、创意决策板、多模态或交互式 MVP 模块。
3. `release`：只有声称可分发、可销售、可迁移或明显优于基线时，才强制执行 clean-session 基线、宿主证明、人工验收和完整闭环。

不得因为完整包里存在某个模板，就要求每个候选 Skill 填满它；也不得因为当前任务简单，就删除以后命中条件时需要的能力。

## 渐进加载

只读当前阶段需要的文件：

| 当前阶段 | 读取 | 何时使用 |
|---|---|---|
| 意图与领域研究 | `references/intent-domain-research.md`、`assets/domain-research-brief-template.md` | 所有候选先写最小领域研究简报；只有领域陌生、当前事实会变、用户要求 deep research、涉及公开兼容/安全/商业就绪声明时升级为深度研究。检索后证据仍不足则标 `research-needed`。内容营销或公开传播类技能再加载内容机会研究。 |
| 表面与产物链 | `references/experience-surface-model.md` | Skill 要产出文件、媒体、截图、演示文稿、报告、仪表盘或其他可见产物。 |
| 产品化设计 | `references/product-design.md` | 需要决定多个产物、用户旅程、3 分钟可见结果、首次公开表面或商业交付时。简单单一工作流不强制。 |
| 运行契约 | `references/skill-contract.md` | 写入或改动候选技能包前使用。 |
| 来源抽象边界 | `references/source-abstraction-boundary.md` | 使用外部案例、内部样例或竞品材料时，先抽象再重写。 |
| 包计划 | `assets/package-plan-template.md` | 编辑前映射 `SKILL.md`、参考文件、资产、脚本、评测和示例。 |
| 多模态/工具路线 | `references/multimodal-tooling.md`、`assets/multimodal-prompt-brief-template.md` | Skill 依赖 Image2、宿主媒体能力、MCP、本地渲染器或脚本；先记录本地能力清单和多模态简报。多页视觉产物还要写每页角色、画面、文字区、禁止遮挡区和页面连续性。 |
| 交互式决策与 MVP 门 | `references/interactive-mvp-product-skill.md` | Skill 要在模糊意图下弹多决策、锁定风格/封面/首屏/MVP 后批量生产，或要跨 Codex、Claude Code 宿主复用确认流程。 |
| 评测设计 | `references/evaluation-method.md`、`evals/trigger-eval.json` | `core` 至少设计触发正反例、两个真实任务和一个边界任务。 |
| 发布级运行证明 | `assets/trigger-run-record-template.json`、`assets/host-event-anchor-template.json`、`assets/host-attestation-template.json`、`assets/reviewer-attestation-template.json` | 仅在 `release` 层设计真实 with/without clean-session、目录外运行/人工锚点和基线对比。 |
| 发布门禁 | `references/release-gate.md`、`assets/acceptance-run-template.md` | 声称可以分发、迁移或交付给别人使用前。 |
| 闭环治理 | `references/closed-loop-governance.md`、`assets/loop-run-record-template.md` | 验收、失败、复盘、漂移、发布准备或用户要求“闭环”时；必须写明运行记录和写回决策。 |

`assets/` 里的 `.md` 是给人填写的工作模板，`.json` 是给脚本或校验读取的结构数据；只有创建对应产物时才读取。`scripts/` 只在校验、转换或打包时运行，不要把脚本内容粘进对话上下文。

## 工作流

1. 分类：判断是 `new-skill`、`refactor-skill`、`evaluate-skill`、`package-plan`，还是 `not-a-skill`。
2. Fetch 与研究：先做足以验证目标、原生产物和失败模式的最小证据扫查；只有命中 `conditional` 条件时才升级并执行 `references/intent-domain-research.md` 的 Abstract Deep Research Protocol。只收集会改变包决策、产物表面、工具路线或验收标准的证据。公开传播/营销类 Skill 由 Skill 自己研究受众需求、场景词、同类内容、公开讨论与内容空缺，不把“流量从哪里来”问给用户。
3. 设计：确定结果、触发边界、输入输出、本地能力路线、交互式决策面、MVP 锁定门、包结构和公开失败模式。多页视觉产物必须有 Creative Decision Board，能说明每页画什么、字放哪、为什么这样安排。
4. 构建：只创建或修改当前目标必须触碰的最小文件集。
5. 验证：`core` 层运行结构检查、触发正反例、两个真实任务和一个边界任务；`release` 层再用跨平台 Python 入口创建 `pending` 验收目录，由外部宿主分别运行不加载/加载 Skill 的干净会话，并把 host event/attestation 与 human reviewer attestation 留在 run folder 外。报告 `structure_status=artifact_consistent`、`runtime_status=verified`、`human_status=verified` 分别证明了什么，任何一层都不能替代另一层。
6. 闭环：填写运行记录；决定 `writeback`、`proposal`、`none-with-reason` 或 `blocked`；只有可复用学习才写回规则，不能把聊天总结冒充闭环。

## 包结构

可用模块（不是每个候选 Skill 的默认文件清单）：

- `SKILL.md`：轻入口，负责触发和执行契约。
- `references/`：领域规则、产品模型、能力路线、来源抽象、评测方法、发布门禁。
- `assets/`：可填写模板、工作表、结构数据或提示词简报。
- `scripts/`：确定性校验、转换、渲染或包检查。
- `evals/`：触发评测和回归用例。
- `examples/`：小而真实的输入/输出示例，不写私有历史、内部评分或假运行证据。

只有当新文件能防止具体失败，或能让 Skill 更容易跑通时才添加。不要为了保存研究笔记而新增参考文件。

## 硬停止

遇到以下情况先停止并说明阻塞：

- 任务只是一次性提示词，不是可重复工作流。
- 目标只写了功能或文件名，没有用户、压力场景、最终产物和可观察成功标准。
- 执行步骤只有“分析、优化、处理”等空动作，没有输入、动作、输出、转移条件或失败路线。
- 边界没有说明非目标、事实来源、权限/副作用、停止条件和降级行为。
- 领域表面靠猜，没有用户材料、本地证据或当前来源证据支撑。
- 多模态 Skill 没有本地能力清单和输出证据路线。
- 需要用户多轮决策或 MVP 确认，却没有原生选择工具、降级等待界面、确认状态字段和批量生成停止规则。
- 包依赖生成文件，但没有办法证明文件、截图、媒体或渲染结果存在。
- 候选包要声称 `public-ready`、可销售、可迁移或优于基线，但 acceptance / baseline 只有准备脚本生成的 `pending` 模板，或只有 run 内日志/本地 hash，没有两个规范化后不同的真实 session、目录外 host event/attestation、逐维人工评分和目录外 reviewer attestation。
- 触发范围和另一个活跃技能包重叠，却没有路由边界。
- 设计会暴露私有评测历史、内部复盘、实现伤痕，或让人看出模仿某个外部项目。

## 验证

以下命令验收 `meta-skill-creator` 自身的完整合同，不是所有候选 Skill 的固定命令：

```bash
python scripts/check_meta_skill_package.py .
python scripts/check_closed_loop.py .
python scripts/test_acceptance_runs.py
python scripts/prepare_acceptance_run.py --mode acceptance --input-file <raw-input-file>
python scripts/check_acceptance_runs.py <completed-run-dir>
```

`prepare_acceptance_run.py` 只准备模板，不能调用模型、预填分数或产出 PASS；准备完成后的 `check_acceptance_runs.py` 失败是预期行为。本地 hash 只证明 artifact consistency；只有真实 clean-session 输出、目录外 host event/attestation、冻结 rubric 的逐维人工评分和目录外 reviewer attestation 全部绑定后，runtime/human 才能 verified，Ready 才允许 pass。逐维 `evidence_refs` 必须指向两份真实输出中存在且非空的行或行范围；包裹 placeholder、AI/自动化 reviewer、伪造或越界行号都必须失败。如果当前系统没有 `python` 命令，可用 `py -3`；Linux/macOS 优先 `python3`。shell 包装器会拒绝低于 3.10 的解释器。

候选 Skill 应运行它自己的脚本与评测。只有进入 `release` 层时，才套用完整 clean-session、宿主证明和人工验收门禁。

## 最终报告

用中文报告：改了哪些文件、包决策、触发边界、渐进加载图、校验命令、证明层级、闭环决策和剩余风险。给一个小的前后对照或输出片段，让用户能判断这个技能包是否真的更容易使用。
