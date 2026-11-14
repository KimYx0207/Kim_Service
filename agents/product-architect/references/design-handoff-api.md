# Candidate design handoff check

Run only through the current host's permitted local-tool mechanism:

    node scripts/check-design-handoff.mjs --input-json -

The component-relative helper accepts one JSON object on stdin, at most 262144 bytes. It reads no referenced files, invokes no commands, uses no network and writes no project state. Exit 0 means structure_valid or not_applicable; exit 1 means invalid. It is not an automatically invoked capability and no caller should infer permission from its presence.

## Input

- productDesign: the caller's existing candidate design, including schemaVersion: 1, designId, positive revision, mode (exploration or delivery), sourceRefs, settledDecisionRefs, userJourneys, taskSlices, interfaces, sharedState and optional softwareDesign.
- acceptanceCriteria: the complete criterion set for the candidate's current delivery scope, with unique id. An optional boolean required defaults to true; required:false may remain unassigned. This checker matches IDs; it does not judge criterion quality or discover omitted requirements outside the supplied set.
- settledDecisionRefs: IDs, or objects with decisionId, supplied by the caller as context. The checker does not authenticate those decisions.
- expectedDesignBinding: optional designId and revision to compare with the candidate. Digest, source authenticity and actual current-task authorization remain caller responsibilities.

softwareDesign has schemaVersion: 1; architecture has id, revision, summary, decisionRefs, technologyChoices (id/name/version/rationale/evidenceRefs), constraints (id/requirement/verification), moduleIds. Each module has id, purpose, journeyRefs, decisionRefs, interfaceRefs, stateRefs, taskIds, acceptanceCriterionIds, states (name/behavior), businessRules, implementationNotes and removalCandidates (path/replacement/reason/evidenceRefs). The embedded capability output schema describes these same fields.

All module IDs must equal architecture.moduleIds as a set. Module references resolve within this design and the supplied criteria/decisions; delivery modules have tasks and criterion coverage. A task's criterion and relevant design references must fit its module. Exploration can leave modules empty, or provide only module id/purpose outlines; details are optional until delivery. Delivery still requires the complete module fields. unknown decisions cannot be represented as settled references. A small task with no softwareDesign gets not_applicable, never a claim that its whole design was checked.

For an explicit softwareDesign in delivery mode, coverage is checked in both directions: every non-support task slice and declared user journey must belong to at least one module. Task workKind follows the existing vertical_slice / migration_batch / support values, with omitted workKind treated as implementation. An independent support task need not belong to a software module, but every task's criterion, journey, decision, interface and shared-state references are checked. Module criteria and journeys require coverage by a non-support task in that module; a review task cannot stand in for implementation.

Every required criterion must have declared coverage. A criterion attached to a user journey must have software-module coverage; a module's criteria must have implementation-task coverage even when required:false. A required criterion outside those declared software references may instead belong to an independent support task. That is structural support coverage, not a semantic finding that the criterion is merely governance or that the product goal is fulfilled. Unassigned required criteria report delivery_criterion_uncovered; user-journey criteria without a module report delivery_criterion_has_no_module. Missing task/journey coverage reports delivery_task_has_no_module, delivery_journey_has_no_module or module_journey_has_no_task. Submit the candidate's actual in-scope obligations; do not silently remove a requirement, relabel implementation as support, or change required to bypass it. Exploration may preserve unscheduled content, and optional undeclared criteria stay optional.

Several modules may share a criterion, journey or task when their declared references fit. There is no one-criterion-per-module quota or text-deduplication rule: whether a broad criterion adequately tests several modules requires professional review of its specific observations. Structural coverage does not prove that roles are well separated, methods ran, acceptance evidence exists, or the product meets the user's goal.

## Output and limits

The output contains schemaVersion, status, issues (stable code and location), claimBoundary, nativeRuntimeVerified: false and productAccepted: false. Checks are structural and relational. A structurally valid architecture can still be a poor choice; valid evidenceRefs may point to nonexistent or unsuitable evidence. Only the host and actual review can resolve these gaps.

This helper does not validate the entire Meta PRD, run a scheduler, mark a decision approved, compare content digests, authorize deletion, assess visual quality or prove actual frontend/backend behavior. removalCandidates remain suggestions; their paths are checked for obvious traversal only and are never opened or deleted.
## 项目专业能力输入补充

候选 `productDesign.projectCapabilityRequirements` 可携带项目独立能力需求。每项包含 `projectId/baseComponentId/baseComponentVersion/role/domainEvidenceRefs/responsibilities/boundaries/projectDelta/reuseConditions/targetPath/requiredInputs/toolRequirements/acceptance`；数组项保留项目领域差异和可观察验收。

helper 核非空内容、项目相对目标、重复目标及候选内容不能授予权限；有显式 productDesign.projectId 时核项目一致。仅有专业能力需求的非软件设计可检查这些字段，无需另造 softwareDesign。没有软件设计或专业能力需求的小任务仍为 not_applicable。语义专业性、真实源文件创建/加载和独立审核不在此 helper 的证明范围；`structure_valid` 仍不是专业接受。

Project capability `projectDelta` uses a nonempty string array for new records. Legacy nonempty text is also accepted and preserved unchanged; both Service and Meta bind the original requirement representation.
