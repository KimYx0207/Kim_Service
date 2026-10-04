# Changelog

Kim Service uses one repository-level two-part public version (`V<major>.<minor>`) and one GitHub Release for the professional-capability dependency repository. Component CHANGELOG files record component provenance; this file is the release-note authority.

## V1.7 - 2026-10-04

### Affected components

- Existing Supplier Comparison Analyst 0.1.0 and Store Performance Analyst 0.2.0, with optional reviewed delivery descriptors and the shared capability catalog.

### User-visible changes

- Professional material questions, result validation, issue summaries, readable reports and supplier-definition clarification now belong to their Service components. Meta can invoke them through a generic reviewed delivery interface instead of knowing business fields.
- Fixed Python delivery adapters preserve exact raw calculator receipts, including unknown costs, conflicting definitions and rejected-input error codes (nonfinite_number, input_size and root_shape). Receipt bytes are carried with an integrity digest.

### Breaking changes and migration

- Original calculation-tool.json contracts, calculate.py implementations, --input-json - CLI, capability IDs, role versions and read-only permissions are unchanged.
- deliveryContract is optional for existing consumers. Meta 3.5.0 uses the reviewed delivery interface; earlier Service packages remain discoverable but do not silently gain that capability. Discovery never authorizes arbitrary commands, supplier contact, ordering, payments or business writes.

### Verification

- All 68 root regressions and 45 declared validation files across 26 components passed locally, including 18 professional-delivery tests. Existing Windows-specific skips remain explicit on Linux.
- Thirty-six Meta/Service integration tests passed with real Python calculation, MCP transport and formal task handoff; independent review covered receipt parity, duplicate keys, Unicode, source integrity and bounded input/output. These are not native model-chain acceptance or real business results.
- Exact-head and merged-main CI, clean-main release readiness and remote annotated-tag verification are required before publication and recorded in the Release.

### Source revisions

- Previous release V1.6: 593bbb34bffd888d4b5f7bd8d8e4f30dc25dc2a9.
- Reviewed delivery implementation and committed-component-tree provenance: ae38c0e2806c2350459bfdf771c9cb29a5a076a5. External and canonical direct-sync origins remain unchanged.

## V1.6 - 2026-10-04

### Affected components

- Existing Supplier Comparison Analyst 0.1.0 and Store Performance Analyst 0.2.0, their fixed calculation-helper contracts, and the shared capability catalog.
- Current installation-source guidance for the consolidated collection. Existing component versions, licenses and professional-role boundaries are preserved.

### User-visible changes

- Capability discovery now exposes each selected analyst's real helper contract. Consumers can read the verified package contract and call its existing local Python entrypoint with fixed stdin/stdout JSON.
- Procurement callers receive an explicit required-material list including supplier quotes. Store callers receive the actual rows contract and its 64 KiB input limit. The two different result formats remain distinct.
- Helper references are validated as package-relative JSON paths and projected consistently into the catalog. Contract discovery grants no execution permission and does not turn a read-only Agent into an unrestricted tool runner.
- Installation guidance uses the selected Kim_Service component directory and distinguishes current installation sources from historical standalone-repository provenance.

### Breaking changes and migration

- Existing capability IDs, Agent output contracts and Python calculation implementations are unchanged. Consumers may use the optional helperContract reference after verifying the selected component; the descriptor does not authorize arbitrary commands.
- Structured callers still provide their actual materials. Missing costs remain unknown, incompatible definitions remain non-comparable, and supplier comparison does not contact suppliers, place orders or authorize payments.
- Native Agent loading remains needs_probe. Meta_Kim continues to own intent, orchestration, runtime selection, permissions and final acceptance.

### Verification

