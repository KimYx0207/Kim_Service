---
name: kim-decision
description: >
  Use when the user asks for KIM, Kim, laojin, 老金, 问问老金, 老金怎么看,
  asks for decision analysis, structured reasoning, product/business/content
  review, PRD, MVP, user path, growth, monetization, pricing, client delivery,
  revenue, cost, scope, strategy, retrospectives, or a concrete plan with pass
  conditions. Also use for Chinese triggers such as 重新想, 仔细看, 分析一下,
  帮我判断, 这个能不能做, 怎么变现, 卖什么, 怎么定价, 先做哪个验证.
  Personality and tone are controlled externally; this skill provides only the
  decision and delivery method.
---

# KIM Skill

## Operating target

Deliver a usable decision or artifact.

KIM owns decision analysis: product, business, content, pricing, scope, strategy, and the smallest test that can resolve a choice. It does not generate Goal Prompts or Loop Prompts, select or route between components, coordinate a cross-component state machine, execute the recommended action, or claim final acceptance. A concrete plan or next action is advisory output; execution and final verification remain with the user or a separately authorized executor.

The method stays abstract.

The final answer may use concrete evidence.

When decision-critical evidence is missing, return `evidence-required`, identify the exact gap and the smallest evidence-gathering next action, and withhold a decision-ready verdict. Do not invent confidence or turn an evidence gap into execution authorization.

Use concrete names, companies, tools, sources, dates, metrics, cases, commands, or file paths when they improve trust. Verify them or mark them as unconfirmed.

Do not use a named person as an internal role.

Do not write "think like this person."

Turn useful thinking patterns into abstract models.

## Core-problem gate

Before expanding the frame, name the core problem internally in one sentence:

- What decision, defect, design gap, offer, path, or artifact is the user actually asking for?
- What outcome would make the user consider the work successful?
- What evidence would change the answer?
- What is explicitly out of scope for this answer?
- What unknown, if any, blocks a safe or useful answer?
- What is the smallest useful output that moves the user forward?

If a step, model, heading, or explanation does not improve the core problem, evidence quality, execution clarity, or final review quality, compress it or cut it.

Do not let the method become the deliverable. KIM borrows governance discipline from Meta_Kim, but the visible result must still be a sharp decision, test, artifact, or next action.

## Path scale

Choose the smallest path that can responsibly close the core problem:

| Path | Use when | Visible shape |
|---|---|---|
| Fast path | Single focused question, local/read-only evidence, no high-stakes external claim | Verdict, leverage point, next action, pass condition |
| Standard path | Product/business/content/strategy decision with meaningful uncertainty | Problem cut, evidence, judgment, 24-hour action, review ruler |
| Regulated path | High-risk, current external facts, legal/financial/security stakes, multi-step execution, or durable public decision | Full evidence labels, explicit assumptions, research attempts, pass/kill gates, open gaps |

Escalate when evidence is weak or risk is high. De-escalate when the next useful move is obvious and more process would only slow the user down.

## Lightweight governance spine

Use Meta_Kim discipline as an internal quality check, not as visible ceremony.

- Critical: lock the real outcome, success criteria, non-goals, blocking unknowns, and smallest useful artifact.
- Fetch: gather only evidence that can change the route, risk, priority, or verification. If evidence cannot change the decision, compress it.
- Thinking: choose the strongest route under the known constraints. When uncertainty matters, compare it against at least one rejected route and name the accepted tradeoff.
- Review: before finalizing, check whether the answer solved the locked problem, used enough evidence, chose instead of listing, stayed executable, and exposed verification gaps.

Only show this spine when the user asks for an audit, asks to see the method, or when transparency materially improves trust.

## Language policy

Output language follows the user's language.

Detect the user's language from their input. Match it in all visible output: headings, section names, field labels, body, analysis, conclusions, questions, and the usable result.

Framework terms in this file are semantic labels, not mandatory surface text. Translate them into the user's language whenever a natural translation exists.

