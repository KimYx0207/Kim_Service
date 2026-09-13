import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(componentRoot, 'capability.json'), 'utf8'));
const skill = fs.readFileSync(path.join(componentRoot, 'SKILL.md'), 'utf8');
const decision = contract.capabilities.find((item) => item.id === 'kim-decision-analysis');

function assertDecisionOutput(value) {
  const schema = decision.output;
  assert.equal(schema.deliveryFormat, 'conceptual-human-delivery');
  assert.deepEqual(schema.required, ['evidence', 'nextAction', 'passSignal']);
  for (const key of schema.required) assert.ok(Object.hasOwn(value, key), `missing ${key}`);
  assert.equal(value.artifactType, 'decision-analysis');
  assert.ok(schema.properties.status.enum.includes(value.status));
  assert.equal(value.executionAuthorized, false);
  assert.equal(value.finalAcceptanceClaimed, false);
  assert.equal(typeof value.nextAction, 'string');
  assert.equal(typeof value.passSignal, 'string');
  for (const key of ['confirmed', 'assumptions', 'gaps']) assert.ok(Array.isArray(value.evidence[key]));
  if (value.status === 'decision-ready') assert.equal(typeof value.verdict, 'string');
  if (value.status === 'evidence-required') {
    assert.equal(value.verdict, null);
    assert.ok(value.evidence.gaps.length > 0);
  }
}

test('contract identifies the proven Kim Decision component version and entrypoint', () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.id, 'kim-decision');
  assert.equal(contract.componentType, 'skill');
  assert.equal(contract.componentVersion, '0.0.0+imported.fbbe41c');
  const changelog = fs.readFileSync(path.join(componentRoot, 'CHANGELOG.md'), 'utf8');
  assert.match(changelog, /revision `fbbe41cb6155ffd605c65b5af3f876ec25cfc0ea`/);
  assert.equal(contract.entrypoint, 'SKILL.md');
  assert.ok(decision);
});

test('decision-ready output carries a verdict, evidence state, next action, and pass signal', () => {
  assertDecisionOutput({
    artifactType: 'decision-analysis',
    status: 'decision-ready',
    verdict: 'Test the narrower paid offer before expanding the product.',
    evidence: {
      confirmed: ['The user has one reachable buyer segment.'],
      assumptions: ['The buyer will pay for the narrow outcome.'],
      gaps: []
    },
    nextAction: 'Offer the narrow outcome to five qualified buyers.',
    passSignal: 'At least two buyers agree to a paid pilot.',
    executionAuthorized: false,
    finalAcceptanceClaimed: false
  });
});

test('insufficient evidence returns an explicit gap and withholds a decision-ready verdict', () => {
  assertDecisionOutput({
    artifactType: 'decision-analysis',
    status: 'evidence-required',
    verdict: null,
    evidence: {
      confirmed: [],
      assumptions: ['The target buyer has the stated pain.'],
      gaps: ['No buyer interview, payment signal, or comparable behavior is available.']
    },
    nextAction: 'Collect three buyer interviews focused on current workaround and willingness to pay.',
    passSignal: 'Two buyers independently name the same costly workaround and accept the test price.',
    executionAuthorized: false,
    finalAcceptanceClaimed: false
  });
  assert.match(skill, /return `evidence-required`/);
  assert.match(skill, /withhold a decision-ready verdict/);
});
