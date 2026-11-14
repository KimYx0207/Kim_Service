import test from 'node:test';
import assert from 'node:assert/strict';
import { auditKnowledgeTrace } from '../scripts/audit-knowledge-trace.mjs';

function trace() {
  return { corpusVersion: 'corpus-4', policyVersion: 'policy-7', allowedSourceIds: ['manual'],
    nodes: [
      { id: 'manual', kind: 'source', revision: '4', revoked: false },
      { id: 'chunk', kind: 'chunk', revision: '2', inputs: [{ id: 'manual', revision: '4' }] },
      { id: 'wiki', kind: 'wiki', revision: '3', inputs: [{ id: 'chunk', revision: '2' }] },
      { id: 'cache', kind: 'cache', revision: '1', inputs: [{ id: 'wiki', revision: '3' }], policyVersion: 'policy-7' }
    ], exposedIds: ['cache'], citedIds: ['manual'] };
}
test('a current authorized source chain can be checked without claiming answer or human quality', () => {
  const input = trace(), original = structuredClone(input), r = auditKnowledgeTrace(input);
  assert.equal(r.status, 'consistent_trace'); assert.deepEqual(r.sourceIds, ['manual']);
  assert.equal(r.answerQualityVerified, false); assert.equal(r.humanReviewVerified, false);
  assert.deepEqual(input, original);
});
test('revocation and ACL changes propagate through chunk, wiki and cache before exposure', () => {
  const revoked = trace(); revoked.nodes[0].revoked = true;
  assert.ok(auditKnowledgeTrace(revoked).issues.some(x => x.code === 'revoked_source'));
  const denied = trace(); denied.allowedSourceIds = [];
  assert.ok(auditKnowledgeTrace(denied).issues.some(x => x.code === 'unauthorized_source'));
});
test('source or intermediate changes invalidate dependents; a surviving mixed summary is not automatically clean', () => {
  const stale = trace(); stale.nodes[0].revision = '5';
  assert.ok(auditKnowledgeTrace(stale).issues.some(x => x.code === 'stale_dependency'));
  const mixed = trace(); mixed.nodes.push({ id: 'private', kind: 'source', revision: '1', revoked: false });
  mixed.nodes[2].inputs.push({ id: 'private', revision: '1' });
  assert.equal(auditKnowledgeTrace(mixed).status, 'rejected');
});
test('missing lineage, unknown IDs, cycles and old cached policy cannot pass', () => {
  for (const [code, mutate] of [
    ['missing_lineage', s => { s.nodes[2].inputs = []; }],
    ['unknown_node', s => { s.exposedIds = ['missing']; }],
    ['lineage_cycle', s => { s.nodes[1].inputs = [{ id: 'wiki', revision: '3' }]; }],
    ['stale_cache_policy', s => { s.nodes[3].policyVersion = 'policy-6'; }]
  ]) { const input = trace(); mutate(input); const result = auditKnowledgeTrace(input); assert.equal(result.status, 'rejected'); assert.ok(result.issues.some(x => x.code === code), code); }
});
test('raw-source-only retrieval works and unrelated revoked content does not block it', () => {
  const input = trace(); input.exposedIds = ['manual']; input.nodes.push({ id: 'old', kind: 'source', revision: '1', revoked: true });
  assert.equal(auditKnowledgeTrace(input).status, 'consistent_trace');
});
test('no exposure is unverified, and collision/undefined access cannot silently authorize content', () => {
  const input = trace(); input.exposedIds = []; input.citedIds = [];
  assert.equal(auditKnowledgeTrace(input).status, 'unverified');
  const bad = trace(); bad.nodes.push({ ...bad.nodes[0] }); assert.throws(() => auditKnowledgeTrace(bad), /unique/);
  delete bad.allowedSourceIds; assert.throws(() => auditKnowledgeTrace(bad), /allowedSourceIds/);
});
