---
description: Kim截图转代码命令 - Gemini看图分析 + Claude技术方案 + Codex代码生成 + Gemini代码审查
allowed-tools: Read, Write, Edit, Bash, Task
argument-hint: [截图路径或URL]
---

## Kim Service 执行门（必须先执行）

1. 先复述原始用户意图，并列出本次计划调用的 MCP 工具、目标目录和拟新增或修改的文件；不要把本命令扩展成 Router 或自动验收流程。
2. 任何项目写入、依赖安装、外部访问或环境变更都必须先获得对应的人类批准。未批准时只分析并展示计划。
3. 写入前读取现有目标；目标已存在时不得用重定向、空文件或整文件覆盖。只做受管更新，遇到冲突停止并展示差异。
4. 新文件只能在已批准的项目根目录内安全创建；不得写用户级配置。MCP 仅使用本 Tool 的 cli.mjs mcp codex 或 cli.mjs mcp gemini 运行时及其已注册工具。

# Kim截图转代码命令（四阶段三引擎）

> **公众号：老金带你玩AI** | **微信：xun900207** | 备注AI加入AI交流群

你现在要协调3个AI工具，将UI设计稿/截图转换为可运行的前端代码：$ARGUMENTS

**核心流程**：Gemini(看图) → Claude(分析) → Codex(生成) → Gemini(审查)

## ⚠️ 文件写入规则（必须遵守）

先展示 `.kim-orchestrator/ui2code/` 和实际前端代码的完整目标清单，获得项目写入批准后再操作。已有目标必须先读并受管更新，新文件安全创建，禁止重定向清空。

## 执行流程

### 阶段0.1：健康检查

**参考 `.claude/skills/kim-orchestrator/prompts/health-check.md` 执行MCP健康检查。**

本命令**必须**同时使用Gemini和Codex：
1. 检测 `mcp__gemini__gemini` （图像识别必需）
2. 检测 `mcp__codex__codex` （代码生成必需）

根据检测结果：
- ✅ 全部可用 → 继续执行完整流程
- ❌ Gemini不可用 → **无法执行**（核心能力缺失，无法看图）
- ⚠️ Codex不可用 → 询问是否用Claude降级生成（质量可能下降）

### 阶段0.2：初始化工作目录

批准后安全创建 `.kim-orchestrator/ui2code/`；逐个检查五个目标文件，存在则读取，不存在才创建。不要覆盖已有内容。

然后读取这些文件：
- Read .kim-orchestrator/ui2code/phase1_vision.json
- Read .kim-orchestrator/ui2code/phase2_spec.json
- Read .kim-orchestrator/ui2code/phase3_code.md
- Read .kim-orchestrator/ui2code/phase4_review.md
- Read .kim-orchestrator/ui2code/result.md

### 阶段0.3：获取截图

根据用户输入类型处理：

**情况1：本地文件路径**
```
如果 $ARGUMENTS 是本地文件路径（如 ./design.png, C:\screenshots\ui.jpg）
→ 使用 Read 工具读取图片文件
→ 将图片内容传递给Gemini
```

**情况2：URL链接**
```
如果 $ARGUMENTS 是URL（如 https://example.com/design.png）
→ 直接将URL传递给Gemini
```

**情况3：用户未提供**
```
→ 询问用户提供截图路径或URL
→ 或者让用户直接粘贴图片到对话中
```

---

### 阶段1：视觉分析（Gemini）

调用 `mcp__gemini__gemini` 分析截图：

**Prompt模板**：
```
请仔细分析这张UI设计截图，提取以下信息：

## 1. 整体布局
- 页面类型（登录页/列表页/详情页/表单页/Dashboard等）
- 整体布局结构（顶部导航+侧边栏+主内容区等）
- 响应式设计要求（移动端/PC端/自适应）

## 2. 组件清单
列出所有可识别的UI组件：
- 按钮（样式、状态、位置）
- 输入框（类型、placeholder、验证）
- 卡片/列表项
- 导航栏/菜单
- 图标/图片
- 表格/数据展示
- 弹窗/模态框
- 其他组件

## 3. 样式信息
- 主色调和配色方案
- 字体大小层级
- 间距规律
- 圆角/阴影等视觉效果

## 4. 交互暗示
- 可点击元素
- 悬停效果暗示
- 表单验证提示
- 状态切换

请以结构化JSON格式输出分析结果。
```

