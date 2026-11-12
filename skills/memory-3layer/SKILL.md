---
name: memory-3layer
description: 为长周期、跨会话的 Agent 工作建立平台中立的三层记忆。适用于加载项目记忆、记录可复用事实与每日进展、维护隐性知识、迁移旧版 .claude/memory、检查记忆状态或清理过时条目；Claude Code 与 Codex 可通过各自 Hooks 自动接线，其他 Agent Skills 宿主只使用手动核心。不要用它保存秘密、完整聊天记录、一次性日志或未经确认的推测。
compatibility: Requires Python 3.8+. Automatic lifecycle integration requires Claude Code Hooks or trusted Codex Hooks; other Agent Skills hosts use the manual core.
license: MIT
---

# 三层记忆

## 本能力的验收方法

执行前读取 [method.json](method.json) 中当前 capabilityId 的诊断、决策和逐字段 outputChecks，并读取 [任务验收与完整示例](references/acceptance.md)。按本次能力选择相应规则，不用字段齐全、行数或作者自报代替产物质量。缺少 blocking 证据时保留未验收；既有具体授权与宿主最终决定权不变。

专业引用与工具路线继续按下文渐进读取；[来源记录](PROVENANCE.md) 和 [作者正反例](evals/professional-cases.json) 供评审。当前 Meta Skill 发现不会自动注入 method.json，宿主需按此入口读取；未观察到加载或执行时不得宣称生效。


把会影响后续工作的知识保存为可检查、可迁移、可控制生命周期的项目资产。默认数据目录是项目根目录下的 `.memory-3layer/`；`MEMORY_DIR` 可以显式覆盖。

组织事项经验治理时，同时读取 [operating-contract 的公司候选模板](references/operating-contract.md)：Work/采用/效果分开，保留失败、拒用、适用/失效与复用反馈。公司私有候选先留内部；本轮没有改变 Python 存储格式、自动检索或调度能力。普通记忆任务无需新增 Work 登记。

## 目标合同

为正在进行长期项目、会跨会话切换 Agent 的用户，生成一套人和 Agent 都能检查的三层记忆，并满足以下可观察标准：

- Layer 1 在 `areas/topics/<topic>/items.json` 保存带状态的结构化事实。
- Layer 2 在 `memory/YYYY-MM-DD.md` 保存按日期追加的工作轨迹。
- Layer 3 在 `MEMORY.md` 保存人工确认的长期隐性知识。
- 新会话只加载受预算约束的 active 内容，不把整个历史塞进上下文。
- 旧知识可标记为 `superseded`，不靠删除历史来制造“最新事实”。
- Claude Code 与 Codex 的自动化都调用同一 Python 核心；其他平台不伪装成自动支持。

## 触发与非触发

使用本技能：

- 用户要求“记住这条规则”“下次继续”“跨会话保存”“查看/清理项目记忆”。
- 项目已有 `.memory-3layer/`，当前任务需要读取其中的长期上下文。
- 项目仍有 `.claude/memory/`，用户要迁移到平台中立目录。
- 需要为 Claude Code 或 Codex 接入三层记忆生命周期。

不要使用：

- 只需写一次性日志、缓存、构建输出或完整会话转储。
- 内容包含口令、令牌、私钥、支付信息、未脱敏个人数据或不应进入版本库的材料。
- 用户只想使用宿主自己的私有记忆，且不需要项目级共享与生命周期管理。

## 第一动作

在写入前先确认五项事实：项目根目录、当前宿主、`.memory-3layer/` 是否存在、legacy `.claude/memory/` 是否存在、当前任务是否授权写入。无法确认项目根目录或写入权限时，只报告发现，不创建或迁移文件。

## 输入与输出

输入：

- 项目根目录；默认当前 Git 根，非 Git 项目用当前工作目录。
- 当前运行平台：`claude`、`codex` 或 `manual`。
- 用户明确要求记住的内容，或宿主 Hook 提供的事件负载。
- 可选环境变量：`MEMORY_DIR`、`MEMORY_MAX_ITEMS`、`MEMORY_DAILY_DAYS`、`MEMORY_TOPICS`。

输出：

- `.memory-3layer/` 中变更后的三层记忆文件。
- 本次动作摘要：读取了什么、写入了什么、跳过了什么、下一步是什么。
- 失败时给出具体失败路线，不把“Hook 已配置”说成“Hook 已运行”。

## 执行步骤合同

