# MCP 健康检查（Kim Service CCG）

每次调用 Codex 或 Gemini 前执行只读检查。

## 检查顺序

1. 从当前 MCP 宿主的工具列表确认 `mcp__codex__codex` 或 `mcp__gemini__gemini` 已注册。
2. 确认请求的 `cwd` 位于当前 `KIM_CCG_WORKSPACE_ROOT` 内。
3. Codex 默认 `sandbox: read-only`；需要 `workspace-write` 时先列出写入计划并获得批准。
4. Gemini 默认启用 sandbox，不允许自动批准模式。
5. 认证/代理只报告 `configured` 或 `disabled`，永远不输出实际值。

## MCP 不可用时

报告缺失的工具，并给出与当前 Tool 对应的启动命令：

```text
node <component>/cli.mjs mcp codex
node <component>/cli.mjs mcp gemini
```

让用户在实际 MCP 宿主中注册绝对路径并重启宿主。不要读取或创建仓库配置文件，不要修改用户级配置，不要假设某一宿主配置路径。

## 降级

- Codex 不可用：说明代码生成能力缺失，询问是否只做分析或由当前宿主生成。
- Gemini 不可用：说明专业审查/视觉能力缺失，询问是否跳过该阶段。
- 两者都不可用：停止多引擎流程，保留用户原始意图并只输出修复计划。

## 隐私与诊断

本运行时默认不写持久日志或会话上下文。诊断时仅报告退出码、错误类别和安全截断后的 stderr；不要记录原始 prompt、Token、代理值或环境变量值。
