// Read-only consistency checks for a host-owned Work. No state, IAM or scheduler.
import { createHash } from 'node:crypto';

export class WorkHandoffError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const requireThat = (condition, code = 'work_handoff_shape') => {
  if (!condition) throw new WorkHandoffError(code);
};
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500 && !/[\x00-\x1f\x7f]/.test(value);
const humanText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 8000 && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value);
function keys(value, required, optional = []) {
  requireThat(object(value) && required.every(key => Object.hasOwn(value, key)) &&
    Object.keys(value).every(key => [...required, ...optional].includes(key)));
}
function refs(value) {
  requireThat(Array.isArray(value) && value.length <= 64 && value.every(text) && new Set(value).size === value.length);
}
const sameRefs = (a, b) => a.length === b.length && a.every(ref => b.includes(ref));
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

// The same normalization/digest used by Meta_Kim. Array order is significant.
export function normalizeWorkContext(value) {
  keys(value, ['schemaVersion', 'organizationRef', 'workRef', 'contextRevision', 'scopeRef'],
    ['sourceRefs', 'acceptedArtifactRefs', 'decisionRefs']);
  requireThat(value.schemaVersion === 'kim-work-context-v1');
  for (const field of ['organizationRef', 'workRef', 'contextRevision', 'scopeRef']) requireThat(text(value[field]));
  const result = { ...value };
  for (const field of ['sourceRefs', 'acceptedArtifactRefs', 'decisionRefs']) {
    result[field] ??= [];
    refs(result[field]);
  }
  return result;
}
export function workBinding(value) {
  const context = normalizeWorkContext(value);
  return { organizationRef: context.organizationRef, workRef: context.workRef, contextRevision: context.contextRevision,
    contextDigest: 'sha256:' + createHash('sha256').update(JSON.stringify(canonical(context))).digest('hex') };
}
function checkBinding(actual, expected) {
  keys(actual, ['organizationRef', 'workRef', 'contextRevision', 'contextDigest']);
  requireThat(Object.keys(expected).every(key => actual[key] === expected[key]), 'work_binding_mismatch');
}

export function validateWorkCriterion(criterion, manifestIds) {
  keys(criterion, ['id', 'description', 'type', 'artifactId', 'artifactBindings', 'runId', 'workBinding']);
  requireThat(manifestIds.has(criterion.artifactId) && text(criterion.runId));
  requireThat(Array.isArray(criterion.artifactBindings) && criterion.artifactBindings.length <= 64);
  for (const binding of criterion.artifactBindings) {
    keys(binding, ['artifactRef', 'artifactId', 'version', 'sha256']);
    requireThat(text(binding.artifactRef) && text(binding.version) && manifestIds.has(binding.artifactId) &&
      binding.artifactId !== criterion.artifactId && /^[a-f0-9]{64}$/.test(binding.sha256));
  }
  refs(criterion.artifactBindings.map(item => item.artifactRef));
  refs(criterion.artifactBindings.map(item => item.artifactId));
  keys(criterion.workBinding, ['organizationRef', 'workRef', 'contextRevision', 'contextDigest']);
  requireThat(['organizationRef', 'workRef', 'contextRevision'].every(key => text(criterion.workBinding[key])) &&
    /^sha256:[a-f0-9]{64}$/.test(criterion.workBinding.contextDigest));
}

