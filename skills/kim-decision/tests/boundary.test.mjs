import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = fs.readFileSync(path.join(componentRoot, 'SKILL.md'), 'utf8');
const kimDecision = JSON.parse(fs.readFileSync(path.join(componentRoot, 'capability.json'), 'utf8'));
const goalpro = JSON.parse(fs.readFileSync(path.join(componentRoot, '..', 'goalpro', 'capability.json'), 'utf8'));
const decision = kimDecision.capabilities.find((item) => item.id === 'kim-decision-analysis');

test('decision analysis is read-only and cannot execute or claim final acceptance', () => {
  assert.ok(decision.permissions.length > 0);
  assert.ok(decision.permissions.every((item) => item.startsWith('read-only')));
  assert.deepEqual(decision.sideEffects, []);
  assert.deepEqual(decision.humanGate, { required: false, when: [] });
  assert.equal(decision.output.properties.executionAuthorized.const, false);
  assert.equal(decision.output.properties.finalAcceptanceClaimed.const, false);
  assert.match(skill, /execute the recommended action, or claim final acceptance/);
});

test('Kim Decision does not generate goals, route components, or own cross-component state', () => {
  const boundary = decision.doNotUseWhen.join('\n');
  assert.match(boundary, /Goal Prompt or Loop Prompt/i);
  assert.match(boundary, /select or route components/i);
  assert.match(boundary, /cross-component state machine/i);
  assert.match(skill, /does not generate Goal Prompts or Loop Prompts/);
  assert.match(skill, /select or route between components/);

  const goalCapability = goalpro.capabilities.find((item) => item.id === 'goalpro-goal-prompt');
  assert.ok(goalCapability);
  assert.match(goalCapability.useWhen.join('\n'), /write, improve, or repair a goal/i);
  assert.match(goalCapability.doNotUseWhen.join('\n'), /use Kim Decision instead/i);
});