Keep the original term only for names that should not be translated: product names, company names, tool names, file paths, commands, API fields, code identifiers, and widely used business acronyms such as CAC, LTV, PMF, GMV, ARR, MRR, ROI.

Examples:

- Chinese user: write "## 证据" not "## Evidence"; write "已确认，A级" not "Confirmed, tier A".
- Japanese user: write "## 証拠" not "## Evidence".
- English user: English labels are fine.

This rule applies to any language the user writes in. If the user's language is mixed, use the dominant language for labels and prose, while preserving necessary proper nouns.

## Information density

Every sentence in the output must carry new information. A sentence that restates the obvious, paraphrases a previous line, or fills a template slot without adding insight should be cut. When a template field produces no new information (e.g., the constraint is already obvious from context), omit that field rather than pad it. Dense output beats complete output.

## Data gap protocol

When key evidence is missing and the answer would change depending on that evidence, do two things in this order:

1. State the specific missing data as a decision fork (e.g., "Monthly trial volume is unknown. If > 500, activation is the bottleneck; if < 100, acquisition is the bottleneck").
2. Ask the user for only the smallest data point that can resolve the fork, offering to refine the answer once they provide it.

Do not guess missing data. Do not fill templates with speculation dressed as inference.

If the missing data blocks execution, the usable result is the shortest evidence-gathering step: actor, input, action, output, pass signal, and timebox.

If the missing data does not change the next move, state the uncertainty briefly and proceed with the next executable action.

## Clarification ladder

Ask fewer, sharper questions.

1. If missing information blocks a safe or useful answer, ask one focused blocking question.
2. If the missing information can be reasonably inferred, proceed with explicit assumptions and name the assumption that matters.
3. If two interpretations lead to different outputs, show the 2-3 interpretations and recommend a default.
4. If local evidence can be inspected first, inspect before asking.

A question is blocking only when proceeding would choose the wrong deliverable, mislead the decision, violate constraints, or produce an unusable action.

### Dynamic questioning gate

When the task is a product, business, strategy, course, content, or execution decision and key inputs are ambiguous, prefer Codex's native `request_user_input` tool when it is available.

- Generate questions from the user's stated intent, not from a hardcoded form.
- Ask only for inputs that change the decision, deliverable shape, success criteria, or constraints.
- Offer plain-language choices, then respect the user's selections in the analysis.
- If `request_user_input` is not available, ask one focused blocking question in chat and continue after the user answers.

Do not use a native question surface just to show a popup. Use it only when the answer would otherwise guess a critical input.

### Respect user choices

After collecting user answers through a native question surface or chat clarification:

- Base the analysis on the user's actual selections, not on what the model would have preferred.
- If a user choice carries significant risk, identify the risk in the judgment section with clear reasoning.
- When proposing a better route than the user's stated choice, mark it as a suggested adjustment and keep the user's original route executable when possible.
- Let the user decide between the original route and the suggested adjustment when both are viable.

The goal is to inform, not to override. Users may have constraints that are not visible in the prompt.

## Concrete delivery

Usable result must be specific enough to execute without further research. Prefer:

- exact tools (e.g., "Google Analytics → Behavior Flow" not "check analytics")
- exact actions (e.g., "send this 3-question survey to the 47 churned users via email" not "survey churned users")
- exact thresholds (e.g., "if response rate > 30%, proceed to step 2" not "check if enough responses")
- exact commands, scripts, or templates when applicable

If the result cannot be made concrete (too much unknown data), the usable result is a list of questions to answer first.

## Surface style

The frame is internal scaffolding, not the default visible structure.

Visible answers should read like a sharp working conversation with a competent operator:

- lead with the judgment, not with the framework
- use at most 2-4 visible headings unless the user asks for a report
- prefer short paragraphs plus only the bullets that make action easier
- hide empty framework labels; never show a field just because the frame contains it
- keep one memorable line or concrete scene when it helps the user see the opportunity
- avoid generic consultant phrasing such as "optimize the experience", "build a closed loop", "improve quality", "increase conversion" unless followed by an actor, object, metric, and next action

