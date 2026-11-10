import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkDesignHandoff, MAX_INPUT_BYTES } from '../scripts/check-design-handoff.mjs';

const example = JSON.parse(readFileSync(new URL('../example.json', import.meta.url), 'utf8'));
const entrypoint = fileURLToPath(new URL('../scripts/check-design-handoff.mjs', import.meta.url));
function candidate() {
  return { productDesign: structuredClone(example.output.productDesign), acceptanceCriteria: structuredClone(example.input.acceptanceCriteria),
    settledDecisionRefs: structuredClone(example.input.settledDecisions), expectedDesignBinding: { designId: 'synthetic-offline-draft', revision: 1 } };
}
const codes = result => result.issues.map(issue => issue.code);

test('an actual candidate output can pass the relational check without becoming accepted or mutating input', () => {
  const input = candidate(); const before = structuredClone(input);
  const result = checkDesignHandoff(input);
  assert.equal(result.status, 'structure_valid');
  assert.deepEqual(result.issues, []);
  assert.equal(result.productAccepted, false);
  assert.equal(result.nativeRuntimeVerified, false);
  assert.match(result.claimBoundary, /no source, digest, decision-authority, professional-quality/);
  assert.deepEqual(input, before);
});

test('small non-software work is not forced into a new PRD or claimed as checked', () => {
  assert.equal(checkDesignHandoff({ productDesign: { designId: 'small-edit' } }).status, 'not_applicable');
  const input = candidate(); input.productDesign.softwareDesign.modules = [];
  input.productDesign.softwareDesign.architecture.moduleIds = [];
  assert.equal(checkDesignHandoff(input).status, 'structure_valid', 'exploration may precede module planning');
  input.productDesign.mode = 'delivery';
  assert.ok(codes(checkDesignHandoff(input)).includes('delivery_modules_required'));
  input.productDesign.mode = 'exploration';
  input.productDesign.softwareDesign.modules = [{ id: 'outline', purpose: 'Module boundary before detailed design' }];
  input.productDesign.softwareDesign.architecture.moduleIds = ['outline'];
  assert.equal(checkDesignHandoff(input).status, 'structure_valid');
  input.productDesign.mode = 'delivery';
  assert.equal(checkDesignHandoff(input).status, 'invalid', 'delivery cannot use an unfinished outline');
});

test('stale design versions and candidate-supplied decisions fail instead of silently rebinding', () => {
  const stale = candidate(); stale.productDesign.revision = 2;
  assert.ok(codes(checkDesignHandoff(stale)).includes('design_binding_mismatch'));
  const invented = candidate();
  invented.productDesign.settledDecisionRefs.push('unanswered-platform');
  invented.productDesign.softwareDesign.architecture.decisionRefs.push('unanswered-platform');
  assert.equal(checkDesignHandoff(invented).status, 'invalid');
  assert.ok(codes(checkDesignHandoff(invented)).includes('unknown_reference'));
});

test('orphan module, journey and interface references produce actionable locations', () => {
  for (const [field, value] of [['journeyRefs', ['absent-journey']], ['interfaceRefs', ['absent-interface']], ['stateRefs', ['absent-state']], ['taskIds', ['absent-task']]]) {
    const input = candidate(); input.productDesign.softwareDesign.modules[0][field] = value;
    const result = checkDesignHandoff(input);
    assert.equal(result.status, 'invalid');
    assert.ok(result.issues.some(issue => issue.code === 'unknown_reference' && issue.location.endsWith('.' + field)));
  }
  const input = candidate(); input.productDesign.softwareDesign.architecture.moduleIds = [];
  assert.ok(codes(checkDesignHandoff(input)).includes('architecture_modules_mismatch'));
});

test('delivery requires observable criterion coverage and preserves task-to-module relationships', () => {
  const input = candidate(); input.productDesign.mode = 'delivery';
  assert.equal(checkDesignHandoff(input).status, 'structure_valid', 'structure pass still does not certify architecture quality');
  input.acceptanceCriteria.push({ id: 'recovery', condition: 'restart preserves draft', evidenceRequired: 'actual restart observation' });
  input.productDesign.softwareDesign.modules[0].acceptanceCriterionIds.push('recovery');
  assert.ok(codes(checkDesignHandoff(input)).includes('module_criterion_has_no_task'));
  input.productDesign.softwareDesign.modules[0].acceptanceCriterionIds = ['recovery'];
  assert.ok(codes(checkDesignHandoff(input)).includes('task_criterion_outside_module'));
  const referenceMismatch = candidate(); referenceMismatch.productDesign.softwareDesign.modules[0].interfaceRefs = [];
  assert.ok(codes(checkDesignHandoff(referenceMismatch)).includes('task_reference_outside_module'));
});

test('authority assertions and unbounded or traversal content are rejected, never executed', () => {
  const input = candidate(); input.productDesign.softwareDesign.modules[0].executionAllowed = true;
  assert.ok(codes(checkDesignHandoff(input)).includes('content_cannot_grant_authority'));
  const deletion = candidate();
  deletion.productDesign.softwareDesign.modules[0].removalCandidates = [{ path: '../../outside', replacement: 'none', reason: 'unproven', evidenceRefs: ['fixture:claim'] }];
  assert.ok(codes(checkDesignHandoff(deletion)).includes('package_relative_candidate_required'));
  const oversized = candidate(); oversized.productDesign.softwareDesign.modules[0].states = Array.from({ length: 257 }, (_, i) => ({ name: String(i), behavior: 'fixture' }));
  assert.ok(codes(checkDesignHandoff(oversized)).includes('bounded_list_required'));
});

test('the real stdin CLI returns structured results and fails on malformed or oversized input', () => {
  const invoke = input => spawnSync(process.execPath, [entrypoint, '--input-json', '-'], { input, encoding: 'utf8', maxBuffer: 1048576, timeout: 5000 });
  const valid = invoke(JSON.stringify(candidate()));
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).status, 'structure_valid');
  const malformed = invoke('{ private-input-do-not-echo');
  assert.equal(malformed.status, 1);
  assert.equal(JSON.parse(malformed.stdout).issues[0].code, 'invalid_json_input');
  assert.ok(!malformed.stdout.includes('private-input'));
  const oversized = invoke(' '.repeat(MAX_INPUT_BYTES + 1));
  assert.equal(oversized.status, 1);
  assert.equal(JSON.parse(oversized.stdout).issues[0].code, 'input_too_large');
});