将Gemini的响应保存到 `.kim-orchestrator/ui2code/phase1_vision.json`

---

### 阶段2：技术方案设计（Claude）

基于阶段1的视觉分析结果，你（Claude）来设计技术实现方案：

```json
{
  "project_type": "项目类型（React/Vue/HTML+CSS）",
  "tech_stack": {
    "framework": "React 18 / Vue 3 / 纯HTML",
    "styling": "Tailwind CSS / CSS Modules / Styled Components",
    "ui_library": "Ant Design / Element Plus / shadcn/ui / 无",
    "icons": "Lucide / Heroicons / 自定义"
  },
  "file_structure": [
    {"path": "src/components/Header.tsx", "purpose": "顶部导航栏"},
    {"path": "src/components/LoginForm.tsx", "purpose": "登录表单"},
    {"path": "src/pages/Login.tsx", "purpose": "登录页面"}
  ],
  "component_hierarchy": {
    "Page": {
      "Header": ["Logo", "NavLinks", "UserMenu"],
      "MainContent": ["Form", "Button"]
    }
  },
  "responsive_breakpoints": {
    "mobile": "< 768px",
    "tablet": "768px - 1024px",
    "desktop": "> 1024px"
  },
  "implementation_notes": [
    "使用Flexbox实现整体布局",
    "表单使用受控组件模式",
    "按钮需要loading状态"
  ]
}
```

将技术方案保存到 `.kim-orchestrator/ui2code/phase2_spec.json`

**技术栈选择建议**：
- 如果用户没指定，默认使用：React 18 + TypeScript + Tailwind CSS
- 简单页面（无交互）：纯HTML + Tailwind CSS
- 复杂交互：React/Vue + 状态管理

---

### 阶段3：代码生成（Codex）

调用 `mcp__codex__codex` 生成代码：

**Prompt模板**：
```
根据以下UI分析和技术方案，生成完整的前端代码：

## 视觉分析结果
[phase1_vision.json的内容]

## 技术方案
[phase2_spec.json的内容]

## 代码要求

1. **文件结构**：按照技术方案中的file_structure生成所有文件
2. **样式还原**：尽可能还原截图中的视觉效果
3. **组件拆分**：合理拆分组件，保持单一职责
4. **TypeScript**：使用严格类型定义
5. **响应式**：支持移动端和PC端
6. **可访问性**：添加适当的aria标签
7. **注释**：关键逻辑添加中文注释

## 输出格式

对于每个文件，使用以下格式：

### 文件：[文件路径]
```[语言]
[代码内容]
```

请生成所有必要的文件。
```

将Codex的响应保存到 `.kim-orchestrator/ui2code/phase3_code.md`

---

### 阶段4：代码审查（Gemini）

调用 `mcp__gemini__gemini` 审查生成的代码：

**Prompt模板**：
```
请审查以下根据UI截图生成的前端代码：

## 原始截图分析
[phase1_vision.json的内容]

## 生成的代码
[phase3_code.md的内容]

## 审查维度

### 1. 视觉还原度
- 布局是否与截图一致？
- 颜色/字体/间距是否准确？
- 组件样式是否匹配？

### 2. 代码质量
- 组件结构是否合理？
- 是否有重复代码？
- TypeScript类型是否完整？

### 3. 响应式设计
- 移动端适配是否正确？
- 断点设置是否合理？

### 4. 最佳实践
- React/Vue使用是否规范？
- 性能优化（memo、lazy等）
- 可访问性（a11y）

### 5. 潜在问题
- 硬编码的值
- 缺失的边界情况
- 可能的兼容性问题

请给出详细的审查报告和改进建议。
```