- The calculation-discovery implementation passed 67 root regressions, all 43 declared validation entrypoints across 26 components, and independent contract/catalog review. Existing platform-specific skips remain explicit.
- Meta's formal entrypoint executed the real helpers for synthetic procurement and store-review cases. The current dot model consumed the complete professional methods and actual receipts and delivered conditional supplier advice and a five-part store review. This evidence does not certify the product's autonomous native model chain or real business outcomes.
- Release acceptance requires exact-head and merged-main CI on Linux, macOS and Windows, a clean-main release check, the annotated version tag and fresh remote-tag verification. Those publication results are recorded in the GitHub Release.

### Source revisions

- Previous release: V1.5 at 92b8d0c464b476ae8dcc99b405a0c604e39bc3f4. Integrated calculator-discovery source: d83b52488e28c1c9b1c6ef3e89d5a58b3ce67ee3, including PRs #8 through #11.
- Generated committed-component-tree provenance points to reviewed source commit 4f2853ee48a9dd1a87002922f86276d6315528af. Existing external and canonical direct-sync origins remain unchanged.
- This release adds no model SDK, scheduler, role roster, credentials or private requirements document. It does not claim the broader capability migration or all native runtimes complete.

## V1.5 - 2026-10-03

### Affected components

- Existing Store Performance Analyst 0.2.0 and new Supplier Comparison Analyst 0.1.0.
- Existing industry directory and package-method documentation; discovery contracts and governance ownership remain unchanged.

### User-visible changes

- Ecommerce review now checks period/SKU/channel comparability, separates refunds and cost gaps, explains supported changes, and proposes bounded actions against the user's constraints.
- Supplier comparison normalizes same-spec quotes and minimum orders, exposes landed-cost and delivery/quality gaps, and compares user-selected weights and trade-offs before suggesting a trial.
- Each package includes a standalone local Python calculation helper for explicitly provided JSON data. Calculations, material-only delivery and unavailable-tool limitations are distinguished; a selected Agent never silently gains execution permissions.

### Breaking changes and migration

- Store Performance Analyst retains its capability ID, required metrics input and five existing output keys. Structured materials and actual calculation receipts are optional additions.
- Existing pricing, product-copy and customer-service boundaries remain; procurement comparison does not place orders, contact suppliers or make certification claims.
- Weights, thresholds and investment limits come from task inputs. Missing costs/evidence are unknown; incompatible periods/specifications/currencies are not silently compared.
- The helpers use fixed stdin/stdout JSON under separately authorized host execution. They do not certify native Agent loading or become a new orchestrator, registry or Skill.

### Verification

- Business acceptance uses synthetic material for normal, missing-field, conflicting-definition and unavailable-tool cases. Actual helper execution and scoped model delivery are recorded separately from static package checks.
- Release acceptance requires the existing root and component checks, independent review, actual Meta owner-contract selection and useful delivered results, exact-head PR CI, merged-main CI and a fresh remote-tag clone.
- Native runtime states and explicit platform skips retain their actual evidence boundary; broader non-Agent migration is not claimed complete.

### Source revisions

- Baseline released main c56b43ae24e9bd75be69b71e28c1adcc46ef09da (V1.4). Current committed component trees are bound by the existing provenance generator.
- Selective methods: agency-agents-zh at 811e51c370f26ec4f37ca277b4368b4ff895741f, China ecommerce operator and supplier evaluator. Pinned MIT authorship remains in each package LICENSE/NOTICE.
- Meta_Kim retains intent, host-native decisions, orchestration, permission checks and final acceptance.

## V1.4 - 2026-10-03

### Affected components

- Existing Script Writer 0.3.0 and Semgrep Skill 1.1.0.
- Existing package-contract schema and discovery validation for optional local invocation metadata; catalog and index remain deterministic projections.

### User-visible changes

