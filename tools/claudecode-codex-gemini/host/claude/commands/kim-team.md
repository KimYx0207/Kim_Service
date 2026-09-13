---
description: Kim多引擎协作命令 - 协调Claude、Codex、Gemini完成需求分析→代码生成→代码审查
allowed-tools: Read, Write, Edit, Bash, Task
argument-hint: [任务描述]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次计划调用的 MCP 工具、目标目录和拟新增或修改的文件；不要把本命令扩展成 Router 或自动验收流程。
2. 任何项目写入、依赖安装、外部访问或环境变更都必须先获得对应的人类批准。未批准时只分析并展示计划。
3. 写入前读取现有目标；目标已存在时不得用重定向、空文件或整文件覆盖。只做受管更新，遇到冲突停止并展示差异。
4. 新文件只能在已批准的项目根目录内安全创建；不得写用户级配置。MCP 仅使用本 Tool 的 cli.mjs mcp codex 或 cli.mjs mcp gemini 运行时及其已注册工具。

# Kim团队协作命令（基于MCP）

> **公众号：老金带你玩AI** | **微信：xun900207** | 备注AI加入AI交流群

你现在要协调3个AI工具完成任务：$ARGUMENTS

**重要**：本命令使用MCP Server封装的Codex和Gemini工具，而不是直接调用bash命令。

## ⚠️ 文件写入规则（必须遵守）

先展示 `.kim-orchestrator/` 与实际代码的完整目标清单并获得项目写入批准。逐个读取已有目标并受管更新；新文件安全创建。禁止重定向、预创建空文件或静默覆盖。

## 执行流程

### 阶段0.1：健康检查

**参考 `.claude/skills/kim-orchestrator/prompts/health-check.md` 执行MCP健康检查。**

在开始前检测MCP工具是否可用：
1. 检测 `mcp__codex__codex` （代码生成必需）
2. 检测 `mcp__gemini__gemini` （代码审查必需）

根据检测结果：
- ✅ 全部可用 → 继续执行完整流程
- ⚠️ Codex不可用 → 询问是否用Claude降级生成
- ⚠️ Gemini不可用 → 询问是否跳过审查（等同/kim-code）
- ❌ 全部不可用 → 显示修复指南，运行 `/kim-setup`

### 阶段0.2：初始化工作目录

在开始任何阶段前，先创建工作目录和所有需要的空文件：

批准后安全创建 `.kim-orchestrator/`，逐个检查四个目标文件；存在则读取，不存在才创建。

然后依次读取这些文件（可并行）：
- Read .kim-orchestrator/phase1_requirements.json
- Read .kim-orchestrator/phase2_code.md
- Read .kim-orchestrator/phase3_review.md
- Read .kim-orchestrator/result.md

### 阶段1：需求分析（你自己完成）

请详细分析用户的需求，输出JSON格式的技术方案，包含：

```json
{
  "task_description": "任务描述",
  "features": ["功能1", "功能2", "..."],
  "tech_stack": {
    "language": "编程语言",
    "framework": "框架",
    "libraries": ["依赖库1", "依赖库2"]
  },
  "file_structure": {
    "files": [
      {"path": "文件路径", "purpose": "用途"}
    ]
  },
  "key_points": [
    "关键实现要点1",
    "关键实现要点2"
  ],
  "risks": [
    "潜在风险1",
    "潜在风险2"
  ]
}
```

将这个JSON保存到临时文件 `.kim-orchestrator/phase1_requirements.json`

### 阶段2：代码生成（调用Codex MCP Server）

使用MCP工具调用Codex生成代码。

**重要**：检查是否有 `mcp__codex__codex` 工具可用。如果没有，告诉用户：

```
⚠️ Codex MCP Server未配置！

请按照以下步骤配置：
1. 查看本组件 README 的 MCP 启动方式
2. 在实际 MCP 宿主注册 `node <component>/cli.mjs mcp codex`
3. 重启该 MCP 宿主
```

如果工具可用，调用Codex MCP Server：

```
请使用mcp__codex__codex工具生成代码，传入以下参数：
- prompt: 根据.kim-orchestrator/phase1_requirements.json的内容生成完整代码
- cwd: 当前已批准的项目根目录
- sandbox: 只有批准写入时使用 `workspace-write`

将Codex的响应保存到 .kim-orchestrator/phase2_code.md
```