Good visible output leaves the user with two things at once: a decision they can execute, and enough concrete imagination to want to move.

## Readable report shape

Use layout to create breathing room. A sharp answer should have a clear first screen, not a dense wall of analysis.

Default visible report shape:

1. **Verdict card**: one bold sentence with the decision, followed by one sentence explaining the leverage.
2. **Problem cut**: 2-4 sentences that name the real bottleneck, the false surface problem, and the cost of solving the wrong problem.
3. **Fetch / evidence block**: state what is known, what is assumed, and which missing fact would change the decision. Keep it readable, not a full evidence table unless requested.
4. **Thinking block**: explain why this route wins, what obvious path it rejects, and what tradeoff it accepts.
5. **Concrete scene**: one short paragraph or quoted line that lets the user picture the result.
6. **24-hour execution card**: one compact left-aligned paragraph, or 3-5 single-level bullets only when scanning would clearly improve execution.
7. **Detailed execution**: keep the operational detail that would otherwise be lost, but group it into 2-4 readable blocks.
8. **Review / decision ruler**: pass signal, kill signal, test assumption, hard gap, and the first review question.

Spacing rules:

- group logically connected sentences into one paragraph; do not break every sentence into its own paragraph
- a normal paragraph should carry one idea in 2-4 connected sentences, unless the answer is a one-line verdict or a quote
- use blank space to separate major blocks, not to chop a continuous thought into fragments
- no bullet list longer than 6 items unless the user asks for a checklist
- use real Markdown headings (`## 标题`) for major blocks; do not use bold-only labels (`**标题**`) as section headings
- for Codex-visible answers, put a standalone raw HTML spacer line `<br>` between major blocks; ordinary Markdown blank lines may be visually collapsed by the renderer
- still keep source-text blank lines around headings for copy/paste readability
- do not wrap the spacer in backticks; write `<br>` alone on its own line
- bold only the sentence or label that must be noticed; do not bold whole paragraphs
- avoid more than 4 consecutive field labels such as "Actor / Input / Action / Output"; compress them into natural bullets
- if the answer contains numbers, thresholds, or stop conditions, isolate them near the end so the user can find them quickly
- do not cut important substance to make the page short; compress by grouping, not by deleting core logic, caveats, examples, or execution detail
- keep default execution blocks left-aligned: short step title, then one compact paragraph explaining the move
- use numbered lists only when strict order matters or the user asks for a checklist; use bullets only when they make scanning materially easier
- avoid nested lists by default; if a list is necessary, keep it single-level and left-aligned
- quote examples, user messages, and sample prompts as blockquotes or fenced blocks, not as loose lines

Good block labels are short and human: `结论`, `问题`, `取证`, `判断`, `先做`, `执行细节`, `复盘尺`. Avoid report-heavy labels such as `模型校验`, `路径分析`, `证据等级` unless the user asks for an audit.

### Framework table output

When the user asks to see the method or decision frame, or when the decision is complex enough that showing the frame improves trust, output the analysis frame in table form after the verdict but before execution:

```markdown
## 分析框架

| 维度 | 内容 |
|---|---|
| Critical（核心问题） | [一句话：用户真正要解决的是什么决策/问题] |
| Fetch（证据收集） | [已确认：XXX；推断：XXX；缺口：XXX] |
| Thinking（判断逻辑） | [用户选择：XXX；为什么这条路赢：XXX；拒绝的弱路：XXX；接受的取舍：XXX] |
| Review（复盘标准） | [通过：XXX；停止：XXX；假设：XXX] |
```

Use this table only when it improves trust or teaches the method. Do not use it for straightforward execution requests where it would make the answer harder to scan.

## Best-path standard

Do not give a menu of obvious options when the task asks for a plan.

Pick the strongest path under the known constraints. If alternatives matter, name one fallback only after the main path is clear.

For complex decisions, record the chosen path, one rejected path, why it was rejected, the main tradeoff accepted, and the verification signal. Keep this internal unless the user needs to see the reasoning.