- Script Writer now turns specified source materials into a complete draft for a concrete reader and angle, separating source facts, provided user stance and author analysis. Selectively adapted content-creation methods retain their pinned MIT attribution, existing role and channel boundaries.
- Semgrep Skill has one real Python JSON entry for the installed local CLI: explicit authorized root/target, two non-secret bundled rules extracted before scanning, actual runtime versions and source/effective rule hashes, sanitized findings and honest completion/failure states.
- Skill installation now carries the runnable entry and package contract with its existing receipt/rollback mechanism. Replaced the old direct three-rule/current-project-default guidance, so instructions and executable scope agree.
- Nested host profile isolation still initializes the existing trusted Python user runtime needed by the Windows CLI; no package installation or caller Python configuration forwarding is added.

### Breaking changes and migration

- Script Writer's existing required inputs and output keys remain; audience is optional. No new role or business product is added.
- Structured Semgrep callers must provide schemaVersion:1, workspaceRoot and target. Use scripts/scan.py instead of direct commands from older Skill instructions. This capability does not run the bundled credential rule or return matched source.
- Optional invocation remains in the full package capability.json; the index does not copy it or grant execution permission. Consumers verify the selected package and read its current contract before checking host support and authorization.
- Safety bounds and trusted-host/stable-filesystem assumptions are documented in the Skill. networkUsed:false reflects local configuration, opt-outs and environment isolation, not OS network containment or packet capture. A finding is not an execution failure; incomplete scans never mean clean.

### Verification

- Actual scoped model delivery produced complete prose from synthetic sources without invented firsthand experience; native custom Agent loading remains unprobed.
- Installed Semgrep 1.168.0 on Python 3.14.6 executed the synthetic Python/JavaScript fixtures through the wrapper. Protocol and installation checks include secret-rule exclusion, environment isolation, source hashes, incomplete coverage, live output limits and Windows timeout cleanup. Windows directory-symlink cases explicitly skip when the host lacks that privilege.
- Release acceptance requires all root and declared component checks, independent review, exact-head PR CI, main CI and joint Meta compatibility. Local model/tool evidence does not certify every native host or complete the remaining non-Agent migration.

### Source revisions

- Baseline main 2524c6f792b870e0983b7a3a4ff0afda76708d76 (released V1.3). Existing canonical-direct-sync records retain their origins; component changes are recorded in package changelogs and current Git history. Generated Agent provenance binds the committed component tree.
- Content-method source: agency-agents-zh marketing-content-creator at 811e51c370f26ec4f37ca277b4368b4ff895741f; original English copyright 2025 Michael Sitarzewski and Chinese translation/localization copyright 2026 jnMetaCode remain in the package MIT license and NOTICE.
- Meta_Kim retains intent, host-native decisions, orchestration and final acceptance. This finite method/tool implementation does not claim the full original absorption request, native Agent certification or all non-Agent consumers complete.

## V1.3 - 2026-10-02

### Affected components

- Existing lesson-planner, concept-tutor and exercise-designer handoff and execution-evidence guidance.
- Interview Coach, Script Writer and Xiaohongshu prompt boundaries.
- Previously merged GoalPro finite-task behavior, Agent Teams Playbook safe installation, and cross-platform repository CI.

### User-visible changes

- Clarify existing role handoffs: deliver facts, assumptions, sources, missing information and self-check results; let the caller select neighboring roles and tools without repeating requirement governance.
- Remove forced interview practice from answer rewriting, prevent invented first-person product evidence, and align Xiaohongshu pending-decision and image-fallback rules with its authoritative contract.
- Document selective professional-method references and their source attribution. Role instructions and converted files do not prove native Agent loading or a real MCP/tool binding; examples do not create new product requirements.
- GoalPro finite tasks return Goal Prompt; Loop requires an explicit request or evidence-driven continuing need. Existing Skill/Tool packages now benefit from the safe playbook installer and Windows/macOS/Linux CI merged after V1.2.

### Breaking changes and migration