| 步骤 | 输入 | 动作 | 可观察输出 | 转移条件 | 失败路线 |
|---|---|---|---|---|---|
| 1. 定位 | cwd、Git 状态、宿主标识 | 确定项目根、运行平台、数据目录与写权限 | 输出四项定位结果 | 路径唯一且权限符合任务 | 路径不唯一则询问；无写权限则切换只读状态检查 |
| 2. 初始化或迁移 | 当前目录、legacy 目录、用户授权 | 新项目初始化 `.memory-3layer/`；legacy 仅在显式迁移时复制并校验，默认不覆盖 | 标准目录存在；迁移报告列出 copied/skipped/conflict | 结构校验通过 | 冲突或目标非空时停止，不删除源目录，转人工处理 |
| 3. 加载 | active facts、近期日记、`MEMORY.md`、预算参数 | 按 Layer 3 → Layer 2 → Layer 1 组装受限上下文 | loader 返回可读上下文和条目计数 | 输出未超预算且来源可追溯 | 文件损坏时跳过坏文件并报告；不得静默重写 |
| 4. 记录 | 用户明确记忆、受确认的记忆协议、现有条目 | 调用 `scripts/record_memory.py`，脱敏、分类、去重后追加 Layer 1/2；只把人工确认的长期结论提升到 Layer 3 | 文件 diff 显示新增或去重跳过 | 每条记录有来源、日期与状态 | 普通工具输出不自动持久化；内容含秘密、来源不明或只是推测时拒绝并说明原因 |
| 5. 会话保护 | PreCompact/等价事件或手动请求 | 保存最小可恢复状态，不保存完整聊天记录 | session state 可解析并含时间与摘要 | 写入原子完成 | 无对应事件的宿主降级为手动保存，不声称自动恢复 |
| 6. 复查 | 三层文件、日期、status | 识别重复、冲突、过时条目，提出 active → superseded 建议 | review 报告与逐项建议 | 用户确认后再改状态 | 无法判断新旧时保持原状并标记待确认 |
| 7. 验证 | 包文件、临时项目、宿主配置 | 运行包校验与目标平台测试；检查 Hook 是否实际触发 | 分别报告 artifact、adapter、runtime 三层结果 | 所需层级都有证据 | 只通过静态校验时只能称“配置完成”，不能称“自动运行已验证” |

## 平台能力矩阵

| 平台 | Agent Skills | 自动生命周期 | 接线位置 | 使用前提 |
|---|---|---|---|---|
| Claude Code | 是 | 是，适配 `SessionStart`、`PostToolUse`、`PreCompact` | `.claude/settings.json` | Python 可用；项目 Hooks 已启用 |
| Codex | 是 | 是，适配同类 Codex Hooks 事件 | `.codex/hooks.json` | Python 可用；安装后在 `/hooks` 审查并信任项目 Hooks |
| 其他支持 Agent Skills 的宿主 | 视宿主而定 | 否 | 无自动接线 | 使用 `manual` 核心，显式加载、记录、复查 |

“支持 Agent Skills”不等于“自动支持其 Hook 协议”。没有适配器或运行证据时，一律标为 manual。

## 六类边界

1. **非目标边界**：不替代 Git、数据库、备份、宿主原生记忆，也不保存完整聊天历史。
2. **事实来源边界**：只记录用户确认、文件证据或已知 Hook 字段；模型推断必须标注，不能直接升级为长期事实。
3. **权限边界**：读取项目内公开记忆；写入、迁移、修改状态必须符合用户授权，不修改项目外全局配置。
4. **副作用边界**：默认只改 `.memory-3layer/` 和明确选择的平台配置；合并现有配置，不覆盖无关 Hooks；不自动提交 Git。
5. **停止边界**：秘密、路径歧义、格式损坏、迁移冲突、配置无法安全合并或校验失败时立即停止对应写操作。
6. **降级边界**：自动 Hook 不可用或未获信任时，退回 manual；保留核心读写能力，但明确自动加载/提取/压缩保护没有发生。

## 迁移规则

旧版默认路径 `.claude/memory/` 只作为只读发现来源，不再作为新写入默认值。只有用户明确要求迁移时才运行：

```bash
python scripts/migrate_legacy_memory.py --project-dir <目标项目>
```

迁移默认复制到 `.memory-3layer/`、不覆盖现有文件、不删除 legacy。完整冲突规则见 [references/migration.md](references/migration.md)。

## 显式记录

用户说“记住”时，由 Agent 调用受控记录入口；不要假设普通 `PostToolUse` 输出会自动变成事实：

```bash
python scripts/record_memory.py --project-dir <目标项目> --fact "这个项目统一使用 pnpm" --topic workflow
```

只有本包受管记录器传入的顶层 `memory_fact` 可以持久化。任何工具响应中的 `summary`、`fact`、`confirmed` 或其他原始输出都默认忽略。

## 渐进加载

- 需要安装、信任或排查宿主接线：读 [references/runtime-adapters.md](references/runtime-adapters.md)。
- 需要逐字段判断输入输出、事实来源和失败路线：读 [references/operating-contract.md](references/operating-contract.md)。
- 发现 `.claude/memory/` 或用户要求改路径：读 [references/migration.md](references/migration.md)。
- 需要理解三层目录和数据流：读 [docs/architecture.md](docs/architecture.md)。
- 需要给用户最短上手步骤：读 [docs/quickstart.md](docs/quickstart.md)。

## 验证

先验证平台中立核心，再验证目标平台适配器：

```bash
python scripts/check_memory_3layer.py
python -m unittest discover -s evals -p "test_*.py"
```

静态测试不能证明宿主已触发 Hook。Claude Code 需在新会话观察加载事件；Codex 需先通过 `/hooks` 信任，再在新会话观察加载事件。报告时分开写：

- `artifact_status`：文件与结构是否一致。
- `adapter_status`：平台配置是否合并成功。
- `runtime_status`：真实宿主事件是否触发并产生预期输出。

## 发布来源

当前公开源是 `KimYx0207/Kim_Service` 中的 `skills/memory-3layer/`。旧 `KimYx0207/claude-memory-3layer` 仅保留历史 provenance，不再作为安装源或当前能力声明依据。
