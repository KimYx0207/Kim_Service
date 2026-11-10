# Evaluation Method

如何评估你用 `meta-skill-creator` 造出的 skill 是否真的有用，而不是一个长 prompt。首次发布时这里写的是评估契约；后续每次重要编辑后跑一遍，把失败写回对应 reference。

## 何时评估

- 造完一个新 skill，发布前。
- 改过 skill 的 trigger、references 或 scripts 之后。
- 准备声称 ready 之前。
- 用户要求闭环、复盘、持续改进或公开交付前。

## 1. Trigger 评估

用 `evals/trigger-eval.json` 跑触发测试，覆盖四类用例：

- should-trigger：明确该用本 skill 的场景。
- should-not-trigger：相邻但不该触发的任务。
- near-miss：模糊边界，需要判定。
- ambiguous：信息不足，需要澄清。

检查 description 是否精准触发、不误触相邻任务。description 太泛则永不触发，太宽则乱触发。

## 2. Output 评估

对模糊输入、不完整输入、高风险输入、真实素材输入跑 skill，检查输出：

- 是否以 Domain Research Brief 开头。**No Domain Research Brief = 不通过**。
- 是否从证据推导 surface，而不是从熟悉例子猜。**Surface guessed = Hard Cap**。
- 是否产出用户可见的最终 artifact。
- 未知领域是否在尝试证据检索后再返回 `research-needed`（**Unknown Domain Research Test**：先检索后停）。
- 多模态 skill 是否先按产物的精度、编辑性与用途选择工具、探测能力并写结构化 brief（**Multimodal Tool Route Regression**：只有栅格创意图应用 Image2/host-native 优先与 MCP 降级证据；精确图表、可编辑文件和原生界面走自身主路径）。
- 是否在没有真实输出证据时硬说 ready。

### Contract Clarity Gate

- **Goal unclear**：目标缺用户/压力场景、最终产物、可观察成功标准或非目标，直接不通过。
- **Execution step opaque**：任一步骤缺进入条件、具体动作、可观察输出、转移条件或失败路线，不能声称可执行。
- **Boundary incomplete**：scope、truth、authority、side effect、stop、fallback 任一类缺失，不能声称边界清晰。
- **Deep research ritualized**：只列网站、摘录或填模板，没有决策问题、来源层级、反证/冲突处理、时效、Decision Impact 和 Stop rule，不算 deep research。

## 3. Baseline 对比

同一任务跑 with-skill vs without-skill。with-skill 必须在 Domain Research、artifact chain、package completeness 上明显更好，且不降低 release honesty。如果 with-skill 不明显更好，回产品设计。

## 4. Regression 检查

编辑后对比新旧版本，确认不引入新误触发、不丢领域研究纪律、不降多模态 brief 质量。首次发布无旧版可回归，这一节是面向未来编辑的契约。

## 5. Loop Closure 检查

每次验收或失败必须检查：

- 是否填写运行记录，且包含 Intent Core、Evidence Fetch、Product Surface、Package Contract、Verification Evidence、Loop Decision。
- 是否区分 structure / contract / artifact / runtime / human 证据层级。
- 是否给出 `writeback`、`proposal`、`none-with-reason` 或 `blocked`。
- 如果选择 `writeback`，是否写回 reference、asset、script、eval 或 example，而不是只写聊天总结。
- 如果选择 `blocked`，是否说明缺哪类证据和下一轮最小动作。
- 是否有 `next_run_reuse_key`，或明确说明为什么没有可复用学习。

无闭环记录的产物最多只能判为 L2 operating candidate；无闭环决策却声称 ready，直接失败。

## 6. Satisfaction 评分（/100）

以下分数是现有工作台的诊断维度，不是跨行业专家认证。运行前按实际任务冻结适用判据与不可抵消的关键项；错误数据、缺少用户最终产物或越过权限均不能由总分抵消。文件数量、入口行数和字数只反映包装成本。纯文字技能不必为了凑资产而新增脚本；相应维度按是否存在真实复用需要解释，不能机械扣分或堆文件。

| 维度 | 分 | 标准 |
|---|---:|---|
| User result definition | 8 | user / pressure / final artifact / success criteria |
| Domain Research | 13 | Brief + evidence + domain model + research-needed stop rule |
| Fetch before stop | 8 | 检索尝试 before research-needed |
| Experience surface | 8 | platform / medium / artifact chain from research |
| Skillization judgment | 8 | 为什么该 / 不该做成 skill |
| Evidence quality | 8 | 官方 / 高信号 / 用户失败 / 反证卡片 |
| Package design | 11 | 文件和资产对应 failure mode |
| Trigger eval | 8 | 正 / 负 / near-miss / ambiguous |
| Output eval | 8 | fuzzy / incomplete / risky / real-material / final artifact |
| Baseline and regression | 10 | with/without + A/B 计划 |
| Release honesty | 7 | ready 状态诚实 + next drift action 清楚 |
| Loop closure | 3 | 运行记录 + 写回/不写回决策 + next_run_reuse_key |

权重合计 = 8+13+8+8+8+8+11+8+8+10+7+3 = 100。

Hard Caps：无 Skill Contract ≤59；Goal unclear ≤59；Execution step opaque ≤64；Boundary incomplete ≤64；Deep research ritualized ≤59；无 Domain Research Brief ≤49；research-needed 前未检索 ≤59；surface 瞎猜 ≤64；无 artifact chain ≤64；无 trigger eval ≤69；无 baseline ≤74；确有复用需求却缺相应资产 ≤79；无用户最终品 ≤69；声称 ready 无可见测试 ≤84；无闭环决策 ≤79；失败无预防规则 ≤74。上限仅描述本工作台诊断，不允许把一个低于上限的关键失败解释为业务可接受。