将审查报告保存到 `.kim-orchestrator/ui2code/phase4_review.md`

---

### 阶段5：生成最终报告

整合所有结果，生成完整报告：

```markdown
# Kim截图转代码结果

**输入截图**: $ARGUMENTS
**完成时间**: [当前时间]
**技术栈**: [技术方案中的tech_stack]

---

## 阶段1: 视觉分析（Gemini）

[phase1_vision.json的格式化内容]

---

## 阶段2: 技术方案（Claude）

[phase2_spec.json的格式化内容]

---

## 阶段3: 生成代码（Codex）

[phase3_code.md的内容]

---

## 阶段4: 代码审查（Gemini）

[phase4_review.md的内容]

---

## 文件清单

| 文件路径 | 用途 | 行数 |
|---------|------|------|
| [路径] | [用途] | [行数] |

---

## 下一步建议

1. 将生成的代码复制到你的项目中
2. 根据审查建议进行优化
3. 运行 `npm install` 安装依赖
4. 运行 `npm run dev` 预览效果
5. 根据实际需求调整样式和交互
```

保存到 `.kim-orchestrator/ui2code/result.md` 并展示给用户。

---

## 使用示例

```bash
# 本地截图
/kim-ui2code "./designs/login-page.png"

# 网络图片
/kim-ui2code "https://dribbble.com/shots/xxx/attachments/xxx"

# Figma导出图
/kim-ui2code "./figma-export/dashboard.png"

# 手机截图
/kim-ui2code "C:\Users\example\Pictures\Screenshots\app-ui.jpg"
```

---

## 支持的输入格式

| 格式 | 说明 | 示例 |
|------|------|------|
| PNG/JPG/JPEG | 本地图片文件 | `./design.png` |
| WebP | 本地图片文件 | `./ui.webp` |
| URL | 网络图片链接 | `https://xxx.com/img.png` |
| 相对路径 | 项目内图片 | `./assets/mockup.jpg` |
| 绝对路径 | 系统图片 | `C:\Screenshots\ui.png` |

---

## 技术栈支持

| 框架 | 样式方案 | UI库 | 适用场景 |
|------|----------|------|----------|
| React 18 + TS | Tailwind CSS | shadcn/ui | 现代Web应用（默认） |
| React 18 + TS | CSS Modules | Ant Design | 企业级B端应用 |
| Vue 3 + TS | Tailwind CSS | Element Plus | Vue技术栈项目 |
| HTML + CSS | Tailwind CSS | 无 | 静态页面/原型 |

**指定技术栈**：
```bash
/kim-ui2code "./design.png" --framework vue --ui element-plus
```

---

## 🔗 相关命令推荐

执行完成后，根据结果推荐下一步：

| 场景 | 推荐命令 | 原因 |
|------|----------|------|
| 需要添加业务逻辑 | `/kim-code` | 生成API调用、状态管理等 |
| 需要审查优化代码 | `/kim-review` | 深度代码审查 |
| 需要生成后端API | `/kim-api` | 配套后端接口 |
| 需要生成表单验证 | `/kim-form` | 表单逻辑增强 |

---

## 常见问题

### Q: Gemini看不清图片细节怎么办？
A: 尽量使用高清截图（建议1920x1080以上），避免模糊或压缩过度的图片。

### Q: 生成的代码样式和截图差距大怎么办？
A:
1. 在阶段2手动补充颜色值、间距等具体数值
2. 提供设计规范文档
3. 使用 `/kim-review` 审查后手动调整

### Q: 支持生成小程序代码吗？
A: 目前主要支持Web前端（React/Vue/HTML），小程序需要额外适配。

---

## 注意事项

1. **图片质量**：高清截图效果更好，模糊图片可能导致识别错误
2. **复杂页面**：建议拆分成多个截图分别生成，再组合
3. **设计系统**：如果有设计规范文档，可以一并提供给Gemini参考
4. **代码调整**：生成的代码是起点，实际使用需根据项目规范调整
5. **版权注意**：确保截图来源合法，不要使用他人版权设计
