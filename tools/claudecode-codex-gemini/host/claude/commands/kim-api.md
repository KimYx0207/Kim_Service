---
description: Kim API生成命令 - 根据接口描述生成完整API端点（路由+校验+文档）
allowed-tools: Read, Write, Edit, Bash, Task
argument-hint: [接口名称和参数描述]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次计划调用的 MCP 工具、目标目录和拟新增或修改的文件；不要把本命令扩展成 Router 或自动验收流程。
2. 任何项目写入、依赖安装、外部访问或环境变更都必须先获得对应的人类批准。未批准时只分析并展示计划。
3. 写入前读取现有目标；目标已存在时不得用重定向、空文件或整文件覆盖。只做受管更新，遇到冲突停止并展示差异。
4. 新文件只能在已批准的项目根目录内安全创建；不得写用户级配置。MCP 仅使用本 Tool 的 cli.mjs mcp codex 或 cli.mjs mcp gemini 运行时及其已注册工具。

# Kim API生成命令

> 输入接口需求，生成完整API端点：路由、参数校验、错误处理、文档注释

你现在要生成API端点：$ARGUMENTS

**模式说明**：专门生成单个API端点，比CRUD更灵活，适合非标准接口。

## 执行流程

### 阶段1：分析接口需求

解析用户输入，提取：
- **接口名称**：如 `sendVerificationCode`、`resetPassword`
- **HTTP方法**：GET/POST/PUT/DELETE
- **请求参数**：Query/Body/Path参数
- **响应格式**：返回数据结构
- **业务逻辑**：核心处理逻辑

如果信息不完整，询问用户：
```
📝 请补充接口信息：

1. 接口名称：发送验证码
2. HTTP方法：POST（推荐）
3. 请求参数：
   - email: string, 必填, 邮箱格式
   - type: string, 可选, 验证码类型(register/reset)
4. 响应格式：
   - success: boolean
   - message: string
   - expire_in: number (秒)

请确认或修改：
```

### 阶段2：检测项目结构

使用Glob检测项目现有的API结构：

```bash
# 查找现有路由文件
ls src/routers/ src/routes/ src/api/ routes/ 2>/dev/null

# 查找现有的Schema/Validator
ls src/schemas/ src/validators/ 2>/dev/null
```

**遵循现有项目结构和命名规范**。

### 阶段3：调用Codex生成代码

使用MCP工具调用Codex生成完整API：

```
生成内容：
1. 路由定义（含路径、方法、描述）
2. 请求参数Schema（含校验规则）
3. 响应模型Schema
4. Service层业务逻辑
5. 错误处理
6. API文档注释（OpenAPI格式）
```

### 阶段4：输出结果

```markdown
# API生成结果：{接口名称}

## 接口信息

| 属性 | 值 |
|------|-----|
| 路径 | POST /api/verification/send |
| 描述 | 发送验证码到指定邮箱 |
| 认证 | 不需要 |
| 限流 | 60秒/次 |

## 请求参数

```json
{
  "email": "user@example.com",  // 必填，邮箱格式
  "type": "register"            // 可选，默认register
}
```

## 响应格式

### 成功 (200)
```json
{
  "data": {
    "success": true,
    "message": "验证码已发送",
    "expire_in": 300
  },
  "error": null
}
```

### 失败 (400/429)
```json
{
  "data": null,
  "error": {
    "code": "RATE_LIMITED",
    "message": "请求过于频繁，请60秒后重试"
  }
}
```

## 生成的代码文件

[代码内容...]
```

---

## 使用示例

```bash
# 基础用法
/kim-api "发送验证码接口，参数email和type"

# 详细描述
/kim-api "用户头像上传接口，POST方法，接收multipart/form-data，限制5MB，返回图片URL"

# 复杂逻辑
/kim-api "订单支付回调接口，验证签名，更新订单状态，发送通知"
```

---

## 支持的接口类型

| 类型 | 示例 | 特点 |
|------|------|------|
| 查询接口 | 搜索、筛选、统计 | GET + Query参数 |
| 操作接口 | 发送、提交、触发 | POST + Body参数 |
| 上传接口 | 文件上传 | multipart/form-data |
| 回调接口 | 支付、Webhook | 签名验证 |
| 聚合接口 | 仪表盘数据 | 多数据源整合 |

---

## 适用场景

✅ **适合使用 /kim-api**：
- 非标准的业务接口
- 需要复杂参数校验
- 第三方集成接口
- 单个功能端点

❌ **不适合**：
- 标准CRUD → `/kim-crud`
- 大量相关接口 → `/kim-code`
- 复杂系统 → `/kim-team`
