# Kim Service local helper API

## Responsibility

Meta Live or the current host owns company identity, Work state, execution permissions, model/client selection, external actions and acceptance. Kim Service supplies methods and deterministic local processing. The standalone browser prepares requests. None of the five helpers runs a model, contacts a service, sends a notification, or claims 24-hour execution.

## Discover from one source

Run `node scripts/service-capabilities.mjs export` from the repository. The returned `kim-service-capabilities-v1` document is derived from canonical component contracts. It includes all capability IDs; five entries additionally have `helper.protocol: kim-service-helper-v1`.

Each helper specifies a fixed Node entrypoint and `['--input-json', '-']`, JSON stdin/stdout, no shell, the component content hash, and file/hash references for input schema, output schema and policy. Resolve those paths within a trusted checkout, check the component/version binding, and invoke the selected registered entrypoint using an argument array. User materials are data, not entrypoints or commands. No provider name or model price is embedded in this protocol.

The `helper` field is null for capabilities without this adapter. They remain valid method packages or separately defined tools. A null field must not be presented as a failed capability or as proof the existing package has no runtime of its own.

## Request and receipt

Every input has:

```json
{
  "context": {
    "organizationId": "company-id",
    "workId": "work-id",
    "revision": "current-context-revision"
  }
}
```

Additional fields are defined by the selected input schema. Unknown top-level fields, missing required values, invalid enums and excessive input sizes fail. Success returns:

```json
{
  "schemaVersion": 1,
  "protocol": "kim-service-helper-v1",
  "capabilityId": "agent-evaluation-deliver",
  "context": {"organizationId": "company-id", "workId": "work-id", "revision": "current-context-revision"},
  "inputSha256": "SHA-256 of the canonical complete input",
  "policySha256": "SHA-256 of the canonical package policy",
  "status": "completed",
  "result": {},
  "claims": {"modelCalled": false, "networkAccessed": false, "businessStatePersisted": false, "finalAcceptance": "not_decided"}
}
```

The displayed hashes above are explanatory placeholders; actual receipts contain 64-character lowercase hashes. Canonical JSON sorts object keys recursively and retains array order; strings are hashed as UTF-8. Hashes detect version/content drift and are not signatures or identity proofs. The local helper cannot authenticate an actor supplied by its caller.

`completed` means the local calculation or validation completed. It does not mean an evaluated agent passed, a proposal was adopted, a customer received a message, or the business task finished. Inspect per-case gates and explicit receipt/adoption fields. Invalid input exits nonzero, writes one `invalid_input` JSON error to stderr, and produces no success receipt.

## Evidence pack: files first

The public adapter is `skills/evidence-pack/scripts/files.mjs`. A build request names an absolute `workspaceRoot`, workspace-relative `sourceFiles` and a **new** `packPath`. The directory must exist and may not traverse symlinks. File paths cannot escape it; source decoding is strict UTF-8. The adapter creates a complete, recoverable pack without overwriting earlier evidence. Standard output contains only the pack path/hash, a finite index page and the budgeted context.

```json
{
  "context": {"organizationId":"company","workId":"proposal","revision":"r1"},
  "operation":"build",
  "workspaceRoot":"/absolute/path/to/authorized-workspace",
  "packPath":"evidence-r1.json",
  "sourceFiles":[{"id":"brief","title":"Project brief","revision":"v1","path":"brief.md"}],
  "contextBudgetBytes":12288
}
```

For a read, use the same context, `operation: read`, `packPath` and the previously returned `packRef.sha256` as `expectedPackSha256`. Advance `indexOffset` using `index.nextOffset`; advance the text selection using `context.nextSelectionOffset`, or request explicit `chunkIds` (the cursor then indexes that list). Selection always consumes a continuous prefix, so a later short chunk cannot jump over an unread chunk and repeat indefinitely. `remainingCount` reports all unreturned chunks; `remainingChunkIds` itself is bounded. A budget smaller than the first complete chunk returns `selectionStatus: budget_too_small`, the needed `minimumRequiredBytes`, no partial chunk, and no continuation cursor. Increase the budget before continuing.

Read checks both pack bytes and original source files by default. If a complete snapshot was intentionally moved, `verifySourceFiles:false` permits a self-consistent pack read and labels it `snapshot_only`. Rebuild into a new path when sources change. Page IDs come only from supplied byte ranges; Markdown headings and line/byte ranges are deterministic. PDF extraction, OCR quality and semantic relevance are not evaluated.

