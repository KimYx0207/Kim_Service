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

部分 Windows 的 shell、Node 和 CLI 组合曾出现无输出。先核实当前环境、退出码与网络，不能据此断言所有 Git Bash 都不支持。

```bash
# 先观察当前环境的真实输出与退出码
npx skills find "react"
```

## 解决方案

本包保留 PowerShell 作为当前 shell 实际失败后的兼容路线：

```bash
# 可尝试的兼容路线，仍需在本机确认
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

1. **Windows 兼容性** - 实际遇到 shell 问题时可用 PowerShell，不假设所有 Bash 都失败
2. **双语支持** - 中英文说明
3. **中文关键词对照** - 内置搜索关键词翻译表
4. **故障排除** - 常见问题与解决方案

## 已知限制

1. **搜索覆盖存在差异** - 可增加相关英文翻译查询；中文空结果不证明只支持英文
2. **触发依赖语义** - 同样的话有时候触发，有时候不触发。加上 "skill" 这个词更容易触发。
3. **Windows 优化** - macOS/Linux 用户建议使用原版

## 三个大坑

### 坑1：把一次空结果当作能力不存在

```bash
# 本次中文查询应先确认执行完成
npx skills find 数据分析

# 可增加英文近义词扩展召回
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
A：先确认查询成功完成，再尝试相关英文翻译；超时或不可解析输出应报告搜索失败，不说能力不存在。

**Q：Windows 上没有输出？**
A：检查当前 Node/npx、CLI 帮助和网络；当前 shell 失败时尝试 PowerShell 并保留失败原因。

**Q：怎么验证安装成功？**
A：先列出已批准作用域，再回读实际目标入口和所有引用资源，核对审查过的来源版本。列表出现只证明发现，宿主触发与业务效果需另行实际观察。

## 致谢

- 原版：[vercel-labs/skills](https://github.com/vercel-labs/skills)
- 旧导入快照：[KimYx0207/findskill](https://github.com/KimYx0207/findskill)（仅作为 provenance）
- Windows 修复及增强：[@KimYx0207](https://github.com/KimYx0207)

## 许可证

MIT（与原版相同）
