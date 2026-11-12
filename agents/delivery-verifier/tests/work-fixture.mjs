import { fixture } from './fixture.mjs';
import { workBinding } from '../scripts/work-handoff.mjs';

// Entirely synthetic company, people and outputs. This is not a production receipt.
export function workFixture() {
  const f = fixture();
  f.request.artifacts = [];
  f.request.taskId = 'synthetic-course-work';
  const old = f.put('course-v1', 'course-v1.txt', 'Synthetic course outline, adopted version 1.');
  const current = f.put('course-v2', 'course-v2.txt', 'Synthetic revision 2; a new draft is not an adoption.');
  const workContext = { schemaVersion: 'kim-work-context-v1', organizationRef: 'org:synthetic-company',
    workRef: 'work:course-launch', contextRevision: 'revision:2', scopeRef: 'scope:internal-course-team',
    sourceRefs: ['source:brief-v1', 'experience:old-image-platform'],
    acceptedArtifactRefs: ['artifact:course-v1'], decisionRefs: ['decision:retain-v1'] };
  const binding = workBinding(workContext);
  const artifactBindings = [
    { artifactRef: 'artifact:course-v1', artifactId: old.id, version: '1', sha256: old.sha256 },
    { artifactRef: 'artifact:course-v2', artifactId: current.id, version: '2', sha256: current.sha256 }
  ];
  const workReceipt = { schemaVersion: 'kim-work-receipt-v1', runId: 'synthetic-run-2', workBinding: binding,
    produced: { status: 'produced', artifactRefs: ['artifact:course-v2'], source: 'bound_execution_results' },
    verified: { status: 'passed', evidenceRefs: ['review:synthetic-v2'], source: 'existing_independent_outcome_review' },
    adopted: { status: 'accepted', artifactRefs: ['artifact:course-v1'], decisionRef: 'decision:retain-v1',
      reason: 'The owner retained version 1 for the current launch.', source: 'host_provided_not_independently_verified' },
    effect: { status: 'unknown', evidenceRefs: [], summary: 'unknown', source: 'not_observed' },
    knowledgeReuse: [{ sourceRef: 'experience:old-image-platform', disposition: 'not_applicable', reason: 'The target channel differs; no transfer of the previous result.' }],
    authority: 'References do not grant access, authenticate adoption/effect, or authorize knowledge publication.' };
  const handoff = { schemaVersion: 'kim-work-handoff-v1', workContext, workReceipt, artifactBindings,
    adoptionObservation: { decisionRef: 'decision:retain-v1', runId: workReceipt.runId, workBinding: binding,
      actorRef: 'person:synthetic-owner', scopeRef: workContext.scopeRef,
      status: 'accepted', artifactRefs: ['artifact:course-v1'], reason: workReceipt.adopted.reason },
    receiving: { status: 'acknowledged', recipientRef: 'person:synthetic-editor', scopeRef: workContext.scopeRef,
      artifactRefs: ['artifact:course-v1', 'artifact:course-v2'], nextAction: 'Continue with the adopted version; keep the new draft separately.',
      receipt: { receiptRef: 'receipt:synthetic-editor-2', recipientRef: 'person:synthetic-editor', runId: workReceipt.runId,
        workBinding: binding, artifactRefs: ['artifact:course-v1', 'artifact:course-v2'] } } };
  f.request.criteria = [{ id: 'work-handoff', description: 'Current Work, exact versions and receiving consistency',
    type: 'work_handoff', artifactId: 'handoff', artifactBindings: structuredClone(artifactBindings),
    runId: workReceipt.runId, workBinding: structuredClone(binding) }];
  const save = () => f.put('handoff', 'handoff.json', handoff);
  save();
  return { ...f, handoff, save };
}