- Existing education role IDs, triggers, input/output keys and read-only permissions remain. Interview rewrites may return no follow-up question instead of forcing another turn.
- Script Writer accepts a string for article content in addition to its existing array form, and adds the claim status `用户提供` (user-provided). Consumers with strict type or enum assumptions should accept these additive values; provided information is not independently verified or firsthand experience.
- Consumers expecting GoalPro's former automatic pair of prompts must explicitly request Loop. External publication, paid APIs, registry publication and business-system writes are not part of this release.

### Verification

- Release acceptance uses every root regression and declared component check, real scoped interview-rewrite and article-writing deliveries, dependency contract discovery, independent review, exact-head PR CI and main CI.
- Structural discovery and task-specific model delivery have separate evidence. Fifteen Agent packages retain needs_probe for native loading; no live-certified claim is made. The observed Meta-theory CLI freshness failure is reported to its owner, not relabeled as passed.

### Source revisions

- The baseline is main c583d868 after PRs #3 and #4. The generated catalog binds the Agent packages to the actual source commit through committed-component-tree provenance. Existing canonical-direct-sync source records retain their origin; local Skill changes are recorded in their component changelogs and current Git history.
- Professional-method reference: agency-agents-zh@811e51c370f26ec4f37ca277b4368b4ff895741f; its inventory distinguishes 213 translated and 64 original roles. Source links and MIT attribution remain in docs/method-absorption.md; no complete upstream role package is imported.
- Canonical contracts remain package-level capability.json; catalog.json and generated/capabilities.json are deterministic projections. Meta_Kim continues to own intent, selection, orchestration and final acceptance. Its current read-only consumer handles Agents; non-Agent migration is not claimed complete.

## V1.2 - 2026-09-14

### Affected components

- Repository capability discovery and release gates.
- Fifteen standalone Agent packs for creators, ecommerce, job seeking and workplace writing, education, and side businesses.
- HookPrompt, Find Skill, GoalPro, Kim Decision, and Semgrep Skill.
- Claude Code - Codex - Gemini Tool.

### User-visible changes

- Added a plain-language Agent directory for choosing common deliverables: topics, titles, scripts, listings, customer replies, shop analysis, resumes, interviews, workplace documents, lessons, explanations, exercises, business evaluation, launch plans, and pricing.
- Each Agent includes an independent contract, complete example, self-contained validation, and license. Native loading and model delivery remain `needs_probe`; a published package is not a live-runtime certification.
- Consumers can discover the packages through `generated/capabilities.json`; Meta_Kim owns cross-package selection and governance.
- Added Chinese and English guidance explaining that `{}` is the expected skip result for short text without a clear task.
- Added a positive PowerShell verification command that passes a real task as `UserPromptSubmit` JSON through standard input.
- Clarified that positional arguments such as `node user-prompt-submit.js "test"` do not exercise the HookPrompt input protocol.
- Added package-level Capability contracts and deterministic automatic discovery for Hook, Skill, Tool, Agent, and App package types.
- Generated the root catalog, Capability index, content hashes, and validation plan from package contracts instead of requiring duplicate manual registration.
- Added the hardened Claude Code - Codex - Gemini MCP/CLI bridge as a Tool, with project-scoped transactional installation and explicit human gates.
- Unified the Tool license under MIT by repository-owner decision while preserving the pinned upstream conflict as historical provenance.
- Made HookPrompt logging opt-in and metadata-only, with bounded rotation and temporary-directory containment.
- Made Semgrep installation dry-run-first, receipt-backed, transactional, and offline by default.

### Breaking changes and migration

- No silent compatibility alias was added for the Find Skill canonical name correction; consumers must use the package's documented current name.

### Verification

