import { createHelper, hash, unique, requireValue as assert } from './runtime.mjs';

export const run = createHelper(import.meta.url, 'feedback-to-requirements', (input, policy) => {
  assert(input.records.length <= policy.maxRecords && input.groups.length <= policy.maxGroups, 'Feedback/group budget exceeded');
  const records = unique(input.records, 'feedback'); const groups = unique(input.groups, 'groups');
  const members = unique(input.members, 'members'); unique(input.decisions ?? [], 'decisions', 'candidateId');
  const roots = new Map(); const lineages = new Map();
  for (const record of input.records) {
    assert(record.projectId === input.projectId, 'Feedback from another project cannot be merged');
    const seen = new Set(); const lineage = [record.id]; let current = record;
    while (current.duplicateOf) {
      assert(!seen.has(current.id), 'Cyclic duplicate reference'); seen.add(current.id);
      assert(records.has(current.duplicateOf), 'Duplicate reference is missing');
      current = records.get(current.duplicateOf);
      lineage.push(current.id);
    }
    roots.set(record.id, current.id);
    lineages.set(record.id, lineage);
  }
  const contradictions = (input.contradictions ?? []).map(item => {
    assert(item.recordIds.length >= 2 && new Set(item.recordIds).size === item.recordIds.length, 'Contradiction requires distinct evidence');
    for (const id of item.recordIds) assert(records.has(id), 'Contradiction evidence is missing');
    return { ...item, resolution: 'not_decided' };
  });
  const assigned = new Set(); const candidates = [];
  for (const group of input.groups) {
    assert(new Set(group.recordIds).size === group.recordIds.length, 'Group has duplicate record references');
    const selected = group.recordIds.map(id => { assert(records.has(id), 'Group evidence is missing'); assigned.add(id); return records.get(id); });
    // Duplicate targets outside the selected group still determine its counts.
    // Bind their full ancestry and any directly related contradictory evidence,
    // so changed lineage or scope cannot silently reuse an old adoption.
    const evidenceIds = new Set(selected.flatMap(record => lineages.get(record.id)));
    const relevantContradictions = contradictions.filter(item => item.recordIds.some(id => evidenceIds.has(id)));
    for (const contradiction of relevantContradictions) {
      for (const id of contradiction.recordIds) for (const relatedId of lineages.get(id)) evidenceIds.add(relatedId);
    }
    const evidenceRecordIds = [...evidenceIds].sort();
    const evidenceSha256 = hash({ records: evidenceRecordIds.map(id => records.get(id)),
      contradictions: relevantContradictions.slice().sort((a,b)=>a.id.localeCompare(b.id)) });
    const proposal = { id: group.id, title: group.title, acceptanceCriteria: group.acceptanceCriteria,
      sourceRecordIds: group.recordIds, evidenceRecordIds, contradictionIds: relevantContradictions.map(item => item.id), evidenceSha256 };
    const candidateSha256 = hash({ context: input.context, projectId: input.projectId, adoptionRole: input.adoptionRole, proposal });
    const decision = (input.decisions ?? []).find(item => item.candidateId === group.id);
    if (decision) {
      assert(decision.candidateSha256 === candidateSha256, 'Decision is stale for this requirement/evidence version');
      assert(members.get(decision.actorId)?.roles.includes(input.adoptionRole), 'Decision actor lacks the configured adoption role');
    }
    candidates.push({ ...proposal, candidateSha256,
      uniqueCustomers: new Set(selected.map(item => item.customerId).filter(Boolean)).size,
      anonymousFeedback: new Set(selected.filter(item => !item.customerId).map(item => roots.get(item.id))).size,
      uniqueIssues: new Set(selected.map(item => roots.get(item.id))).size,
      adoption: decision ? { status: decision.status, actorId: decision.actorId, reason: decision.reason, evidenceRef: decision.evidenceRef, authenticity: 'caller_supplied' } : { status: 'proposed' } });
  }
  for (const decision of input.decisions ?? []) assert(groups.has(decision.candidateId), 'Decision names unknown candidate');
  return { result: { projectId: input.projectId, feedbackSha256: hash(input.records),
    lineage: input.records.map(item => ({ id: item.id, rootId: roots.get(item.id), sourceRef: item.sourceRef, textSha256: hash(item.text) })),
    candidates, contradictions, unclassifiedRecordIds: input.records.filter(item => !assigned.has(item.id)).map(item => item.id),
    counts: { records: input.records.length, uniqueIssues: new Set(roots.values()).size, uniqueCustomers: new Set(input.records.map(item => item.customerId).filter(Boolean)).size,
      anonymousFeedback: new Set(input.records.filter(item => !item.customerId).map(item => roots.get(item.id))).size },
    interpretation: { semanticMerging: 'caller_supplied_grouping', priority: 'not_inferred', customerIdentity: 'caller_supplied' } } };
});
