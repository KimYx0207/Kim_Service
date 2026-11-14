import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const contract = read('capability.json');
const method = read('method.json');
const example = read('example.json');
test('standalone role owns a specific method without granting runtime permissions', () => {
  assert.equal(contract.id, path.basename(root));
  assert.equal(method.roleId, contract.id);
  assert.equal(method.runtimeStatus, 'needs_probe');
  assert.equal(method.automaticInvocation, false);
  assert.equal(method.coordinationOwner, 'caller');
  assert.equal(method.finalAcceptance, 'caller_only');
  assert.ok(method.steps.length >= 5);
  assert.ok(method.acceptance.length >= 3);
  assert.ok(method.toolSlots.length > 0);
  assert.ok(method.stopConditions.includes('explicit_denial'));
  assert.ok(method.stopConditions.includes('resource_lease_unavailable'));
  const cap = contract.capabilities[0];
  assert.deepEqual(cap.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(cap.sideEffects, []);
  assert.equal(cap.humanGate.required, true);
  for (const file of ['AGENT.md','README.md','LICENSE','NOTICE','CHANGELOG.md']) assert.ok(fs.statSync(path.join(root,file)).isFile());
});
test('complete synthetic handoff has every required input and output and no success claim', () => {
  const cap = contract.capabilities[0];
  for (const direction of ['input','output']) for (const key of cap[direction].required) {
    assert.ok(Object.hasOwn(cap[direction].properties,key), key);
    assert.ok(Object.hasOwn(example[direction],key), key);
  }
  assert.equal(example.output.status, 'partial');
  assert.equal(example.output.nativeRuntimeVerified, false);
  assert.deepEqual(example.output.artifactRefs, []);
  assert.ok(example.output.criterionResults.every(x => x.status === 'not_run'));
  assert.ok(example.output.missingCapabilities.length > 0);
});
test('documents keep execution, safety and context boundaries explicit', () => {
  const agent = fs.readFileSync(path.join(root,'AGENT.md'),'utf8');
  assert.ok(agent.includes('method.json'));
  assert.ok(agent.includes('只读声明') || agent.includes('默认权限'));
  assert.ok(agent.includes('不改API'));
  assert.ok(agent.includes('不读取历史会话'));
  assert.ok(agent.includes('共享资源'));
  assert.ok(!agent.includes('C:/Users/'));
  assert.ok(!agent.includes('Kim_Service-task-agents'));
});

test('phase-specific professional deliverables retain review coverage without becoming universal requirements', () => {
  const cap = contract.capabilities[0];
  const guide = method.expertise.contractGuidance.find(item => item.capabilityId === cap.id);
  for (const field of ['exploration', 'experienceDesign', 'deliverySlices', 'productDesign']) {
    assert.ok(Object.hasOwn(cap.output.properties, field), field);
    assert.ok(!cap.output.required.includes(field), `${field} must remain conditional on the task phase`);
    const checks = guide.outputChecks.filter(check => check.field === field);
    assert.equal(checks.length, 1, `${field} needs one source-bound professional review rule`);
    assert.equal(checks[0].verificationMethod, 'domain_review');
    assert.equal(checks[0].blocking, true);
    assert.ok(checks[0].evidenceRequired.length > 0);
  }
});

// This regression checks that authored counterexamples have a live method to
// guide independent review. It does not infer a verdict from candidate words.
test('delivery action counterexamples bind to the live professional method without grading candidate semantics', () => {
  const examples = read('evals/professional-cases.json');
  assert.equal(examples.inputProvenance, 'synthetic');
  assert.equal(examples.evaluationStatus, 'not_evaluated');
  for (const id of ['orphaned-demo-action', 'unavailable-rollback-input', 'consumer-missing-producer-dependency', 'action-covered-delivery-handoff']) {
    const item = examples.cases.find(candidate => candidate.id === id);
    assert.ok(item, `Missing authored review case: ${id}`);
    assert.equal(item.input.phase, 'delivery_slicing');
    assert.ok(item.diagnosticRefs.includes('execution-action-coverage'));
    assert.ok(item.decisionRuleRefs.includes('trace-delivery-actions'));
  }
  const checks = method.expertise.contractGuidance[0].outputChecks;
  for (const field of ['deliverySlices', 'productDesign']) {
    const check = checks.find(item => item.field === field);
    assert.equal(check.verificationMethod, 'domain_review');
    assert.equal(check.blocking, true);
    assert.ok(!contract.capabilities[0].output.required.includes(field), 'Exploration must not be forced to claim complete execution design');
  }
});