## 7. Acceptance Run（clean-session 验收）

先用跨平台 Python 入口创建目录：

```bash
python scripts/prepare_acceptance_run.py --mode acceptance --input-file <raw-input-file>
```

Windows 上 `python` 不可用时用 `py -3`；Linux/macOS 优先 `python3`。旧 `run-acceptance.sh` / `run-baseline.sh` 只保留为 shell 兼容包装器，会探测 Python ≥3.10，不是主入口。

准备器只生成 `pending` 模板：它不能调用模型、加载 Skill、填写真实 evidence、给分或写 `Ready decision: pass`。因此刚准备好的目录运行 `check_acceptance_runs.py` **必须失败**；如果直接通过，说明门禁发生假阳性。

完整 run folder：

```text
test-results/<date>-<skill>-acceptance/
  input.md
  prompt-without-skill.txt
  prompt-with-skill.txt
  evidence-sweep.md
  tool-capability.md
  without-skill-output.md
  with-skill-output.md
  runtime-without-skill.log
  runtime-with-skill.log
  trigger-run.json
  scoring-rubric.md
  scoring-rubric.json
  reviewer-notes.md
  release-gate.md
  validation.md
  validation.log
```

目录外证据与 run folder 同级存放：

```text
test-results/
  <run-folder>/
  attestations/
    <run-id>-host-event.json
    <run-id>-host-attestation.json
    <run-id>-reviewer-attestation.json
```

run folder 内的日志和 SHA-256 只能证明文件彼此一致，不能证明宿主运行或人工审核真的发生。发生性由目录外 host event/attestation 与 reviewer attestation 提供；本地校验器验证其位置、hash 和字段绑定，但不能替代宿主或组织自己的签名/权限信任。

### Trigger-run 真实记录合同

`trigger-run.json` 使用 v2 的 `assets/trigger-run-record-template.json`，必须包含且相互绑定：

- 顶层：`run_id`、`run_type`、`status=completed`、`input_sha256`。
- 两条 route：`without-skill` 与 `with-skill`，session ID 去首尾空白并 casefold 后仍不同。
- 每条 route：宿主、session ID、起止时间、`prompt_sha256`、`output_sha256`、是否加载 Skill、是否观察到触发、外部 evidence 文件。
- without 路线必须 `skill_loaded=false`、`trigger_observed=false`；with 路线必须 `skill_loaded=true`、`trigger_observed=true` 并写明 `skill_source`。
- run 内日志副本必须包含 session、route、prompt hash 和 output hash，但不能反过来充当运行证明。
- `attestations.host` 指向 run 外 host attestation；它绑定两条 route、宿主能力和 host event anchor hash。
- `attestations.reviewer` 指向 run 外 human reviewer attestation；它绑定 reviewer、rubric hash、两份 output hash、逐维分数和行级证据。每个维度的 `evidence_refs` 必须同时包含 `without-skill-output.md#Lx[-Ly]` 与 `with-skill-output.md#Lx[-Ly]`，文件必须位于 run 内，行号/范围实际存在，引用内容非空且不含模板占位符。

clean-session prompt 只用用户原始模糊意图：`input.md`、`prompt-without-skill.txt`、`prompt-with-skill.txt` 去除首尾空白后必须完全相同。Skill 由宿主加载，不能靠 prompt 注入验收规则。

### 三层状态合同

- `structure_status=artifact_consistent`：文件、格式、同 prompt、hash、rubric 和确定性校验闭合；不证明发生性。
- `runtime_status=verified`：两个真实 session、Skill 加载/触发观察和目录外 host anchor 闭合。
- `human_status=verified`：非匿名的人类 reviewer 使用评分前冻结的机器 rubric，逐维评分、重算总分并由目录外 attestation 明确 accepted。

所有时间必须带时区、不得在未来，并满足 evidence/capability/rubric freeze → 两路 run → validation/host attestation → human review → release。只有三层精确成立且 `Ready decision: pass`，校验才返回 0。`python scripts/test_acceptance_runs.py` 的回归必须覆盖 pending、`[]` / `<>` / `()` / `{{}}` 等通用模板语法、中英文未执行词、session 空白与大小写伪分离、能力自报、目录内 attestation、未来与倒序时间、AI/Artificial Intelligence/A.I./Machine Review/自动化 reviewer、固定分数换壳、越界或空行证据、逐维合计不符、缺外部 anchor、hash 协同改写和 trigger 不一致。

## 评估字段速查

- **Trigger Eval**：should-trigger / should-not-trigger / near-miss / ambiguous / expected description changes
- **Output Eval**：fuzzy / incomplete / risky-boundary / real-material / multimodal-tool-route / final artifact scoring
- **Tool & Multimodal**：local capability inventory / native-MCP-local route / Image2 host-native first proof / downgrade proof / structured brief / output evidence / clean-session check
- **Baseline**：prompt / without path / with path / scoring dimensions / result
- **Regression**：previous version / new version / comparison prompts / pass-fail threshold / regression found
- **Human Review**：reviewer / visible artifacts / feedback / next drift action
- **Loop Closure**：run record / evidence level / writeback decision / prevention rule / next_run_reuse_key

## Next Drift Action

评估失败时，把失败写回 `references/intent-domain-research.md`（领域研究问题）、`references/multimodal-tooling.md`（多模态路由问题）或 `references/release-gate.md`（发布门问题）。skill 保持 `evidence-blocked`，直到 clean-session acceptance 跑通且有独立复核。
