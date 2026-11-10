# Business layer

Load when the task involves a proposal, plan, business decision, monetization, product strategy, pricing, client delivery, or any decision with a commercial dimension.

Trigger keywords: 方案, 商业, 变现, 定价, 客户, 交付, 产品决策, 挣钱, 复购, 老板, MVP, 收入, 成本, revenue, monetize, price, client, deliver, scope.

## Revenue Judge gate

Before finalizing any business output, answer all six:

1. Revenue model: how does this make money?
2. Payer: who pays?
3. Urgency: why pay now?
4. Deal size: what amount closes a deal?
5. Delivery cost: what does it cost to fulfill?
6. Repeat: can they buy again?

Decision rule:

- Questions 1-3 unanswered → output downgrades to "do not proceed" with specific gaps listed
- Questions 4-6 unanswered → flag as "needs verification" and list specific gaps
- All six answered → proceed with revenue estimate

## MVP Converger gate

For every proposal, force scope compression:

1. V1 scope: what does the first version do? (one sentence maximum)
2. Exclusions: which plausible extensions would distract from the current validation? Name the relevant exclusions; do not invent three merely to satisfy a count.
3. Fastest delivery: how many days to ship V1?
4. Minimum customer: who is the smallest viable customer?
5. Minimum deal: what is the smallest transaction that validates the model?
6. Failure criteria: what measurable result means "stop, this does not work"?

Compression rules:

- V1 scope exceeds one sentence → compress until it fits
- No exclusions listed → scope is too broad, cut until exclusions appear
- Fastest delivery exceeds the user's time/resource budget or cannot expose the critical uncertainty within the business feedback cycle → reduce scope or renegotiate the constraint; no universal 14-day cutoff
- No failure criteria → add one before proceeding

## Boss Perspective model

View the proposal from the buyer's chair:

1. Why buy: what pain does this solve for the person holding budget?
2. Adoption: will employees use it without being forced?
3. Implementation: how many steps from "buy" to "first result"?
4. Quick win: what visible result appears in the first week?
5. FOMO: what happens if they do not buy?

Output:

```text
Finding: [what the buyer would reject or question]
Fix: [how to address it]
```

Rule: if no quick win exists, the proposal relies on long-term promises only. Flag as "needs short-term visible result".

## Delivery Loop gate

Every deliverable must close the loop:

1. Input: what goes in? (format, source, quality bar)
2. Process: what happens to it? (steps, tools, time)
3. Output: what comes out? (format, destination, quality bar)
4. Acceptance criteria: how does the client verify it is done?
5. Client confirmation: what does the client sign, send, or say to confirm?
6. Reuse: what can be reused for the next client or project?

Rules:

- Steps 1-5 missing any item → deliverable is not ready
- Step 6 missing → flag as "one-time work, no leverage"
- Reuse can be: template, process, tool, script, checklist, framework

## Interaction with core frame

- Revenue Judge: runs after Evidence, before Output
- MVP Converger: runs after Path, before Minimum Test
- Boss Perspective: runs as a Model alongside other models
- Delivery Loop: runs as the final gate before Output
