import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = fs.readFileSync(path.join(componentRoot, 'SKILL.md'), 'utf8');
const goalpro = JSON.parse(fs.readFileSync(path.join(componentRoot, 'capability.json'), 'utf8'));
const kimDecision = JSON.parse(fs.readFileSync(path.join(componentRoot, '..', 'kim-decision', 'capability.json'), 'utf8'));

test('prompt-only capabilities have no write permission, side effect, execution, routing, or acceptance authority', () => {
  for (const capability of goalpro.capabilities) {
    assert.ok(capability.permissions.every((permission) => permission.startsWith('read-only')));
    assert.deepEqual(capability.sideEffects, []);
    assert.deepEqual(capability.humanGate, { required: false, when: [] });
    assert.equal(capability.output.properties.executionAuthorized.const, false);
  }
  assert.match(skill, /不选择或路由组件，不协调跨组件状态机/);
  assert.match(skill, /不执行目标、运行 Loop 或替用户做最终验收/);
});

test('GoalPro and Kim Decision explicitly hand off instead of claiming each other\'s job', () => {
  const goalBoundary = goalpro.capabilities.flatMap((item) => item.doNotUseWhen).join('\n');
  const decision = kimDecision.capabilities.find((item) => item.id === 'kim-decision-analysis');
  assert.ok(decision);
  const decisionBoundary = decision.doNotUseWhen.join('\n');

  assert.match(goalBoundary, /product or business decision analysis/i);
  assert.match(goalBoundary, /route work|route components/i);
  assert.match(decisionBoundary, /Goal Prompt or Loop Prompt/i);
  assert.match(decisionBoundary, /route components|cross-component state machine/i);

  const ids = [...goalpro.capabilities, ...kimDecision.capabilities].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, 'capability ids must not collide');
});