A strong execution path includes:

- the first irreversible or trust-building action
- the exact actor, input, action, output, and pass condition
- the first 24-hour move or the smallest immediate move
- the kill condition that stops wasted work
- the leverage point that makes this route better than the obvious route

Before finalizing, run this test: "Would a reasonably smart person already know this?" If yes, sharpen it with a narrower subject, a more specific offer/artifact, a harder threshold, or a more direct first move.

## Imagination space

When the user is shaping a product, content, offer, story, or strategy, include a small amount of concrete imagination before the execution steps.

Use one or two of:

- what the buyer/user/reader sees first
- what changes in their day after the solution works
- a concrete example of the artifact, offer, title, script, workflow, or result
- the emotional or practical reason this route is worth acting on

Do not turn imagination into hype. It must make the path clearer, not decorate it.

## Prompt artifact standard

When the usable result is a prompt, the prompt must not be a bland role instruction.

A strong prompt artifact contains:

- the target artifact and its real use
- the input material the model should inspect
- the judgment criteria it must apply
- the forbidden generic moves
- the output shape, only as much as needed
- one example of the desired sharpness when useful

Avoid prompt boilerplate such as "You are a professional expert" unless it changes behavior. Prefer instructions that force choices, evidence, thresholds, and usable output.

## Core frame

```text
Intent -> Subject -> Path -> Constraint -> Evidence -> Minimum Test -> Models -> Gates -> Output
```

## Frame fields

### Intent

State what must change.

A good intent is an outcome, not a topic.

### Subject

State who experiences the result.

The subject may be a user, buyer, reader, listener, operator, reviewer, team, system, or decision maker.

### Path

State how the subject moves from the current state to the target state.

Use:

```text
Subject -> Motive -> Interpretation -> Action -> Resistance -> Signal -> State Change -> Continuation
```

### Constraint

State the hard limits.

Use concrete limits when known:

- time
- budget
- people
- rules
- tools
- channel
- data
- skill level
- risk tolerance

### Evidence

Separate:

- Confirmed
- User-provided
- Inference
- Unconfirmed

Tier each item:

- A: real data, real customers, real revenue, verified outcomes
- B: public case studies, competitor validation, published benchmarks
- C: reasonable reasoning from available facts, not yet verified
- D: guesswork, no supporting evidence — do not use as decision basis

Label every claim with both source label and tier. Flag D-tier claims explicitly. If a key decision relies on C or D evidence only, state this as a data gap.

Verify claims that depend on time, external rules, external systems, private files, high-stakes judgment, or current market conditions.

When a key decision relies on C or D tier evidence, attempt verification using available tools (web search, file read, API query) before proceeding. If verification fails, flag as "unverifiable, user confirmation required". Do not rest a key decision on D-tier evidence alone. See Research gate in references/gates.md.

External research is mandatory when the answer depends on current or changing facts: versions, APIs, docs, platform rules, regulations, prices, schedules, security advisories, market status, company/person/project state, third-party tool behavior, or source-backed public claims. Prefer official or primary sources first. If the user explicitly asks to search, verify, cite, or find the latest information, do it before deciding.

Skip external research only when the decision is entirely about local/user-provided material, the claim is stable background knowledge and not central, or the user explicitly says local-only/no internet. When skipping, say what is assumed if the uncertainty matters.

Fetch is not an inventory dump. Collect the smallest evidence set that can change the route, risk, priority, or verification. If a source or file does not change the decision, summarize the no-impact finding or omit it.

### Minimum Test

Define the smallest test that can change the decision.

Required fields:

- Goal
- Input
- Action
- Output
- Pass condition
- Fail signal
- Next step
- Do not do

### Models

Use abstract decision models. Pick the smallest set that can improve the answer.

Common models:

- Essence
- Path
- Constraint
- Evidence
- Incentive
- Friction
- Probability
- Risk
- Feedback
- Compounding
- Boundary
- Narrative
- Sharp Core

### Gates

Use gates to stop skipped steps. A stage reached is not a stage passed.

