# Gates

## Core-problem gate

No method expansion before the real problem is named.

Required:

```text
core problem
decision or artifact requested
evidence that would change the answer
smallest useful output
```

Fail if the answer displays framework scaffolding but does not move the user's decision forward.

## Clarification gate

No broad questionnaire before the smallest blocking question.

Ask only when missing information would change:

```text
deliverable
decision
scope
risk
first action
```

If the gap can be inspected locally, inspect first. If it can be assumed safely, proceed and label the assumption.

## Path gate

No full plan before path.

Required:

```text
Subject
Motive
Interpretation
Action
Resistance
Signal
State Change
Continuation
```

## Evidence gate

Verify or label uncertainty when a claim depends on:

```text
time
external rules
external systems
private files
high-stakes judgment
current market conditions
```

## Minimum-test gate

No large system before a minimum test.

Required:

```text
Goal
Input
Action
Output
Pass condition
Fail signal
Next step
Do not do
```

## No-placeholder gate

Do not leave placeholders.

Avoid:

```text
TBD
TODO
later
proper handling
optimize as needed
improve experience
complete the loop
```

Write:

```text
actor
input
action
output
pass condition
```

## Root-cause gate

For repeated failure, collect evidence before changing the solution.

Required:

```text
symptom
reproduction path
recent change
evidence
hypothesis
minimum validation
```

## Completion gate

Do not say done without checking:

```text
acceptance criteria
unconfirmed facts
open risks
placeholders
usable result
```

## Three-failure gate

After three failed attempts, stop and reframe.

Check:

```text
intent
path
root cause
model choice
missing input
scope
alternative path
```

## Research gate

When a key decision relies on C or D tier evidence, attempt verification before proceeding.

External research is mandatory when the answer depends on:

```text
current versions
APIs or docs
regulations or rules
prices or schedules
security advisories
market or company status
third-party tool behavior
source-backed public claims
```

Steps:

1. Identify which C/D evidence would change the decision if upgraded
2. Use available tools to search: web search, file read, API query, documentation lookup
3. If found → upgrade tier (C→B or D→C), cite source
4. If not found → mark as "unverified" and state: "unverifiable, user confirmation required"

Rules:

- Do not proceed with a key decision resting on D-tier evidence alone
- At least one attempt to verify each critical C/D claim
- Prefer official or primary sources before commentary
- User requests for "latest", "verify", "search", or "cite" always trigger research
- Local/user-provided material can stay local-only when no external changing fact affects the decision
- If no search tools are available, skip the search and flag the gap explicitly

## Value and stage gate

Load: references/business.md

Record composable `valueTypes` and the current `stage` in the existing project context. Check outcome evidence for each applicable value type and proportion it to this decision. Exploration can continue with a bounded probe; delivery needs an acceptance method and owner; scale needs repeatability, capacity and applicable economics or nonfinancial value.

For a paid delivery or scale commitment, inspect revenue model, payer, urgency, deal size, delivery cost and applicable repeat purchase. For a one-time offer, record the reason and one-time economics. Missing evidence limits the paid commitment. Internal and open-source value do not require an external payer.

## MVP gate

Load: references/business.md

Required:

```text
V1 scope (one sentence)
Explicit exclusions
Actual time and resource limit
Beneficiary and test setting
Applicable value signal (transaction, time/error improvement, reproducible adoption)
Failure criteria
```

Make the first result clear and bounded. Keep exclusions only where they prevent a real scope misunderstanding.

## Delivery gate

Load: references/business.md

Required:

```text
Input
Process
Output
Acceptance criteria
Acceptance owner and observed review state
Reuse potential where useful
```

An incomplete acceptance path limits readiness; an actual review must be recorded separately from its plan. Existing authorization remains valid and ordinary reversible work does not require repeated approval.
