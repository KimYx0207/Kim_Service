import test from 'node:test';
import assert from 'node:assert/strict';
import { assessOptions } from '../scripts/assess-options.mjs';

function study() {
  return {
    environment: 'runtime-20/project-lock-4', evaluatedAt: '2026-11-15',
    criteria: [
      { id: 'monthly-cost', max: 100, unit: 'USD/month', evidenceRequired: 'observed' },
      { id: 'p95', max: 500, unit: 'ms', evidenceRequired: 'observed' }
    ],
    evidence: [
      { id: 'benchmark', kind: 'local_observation', ref: 'runs/comparison.json', version: 'run-2', observedAt: '2026-11-14' },
      { id: 'compat', kind: 'primary_source', ref: 'https://example.org/runtime/docs/v20', version: '20', observedAt: '2026-11-14' }
    ],
    candidates: [
      { id: 'reuse', mechanism: 'Reuse the existing indexed store', environment: 'runtime-20/project-lock-4',
        dependencies: [{ name: 'runtime', version: '20', compatible: true, evidenceRefs: ['compat'] }],
        measurements: [{ criterionId: 'monthly-cost', value: 90, unit: 'USD/month', evidenceRefs: ['benchmark'] }, { criterionId: 'p95', value: 480, unit: 'ms', evidenceRefs: ['benchmark'] }] },
      { id: 'replacement', mechanism: 'Rebuild on a separate managed service', environment: 'runtime-20/project-lock-4',
        dependencies: [{ name: 'runtime', version: '20', compatible: true, evidenceRefs: ['compat'] }],
        measurements: [{ criterionId: 'monthly-cost', value: 150, unit: 'USD/month', evidenceRefs: ['benchmark'] }, { criterionId: 'p95', value: 200, unit: 'ms', evidenceRefs: ['benchmark'] }] }
    ]
  };
}
test('a faster option cannot compensate for a hard budget violation', () => {
  const input = study(), copy = structuredClone(input), result = assessOptions(input);
  assert.deepEqual(result.eligibleForReview, ['reuse']);
  assert.equal(result.candidates[1].status, 'violates-constraints');
  assert.deepEqual(result.candidates[1].failures, ['monthly-cost']);
  assert.equal(result.professionalQualityVerified, false);
  assert.deepEqual(input, copy);
});
test('many sources or a primary-source claim cannot substitute for an observed benchmark', () => {
  const input = study(); input.evidence[0].kind = 'primary_source';
  assert.equal(assessOptions(input).eligibleForReview.length, 0);
  input.evidence[0].kind = 'synthetic';
  assert.equal(assessOptions(input).candidates[0].status, 'needs-evidence');
});
test('different environments, missing compatibility, stale evidence and unknown refs stay unresolved', () => {
  for (const mutate of [
    s => { s.candidates[0].environment = 'runtime-22/other-lock'; },
    s => { s.candidates[0].dependencies[0].compatible = null; },
    s => { s.criteria[0].maxAgeDays = 2; s.evidence[0].observedAt = '2026-11-01'; },
    s => { s.candidates[0].measurements[0].evidenceRefs = ['missing']; }
  ]) { const input = study(); mutate(input); assert.equal(assessOptions(input).candidates[0].status, 'needs-evidence'); }
});
test('unit mismatch, duplicate evidence, invalid numerics and future observations are not comparisons', () => {
  const input = study(); input.candidates[0].measurements[0].unit = 'USD/year';
  assert.equal(assessOptions(input).candidates[0].status, 'needs-evidence');
  input.evidence.push({ ...input.evidence[0] }); assert.throws(() => assessOptions(input), /unique/);
  const bad = study(); bad.candidates[0].measurements[0].value = NaN; assert.throws(() => assessOptions(bad), /finite/);
  const future = study(); future.evidence[0].observedAt = '2026-11-16';
  assert.equal(assessOptions(future).candidates[0].status, 'needs-evidence');
});
test('explicit boolean constraints are checked without assigning invented weights', () => {
  const input = study(); input.criteria = [{ id: 'export', expected: true, unit: 'boolean', evidenceRequired: 'documented' }];
  input.candidates = input.candidates.map((c, i) => ({ ...c, measurements: [{ criterionId: 'export', value: i === 0, unit: 'boolean', evidenceRefs: ['compat'] }] }));
  assert.deepEqual(assessOptions(input).eligibleForReview, ['reuse']);
});