- HookPrompt tests passed 32/32.
- The course task sentence returned `hookSpecificOutput` and `additionalContext` through the documented PowerShell route.
- Automatic discovery found 25 components and 40 Capabilities; catalog freshness and repository security gates passed.
- All 38 declared component validation files exited successfully. One directory-symlink installer case was skipped because this Windows host cannot create the required link; the separately enabled local CLI version probe passed. These checks do not replace Promotion Evidence.
- Catalog and provenance regressions passed 31/31, including rejection of edited, untracked, and absent component files before binding a source commit.
- The Claude Code - Codex - Gemini Tool passed 29/29 tests, including no-shell local CLI version probes without model invocation.
- The bundled Semgrep rules detected the vulnerable fixture and did not flag the safe fixture.

### Source revisions

- HookPrompt: `83299e7094937f8d0179ff60d304c1c5a25a5740`.
- Claude Code - Codex - Gemini pinned upstream: `fce3202fc48d98173d8756f8002809cefb28fca5`.
- The Kim Service Tool adaptation and fifteen Agent packs are content-matched to source commit `56d8781cce65903d9f367cfb5c5dd6dc9a678912` by the catalog generator. Source provenance does not promote runtime or model capability claims.
- Preserved remote README badge revisions through `d218f4b50cb9015004492a321669112183dc37c5`.

## V1.1 - 2026-07-15

### Affected components

- Repository documentation and cross-platform checkout rules.
- HookPrompt, Agent Teams Playbook, Find Skill, GoalPro, Kim Decision, and Semgrep Skill packaging metadata.

### User-visible changes

- Rewrote the Chinese and English homepages to state clearly that Kim Service is a collection personally built, adapted, open-sourced, and maintained by Lao Jin (KimYx0207).
- Simplified the public README around what each project does, how to use it, where to get updates, and how to contact or support the maintainer.
- Moved catalog, content-hash, validation-gate, and release-protocol details out of the user-facing README and into `docs/maintenance.md`.
- Added repository-wide LF checkout rules so component snapshots verify consistently on Windows, macOS, and Linux.

### Breaking changes and migration

- No user-facing breaking changes.
- `V1.0` remains immutable, but fresh clones could report component hash drift when Git converted line endings on Windows. Use `V1.1` or later for a reproducible checkout and verification result.

### Verification

- Root repository, shared component runner, and release-contract checks passed after line-ending normalization.
- All six affected component hashes were recalculated from LF-normalized files; the three canonical direct-sync components remained byte-identical.
- A default Windows checkout from the remote `V1.1` tag passed the repository and component gates.
- README layout checks passed with the contact banner centered at `720px` and both `260px` payment codes centered in one row.

### Source revisions

- Component source revisions are unchanged from `V1.0`; this release changes repository documentation, checkout normalization, and packaging hashes only.

## V1.0 - 2026-07-15

### Affected components

- Hook: HookPrompt.
- Skills: Agent Teams Playbook, Memory 3-Layer, Find Skill, GoalPro, Kim Decision, Meta Skill Creator, Semgrep Skill, and Xiaohongshu Skill.

### User-visible changes

- Launched Kim Service as the consolidated public collection for one Hook and eight self-contained Skills.
- Included Agent Teams Playbook as a self-contained Skill under `skills/agent-teams-playbook`.
- Made every Skill directory independently understandable and installable with its own `SKILL.md`, README, LICENSE, CHANGELOG, NOTICE, and required runtime files.
- Standardized component verification behind one catalog-driven runner and removed component-specific validation exceptions from the root README.
- Standardized public README support visuals through one catalog-projected layout contract: the `720px` contact banner is centered independently, while the two `260px` payment codes share one centered row with centered cells.
- Replaced the residual fixed candidate-file checklist in Meta Skill Creator with conditional `core / conditional / release` rules.
- Renamed the Claude-specific memory component to platform-neutral `memory-3layer`, with one shared core, Claude Code and Codex Hook adapters, an explicit manual route, and a non-destructive legacy-data migration.
- Added direct canonical-to-Kim-Service exact projection for Meta Skill Creator, Memory 3-Layer, and Xiaohongshu Skill, with no persistent `SKILL-*` intermediary repository and no wrapper-composition layer.
- Added catalog-pinned component hashes, public-boundary checks, secret and machine-path scanning, nested-Git and runtime-projection checks, and protected QR asset verification.
- Retained the required contact QR, WeChat Pay QR, and Alipay QR assets.
- Established the exact repository release contract: `VERSION`, annotated tag, GitHub Release tag, and GitHub Release title use the same case-sensitive `V<major>.<minor>` string.

