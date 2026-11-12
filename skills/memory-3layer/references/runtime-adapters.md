# Runtime 适配与信任

三层数据与 Python 核心是共享的；平台目录只保存薄适配配置。安装器必须合并配置，不覆盖用户已有 Hooks。

## 安装模式

| 参数 | 行为 |
|---|---|
| `auto` | 默认。检测 Claude Code / Codex；同时存在则安装两端，只有一个则安装对应端，都不存在则转 `manual` |
| `claude` | 初始化核心并合并 Claude Code 项目 Hooks |
| `codex` | 初始化核心并合并 Codex 项目 Hooks |
| `both` | 初始化核心并合并两端项目 Hooks |
| `manual` | 只初始化 `.memory-3layer/` 并打印手动接线说明 |

Windows：

```powershell
$ProjectDir = (Resolve-Path "..\你的目标项目").Path
.\install.ps1 -ProjectDir $ProjectDir -Platform auto
```

macOS / Linux：

```bash
./install.sh --project-dir /你的/目标项目 --platform auto
```

目标项目参数必填。安装器先把它归一到所在 Git 根；若不属于 Git 仓库，则使用给定目录本身。禁止把公开包所在的 Kim Service 克隆目录当作隐式目标。

## Claude Code

- 配置位置：项目根 `.claude/settings.json`。
- 生命周期：`SessionStart` 加载、`PostToolUse` 只跟踪项目内工作文件、`PreCompact` 保存最小恢复状态。
- 普通工具结果中的 `summary`、`fact` 或大段输出不会自动持久化；记录用户确认事实时调用 `scripts/record_memory.py`。
- 安装器只合并本包条目；已存在的无关 Hooks 必须保留。
- 配置完成后启动新会话，观察 loader 输出并检查 `.memory-3layer/`；没有真实事件证据时只报告 `adapter_status=configured`。

## Codex

- 配置位置：项目根 `.codex/hooks.json`。
- 适配器把 Codex 事件转换为同一核心输入，不维护第二套数据目录。
- 项目 Hook 是可执行代码。安装后在 Codex 中运行 `/hooks`，逐项审查命令与路径，再选择信任。
- 未信任、被禁用或宿主未加载时，Hook 不会自动执行；此时只能使用 manual 核心。
- 信任后启动新会话，观察 loader 输出并检查 `.memory-3layer/`，再报告 `runtime_status=observed`。

## 其他平台

Agent Skills 兼容只保证能读取 `SKILL.md`，不保证兼容 Claude Code 或 Codex 的 Hook 配置。默认使用：

1. 会话开始时显式运行 loader 或让 Agent 读取三层文件。
2. 用户确认“记住”时调用 `scripts/record_memory.py`；只有该受管记录器的顶层 `memory_fact` 可写，不接受任意工具原始输出。
3. 会话结束前显式保存最小状态。
4. 定期运行 `memory-review`。

平台没有真实适配器时，不复制 `.claude/settings.json` 或 `.codex/hooks.json` 来冒充支持。

## 安全检查

- Hook 命令必须使用包内相对路径或安装器解析出的安全路径。
- 配置合并前备份目标文件；JSON 无法解析时停止，不重建空文件。
- 不把本机用户名、绝对路径、环境变量值写入公开包。
- 任何平台都不得把完整事件负载直接持久化。

## 客户端与模型分别记录

`runtime` 来源标签只使用安装薄适配明确绑定的 MEMORY_HOST，或载荷明确的 runtime/host/client 声明；没有声明时为 manual。安装器为已有 Claude/Codex 适配传入明确的客户端标签。原有未带标签的命令仍可运行，只保留未知/手动来源，不从 model 名称猜客户端。

同一 Claude Code 客户端使用 MiniMax 模型时仍标客户端 claude；未知客户端自报 GPT 模型不会因此变成 Codex。可选 model 对象独立保留 name 和 payload_unverified/not_provided，既不改变输出协议、权限和存储格式，也不认证实际模型调用。runtime_evidence 仍为 not-observed，外部声明不是原生实测。

MiniMax code、ZCode、Gemini CLI 等未提供真实 Hook 适配证据的宿主继续使用 manual 核心；宿主可按现有合同声明来源并手动调用，不能复制 Claude/Codex 配置冒称原生支持。数据始终在同一 .memory-3layer 项目目录，安装目录只是薄适配，展示读取实际报告。
