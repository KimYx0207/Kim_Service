import { createHelper, hash, equal, unique, requireValue as assert } from './runtime.mjs';

export const run = createHelper(import.meta.url, 'customer-case-operations', (input, policy) => {
  assert(input.cases.length <= policy.maxCases && input.events.length <= policy.maxEvents, 'Case/event budget exceeded');
  const { workflow } = input; const states = unique(workflow.states, 'states');
  const workflowSha256 = hash(workflow);
  // A decision is about this company's Work, workflow and artifact, not merely
  // a coincidentally equal case ID/state in another invocation.
  const snapshotHash = item => hash({ context: input.context, workflowSha256,
    case: { caseId: item.id, customerId: item.customerId, state: item.state, ownerId: item.ownerId,
      materials: item.materials, version: item.version, artifactVersion: item.artifactVersion } });
  const transitions = unique(workflow.transitions, 'transitions'); const members = unique(input.members, 'members');
  assert(states.has(workflow.initialState), 'Workflow initial state does not exist');
  for (const transition of workflow.transitions) {
    assert(states.has(transition.from) && states.has(transition.to), 'Transition points to an unknown state');
    assert(!states.get(transition.from).terminal, 'Terminal state cannot have outgoing transitions');
  }
  const cases = unique(input.cases.map(item => ({ ...structuredClone(item), receipts: [], adoption: null })), 'cases');
  for (const item of cases.values()) {
    assert(states.has(item.state), 'Unknown case state'); assert(members.has(item.ownerId), 'Case owner is missing'); unique(item.materials, 'materials');
    for (const required of states.get(item.state).requiredMaterials) assert(item.materials.some(material => material.id === required), 'Initial state lacks required material');
  }
  const processed = new Map(); const outcomes = [];
  for (const event of input.events) {
    if (processed.has(event.id)) { assert(equal(processed.get(event.id), event), 'Conflicting duplicate event ID'); outcomes.push({ eventId: event.id, status: 'duplicate_ignored' }); continue; }
    processed.set(event.id, event);
    const item = cases.get(event.caseId); assert(item, 'Event case is missing');
    const actor = members.get(event.actorId); assert(actor, 'Event actor is missing');
    const snapshotSha256 = snapshotHash(item);
    if (event.kind === 'transition') {
      const transition = transitions.get(event.transitionId); assert(transition, 'Transition is missing');
      assert(event.expectedVersion === item.version && transition.from === item.state, 'Stale case version or state');
      assert(transition.roles.some(role => actor.roles.includes(role)), 'Actor lacks a transition role');
      const required = [...transition.requiredMaterials, ...states.get(transition.to).requiredMaterials];
      assert(required.every(id => item.materials.some(material => material.id === id)), 'Transition lacks required materials');
      if (transition.requiresDecision) {
        const decision = event.decision;
        assert(decision && decision.caseSnapshotSha256 === snapshotSha256 && decision.transitionId === transition.id, 'Missing or stale decision');
        assert(members.get(decision.actorId)?.roles.some(role => transition.decisionRoles.includes(role)), 'Decision actor lacks its configured role');
      }
      item.state = transition.to; item.version++;
    } else if (event.kind === 'material') {
      assert(event.expectedVersion === item.version && (event.actorId === item.ownerId || actor.roles.includes(workflow.managerRole)), 'Stale version or unauthorized material update');
      const i = item.materials.findIndex(material => material.id === event.material.id);
      if (i < 0) item.materials.push(event.material); else item.materials[i] = event.material;
      item.version++;
    } else if (event.kind === 'receipt') {
      assert(event.expectedVersion === item.version && event.artifactVersion === item.artifactVersion, 'Receipt refers to a stale case/artifact version');
      if (event.receiptKind === 'verified') assert(actor.roles.includes(workflow.verificationRole), 'Actor lacks verification role');
      item.receipts.push({ eventId: event.id, kind: event.receiptKind, actorId: event.actorId, caseVersion: item.version, artifactVersion: event.artifactVersion, evidenceRef: event.evidenceRef, authenticity: 'caller_supplied' });
    } else if (event.kind === 'adoption') {
      assert(event.expectedVersion === item.version && event.artifactVersion === item.artifactVersion, 'Adoption refers to a stale case/artifact version');
      assert(actor.roles.includes(workflow.adoptionRole), 'Actor lacks adoption role');
      assert(item.receipts.some(receipt => receipt.kind === 'verified' && receipt.artifactVersion === event.artifactVersion && receipt.caseVersion === item.version), 'Adoption needs a version-matched verification receipt');
      item.adoption = { status: event.status, actorId: event.actorId, caseVersion: item.version, artifactVersion: event.artifactVersion, reason: event.reason, evidenceRef: event.evidenceRef, authenticity: 'caller_supplied' };
    }
    outcomes.push({ eventId: event.id, status: 'applied_to_projection', beforeSha256: snapshotSha256, caseVersion: item.version });
  }
  const projections = [...cases.values()].map(item => {
    const available = workflow.transitions.filter(transition => transition.from === item.state).map(transition => ({ transitionId: transition.id, to: transition.to,
      requiredRoles: transition.roles, requiresDecision: transition.requiresDecision,
      missingMaterials: [...new Set([...transition.requiredMaterials, ...states.get(transition.to).requiredMaterials])].filter(id => !item.materials.some(material => material.id === id)) }));
    const { receipts, adoption, ...fields } = item;
    return { ...fields, caseSnapshotSha256: snapshotHash(item),
      terminal: states.get(item.state).terminal, receipts, adoption: adoption && adoption.caseVersion === item.version ? adoption : { status: 'not_decided', previous: adoption }, nextActions: available,
      effect: 'not_observed' };
  });
  return { result: { workflowSha256, cases: projections, events: outcomes,
    stateKind: 'deterministic_projection', notificationsSent: false, schedulerRunning: false, eventHistorySha256: hash(input.events) } };
});
