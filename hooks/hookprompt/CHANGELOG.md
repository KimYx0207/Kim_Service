# 变更记录

本文件记录 HookPrompt 的重要变更。

## Kim Service Unreleased - 2026-07-17

- 同步 `KimYx0207/HookPrompt` 修订 `83299e7094937f8d0179ff60d304c1c5a25a5740` 的双语验证说明。
- 明确 `{}` 是短文本主动跳过结果，并提供从标准输入传入真实任务 JSON 的正向验收命令。

## Kim Service V1.0 - 2026-07-15

- 基于 `KimYx0207/HookPrompt` 修订 `a4c1faac0cc79860308f5553e3be0b0ac32415bb` 纳入 Kim Service。
- 后续合集版本、tag 与 Release 由 Kim Service 统一发布，HookPrompt 的历史版本记录继续保留在本文件中。

## v1.2.11 - 2026-07-03

整理项目公开文档和发布边界，让 HookPrompt 更适合作为正式开源项目使用。

### 变更

- 重写中文 README，并同步英文 README，补齐项目定位、工作方式、安装、配置、测试、故障排查、联系方式和支持方式。
- 将历史版本记录迁移到独立 `CHANGELOG.md`，并改为中文读者可读的版本说明。
- 引入仓库本地图片资源 `docs/images/contact-qr.png`、`docs/images/wechat-pay.jpg` 和 `docs/images/alipay.jpg`，避免 README 继续依赖外部二维码链接。
- 清理公开配置中的本机绝对路径和 Graphify 运行钩子，让 `.claude/settings.json` 与 `.codex/hooks.json` 回到可复用的 HookPrompt 配置。
- 删除并忽略 `.claude/settings.local.json`、`AGENTS.md`、`CLAUDE.md`、`.meta-kim/` 和 `graphify-out/` 等本机或外部工具产物。

### 验证

- `node test-hook.js` 通过，32/32。
- `.claude/settings.json` 和 `.codex/hooks.json` 均可被 JSON 解析。
- `git diff --check` 通过，仅有 Git 的 CRLF 提示。
- 公开文件扫描未发现本机绝对路径、旧项目目录或外部工具钩子残留。

## v1.2.10 - 2026-06-19

修复 prompt 级治理入口的路由问题。

### 变更

- 放行 `/meta-theory ...`，让这类治理入口继续触发 HookPrompt 首屏理解，避免被普通斜杠命令过滤提前跳过。
- 保留普通命令过滤，`/help`、`/clear`、`/commit` 等内置命令仍然不优化。
- 补充 Claude / Codex 回归测试，覆盖 `/meta-theory` 触发和 `/help` 跳过。

## v1.2.9 - 2026-06-13

升级提示词模板，引入 Outcome Contract，并修复短诊断输入触发。

### 变更

- 将提示词模板从 CTF / 叙事式结构升级为 role-first、outcome-contract、tagged structure、success criteria 和 verification plan。
- `这个不行`、`报错了`、`帮我看看` 等短但有任务意图的输入会触发优化。
- `好的`、`继续`、`ok` 等纯确认回复仍然跳过优化。
- 补充 Claude / Codex 回归测试，覆盖短诊断、短错误反馈、短检查请求和正常长文本。

## v1.2.8 - 2026-06-11

恢复默认完整的用户可见优化体验。

### 变更

- 默认把完整 meta 模板注入 `additionalContext`，保留三段式优化展示。
- 原始用户输入继续放进 fenced code block，避免 Markdown 标题、文件路径和图片引用被错误渲染。
- 只有显式设置 `HOOKPROMPT_COMPACT_CONTEXT=1` 时才使用紧凑后台契约。
- Claude Code / Codex / Cursor 适配继续复用同一套 Hook 契约。

## v1.2.7 - 2026-06-11

引入短后台契约，同时保留前台三段式输出。

### 说明

- 该版本的默认路径已被 v1.2.8 调整；紧凑契约现在只作为显式应急模式保留。
- 用户可见回复仍要求展示 `原始输入 / 优化后的理解 / 优化后的完整提示词`。

## v1.2.6 - 2026-06-10

新增 Codex `UserPromptSubmit` 正式适配。

### 变更

- 新增 Codex 项目级入口：`.codex/hooks.json` 和 `.codex/hooks/user-prompt-submit.js`。
- 通过 `hookSpecificOutput.additionalContext` 保持 Codex 模型可见上下文。
- 避免把优化内容错误包装成 `systemMessage`。
- 增加 Codex JSON 输入测试，验证只提取 `prompt` 字段进行优化。

## v1.2.5 - 2026-01-30

强化用户可见输出格式要求。

### 变更

- 新增强制格式指令，要求回复以 `原始输入` 开头。
- 将格式指令放在 `additionalContext` 最前面。
- 明确格式规则，方便用户判断 Hook 是否真正生效。

## v1.2.4 - 2026-01-29

完成本地测试验证。

### 变更

- 确认 `test-hook.js` 测试用例通过。
- 验证 Windows 运行稳定性和 JSON 解析行为。
- 清理项目结构，移除无关残留文件。

## v1.2.3 - 2026-01-28

完善 JSON 输入解析。

### 变更

- 解析 Claude Code API JSON 输入，并从 `messages` 中提取用户消息。
- 修复 UserPromptSubmit 接收结构化 Claude Code API 输入时的处理问题。
- 同时支持 JSON 输入和纯文本输入。
- 增加原始输入与提取后内容的解析日志。

## v1.2.2 - 2026-01-27

修复 Claude Code Hook API 输入解析。

### 变更

- 正确解析 Claude Code Hook API JSON 输入。
- 正确识别并跳过 `/clear`、`/help` 等内置命令。
- 支持 `messages` 数组和纯文本输入。
- 改进诊断日志。

## v1.2.1 - 2026-01-27

新增内置命令过滤。

### 变更

- 自动识别并跳过 `/clear`、`/help`、`/commit` 等 Claude Code 内置命令。
- 避免把 `/clear` 误解成项目清理请求。
- 普通斜杠命令不再被不必要地优化。

## v1.2.0 - 2026-01-11

修复核心 Hook 触发路径。

### 变更

- 在 `settings.json` 中使用正确的 `UserPromptSubmit` 键名和数组结构。
- 输出符合 Claude Code Hook API 的 JSON 结构。
- 增加 Windows 和 Unix 配置示例。
- 新增 `test-hook.js` 本地测试工具。
- 扩充安装和故障排查文档。

## v1.1.0 - 2025-12-09

新增跨平台支持，并统一早期文档。

### 变更

- 新增 Node.js 实现，支持 Windows、macOS 和 Linux。
- 保留 Bash 实现，适合 macOS 和 Linux。
- 改进输出格式，移除会干扰 Claude 理解的分隔符。
- 使用跨平台临时日志路径。
- 支持 `$HOME` 和项目目录查找。
- 增加模板缺失日志。
- 统一代码和文档中的输入长度阈值说明。
