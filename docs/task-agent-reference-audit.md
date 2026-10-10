# 多任务专业 Agent：参考源全景

核查日期：2026-10-05。范围：Meta_Kim 9f4e07d9 与 Kim Service V1.7 的公开源码声明及一手上游。

## 一句话结论

本轮盘点得到 **55 个外部、历史、方法或候选项目身份**，另有 Meta_Kim 自身；专业 Agent 应按任务吸收方法、明确交接与验收，保留宿主工具和授权边界。

“已登记”“可安装”“方法参考”“真实调用通过”是不同状态。以下没有把参考库数量当可执行 Agent 数量，也没有宣称本轮安装或运行任何上游。

## 完整去重范围

### 运行与安装声明（12）

- [SBoudrias/Inquirer.js](https://github.com/SBoudrias/Inquirer.js)：MIT；直接 npm 运行依赖
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)：v1.x MIT；main 新贡献 Apache-2.0、历史 MIT；直接 npm 运行依赖
- [colinhacks/zod](https://github.com/colinhacks/zod)：MIT；直接 npm 运行依赖
- [npm/mute-stream](https://github.com/npm/mute-stream)：ISC；传递依赖 override
- [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)：当前 Apache-2.0；历史部分 MIT；可选 pip/provider
- [doobidoo/mcp-memory-service](https://github.com/doobidoo/mcp-memory-service)：Apache-2.0；可选 pip/provider
- [semgrep/semgrep](https://github.com/semgrep/semgrep)：LGPL-2.1 引擎；规则/商业组件另核；条件运行工具依赖
- [obra/superpowers](https://github.com/obra/superpowers)：MIT；可安装可选技能；当前注册为 reference
- [obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)：MIT 仅 marketplace 元数据；安装元数据来源
- [affaan-m/ECC](https://github.com/affaan-m/ECC)：MIT；可安装可选技能；当前注册为 external_reference
- [HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything)：Apache-2.0；可安装但默认未选；方法参考
- [garrytan/gstack](https://github.com/garrytan/gstack)：MIT；明确 opt-in 的第三方参考

### 第一方组件与历史来源（9）

- [KimYx0207/Kim_Service](https://github.com/KimYx0207/Kim_Service)：根 MIT；各组件独立；Kim Decision 双许可；当前第一方依赖源/组件合集
- [KimYx0207/HookPrompt](https://github.com/KimYx0207/HookPrompt)：MIT；合入 Service 的 Hook 历史源
- [KimYx0207/findskill](https://github.com/KimYx0207/findskill)：MIT；合入 Service 的 Skill 历史源
- [KimYx0207/GoalPro](https://github.com/KimYx0207/GoalPro)：MIT；合入 Service 的 Skill 历史源
- [KimYx0207/Kim_Decision](https://github.com/KimYx0207/Kim_Decision)：MIT OR Apache-2.0；合入 Service 的参考协议历史源
- [KimYx0207/meta-skill-creator](https://github.com/KimYx0207/meta-skill-creator)：MIT；当前 Service canonical 组件的历史来源
- [KimYx0207/claude-memory-3layer](https://github.com/KimYx0207/claude-memory-3layer)：MIT；已合入 Service 的历史实现源
- [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep)：MIT（包装）；Service 安全扫描包装历史源
- [KimYx0207/Claudecode-Codex-Gemini](https://github.com/KimYx0207/Claudecode-Codex-Gemini)：上游 LICENSE MIT / README CC BY-NC 冲突；本组件有 MIT 选定记录；被选择性导入并加固的历史源

### 吸收后退休（2）

- [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files)：MIT；本仓吸收后删除，历史证据专用
- [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)：MIT；旧项目迁移出处；非当前依赖

### 已登记并有限内化的方法（9）

- [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)：MIT；方法参考，installedDependency=false
- [NVIDIA/SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator)：Apache-2.0；方法参考，installedDependency=false
- [sierra-research/tau2-bench](https://github.com/sierra-research/tau2-bench)：MIT；方法参考，installedDependency=false
- [microsoft/markitdown](https://github.com/microsoft/markitdown)：MIT；方法参考，installedDependency=false
- [sindresorhus/p-queue](https://github.com/sindresorhus/p-queue)：MIT；方法参考，installedDependency=false
- [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)：MIT；方法参考，installedDependency=false
- [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core)：MIT；方法参考，installedDependency=false
- [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)：MIT；方法参考，installedDependency=false
- [loopx-project/loopx](https://github.com/loopx-project/loopx)：Apache-2.0；当前保留历史 MIT（非任意 OR 双许可）；方法参考，installedDependency=false

### 专业角色与技能方法（14）

- [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)：MIT；ZH 继承的英文原版，间接来源
- [jnMetaCode/agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh)：MIT，须保留 Michael Sitarzewski 与 jnMetaCode 两份版权；已选择性适配的方法源
- [HKUDS/OpenSpace](https://github.com/HKUDS/OpenSpace)：MIT；名称级方法参考；本地未固定仓库/版本
- [larksuite/cli](https://github.com/larksuite/cli)：MIT；按需工具接入方法参考
- [yaojingang/yao-meta-skill](https://github.com/yaojingang/yao-meta-skill)：MIT；GoalPro 来源地图中的方法参考
- [agentsmd/agents.md](https://github.com/agentsmd/agents.md)：MIT；GoalPro 来源地图中的方法参考
- [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)：MIT；GoalPro 来源地图中的方法参考
- [mgechev/skills-best-practices](https://github.com/mgechev/skills-best-practices)：未发现明确许可证；GoalPro 来源地图中的方法参考
- [ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips)：All Rights Reserved；未授通用复用许可；GoalPro 来源地图中的方法参考
- [ching-kuo/claude-codex](https://github.com/ching-kuo/claude-codex)：MIT；GoalPro 来源地图中的方法参考
- [shinpr/codex-workflows](https://github.com/shinpr/codex-workflows)：MIT；GoalPro 来源地图中的方法参考
- [anthropics/skills](https://github.com/anthropics/skills)：分目录许可：skill-creator Apache-2.0；docx/pdf/pptx/xlsx 仅 source-available；旧 JA/KO README 提及；技能设计方法源
- [vercel-labs/skills](https://github.com/vercel-labs/skills)：MIT；find-skill 的 fork 来源/CLI 生态
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)：MIT；find-skill 文档中的示例能力

### 仅提及/候选协议与宿主（9）

- [garrytan/gbrain](https://github.com/garrytan/gbrain)：MIT；本地仅出现在来源名称过滤；本轮补充研究
- [wshobson/agents](https://github.com/wshobson/agents)：MIT；本地仅有作者名过滤；仓库身份为候选匹配
- [a2aproject/A2A](https://github.com/a2aproject/A2A)：Apache-2.0；候选互操作协议参考
- [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)：MIT（代码）；文档条款另核；官方事件文档方法参考
- [openai/openai-agents-python](https://github.com/openai/openai-agents-python)：MIT；Tracing 官方文档方法参考
- [openai/codex](https://github.com/openai/codex)：Apache-2.0（CLI 源码）；宿主与官方能力依据
- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)：MIT；beta_compatibility 候选宿主
- [QoderAI/qoder-agent-sdk-samples](https://github.com/QoderAI/qoder-agent-sdk-samples)：MIT（样例）；SDK/服务单独条款；Qoder 候选探测的官方样例参考
- [Trae-AI/TRAE](https://github.com/Trae-AI/TRAE)：本次页面未发现可复用代码许可证；候选宿主官方资料入口

## 需要特别分清的来源关系

- agent-teams-playbook 旧仓 URL 已重定向到 Kim Service；其组件与 HookPrompt、find-skill、GoalPro、Kim Decision、meta-skill-creator 等应以 Service 当前包合同为准，旧仓记录用于追溯。
- ECC 的旧名 everything-claude-code 已合并计算；Graphify 的旧地址 safishamsi/graphify 已转到 Graphify-Labs/graphify。
- Agency Agents 原英文版和中文本地化版分别保留版权归属。Kim 当前仅对部分专业方法做有限适配。
- planning-with-files 在 Meta 已吸收后退休，当前上游仍存在不代表应重新安装；旧 GSD 仓库已归档，现行方法来源是 GSD Core。
- gbrain 的准确上游是 [garrytan/gbrain](https://github.com/garrytan/gbrain)，当前 MIT。它在两仓尚未登记为运行依赖；值得参考的是“事实附来源、可修正/撤回、按需检索”，不能据此宣称已经有 GBrain 能力。
- OpenSpace 在本地文档只有名称；本文将其列为与描述匹配的 HKUDS 项目，但仍需补固定 URL/修订绑定。wshobson/agents 同样是作者名线索对应的候选研究对象，不是已注册能力。

## 许可风险摘要

1. [YK tips LICENSE](https://github.com/ykdojo/claude-code-tips/blob/main/LICENSE) 是保留全部权利，未授通用复制/改编许可；mgechev 的许可本次未核明。二者先保留引用与独立方法归纳，不直接复制材料。
2. [Anthropic skills](https://github.com/anthropics/skills) 按目录授权：skill-creator 可核 Apache-2.0，docx/pdf/pptx/xlsx 为 source-available，不能整库视作同一开源许可。
3. [Claudecode-Codex-Gemini](https://github.com/KimYx0207/Claudecode-Codex-Gemini) 上游仍有 MIT 与 CC BY-NC 声明冲突。Service 组件另有 MIT 选定及来源记录；扩大导入前须核清具体材料与权利范围。
4. [Graphify NOTICE](https://github.com/Graphify-Labs/graphify/blob/v8/NOTICE) 表示当前 Apache-2.0、历史部分 MIT；[MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk#license) 的 v1.x 是 MIT，当前 main 新贡献 Apache-2.0、历史代码 MIT。核查必须按实际采用版本，不能直接套当前主线或旧 README。
5. [Semgrep](https://github.com/semgrep/semgrep) 引擎 LGPL-2.1 与 Kim 包装的 MIT 分开处理。独立调用本机 CLI、复制代码、分发二进制是不同使用方式。
6. MIT/Apache/ISC 都不等于无条件去归属。复制许可材料时保留对应版权、许可、适用 NOTICE、固定修订和修改说明；不暗示原作者背书。

这些是工程来源审计结论，不构成法律意见，也未对现有实现作侵权认定。新专业包若为原创 host-bound methods、未复制上游，其记录应明确写为方法参考而不是衍生代码导入。

## 推荐吸收的六组方法

- 专业交付：从 Agency EN/ZH 与现有 Service 角色提炼任务输入、领域步骤、成果、自查、拒绝范围和交接材料，按需加载
- 结果评测：用 promptfoo、SkillEvaluator、tau2-bench 的思路区分结构、路由/权限、真实任务结果，加入缺项、冲突、误触发、未授权与失败反例
- 意图与方案：采用 Compound Engineering、GSD Core、BMAD、Kim Decision 的先查事实、具体场景、保留已定方向和最小验证方法
- 材料与工具：借鉴 MarkItDown/Graphify 的保真与来源标记、CLI-Anything/Lark 的窄接口和版本/schema/权限对齐
- 协作与质量：从 Superpowers、gstack、ECC、Agent Teams 提炼独立工作分工、实施/review 分离、完成前真实验证
- 复用与知识：以 OpenSpace、gbrain、YAO、Agent Skills 的按需检索、可纠正知识、轻入口和评测为参考；先增强现有组件，避免第二路由器、调度器或记忆服务

## 补充范围

还检查了 Service 基线 **26 个组件**（16 Agent、8 Skill、1 Hook、1 Tool）以及 Meta compatibility catalog 的 **20 个产品**：Claude Code、Codex、OpenClaw、Cursor、OpenCode、Qwen Code、Zed、Gemini CLI、CodeBuddy、Antigravity、JoyCode、Trae、Kiro、Windsurf/Devin Desktop、Cline、Roo Code、Continue、ZCode、DeepSeek Harness、Qoder CLI。

这些宿主登记层级不同，包含正式投影、仅依赖安装目标、候选探测和 beta 结构适配；没有统一宣称“原生已支持”。Agent Skills、MCP、AG-UI、OpenAI/Anthropic 官方方法文档、OWASP/NIST、Reflexion/Self-Refine、PRISMA/GRADE 也属于补充规范/研究来源，但不是新增运行依赖。

## 核验边界

本轮扫描两仓 1,414 个已跟踪文本文件，并核对主要上游 GitHub 及许可原文。没有运行上游、没有验证所有实时 HEAD、没有生成完整传递依赖 SBOM。公开可读和许可证明确不代表生产稳定或实际业务结果通过；真正复制或升级前还需按文件、修订和分发形式复核。
