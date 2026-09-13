[中文](./README.md) | [English](./README_EN.md)

# Semgrep 本地安全扫描 Skill

这是一个使用随组件发布的本地 Semgrep 规则进行静态分析和密钥模式检查的 Claude Code Skill。默认行为是只读、离线、不上传代码、不自动修复。

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/KimYx0207/Kim_Service)
[![Version](https://img.shields.io/badge/Claude_Code-2.1.39-green.svg)](https://github.com/KimYx0207/Kim_Service)

## 能力边界

当前本地规则只检查：

- 常见变量名后的疑似硬编码凭据；
- Python `subprocess(..., shell=True)`；
- JavaScript / TypeScript `eval(...)`。

扫描通过只代表这些本地规则没有命中，不等于完整安全审计。默认不使用 `--config auto`、`p/*`、Semgrep Registry 或 Semgrep Cloud，也不会登录、上传、下载规则或写入被扫描项目。

Semgrep 必须已经由用户自行安装。组件安装器只安装 Skill，不会运行 `pip` 或其他包管理器。

## 使用

在 Claude Code 中说：

```text
用 semgrep-skill 本地扫描这个项目
```

Skill 会解析自己的安装目录，并使用：

```bash
semgrep scan --config "<skill-dir>/rules/local-security.yml" --metrics off --disable-version-check --json "<target>"
```

结果只报告规则、文件、行号、严重程度和脱敏说明。修复建议只是文字建议；修改源码属于另一项需要授权的任务。

## 安装器安全模型

安装器必须显式选择作用域，并且默认只预览：

```powershell
# 项目级 dry-run（不写文件）
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project

# 人工确认后应用
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project -Apply

# 用户级 dry-run / 应用
.\install.ps1 -Scope User
.\install.ps1 -Scope User -Apply

# 预览回滚 / 确认后回滚
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project -Rollback
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project -Rollback -Apply
```

macOS / Linux 使用相同参数名：

```bash
./install.sh --scope project --project-root /path/to/project
./install.sh --scope project --project-root /path/to/project --apply
./install.sh --scope project --project-root /path/to/project --rollback --apply
```

安装器具备以下约束：

- `--apply` / `-Apply` 是所有写操作的显式授权；
- 项目级写入 `.claude/skills/semgrep-skill`，用户级写入 `~/.claude/skills/semgrep-skill`；
- 每次安装记录文件实际 SHA-256 和聚合 `targetHash`；
- 升级前保留经过 receipt 验证的旧安装，之后仍可回滚；
- receipt 写入或交换失败时保留/恢复原安装；
- 目标存在未知文件、文件被修改、receipt 缺失或路径包含链接时拒绝覆盖；
- 不触碰旧的 `code-security` 目录。

## 从 `code-security` 迁移

组件目录和 catalog 标识一直是 `semgrep-skill`，现在 frontmatter `name` 也统一为 `semgrep-skill`。旧 `/code-security` 名称不再由新版本发布。

为了避免覆盖未知用户内容，安装器不会自动移动或删除 `~/.claude/skills/code-security` 或项目里的同名目录。先按上述命令安装并验证 `/semgrep-skill`，再由用户单独决定是否保留旧目录。

## 测试

```powershell
python -m unittest discover -s tests -p "test_*.py" -v
```

行为测试会在 Semgrep 可执行时运行真实本地规则扫描；未安装时明确跳过该用例。安装器测试覆盖 dry-run、实际 hash receipt、未知内容拒绝、升级回滚和 receipt 失败事务恢复。

## 来源与许可证

该组件最初从 [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep) 导入。当前维护版本以 Kim Service 中的 `skills/semgrep-skill/` 为准，使用 MIT License。
