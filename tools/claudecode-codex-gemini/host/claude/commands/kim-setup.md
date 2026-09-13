---
description: Kim环境检测命令 - 检查 Claude Code、Codex、Gemini 与 Kim Service CCG MCP 注册状态
allowed-tools: Read, Bash
argument-hint: [可选：check/plan]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次只读检测项；本命令不自动安装、不写 MCP 或用户级配置。
2. `check` 只检测，`plan` 只输出修复计划。需要项目级安装时，展示 kim-ccg plan 结果，必须由用户另行明确批准 apply。
3. 认证与代理只报告 `configured` 或 `disabled`，不得输出值、URL、端口、Token 或凭证。
4. MCP 仅对应本 Tool 的 `cli.mjs mcp codex` 与 `cli.mjs mcp gemini` 运行时；不要读取或创建仓库旧配置、用户目录会话文件或持久日志。

# Kim环境检测命令

运行模式：$ARGUMENTS（默认 `check`）。除 `check` 和 `plan` 外拒绝执行。

## 1. 基础与 CLI 检测

只运行版本/存在性检查：

```text
node --version
claude --version
codex --version
gemini --version
```

如果宿主环境无法直接启动 npm shim，报告 `installed but host launch unresolved`，不要改 PATH、执行策略或用户配置。

## 2. MCP 注册状态

从当前宿主的 MCP 工具列表检查 `mcp__codex__codex` 与 `mcp__gemini__gemini`。不要通过读取某个固定配置文件推断已注册。

若缺失，输出如下计划，不执行：

1. 定位 Kim Service 中本组件的绝对路径。
2. Codex server command: `node <component>/cli.mjs mcp codex`。
3. Gemini server command: `node <component>/cli.mjs mcp gemini`。
4. 由用户在实际 MCP 宿主中添加配置并重启宿主。

## 3. 认证与代理状态

只检查是否配置，输出示例：

```text
OPENAI_API_KEY status: configured|disabled
GEMINI_API_KEY status: configured|disabled
HTTP proxy forwarding: configured|disabled
HTTPS proxy forwarding: configured|disabled
```

不得回显任何变量值。代理默认不转发；只有操作员显式设置 `KIM_CCG_FORWARD_PROXY=1` 时，运行时才会验证并转发无凭证 HTTP(S) 代理 URL。

## 4. 项目级宿主资产

需要安装 Claude commands/Skill 时，先运行 dry-run：

```text
node <component>/cli.mjs install --target <project-root>
```

展示目标文件、冲突和哈希。用户明确批准项目写入后，才可建议：

```text
node <component>/cli.mjs install apply --target <project-root> --confirm-project-write
```

冲突文件默认拒绝；不得自动添加 `--replace`。

## 5. 输出

按 `ready / partial / blocked` 汇总 Node、Claude、Codex、Gemini、两项 MCP 注册、认证状态与代理转发状态。修复计划必须与检测结果分开，且不得声称已经执行。