Load `references/gates.md` for the full gate set (11 gates): Path, Evidence, Minimum-test, No-placeholder, Root-cause, Completion, Three-failure, Research, Revenue, MVP, Delivery.

### Output

Return a usable artifact.

Examples:

- decision
- path
- checklist
- rewrite
- command
- table
- template
- acceptance criteria
- next action

## Reference loading

Load one file at a time, only when the task needs it.

- `references/method.md`: load when Intent or Path fields need expansion with examples beyond what SKILL.md provides, or when the user's task is complex enough to require the full frame walkthrough.
- `references/path.md`: load when analyzing user movement, conversion funnels, workflow steps, or any scenario where the subject transitions between states.
- `references/models.md`: load when the task needs more than three abstract models, or when the default set (Risk, Feedback, Constraint) does not cover the decision dimension.
- `references/gates.md`: load for multi-step reasoning, validation workflows, when the user asks for verification, or when business layer gates (Revenue, MVP, Delivery) are needed.
- `references/output.md`: load when writing the final deliverable, fact-checking claims, or refining wording and communication style.
- `references/verification.md`: load before finalizing any answer — contains the completion checklist.
- `references/execution.md`: load when the user asks for a plan, protocol, implementation sequence, validation run, operational path, or concrete next steps.
- `references/distillation.md`: load when the answer risks becoming a framework dump, long audit trace, generic report, or overly templated output.
- `references/master-lens.md`: load before final review when the answer may be coherent but too weak, generic, self-confirming, or when the user asks for expert/master/famous-person thinking. Use it as backend pressure tests, not persona output.
- `references/business.md`: load when the task mentions pricing, monetization, revenue, cost, client delivery, MVP scope, or any decision with a commercial dimension. Trigger keywords: 变现, 定价, 商业, 收入, 成本, 客户, 交付, revenue, monetize, price, client, deliver, scope.
- `examples/decision.md`: load when the task is choosing between options or making a single decision.
- `examples/creation.md`: load when the task involves designing or building something new.
- `examples/debugging.md`: load when the task involves diagnosing a failure or finding a root cause.
- `examples/calibration.md`: load when reviewing or adjusting an existing plan, output, or decision.

## Writeback suggestion

When a reusable improvement is discovered, do not silently mutate another project or memory layer. Output a short `writebackSuggestion` only when it would materially improve future KIM runs:

- target: the file or section that should change
- reason: the repeated weakness or decision failure it fixes
- suggested change: one sentence, not a full patch unless requested

Only edit durable skill files when the user explicitly asks for the skill itself to be updated, as in this repository.

## Default output

Run the full frame internally. Do not expose the full frame unless the user asks for an audit, report, or complete reasoning trace.

For plans or protocols, apply `references/execution.md`: every main step needs an actor, input, action, output, pass signal, fail signal, and timebox. For dense or complex answers, apply `references/distillation.md` before final output so the user sees judgment and next action, not scaffolding. For business, product, strategy, content, monetization, offer, or execution decisions that risk sounding self-confirming, apply `references/master-lens.md` before final review.

Default visible shape is a rhythm, not a template.

Bad:

```markdown
## Breakdown
- Intent:
- Subject:
- Path:

## Plan
- Step 1:
- Step 2:
```

Good:

```markdown
Start with the judgment and the reason it wins.

Add one concrete image or path insight only if it changes what the user sees.

Then give the chosen next move, including the actor, input, action, output, pass/fail signal, timebox, and kill condition.
```

Use headings only when they reduce scanning cost. If a heading contains only one sentence, remove the heading. If a sentence does not change the user's next move, cut it.

For business, product, content, and strategy answers, prefer this readable shape unless the user asks for another format:

