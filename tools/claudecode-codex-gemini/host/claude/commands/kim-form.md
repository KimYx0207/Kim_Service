---
description: Kim表单生成命令 - 根据字段描述生成React/Vue表单组件（含校验逻辑）
allowed-tools: Read, Write, Edit, Bash, Task, Glob
argument-hint: [表单字段描述]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次计划调用的 MCP 工具、目标目录和拟新增或修改的文件；不要把本命令扩展成 Router 或自动验收流程。
2. 任何项目写入、依赖安装、外部访问或环境变更都必须先获得对应的人类批准。未批准时只分析并展示计划。
3. 写入前读取现有目标；目标已存在时不得用重定向、空文件或整文件覆盖。只做受管更新，遇到冲突停止并展示差异。
4. 新文件只能在已批准的项目根目录内安全创建；不得写用户级配置。MCP 仅使用本 Tool 的 cli.mjs mcp codex 或 cli.mjs mcp gemini 运行时及其已注册工具。

# Kim表单生成命令

> 输入字段和校验规则，生成完整的表单组件（React/Vue + 校验 + 样式）

你现在要生成表单组件：$ARGUMENTS

**模式说明**：专门生成前端表单组件，自动处理校验、样式、提交逻辑。

## 执行流程

### 阶段1：分析表单需求

解析用户输入，提取：
- **表单名称**：如 `LoginForm`、`UserProfile`
- **字段列表**：字段名、类型、校验规则
- **提交地址**：API端点
- **框架选择**：React/Vue（检测项目）

如果信息不完整，询问用户：
```
📝 请补充表单信息：

1. 表单名称：用户注册表单
2. 字段列表：
   - username: 文本, 必填, 4-20字符, 字母数字下划线
   - email: 邮箱, 必填, 邮箱格式
   - password_field: 密码, 必填, 8位以上, 含字母数字
   - confirm_password_field: 密码, 必填, 与password_field一致
   - agreeTerms: 复选框, 必填
3. 提交地址：/api/register
4. 成功后：跳转登录页

请确认或修改：
```

### 阶段2：检测前端框架

使用Glob检测项目使用的前端框架：

```bash
# 检测React
ls package.json 2>/dev/null | xargs grep -l "react"

# 检测Vue
ls package.json 2>/dev/null | xargs grep -l "vue"

# 检测UI库
grep -E "antd|@mui|element-plus|naive-ui" package.json 2>/dev/null
```

### 阶段3：调用Codex生成组件

使用MCP工具调用Codex生成表单组件：

**React模板**：
```
生成内容：
1. 表单组件（React Hook Form / Formik）
2. 校验Schema（Zod / Yup）
3. 样式文件（Tailwind / CSS Modules）
4. 类型定义（TypeScript）
```

**Vue模板**：
```
生成内容：
1. 表单组件（Vue 3 Composition API）
2. 校验规则（VeeValidate / Element Plus rules）
3. 样式文件
4. 类型定义
```

### 阶段4：输出结果

```markdown
# 表单生成结果：{表单名称}

## 表单预览

| 字段 | 类型 | 校验规则 |
|------|------|----------|
| username | 文本输入 | 必填, 4-20字符 |
| email | 邮箱输入 | 必填, 邮箱格式 |
| password_field | 密码输入 | 必填, 8位以上 |
| confirm_password_field | 密码输入 | 必填, 密码一致 |
| agreeTerms | 复选框 | 必须勾选 |

## 生成的文件

1. `components/RegisterForm.tsx` - 表单组件
2. `schemas/register.ts` - 校验Schema
3. `types/register.ts` - 类型定义

## 使用方法

```tsx
import RegisterForm from '@/components/RegisterForm';

function RegisterPage() {
  return <RegisterForm onSuccess={() => router.push('/login')} />;
}
```

## 生成的代码

[代码内容...]
```

---

## 使用示例

```bash
# 基础用法
/kim-form "登录表单：用户名、密码、记住我"

# 详细描述
/kim-form "用户资料编辑表单：昵称必填、头像上传、性别单选、生日日期选择、个人简介文本域"

# 复杂表单
/kim-form "订单表单：收货人、手机号（11位）、省市区级联、详细地址、发票信息可选"
```

---

## 支持的字段类型

| 类型 | 对应组件 | 校验支持 |
|------|----------|----------|
| 文本 | Input | 长度、正则、必填 |
| 邮箱 | Input | 邮箱格式 |
| 密码 | Password | 强度、一致性 |
| 手机号 | Input | 11位数字 |
| 数字 | InputNumber | 范围、精度 |
| 单选 | Radio | 必选 |
| 多选 | Checkbox | 最少/最多 |
| 下拉 | Select | 必选 |
| 日期 | DatePicker | 范围 |
| 上传 | Upload | 大小、格式 |
| 文本域 | Textarea | 长度 |

---

## 适用场景

✅ **适合使用 /kim-form**：
- 需要快速生成表单
- 标准的数据录入界面
- 用户注册/登录/资料编辑
- 后台管理表单

❌ **不适合**：
- 复杂动态表单 → `/kim-code`
- 表格编辑 → `/kim-code`
- 需要后端配合 → `/kim-team`