### 阶段3：代码审查（调用Gemini MCP Server）

使用MCP工具调用Gemini审查代码质量。

**重要**：检查是否有 `mcp__gemini__gemini` 工具可用。如果没有，告诉用户：

```
⚠️ Gemini MCP Server未配置！

请按照以下步骤配置：
1. 查看本组件 README 的 MCP 启动方式
2. 在实际 MCP 宿主注册 `node <component>/cli.mjs mcp gemini`
3. 确认本地 Gemini CLI 已认证
4. 重启该 MCP 宿主
```

如果工具可用，调用Gemini MCP Server：

```
请使用mcp__gemini__gemini工具审查代码，传入以下参数：
- prompt: 审查.kim-orchestrator/phase2_code.md的代码质量
- sandbox: true
- cwd: 当前已批准的项目根目录

将Gemini的响应保存到 .kim-orchestrator/phase3_review.md
```

### 阶段4：生成最终报告

整合所有结果，生成完整的报告：

```markdown
# Kim多引擎编排结果

**任务描述**: $ARGUMENTS
**完成时间**: [当前时间]

---

## 阶段1: 需求分析（Claude Sonnet 4.5）

\`\`\`json
[phase1_requirements.json的内容]
\`\`\`

---

## 阶段2: 代码生成（GPT-5.1 Codex Max）

[phase2_code.md的内容]

---

## 阶段3: 代码审查（Gemini 3 Pro）

[phase3_review.md的内容]

---

## 总结

本次编排成功完成以下工作：
1. ✅ Claude完成需求分析和技术方案设计
2. ✅ Codex生成完整的可执行代码
3. ✅ Gemini审查代码质量并提供优化建议

所有中间文件已保存到 `.kim-orchestrator/` 目录，你可以查看详细过程。
```

将这个报告保存到 `.kim-orchestrator/result.md` 并展示给用户。

---

## 注意事项

1. **MCP工具检测**：在执行每个阶段前，先检查MCP工具是否可用：
   - 检查 `mcp__codex__codex` 是否存在
   - 检查 `mcp__gemini__gemini` 是否存在
   - 如果工具不存在，引导用户查看本组件 README，并使用 cli.mjs mcp 子命令注册

2. **错误处理**：如果某个阶段失败，清晰告知用户失败原因和解决方法：
   - Codex 401错误 → API Key未配置或失效
   - Gemini认证失败 → 需要运行 `gemini-cli auth`
   - MCP工具不存在 → Claude Desktop配置未生效，需要重启

3. **文件清理**：任务完成后询问用户是否保留 `.kim-orchestrator/` 目录

4. **日志与上下文**：本运行时默认不写持久日志或会话文件。诊断只读取 MCP 宿主捕获的 stderr；后续阶段需要的上下文通过已批准的项目文件显式传递。

---

## 使用示例

```bash
# 简单任务
/kim-team "实现用户登录功能"

# 复杂任务
/kim-team "实现JWT登录功能，包含注册、登录、token刷新、密码重置"

# 系统设计
/kim-team "设计RBAC权限系统，包含角色管理、权限分配、访问控制"
```

---

## 故障排除参考

如果命令执行失败，请参考以下文档：

1. **MCP Server配置与运行时说明**：本组件 `README.md`
2. **健康检查**：`.claude/skills/kim-orchestrator/prompts/health-check.md`
3. **诊断**：查看 MCP 宿主捕获的安全截断 stderr；本组件不创建用户目录日志。
4. **常见问题**：
   - **MCP工具不可用**：重启Claude Desktop
   - **Codex认证失败**：配置OPENAI_API_KEY环境变量
   - **Gemini认证失败**：运行 `gemini-cli auth`
   - **路径错误**：确保配置文件中使用绝对路径

---

## 🔗 相关命令推荐

执行完成后，根据结果推荐下一步：

| 场景 | 推荐命令 | 原因 |
|------|----------|------|
| 需要继续开发相关功能 | `/kim-code` | 快速迭代 |
| 需要单独审查某段代码 | `/kim-review` | 深度审查 |
| 需要规划后续任务 | `/kim-plan` | 拆解大任务 |
| 生成CRUD相关代码 | `/kim-crud` | 模板化生成 |