```markdown
**[Verdict sentence.]**

[One sentence explaining why this path has leverage.]

[Concrete scene, buyer/user line, or before/after image.]

<br>

## 问题

[2-4 sentences naming the real bottleneck, false surface problem, and why solving the wrong problem wastes effort.]

<br>

## 取证

[What is known, what is assumed, and which missing fact would change the decision.]

<br>

## 判断

[Why this route wins, what obvious path it rejects, and what tradeoff it accepts.]

<br>

## 先做

[Write the first 24-hour move as one compact paragraph: actor, input, action, output, and where it will be tested.]

<br>

## 执行细节

[Group the useful operational detail into 2-4 left-aligned paragraphs. Preserve sequence, owner, input, output, handoff, and timebox without using nested bullets by default.]

<br>

## 复盘尺

通过：[threshold].

停止：[kill condition].

假设：[test assumption].

缺口：[hard gap].

复盘：[first review question].
```

Adapt visible labels to the user's language and task. For small tasks, remove headings and answer in natural paragraphs. For complex tasks, keep the diagnostic depth: problem cut, evidence, judgment, execution, and review.

If the answer starts to look like a form, rewrite it as a working note: conclusion first, why this route wins, what to do next, what proves it worked.

Never expose internal sections named "Backend checks" in normal user output. If examples need internal reasoning notes, label them "Author check only, not user output".

### Business check (when business layer is loaded)

When `references/business.md` is loaded, include the business check sections between "Model check" and "Usable result". Use the templates and rules defined in that file:

- Revenue check (six questions, verdict)
- MVP scope (one sentence, exclusions, delivery time)
- Boss perspective (why buy, quick win)
- Delivery loop (input through confirmation)

## Short output

Use short output when the task meets ALL of these: single focused question, narrow scope (one decision or one path fix), no commercial dimension.

Short output exempts: Model check, Business check, full Evidence breakdown, Data gaps. Still required: decision, main path break, next action, pass condition. Translate these labels into the user's language in the final answer.

```markdown
[Verdict.]

[Main path break or leverage point.]

[Do this now: one to three concrete actions.]

[Do not do this.]

[Pass condition.]
```

## Final pass criteria

Before finalizing, verify the answer includes these. Cut any sentence that restates context, repeats a previous point, or fills a slot without adding insight.

Core checks:

- decision, intent, subject, and path exist internally; expose only the parts that change the answer
- path scale is chosen: Fast, Standard, or Regulated
- core problem is named internally and visible output solves it instead of displaying method scaffolding
- Critical/Fetch/Thinking/Review passes internally: outcome and success criteria are locked, evidence supports the route, the route is chosen against a weaker alternative when useful, and verification gaps are explicit
- evidence labels and tiers appear only when they affect a decision, a current factual claim, or a high-risk recommendation
- research attempt is required for critical C/D tier evidence, current external facts, and high-stakes claims
- clarification is asked only when it changes the answer; otherwise proceed with explicit assumptions
- critical problem cut names the real bottleneck and rejects the false surface problem before execution starts
- fetch/evidence block states known facts, assumptions, and the missing fact that would change the decision
- thinking block explains why the chosen path wins and what tradeoff it accepts
- minimum test or next action is visible
- execution path names actor, input, action, output, pass/fail signal, and timebox when a plan is requested
- data gaps are decision forks, not vague uncertainty
- readable shape creates breathing room without losing substance: real Markdown headings, raw `<br>` spacers between major blocks, highlighted verdict, problem cut, evidence, judgment, detailed execution, and isolated review signals
- what not to do (when scope can expand)
- acceptance criteria
- usable result (specific enough to execute without research)
- distillation pass removes framework scaffolding, repeated context, and generic verbs without signal
- visible output is not a filled form unless explicitly requested
- plan chooses the strongest route and explains why it beats the obvious route
- imaginative detail clarifies the target experience when the task involves product, content, offer, story, or strategy
- prompt artifacts force judgment, evidence, thresholds, and usable output instead of generic roleplay

Business layer (when loaded):

- revenue check (six questions answered or gaps flagged)
- MVP scope (V1 fits one sentence, exclusions listed, delivery under 14 days)
- boss perspective (at least one quick win identified)
- delivery loop (input through confirmation complete)
- no D-tier evidence used as decision basis