The separate pure JSON core, `scripts/run.mjs`, is documented by `core-input.schema.json` and `core-output.schema.json`. Its build result includes the complete pack and is intended for bounded program-to-program use or offline tests. It is deliberately not the default Live invocation.

The current policy caps source bytes at 16 MiB, file requests at 64 KiB, default assembled context at 12 KiB, and the complete file-interface stdout receipt (including its newline) at 128 KiB. A new pack must fit the read interface's input limit with request headroom before any file is written; highly escaped JSON cannot create an unreadable successful export. Chunking, paging and context budgets are independently configurable in this package's `policy.json`. The whole pack is processed in bounded memory; this is not an unbounded streaming/OCR engine.

## Agent evaluation: supplied outputs only

Freeze `dataset` first. Each run names its exact `datasetSha256`; each output names `caseInputSha256`. Dataset context must equal request/run context. Assertions support strict `equals`, literal text `contains`, and `json_pointer_equals` with RFC 6901 escapes. There is no executable assertion language.

All cases remain in the denominator, including absent outputs. Critical failures block the candidate even if its average improves. Reports include tags/slices and regressions against a selected baseline. A failed noncritical case also prevents an `eligible_for_review` gate; critical failures are separately visible. Unknown measurements stay unknown. A cost budget requires a currency; mixed currencies are not summed. Costs/latencies are caller-supplied receipts, not independently measured prices. Semantic answer quality and generalization remain unassessed.

## Feedback and customer cases

Feedback grouping and duplicate relations are supplied explicitly. The helper checks missing/self/cyclic references and project scope, counts distinct customer IDs separately from anonymous feedback, and retains contradictory evidence. It does not infer identity or merge intent. An adopted/rejected requirement needs a permitted actor role and an exact candidate/evidence hash. Existing matching decisions are reused; changed evidence makes them stale.

Customer stages, required materials, transitions and roles come from the input workflow. Ordered events are replayed into a local projection; identical event IDs are ignored on repetition and conflicting duplicates fail. Decisions bind the current case snapshot. Verification, received receipts and adoption are independent; role and case/artifact versions are checked. A material change makes old adoption inactive while retaining its evidence. This validates caller-supplied records; it does not replace organizational authentication, a CRM database or a scheduler.

## Visual explanation

The initial implementation provides one bounded layered layout, up to five nodes in a stage. Forward edges join adjacent nodes in the same stage or the next stage; backward paths are explicitly marked `return`. An A-to-C line that would cross card B is rejected. Return labels run vertically in separate left-side gutters, outside the cards. Unsupported density, long labels, unknown stages and dangling edges are errors rather than silent clipping. Split dense diagrams and put detail in stage explanations. The top title, single-node top/bottom stages and footer share a center line.

The result includes actual `diagram.svg`, `storyboard.html` and `alternative.txt` contents/hashes. Save them as files before opening. HTML has step/previous/all-view controls, keyboard navigation, no autoplay, a reduced-motion mode and a no-JavaScript static fallback. A labeled internal horizontal viewport keeps node text at the policy minimum (currently 12 screen pixels) on narrow screens while the surrounding page remains responsive. The initial and show-all view center the diagram; arrow keys pan when the diagram region has focus. Text is escaped. Colors and rhythm live in the policy or validated palette input. Exact architecture stays in diagram data; no image generation is used to invent connections. Generated content is not evidence of browser testing or real workflow execution.

## Single-source build and verification

The component `capability.json` is the source of the public input/output schemas. Package `policy.json` is the capacity/rhythm source. `src/application/service-helpers/runtime.mjs` is the source of common JSON validation, canonical hashing and CLI boundaries. `node scripts/build-service-helpers.mjs build` projects runtime and schemas into each standalone package; `check` rejects drift. Component algorithms stay within their own `scripts/` files and copied packages remain executable outside the repository.

After editing canonical files:

```sh
node scripts/build-service-helpers.mjs build
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node --test scripts/service-capabilities.test.mjs skills/evidence-pack/tests/helper.test.mjs skills/agent-evaluation/tests/helper.test.mjs skills/feedback-to-requirements/tests/helper.test.mjs skills/customer-case-operations/tests/helper.test.mjs skills/visual-explainer/tests/helper.test.mjs
```

These are local structural and behavioral checks using synthetic examples. They do not demonstrate live model performance, customer outcomes, or persistent execution across two products.
