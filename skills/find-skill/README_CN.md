# find-skill（Windows 兼容版）

[English](./README.md) | [中文](./README_CN.md)

> 🔗 **当前发布包**: [KimYx0207/Kim_Service · skills/find-skill](https://github.com/KimYx0207/Kim_Service/tree/main/skills/find-skill)

---

## 快速访问

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

</div>

---

## 简介

这是 [vercel-labs/skills find-skills](https://github.com/vercel-labs/skills) 的 Windows 兼容版本，修复了在 Claude Code on Windows 中搜索无输出的问题。

## 问题

在 Windows 上，Claude Code 使用的 Bash/Git Bash 环境无法正确处理 `npx skills` 命令——命令执行后没有任何输出。

```bash
# ❌ 在 Windows 的 Claude Code 中没有输出
npx skills find "react"
```

## 解决方案

这个 fork 修改了 SKILL.md，让 Claude Code 使用 PowerShell 来运行 skills 命令：

```bash
# ✅ 在 Windows 上正常工作
powershell -Command "npx skills find 'react'"
```

## 安装方法

### 从 Kim Service 直接安装（推荐）

```bash
powershell -Command "npx skills add KimYx0207/Kim_Service@find-skill -a codex"
```

该示例安装到当前项目的 Codex；需要其他 Agent 时，用精确批准的 Agent 替换 `codex`。用户级安装需要单独确认并添加 `-g`；不要添加 `-y`。

Kim Service 是该公开包的维护与发布源；旧独立仓库只用于记录导入快照的来源。

### 手动安装

```powershell
git clone --depth 1 https://github.com/KimYx0207/Kim_Service.git
New-Item -ItemType Directory -Path "$env:USERPROFILE\.agents\skills\find-skill" -Force
Copy-Item "Kim_Service\skills\find-skill\SKILL.md" "$env:USERPROFILE\.agents\skills\find-skill\SKILL.md" -Force
```

### 重启 Claude Code

关闭并重新打开 Claude Code。

### 验证

对 Claude Code 说："帮我搜索一个数据分析的 skill"

如果看到搜索结果，说明安装成功。

## 使用示例

安装后，对 Claude Code 说：

- "帮我搜索一个 react 的 skill"
- "find a skill for code review"
- "搜索 skill data analysis"

## 文件结构

```
findskill/
├── SKILL.md            # 合并后的 skill（Windows 兼容）
├── README.md           # 英文文档
├── README_CN.md        # 中文文档（本文）
└── LICENSE             # MIT 许可证
```

## 主要特性

1. **Windows 兼容性** - 所有命令使用 PowerShell 而非 Bash
2. **双语支持** - 中英文说明
3. **中文关键词对照** - 内置搜索关键词翻译表
4. **故障排除** - 常见问题与解决方案

## 已知限制

1. **搜索只支持英文关键词** - 中文查询需要 AI 翻译
2. **触发依赖语义** - 同样的话有时候触发，有时候不触发。加上 "skill" 这个词更容易触发。
3. **Windows 优化** - macOS/Linux 用户建议使用原版

## 三个大坑

### 坑1：搜索只支持英文

```bash
# ❌ 中文搜索没有结果
npx skills find 数据分析

# ✅ 用英文关键词
powershell -Command "npx skills find 'data analysis'"
```

### 坑2：触发不稳定

因为 AI 是语义理解的，同样的话有时候触发，有时候不触发。

```
⚠️ "帮我找个做数据分析的工具" → 可能触发，也可能不触发
✅ "帮我搜索一个数据分析的 skill" → 更容易触发
```

**建议**：想稳定触发，话里带上 "skill" 这个词。

### 坑3：Windows 上原版不能用

原版在 Windows 的 Claude Code 中完全不能用，这就是为什么需要这个 fork。

## 中英文关键词对照

| 你想做的事 | 搜索关键词 |
|-----------|-----------|
| 数据分析 | data analysis |
| 做PPT | ppt, presentation |
| 写文章 | writing |
| 代码审查 | code review |
| 部署上线 | deploy, deployment |
| 写测试 | testing |
| 做视频 | video, remotion |
| 图片生成 | image generation, dalle |
| API文档 | api docs, openapi |

## 常见问题

**Q：搜索没有结果？**
A：用英文关键词，中文搜索不支持。

**Q：Windows 上没有输出？**
A：用这个 Windows 版本替换原版。

**Q：怎么验证安装成功？**
A：项目级运行 `powershell -Command "npx skills list"`，用户级运行 `powershell -Command "npx skills list -g"`；在已批准的范围看到 `find-skill` 即成功。

## 致谢

- 原版：[vercel-labs/skills](https://github.com/vercel-labs/skills)
- 旧导入快照：[KimYx0207/findskill](https://github.com/KimYx0207/findskill)（仅作为 provenance）
- Windows 修复及增强：[@KimYx0207](https://github.com/KimYx0207)

## 许可证

MIT（与原版相同）
