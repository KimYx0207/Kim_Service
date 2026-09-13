---
description: Kim双引擎开发命令 - Claude需求分析 + Codex代码生成（快速开发模式，无审查）
allowed-tools: Read, Write, Edit, Bash, Task
argument-hint: [任务描述]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次计划调用的 MCP 工具、目标目录和拟新增或修改的文件；不要把本命令扩展成 Router 或自动验收流程。
2. 任何项目写入、依赖安装、外部访问或环境变更都必须先获得对应的人类批准。未批准时只分析并展示计划。
3. 写入前读取现有目标；目标已存在时不得用重定向、空文件或整文件覆盖。只做受管更新，遇到冲突停止并展示差异。
4. 新文件只能在已批准的项目根目录内安全创建；不得写用户级配置。MCP 仅使用本 Tool 的 cli.mjs mcp codex 或 cli.mjs mcp gemini 运行时及其已注册工具。

# Kim代码生成命令（Claude + Codex）

> 快速开发模式：需求分析 → 代码生成，跳过审查环节

你现在要协调2个AI工具完成任务：$ARGUMENTS

**模式说明**：这是精简版的双引擎模式，适合快速开发、原型验证，不需要代码审查。

## ⚠️ 文件写入规则（必须遵守）

先展示 `.kim-orchestrator/` 内的目标文件清单并获得项目写入批准。逐个读取已有目标；已有文件只做受管更新，新文件使用安全创建，禁止通过重定向预创建或清空文件。

## 执行流程

### 阶段0.1：健康检查

**参考 `.claude/skills/kim-orchestrator/prompts/health-check.md` 执行MCP健康检查。**

在开始前检测 `mcp__codex__codex` 工具是否可用：
- ✅ 可用 → 继续执行
- ❌ 不可用 → 显示修复指南，询问是否用Claude降级执行

### 阶段0.2：初始化工作目录

在获得批准后，安全创建 `.kim-orchestrator/` 目录；逐个检查三个目标文件，存在则读取，不存在才创建。不要覆盖已有内容。

然后读取这些文件：
- Read .kim-orchestrator/phase1_requirements.json
- Read .kim-orchestrator/phase2_code.md
- Read .kim-orchestrator/result.md

### 阶段1：需求分析（你自己完成）

详细分析用户需求，输出JSON格式的技术方案：

```json
{
  "task_description": "任务描述",
  "features": ["功能1", "功能2"],
  "tech_stack": {
    "language": "编程语言",
    "framework": "框架",
    "libraries": ["依赖库"]
  },
  "file_structure": {
    "files": [{"path": "路径", "purpose": "用途"}]
  },
  "key_points": ["关键实现要点"],
  "risks": ["潜在风险"]
}
```

保存到 `.kim-orchestrator/phase1_requirements.json`

### 阶段2：代码生成（调用Codex MCP Server）

**检查工具**：确认 `mcp__codex__codex` 可用。如果不可用，提示用户配置MCP Server。

调用Codex生成代码：
- prompt: 根据phase1_requirements.json生成完整代码
- cwd: 当前已批准的项目根目录
- sandbox: 只有用户批准项目写入时才使用 `workspace-write`，否则 `read-only`

将响应保存到 `.kim-orchestrator/phase2_code.md`

### 阶段3：生成最终报告

```markdown
# Kim双引擎开发结果（Claude + Codex）

**任务描述**: $ARGUMENTS
**完成时间**: [当前时间]
**模式**: 快速开发（无审查）

---

## 阶段1: 需求分析（Claude Sonnet 4.5）

\`\`\`json
[phase1_requirements.json的内容]
\`\`\`

---

## 阶段2: 代码生成（GPT-5.1 Codex Max）

[phase2_code.md的内容]

---

## 总结

本次编排完成以下工作：
1. ✅ Claude完成需求分析和技术方案设计
2. ✅ Codex生成完整的可执行代码
3. ⏭️ 跳过代码审查（快速开发模式）

💡 **提示**：如需代码审查，请使用 `/kim-team` 命令（完整三引擎模式）
```

保存到 `.kim-orchestrator/result.md` 并展示给用户。

---

## 使用示例

```bash
# 快速原型
/kim-code "实现一个简单的计算器类"

# 功能开发
/kim-code "实现用户注册功能，包含邮箱验证"

# 工具开发
/kim-code "写一个日志轮转脚本"
```

---

## 适用场景

✅ **适合使用 /kim-code**：
- 快速原型验证
- 简单功能开发
- 工具脚本编写
- 时间紧迫的任务

❌ **建议使用 /kim-team**：
- 生产级代码
- 安全敏感功能
- 需要代码审查的场景

---

## 🔗 相关命令推荐

执行完成后，根据结果推荐下一步：

| 场景 | 推荐命令 | 原因 |
|------|----------|------|
| 想要审查生成的代码 | `/kim-review` | 确保代码质量 |
| 需要生成更多相关代码 | `/kim-code` | 继续开发 |
| 需要完整流程 | `/kim-team` | 含审查的完整模式 |
| 需要拆解成更多任务 | `/kim-plan` | 规划后续工作 |
