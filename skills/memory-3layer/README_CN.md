<h1 align="center">三层记忆（Memory 3-Layer）</h1>

<p align="center">给长期 Agent 工作一套结构清晰、可检查、可迁移的项目记忆。</p>

Memory 3-Layer 把项目知识保存在 `.memory-3layer/` 的三个生命周期层中。Claude Code 与 Codex 提供自动 Hook 适配；其他支持 Agent Skills 的宿主使用同一手动核心。本项目不会把“能读取 Skill”夸大成“所有平台都能自动记忆”。

English documentation: [README.md](README.md).

## 它解决什么

- **Layer 1：结构化事实。** 按 topic 保存 JSON，支持 `active` / `superseded` 生命周期。
- **Layer 2：每日轨迹。** 按日期追加 Markdown，保留近期工作与时间上下文。
- **Layer 3：隐性知识。** 保存经过人工确认、值得跨会话保留的经验。
- **平台中立数据。** 两个自动适配器都写 `.memory-3layer/`，不把数据绑在某个厂商目录里。
- **可控加载。** 最近天数和 active 条目数都可配置，避免历史无限挤占上下文。
- **显式记录。** 用户确认的事实通过 `scripts/record_memory.py` 写入；普通工具输出绝不会被静默提升成记忆。

## 能力矩阵

| 平台 | Agent Skill | 自动生命周期 | 使用前提 |
|---|---|---|---|
| Claude Code | 支持 | `SessionStart`、`PostToolUse`、`PreCompact` 适配 | 启用合并后的项目 Hooks |
| Codex | 支持 | Codex Hooks 适配到同一核心 | 运行 `/hooks`，审查并信任项目 Hooks |
| 其他 Agent Skills 宿主 | 取决于宿主 | 不支持 | 使用 manual 核心 |

“提供自动适配器”不等于“运行时已经验证”。只有真实宿主事件被观察到后，才能声称自动链路已生效。

## 从 Kim Service 安装

当前公开包位于 [`Kim_Service/skills/memory-3layer`](https://github.com/KimYx0207/Kim_Service/tree/main/skills/memory-3layer)。先克隆合集并进入该目录：

```bash
git clone https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service/skills/memory-3layer
```

然后运行：

Windows：

```powershell
$ProjectDir = (Resolve-Path "..\你的目标项目").Path
.\install.ps1 -ProjectDir $ProjectDir -Platform auto
```

macOS / Linux：

```bash
chmod +x install.sh
./install.sh --project-dir /你的/目标项目 --platform auto
```

目标项目参数是必填项：安装器不会把 Kim Service 克隆目录猜成你的业务项目。可选模式：`auto`、`claude`、`codex`、`both`、`manual`。`auto` 会检测两个已支持宿主；都不存在时只初始化 manual 核心。安装器合并现有 Hook 配置，不覆盖用户已有条目。

Codex 安装后还没有结束：先运行 `/hooks`，检查命令与路径，再明确选择信任项目 Hooks。

## 默认数据结构

```text
.memory-3layer/
├── MEMORY.md
├── memory/YYYY-MM-DD.md
├── areas/topics/<topic>/items.json
└── data/session_state.json
```

可用 `MEMORY_DIR` 覆盖根目录。数据流见 [架构说明](docs/architecture.md)。

## 旧版迁移

旧 `.claude/memory/` 只作为迁移来源读取，新内容默认写入 `.memory-3layer/`。

```bash
python scripts/migrate_legacy_memory.py --project-dir /你的/目标项目
```

迁移只复制识别到的数据，冲突时跳过，不覆盖目标，也绝不删除旧目录。完整规则见 [迁移文档](references/migration.md)。

## 运行合同

每个步骤都必须写清输入、动作、可观察输出、转移条件和失败路线：

1. 确认项目、宿主、数据路径和写入权限。
2. 初始化或显式迁移，不覆盖用户已有数据。
3. 按 Layer 3 → Layer 2 → Layer 1 进行预算内加载。
4. 脱敏、分类、去重后只保存可信事实。
5. 冲突内容先复查，再改变生命周期状态。
6. 分开报告文件、适配器和真实运行证据。

六类边界分别是：非目标、事实来源、权限、副作用、停止条件和降级行为。详见 [SKILL.md](SKILL.md) 与 [运行合同](references/operating-contract.md)。

## 验证

```bash
python scripts/check_memory_3layer.py
python -m unittest discover -s evals -p "test_*.py"
```

这些命令验证包结构和适配行为，不能替代真实 Claude Code 会话或已信任的 Codex Hook 事件。

不依赖某个平台的自然语言协议，也可以显式记录一条已确认事实：

```bash
python scripts/record_memory.py --project-dir /你的/目标项目 --fact "这个项目统一使用 pnpm" --topic workflow
```

## 文档

- [快速开始](docs/quickstart.md)
- [架构](docs/architecture.md)
- [平台支持](docs/platform-support.md)
- [Runtime 适配与信任](references/runtime-adapters.md)
- [旧版迁移](references/migration.md)

## 当前来源与历史

当前发布源：[`KimYx0207/Kim_Service/skills/memory-3layer`](https://github.com/KimYx0207/Kim_Service/tree/main/skills/memory-3layer)。

旧 [`KimYx0207/claude-memory-3layer`](https://github.com/KimYx0207/claude-memory-3layer) 仓库仅保留历史 provenance，不再作为当前安装源，也不能用来证明跨平台能力。

## 许可证

MIT，详见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

## 联系方式

<p align="center">
  <img src="docs/images/contact-qr.png" width="720" alt="联系二维码">
</p>

## 支持项目

<table align="center">
  <tr>
    <th align="center">微信支付</th>
    <th align="center">支付宝</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" width="260" alt="微信收款码"></td>
    <td align="center"><img src="docs/images/alipay.jpg" width="260" alt="支付宝收款码"></td>
  </tr>
</table>

公司事项经验：按 [operating-contract](references/operating-contract.md) 的候选模板在现有治理输出中保留版本、采用理由、失败/拒用、适用/过期及实际复用反馈。公司私有经验先留内部，公共方法需脱敏和验证。存储、加载器与调度能力保持原实现。
