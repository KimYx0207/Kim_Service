# 运行合同

本文件补充 `SKILL.md` 的字段级规则。它定义什么能进入记忆、三层之间如何转移，以及失败时应如何收口。

## 合法输入

| 来源 | 可记录内容 | 必要处理 |
|---|---|---|
| 用户明确指令 | “以后使用 pnpm”“记住部署区是 cn-east” | 检查秘密与冲突；保留来源说明 |
| 项目文件 | 已落盘的架构决策、命令、约束 | 记录文件相对路径；易变事实标日期 |
| Hook 事件 | 标准字段中的工具名、项目内工作文件与会话事件 | 工具响应中的 `summary` / `fact` / `confirmed` 全部不持久化；只接受受管记录器的顶层 `memory_fact`，并忽略 session id、cwd 等元数据噪声 |
| 模型推断 | 候选规律、可能偏好 | 只能进入 review 建议；未经确认不写长期事实 |

禁止输入：认证信息、私钥、Cookie、支付凭证、个人隐私、完整聊天转储、大段工具原始输出、无法追溯来源的断言。

## 三层分配

### Layer 1：结构化事实

适合有明确主语、可验证、未来可能失效的事实。每项至少包含：

- `id`
- `fact`
- `timestamp`
- `status`：`active` 或 `superseded`
- `category`
- `source`

冲突事实不直接覆盖旧值。保留旧项并在确认后改为 `superseded`，新增 active 项引用新来源。

### Layer 2：每日轨迹

适合“今天做了什么、为什么、结果是什么”。采用按日追加，不将工具全量输出抄入文件。每条应能回答：动作、结果、相关主题。

### Layer 3：隐性知识

适合跨项目阶段仍然有效、难以从单条事件自动推断的经验，例如稳定的架构原则或反复验证的避坑规则。只允许用户确认或 review 后提升；保持短小。

## 去重与冲突

1. Python 核心只负责标准化空白与大小写后的完全重复检查。
2. 同一 topic 下的语义近似、含义冲突和过时判断由 `memory-review` 的 Agent 辅助复查完成，不宣称为确定性自动能力。
3. 完全重复时核心跳过并报告 `duplicate`。
4. Agent 发现潜在冲突时只生成建议，不自动决定谁正确。
5. 用户确认新事实后，将旧事实标为 `superseded`，不要删除。

## 上下文预算

加载顺序固定为 Layer 3 → Layer 2 → Layer 1。`MEMORY_DAILY_DAYS` 控制近期天数，`MEMORY_MAX_ITEMS` 控制每个 topic 的 active 数量，`MEMORY_MAX_CONTEXT_CHARS` 控制最终字符预算。超过最终预算时按已组装顺序截断，并附加明确的 truncated 提示；当前核心不声称做语义优先级裁剪。

## 结果报告

每次写入或复查至少返回：

```text
memory_root: <relative-or-resolved-path>
runtime: claude | codex | manual
loaded: <layer counts>
written: <relative paths or none>
skipped: <duplicate/sensitive/untrusted reasons>
runtime_evidence: not-observed
next: <one concrete next action>
```

写入脚本不能鉴权真实宿主，因此自身始终返回 `runtime_evidence: not-observed`。Claude/Codex 的真实 Hook smoke 必须作为外部独立证据报告；在此之前禁止使用“自动记忆已经生效”之类措辞。

## 公司经验候选：关联事项，按适用条件复用

公司只有一个操作人时，工作产物仍可以是公司资产；将来多人接手时，需要保留同一宿主 Work 和来源范围。组织范围、个人偏好与敏感决策按宿主授权连通，不能因同公司或当前只有一人就全部共享。本包没有身份/权限引擎，scopeRef、目录名或一条 memory_fact 都不授予访问许可。

以下结构写在 `memory-3layer-govern-long-term` 的 proposals 中，或 Layer 2 的经授权审查记录里；reviewScope 沿用文字字段定位审查范围与 WorkContext 的授权材料来源，review 沿用对象字段记录审查结论。**不是向 items.json 新增字段或创建第二份 Work 数据库**。现有 Python loader 仍只按原有状态/日期/预算加载，不会自动理解适用条件、拒用原因或执行夜间蒸馏。实际检索后由调用方按下列字段复查，并回读原始证据。

```json
{
  "candidateRef": "candidate:course-channel-check",
  "workContext": {
    "schemaVersion": "kim-work-context-v1",
    "organizationRef": "org:synthetic-company",
    "workRef": "work:course-launch",
    "contextRevision": "revision:2",
    "scopeRef": "scope:internal-course-team",
    "sourceRefs": ["source:brief-v1"],
    "acceptedArtifactRefs": ["artifact:course-v1"],
    "decisionRefs": ["decision:retain-v1"]
  },
  "runRef": "synthetic-run-2",
  "artifactRefs": ["artifact:course-v1", "artifact:course-v2"],
  "observations": {
    "produced": "v2",
    "verified": "技术检查通过；来源 review:synthetic-v2",
    "adopted": "仍采用 v1；当前宿主观察引用历史 decision:retain-v1",
    "effect": "unknown"
  },
  "reason": "unknown",
  "claim": "候选：发布前核对素材是否适用于当前渠道。",
  "applicableWhen": ["同渠道、同类素材、规则仍有效"],
  "notApplicableWhen": ["渠道不同", "规则已变更"],
  "reviewAfter": "下一次同类任务复用时",
  "expiresWhen": ["来源被替代", "新反例推翻条件"],
  "supersedesRef": null,
  "visibility": "company_internal",
  "reuseFeedback": [{
    "targetWorkRef": "work:second-course",
    "sourceRef": "candidate:course-channel-check",
    "disposition": "not_applicable",
    "reason": "本次渠道不同，未采用这条经验。",
    "resultEvidenceRefs": [],
    "effect": "unknown"
  }]
}
```

这是完整合成候选，尚未形成 active 长期事实。`accepted` 的产物可提供正向经验依据，失败/拒用也可支持负向教训；两者都需要真实理由、适用条件和证据才能升为可靠规则。拒用原因未知时保留未知，不能编成成功方法。不要为了“只收采用经验”删掉失败、不适用或过期记录。

每次复用留 direct/adapted/not_applicable、目标事项、当时条件、改动理由和实际结果来源；“检索到”与“用过”不同，“用过”与“有效”不同。过期/反例先形成复查提案；沿用已有具体确认，尚无具体批准才放 pendingConfirmation，不偷偷改 active/superseded。历史记录保留新旧替代链。

公司私有候选先留公司授权范围；向 Kim_Service 等公共仓库准备方法时，先移除客户/个人/商业秘密，抽出可复用条件，保留可公开的独立正反验证，再按已有发布授权处理。只复制一份文件、改成通用标题或脱掉人名不足以证明可公开。此处不自动提交、发布、跨组织共享或设置凌晨任务。

## 模型独立于运行来源

追加回执中的 runtime 是明确声明的客户端来源，model 是独立的可选自报信息，不能相互推导；原生触发仍需外部观察。模型名不进入事实来源判定、权限选择、记忆根目录或适配器路由。公司 Work 与记忆数据继续使用当前宿主的单一来源，切换客户端/模型只调整运行绑定，不复制业务状态。