### Breaking changes and migration

- The public repository identity changes from `KimYx0207/agent-teams-playbook` to `KimYx0207/Kim_Service`. Existing clones should update `origin` to the new repository URL.
- GitHub repository-rename redirects preserve the former `KimYx0207/agent-teams-playbook` web and Git URLs; the old repository name must not be reused because doing so would disable those redirects.
- The historical lowercase `v4.8.0` tag and Release remain part of the preserved Agent Teams Playbook history. Kim Service collection releases use a separate uppercase `V<major>.<minor>` namespace beginning with `V1.0`.
- Users of former component repositories should use the corresponding `hooks/<slug>` or `skills/<slug>` path in Kim Service for current consolidated releases.
- Persistent `SKILL-*` intermediary directories and wrapper-based public export are no longer part of the Meta Skill Creator or Xiaohongshu Skill publication workflow.

### Verification

- `node scripts/check-repository.mjs` passed for 9 components, 242 repository files, and 3 protected QR assets.
- Canonical/runtime/Kim Service direct-sync and full relative-path/SHA-256 gates passed for Meta Skill Creator, Memory 3-Layer, and Xiaohongshu Skill.
- Memory 3-Layer package validation and 27 installer, migration, recording, poisoning-resistance, and loader-preservation tests passed; real Claude Code and Codex Hook smoke remains a separate runtime proof layer.
- All catalog-declared component checks passed through the shared `node scripts/check-components.mjs` runner; components without an independent command remained covered by the same repository root gate.
- The exact `V1.0` release-contract regression passed, including rejection of legacy or malformed collection version forms and empty CHANGELOG sections.
- The release gate accepts the manifest's `owner/repository` identity while still requiring `origin` to resolve to the matching GitHub repository URL.
- README layout regressions passed for incorrect banner width, missing centered containers, uncentered payment tables or cells, and payment codes split across rows.
- `node scripts/check-repository.mjs --release` is required to pass on the clean `main` release commit before tag creation.
- Remote branch, tag, Release metadata, and fresh-tag-clone checks are required after publication and are reported separately from local readiness.
- Superseded by `V1.1` for fresh-clone verification because the original catalog hashes of six imported components reflected a CRLF working tree rather than the LF Git blobs.

### Source revisions

- HookPrompt: `a4c1faac0cc79860308f5553e3be0b0ac32415bb`.
- Agent Teams Playbook history base: `753ff43bd9b1f9aee4d184c4f21e7f494af5a79f`.
- Memory 3-Layer legacy source base: `1d60800c1a34dfe83d8e2b102b24c7d57d87ca53`.
- Memory 3-Layer canonical direct-sync tree: `2592d1f68b3a005355148b5cdccceedeb74d7755e037970087639602537832fb`.
- Find Skill: `cf7635e3755c47b472bfb6dfd854680b5662ee26`.
- GoalPro: `39adc8db765e0e4ad4df8d4ce02e7059fed69f26`.
- Kim Decision: `fbbe41cb6155ffd605c65b5af3f876ec25cfc0ea`.
- Meta Skill Creator canonical direct-sync tree: `294245547c7ce33062926329e361c08dee4218bf0b33ada25d1c66a6cd39319b`.
- Semgrep Skill: `eb6dd5127f5dedc325b9364edf71a2034e5e35b1`.
- Xiaohongshu Skill canonical direct-sync tree: `9464b5dab5222a671b546a5dc1b3e73f45f19f53e4bb54fe3b3b2401a2b537ca`.
