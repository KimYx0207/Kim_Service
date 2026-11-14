# Value and business layer

Load for product value, cost, pricing, internal workflow improvement, open-source adoption, client delivery or MVP scope. Start from the user's result, not a universal revenue questionnaire.

## Value types and stage

Record `valueTypes` as a combination of `paid`, `internal`, `open-source`, and `stage` as `exploration`, `validation`, `delivery` or `scale`. These describe the current decision, not mutually exclusive product templates. A public project may sell hosting; an internal service may indirectly support revenue.

| Value type | Evidence that matters | Inapplicable shortcut |
|---|---|---|
| paid | Buyer problem, revenue model, willingness to pay, delivery cost, applicable retention/repeat | Treating a hypothetical buyer as proven revenue |
| internal | Work outcome, time/error baseline, adoption, operating cost, owner | Requiring an external payer before testing internal value |
| open-source | Reproducible use, adoption/contribution, maintenance burden, distribution and owner | Requiring a transaction or equating stars with successful use |

For mixed types, retain applicable measures separately. DAU, conversion, price, LTV and support burden are distinct assumptions; do not derive a technical stack from one label. Use observed denominators, windows and current prices for numerical claims.

| Stage | Minimum useful evidence and next move |
|---|---|
| exploration | Clarify beneficiary and outcome; compare alternatives and choose a falsifiable probe. Unknown pricing does not block an interview or local prototype. |
| validation | Observe adoption/outcome and cost under a bounded test. Keep willingness to pay and nonfinancial value as separate hypotheses. |
| delivery | Check promised scope, actual resources, acceptance method and owner. Commercial promises additionally need commercial evidence. |
| scale | Check repeatability, capacity and economics or applicable nonfinancial value. A successful demonstration does not establish reliable scale. |

## Revenue questions when a paid commitment is at stake

Inspect revenue model, payer, why now, deal size, delivery cost, and repeat purchase/retention where applicable. An intrinsically one-time offer may have no repeat purchase; record one-time economics rather than invent recurrence.

Missing revenue evidence limits the related commercial conclusion. It does not veto an internal/open-source project or bounded commercial exploration. Distinguish a worthwhile test from an evidenced commitment or scale decision. Answering six questions is not proof of demand.

## Smallest useful version

State one clear user result, the actual audience, inputs, artifact, time/resource limit, success observation and failure/reopen condition. Name relevant exclusions only. For paid validation use a suitable transaction signal; for internal work use time, errors or task success; for open source use reproducible adoption and maintenance evidence. Delivery time follows the real feedback cycle, not a universal day limit.

## Beneficiary and delivery review

Read the proposal from the actual beneficiary's position: why use it, how adoption happens, what effort precedes the first result, and what visible observation supports continued investment. A quick win must match the task's real cycle; do not promise a first-week outcome if the process takes longer.

Close the delivery path: source/input, processing/tools, output/destination, acceptance method and owner, plus reuse where useful. Record whether actual user review occurred; an identified reviewer is not a completed review. Existing authorization remains valid, and ordinary reversible work does not need repeated sign-off.

## Research and project context

Inspect available project facts before asking. Research current facts using primary sources and installed versions. Record which finding changes which option, the strongest counterexample, remaining uncertainty, and when to stop or reopen. More links do not make an unsupported decision ready. For technical comparison, return the decision context for `technology-option-evaluation`; knowledge systems may need `knowledge-architecture-evaluation`. The caller selects and invokes components.

For a continuing project, preserve value/stage context in the existing design and requirements for its independent professional abilities. Global methods provide a base; project domain, vocabulary, constraints and acceptance must be explicit. This analysis does not create those files or own their lifecycle.

## Optional evidence routing helper

`node scripts/assess-value-stage.mjs --input-json -` consumes `{valueTypes, stage, evidence, recurrence?, recurrenceReason?}`. Evidence booleans indicate material supplied for review, not truth or approval. It reports required categories and gaps; `executionAuthorized` and `finalAcceptanceClaimed` stay false. `ready-for-next-test` means routing requirements were supplied. Professional judgment must still check quality and applicability. Explain legitimate one-time economics in the actual decision rather than converting inapplicable recurrence into a veto.

`recurrence` is `unknown`, `recurring` or `one-time`. One-time delivery requires a nonempty `recurrenceReason`; the helper then excludes `repeatPurchase` while retaining all other applicable evidence.
