---
name: kim-orchestrator
description: |
  多AI协作编排技能 - 自动协调Claude、Codex、Gemini完成需求分析→代码生成→代码审查工作流。

  【核心触发场景】
  - 开发任务、写代码、实现功能、编程任务
  - 新功能开发、功能实现、代码实现
  - 重构、优化代码、代码改进
  - Bug修复、问题修复、错误处理
  - 系统设计、架构设计、模块设计

  【显式触发词】
  - "AI编排"、"ai编排"、"多AI协作"、"三引擎"、"三AI"
  - "codex"、"gemini"、"kim team"、"kim-team"
  - "协作开发"、"编排流程"

  【任务类型触发】
  - 实现XXX功能、开发XXX模块、写一个XXX
  - 创建XXX、构建XXX、搭建XXX
  - 添加XXX功能、新增XXX特性
  - 修改XXX、更新XXX、升级XXX
  - 修复XXX、解决XXX问题
  - 重构XXX、优化XXX性能
  - 设计XXX架构、规划XXX系统

  【技术任务触发】
  - API开发、接口实现、后端开发、前端开发
  - 数据库设计、表结构、CRUD操作
  - 用户认证、登录注册、权限控制
  - 文件处理、数据导入导出
  - 第三方集成、SDK接入
allowed-tools: Read, Write, Bash, Task
---

# AI多引擎编排技能

## Kim Service 执行门

本 Skill 只在用户明确选择多引擎流程时使用。开始前展示工具调用、工作目录和目标文件计划；任何项目写入先获批准。已有目标必须读取并受管更新，新文件安全创建，禁止重定向清空、静默覆盖、用户级配置写入或自动修改 README。未批准写入时，把各阶段结果返回给用户而不落盘。

> **公众号：老金带你玩AI** | **微信：xun900207** | 备注AI加入AI交流群

## 概述

自动协调三个AI引擎完成软件开发工作流：
1. **Claude Code** - 需求分析和技术方案设计
2. **Codex CLI** - 代码生成
3. **Gemini CLI** - 代码审查

## 工作流程

### 阶段1：需求分析（Claude）

分析用户需求，输出技术方案JSON：

```json
{
  "task_description": "任务描述",
  "features": ["功能列表"],
  "tech_stack": {"language": "", "framework": "", "libraries": []},
  "file_structure": {"files": [{"path": "", "purpose": ""}]},
  "key_points": ["关键实现要点"],
  "risks": ["潜在风险"]
}
```

保存到：`.kim-orchestrator/phase1_requirements.json`

### 阶段2：代码生成（Codex）

调用Codex MCP Server生成代码：

```
使用 mcp__codex__codex 工具：
- prompt: 根据phase1的需求生成代码
- cwd: 当前已批准的项目根目录
- sandbox: 只有批准项目写入后使用 `workspace-write`
```

保存到：`.kim-orchestrator/phase2_code.md`

### 阶段3：代码审查（Gemini）

调用Gemini MCP Server审查代码：

```
使用 mcp__gemini__gemini 工具：
- prompt: 审查phase2的代码
- sandbox: true
```

保存到：`.kim-orchestrator/phase3_review.md`

## 配置

工作目录：`.kim-orchestrator/`

## 依赖

- Claude Code（必需）
- Codex CLI + MCP Server（可选，代码生成）
- Gemini CLI + MCP Server（可选，代码审查）

## 示例

```
# 简单任务
"实现用户登录功能"

# 复杂任务
"实现JWT登录，包含注册、登录、token刷新"

# 系统设计
"设计RBAC权限系统"
```
