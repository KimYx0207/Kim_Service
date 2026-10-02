import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(fs.readFileSync(path.join(componentRoot, 'capability.json'), 'utf8'));
const skill = fs.readFileSync(path.join(componentRoot, 'SKILL.md'), 'utf8');

function capability(id) {
  const result = contract.capabilities.find((item) => item.id === id);
  assert.ok(result, `missing capability ${id}`);
  return result;
}

function assertConceptualOutput(schema, value) {
  assert.equal(schema.deliveryFormat, 'conceptual-human-delivery');
  assert.deepEqual(schema.required, ['content']);
  for (const key of schema.required) assert.ok(Object.hasOwn(value, key), `missing ${key}`);
  for (const [key, rule] of Object.entries(schema.properties)) {
    if (Object.hasOwn(rule, 'const')) assert.equal(value[key], rule.const, `${key} must equal its const`);
    if (rule.enum) assert.ok(rule.enum.includes(value[key]), `${key} must match its enum`);
    if (rule.type === 'string') assert.equal(typeof value[key], 'string', `${key} must be a string`);
  }
}

test('contract identifies the proven GoalPro component version and entrypoint', () => {
  assert.equal(contract.schemaVersion, 1);
  assert.equal(contract.id, 'goalpro');
  assert.equal(contract.componentType, 'skill');
  assert.equal(contract.componentVersion, '0.1.4'); // Proven by this component's CHANGELOG, not the collection version.
  assert.equal(contract.entrypoint, 'SKILL.md');
});

test('finite delivery supports Goal Prompt and evidence-qualified optional Loop', () => {
  const goal = capability('goalpro-goal-prompt');
  assertConceptualOutput(goal.output, {
    artifactType: 'goal-prompt',
    content: 'Goal:\nShip the bounded change with named evidence and stop conditions.',
    evidenceStatus: 'sufficient',
    executionAuthorized: false
  });
  const loop = capability('goalpro-loop-prompt');
  assertConceptualOutput(loop.output, {
    artifactType: 'loop-prompt',
    content: '时间参数:\n手动：贴入上一轮结果后继续',
    continuationNeed: 'post-delivery-evidence',
    executionAuthorized: false
  });
  assert.match(skill, /默认一次性交付只输出 `Goal Prompt`/);
  assert.match(skill, /复杂、多文件、需要多个 checkpoint、一次执行内反复验证，不自动构成/);
});

test('insufficient evidence yields a draft or research plan rather than invented certainty', () => {
  const goal = capability('goalpro-goal-prompt');
  assertConceptualOutput(goal.output, {
    artifactType: 'draft-goal',
    content: 'Draft Goal:\nKeep the unknown decision fork explicit and delegate evidence collection.',
    evidenceStatus: 'insufficient',
    executionAuthorized: false
  });
  assert.match(skill, /不足输出 `Draft Goal` 或 `Research Plan`/);
});

test('Loop Prompt remains a separate non-executing artifact', () => {
  const loop = capability('goalpro-loop-prompt');
  assertConceptualOutput(loop.output, {
    artifactType: 'loop-prompt',
    content: '时间参数:\n手动：贴入上一轮结果后继续',
    continuationNeed: 'explicit-loop-request',
    executionAuthorized: false
  });
  assert.match(loop.useWhen.join('\n'), /post-delivery evidence/i);
  assert.match(loop.doNotUseWhen.join('\n'), /run the loop|execute fixes/i);
  assert.match(skill, /Loop 只是交付后可粘贴的继续进化提示词，不授权当前回合执行/);
});

test('Loop eligibility no longer accepts an unconditional default reason', () => {
  const loop = capability('goalpro-loop-prompt');
  const reasons = ['explicit-loop-request', 'post-delivery-evidence'];
  assert.deepEqual(loop.input.properties.continuationNeed.enum, reasons);
  assert.deepEqual(loop.output.properties.continuationNeed.enum, reasons);
  assert.ok(loop.input.required.includes('continuationNeed'));
  assert.match(loop.doNotUseWhen.join('\n'), /finite delivery/);
  assert.throws(() => assertConceptualOutput(loop.output, {
    artifactType: 'loop-prompt', content: 'Not eligible',
    continuationNeed: 'default-goalpro-delivery', executionAuthorized: false
  }), /enum/);
});
