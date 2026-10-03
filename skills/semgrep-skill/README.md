[中文](./README.md) | [English](./README_EN.md)

# Semgrep 本地安全扫描 Skill

这是现有 Semgrep Skill 的结构化本地调用入口。组件版本 **1.1.0**；宿主必须已安装可信 Semgrep，调用者必须提供已授权的绝对 `workspaceRoot` 与其内的目录 `target`。入口不默认扫描当前项目。

## 使用与结果

`capability.json` 是输入输出与 invocation 的权威合同。宿主从现有索引选中包并核 hash 后，再读取包合同；生成索引不透传 invocation，也不自动授权执行。

```json
{"schemaVersion":1,"workspaceRoot":"C:\\authorized\\project","target":"src"}
```

将该对象通过标准输入送给唯一入口：

```bash
python "<skill-dir>/scripts/scan.py" --input-json -
```

也可显式使用 `--workspace-root <absolute-root> --target <directory>`；可选 rules 只能是 `rules/local-security.yml`。不接受额外 Semgrep flags、远程配置、执行文件选择或隐含目标。

运行前从原规则文件提取两条非密钥规则：Python shell=True 与 JavaScript/TypeScript eval，记录原始和有效配置 SHA-256。旧密钥规则保留来源，不被这个能力执行。仅报告规则、相对路径、位置、严重程度及本地规则说明；不输出源码、匹配值或 raw stderr。

`completed` 表示选中文件都完成扫描，发现问题仍退出0；其他状态 `partial/invalid_input/unavailable/failed` 均返回 completed:false 并退出2。未安装工具明确 unavailable，不代装。无命中不等于完整安全审计。

## 边界

只选可见 py/js/jsx/ts/tsx；隐藏文件/目录及 node_modules、__pycache__、venv、vendor 不在覆盖内。拒绝链接或重解析点；最多512个选中文件、每个1MiB。运行/输出安全上限集中在 scripts/scan.py，业务调用不能放宽。

版本探测和扫描都关闭 metrics/version check，隔离设置、日志及缓存，采用最小子进程环境，不继承 token、proxy、调用者 PYTHONPATH 或自定义 Semgrep 配置。为已安装 Python runtime 可保留 Windows APPDATA 与计算出的 user base/site；后者使隔离 APPDATA 时仍能初始化已安装的 pywin32 等运行依赖。networkUsed:false 依据这些执行约束，不代表网络抓包或系统级断网证明；filesModified:false 指目标源码不被修改，临时运行文件在目标外清理。要求可信现有安装和稳定文件系统，不提供恶意 binary 或并发路径替换隔离保证。

修复建议仅为文本。扫描、安装 Skill、安装 Semgrep、修改源码是不同权限。

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

行为测试只用合成夹具调用真实包装器与已安装 Semgrep；未安装时明确 skip，不能记成实测通过。协议测试覆盖越界/链接、环境隔离、密钥规则排除、漏扫、失败和输出脱敏；安装器测试验证投影带合同与可运行入口，并保留事务检查。

## 来源与许可证

该组件最初从 [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep) 导入。当前维护版本以 Kim Service 中的 `skills/semgrep-skill/` 为准，使用 MIT License。