// All referenced local artifact bytes have already passed the verifier's manifest
// checks. These records can still be fabricated; provenance remains host-owned.
export function inspectWorkHandoff(data, criterion, artifactMap) {
  keys(data, ['schemaVersion', 'workContext', 'workReceipt', 'artifactBindings', 'adoptionObservation', 'receiving']);
  requireThat(data.schemaVersion === 'kim-work-handoff-v1');
  const context = normalizeWorkContext(data.workContext), expected = workBinding(context);
  checkBinding(criterion.workBinding, expected);
  const receipt = data.workReceipt;
  keys(receipt, ['schemaVersion', 'runId', 'workBinding', 'produced', 'verified', 'adopted', 'effect', 'knowledgeReuse'], ['authority']);
  requireThat(receipt.schemaVersion === 'kim-work-receipt-v1' && receipt.runId === criterion.runId, 'work_run_mismatch');
  if (Object.hasOwn(receipt, 'authority')) requireThat(humanText(receipt.authority));
  checkBinding(receipt.workBinding, expected);

  requireThat(Array.isArray(data.artifactBindings) && data.artifactBindings.length <= 64);
  const bindings = new Map();
  for (const binding of data.artifactBindings) {
    keys(binding, ['artifactRef', 'artifactId', 'version', 'sha256']);
    requireThat(text(binding.artifactRef) && text(binding.version) && !bindings.has(binding.artifactRef));
    const artifact = artifactMap.get(binding.artifactId);
    const requested = criterion.artifactBindings.find(item => item.artifactRef === binding.artifactRef);
    requireThat(requested && Object.keys(requested).every(key => requested[key] === binding[key]) && artifact?.sha256 === binding.sha256,
      'work_artifact_mismatch');
    bindings.set(binding.artifactRef, binding);
  }
  requireThat(data.artifactBindings.length === criterion.artifactBindings.length &&
    sameRefs([...new Set(data.artifactBindings.map(item => item.artifactId))], criterion.artifactBindings.map(item => item.artifactId)),
    'work_artifact_mismatch');
  const boundRefs = value => { refs(value); requireThat(value.every(ref => bindings.has(ref)), 'work_artifact_unbound'); };

  keys(receipt.produced, ['status', 'artifactRefs'], ['source']); boundRefs(receipt.produced.artifactRefs);
  if (Object.hasOwn(receipt.produced, 'source')) requireThat(receipt.produced.source === 'bound_execution_results');
  requireThat(['produced', 'not_produced'].includes(receipt.produced.status) &&
    (receipt.produced.status === 'produced' ? receipt.produced.artifactRefs.length > 0 : receipt.produced.artifactRefs.length === 0));
  keys(receipt.verified, ['status', 'evidenceRefs'], ['source']); refs(receipt.verified.evidenceRefs);
  if (Object.hasOwn(receipt.verified, 'source')) requireThat(receipt.verified.source === 'existing_independent_outcome_review');
  requireThat(['passed', 'failed', 'unknown'].includes(receipt.verified.status) &&
    (receipt.verified.status === 'unknown' || receipt.verified.evidenceRefs.length > 0));
  keys(receipt.adopted, ['status', 'artifactRefs', 'decisionRef', 'reason'], ['source']); boundRefs(receipt.adopted.artifactRefs);
  if (Object.hasOwn(receipt.adopted, 'source')) requireThat(['host_provided_not_independently_verified', 'not_observed'].includes(receipt.adopted.source));
  requireThat(['unknown', 'accepted', 'rejected', 'pending'].includes(receipt.adopted.status) && humanText(receipt.adopted.reason));
  requireThat(receipt.adopted.decisionRef === null || text(receipt.adopted.decisionRef));
  if (receipt.adopted.source === 'not_observed') requireThat(receipt.adopted.status === 'unknown' &&
    receipt.adopted.artifactRefs.length === 0 && receipt.adopted.decisionRef === null, 'work_provenance_mismatch');
  const decided = ['accepted', 'rejected'].includes(receipt.adopted.status);
  if (decided) {
    requireThat(text(receipt.adopted.decisionRef) && (receipt.adopted.status !== 'accepted' || receipt.adopted.artifactRefs.length > 0), 'work_adoption_unbound');
    const decision = data.adoptionObservation;
    keys(decision, ['decisionRef', 'runId', 'workBinding', 'actorRef', 'scopeRef', 'status', 'artifactRefs', 'reason']);
    checkBinding(decision.workBinding, expected);
    requireThat(decision.runId === receipt.runId && decision.scopeRef === context.scopeRef && text(decision.actorRef),
      'work_adoption_scope_mismatch');
    refs(decision.artifactRefs);
    requireThat(decision.decisionRef === receipt.adopted.decisionRef && decision.status === receipt.adopted.status &&
      sameRefs(decision.artifactRefs, receipt.adopted.artifactRefs) && decision.reason === receipt.adopted.reason,
      'work_adoption_mismatch');
  } else requireThat(data.adoptionObservation === null, 'work_adoption_mismatch');

  keys(receipt.effect, ['status', 'evidenceRefs', 'summary'], ['source']); refs(receipt.effect.evidenceRefs);
  if (Object.hasOwn(receipt.effect, 'source')) requireThat(['host_provided_not_independently_verified', 'not_observed'].includes(receipt.effect.source));
  requireThat(['unknown', 'observed'].includes(receipt.effect.status) && humanText(receipt.effect.summary) &&
    (receipt.effect.status === 'unknown' || receipt.effect.evidenceRefs.length > 0));
  if (receipt.effect.source === 'not_observed') requireThat(receipt.effect.status === 'unknown' &&
    receipt.effect.evidenceRefs.length === 0, 'work_provenance_mismatch');
  requireThat(Array.isArray(receipt.knowledgeReuse) && receipt.knowledgeReuse.length <= 64);
  for (const reuse of receipt.knowledgeReuse) {
    keys(reuse, ['sourceRef', 'disposition', 'reason']);
    requireThat(text(reuse.sourceRef) && ['direct', 'adapted', 'not_applicable'].includes(reuse.disposition) && humanText(reuse.reason));
  }

  const receiving = data.receiving;
  keys(receiving, ['status', 'recipientRef', 'scopeRef', 'artifactRefs', 'nextAction', 'receipt']);
  requireThat(['pending', 'acknowledged'].includes(receiving.status) && text(receiving.recipientRef) &&
    humanText(receiving.nextAction) && receiving.scopeRef === context.scopeRef, 'work_receiving_scope_mismatch');
  boundRefs(receiving.artifactRefs);
  if (receipt.adopted.status === 'accepted') requireThat(receipt.adopted.artifactRefs.every(ref => receiving.artifactRefs.includes(ref)),
    'work_receiving_omits_adopted');
  if (receiving.status === 'acknowledged') {
    const acknowledgment = receiving.receipt;
    keys(acknowledgment, ['receiptRef', 'recipientRef', 'runId', 'workBinding', 'artifactRefs']);
    requireThat(text(acknowledgment.receiptRef) && acknowledgment.recipientRef === receiving.recipientRef &&
      acknowledgment.runId === receipt.runId, 'work_receiving_mismatch');
    checkBinding(acknowledgment.workBinding, expected);
    refs(acknowledgment.artifactRefs);
    requireThat(sameRefs(acknowledgment.artifactRefs, receiving.artifactRefs), 'work_receiving_mismatch');
  } else requireThat(receiving.receipt === null, 'work_receiving_mismatch');

  return { produced: receipt.produced.status, verified: receipt.verified.status, adopted: receipt.adopted.status,
    effect: receipt.effect.status, receiving: receiving.status, authenticity: 'not_verified', finalAcceptance: 'not_decided' };
}
