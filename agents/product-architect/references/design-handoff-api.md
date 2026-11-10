# Candidate design handoff check

Run only through the current host's permitted local-tool mechanism:

    node scripts/check-design-handoff.mjs --input-json -

The component-relative helper accepts one JSON object on stdin, at most 262144 bytes. It reads no referenced files, invokes no commands, uses no network and writes no project state. Exit 0 means structure_valid or not_applicable; exit 1 means invalid. It is not an automatically invoked capability and no caller should infer permission from its presence.

## Input

- productDesign: the caller's existing candidate design, including schemaVersion: 1, designId, positive revision, mode (exploration or delivery), sourceRefs, settledDecisionRefs, userJourneys, taskSlices, interfaces, sharedState and optional softwareDesign.
- acceptanceCriteria: current criterion objects with unique id. This checker matches IDs; it does not judge criterion quality.
- settledDecisionRefs: IDs, or objects with decisionId, supplied by the caller as context. The checker does not authenticate those decisions.
- expectedDesignBinding: optional designId and revision to compare with the candidate. Digest, source authenticity and actual current-task authorization remain caller responsibilities.

softwareDesign has schemaVersion: 1; architecture has id, revision, summary, decisionRefs, technologyChoices (id/name/version/rationale/evidenceRefs), constraints (id/requirement/verification), moduleIds. Each module has id, purpose, journeyRefs, decisionRefs, interfaceRefs, stateRefs, taskIds, acceptanceCriterionIds, states (name/behavior), businessRules, implementationNotes and removalCandidates (path/replacement/reason/evidenceRefs). The embedded capability output schema describes these same fields.

All module IDs must equal architecture.moduleIds as a set. Module references resolve within this design and the supplied criteria/decisions; delivery modules have tasks and criterion coverage. A task's criterion and relevant design references must fit its module. Exploration can leave modules empty, or provide only module id/purpose outlines; details are optional until delivery. Delivery still requires the complete module fields. unknown decisions cannot be represented as settled references. A small task with no softwareDesign gets not_applicable, never a claim that its whole design was checked.

## Output and limits

The output contains schemaVersion, status, issues (stable code and location), claimBoundary, nativeRuntimeVerified: false and productAccepted: false. Checks are structural and relational. A structurally valid architecture can still be a poor choice; valid evidenceRefs may point to nonexistent or unsuitable evidence. Only the host and actual review can resolve these gaps.

This helper does not validate the entire Meta PRD, run a scheduler, mark a decision approved, compare content digests, authorize deletion, assess visual quality or prove actual frontend/backend behavior. removalCandidates remain suggestions; their paths are checked for obvious traversal only and are never opened or deleted.
