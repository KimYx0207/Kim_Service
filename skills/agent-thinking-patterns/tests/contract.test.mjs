import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const patterns = () => JSON.parse(read('references/patterns.json'));

test('the ten transferable patterns have stable, unique identities and sources', () => {
  const items = patterns().patterns;
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map((pattern) => pattern.id)).size, 10);
  assert.deepEqual(items.map((pattern) => pattern.id), [
    'clarify-real-problem', 'adversarial-review', 'backcast-goal', 'expert-comparison',
    'decision-tradeoffs', 'opportunity-scan', 'practice-feedback', 'repeatable-system',
    'knowledge-extraction', 'strategic-focus'
  ]);
  for (const item of items) {
    assert.match(item.source, /^https:\/\/x\.com\/PaulYoungX\/status\/\d+$/);
    assert.ok(item.trigger && item.action && item.evidenceBoundary && item.skipWhen);
  }
});

test('the common method is role-neutral and specifically permits non-education practice and feedback', () => {
  const skill = read('SKILL.md');
  const contract = JSON.parse(read('capability.json'));
  const method = JSON.parse(read('method.json'));
  assert.equal(contract.componentType, 'skill');
  assert.equal(contract.id, 'agent-thinking-patterns');
  assert.equal(method.roleId, contract.id);
  assert.equal(method.automaticInvocation, false);
  assert.match(skill, /任何专业 Agent|任意专业 Agent/);
  assert.match(skill, /代码评审|产品设计/);
  assert.match(skill, /先练.*提交.*反馈/s);
  assert.doesNotMatch(skill, /所有任务必须.*10/);
  assert.ok(contract.capabilities[0].useWhen.some((value) => /领域|Agent/.test(value)));
  assert.ok(contract.capabilities[0].doNotUseWhen.some((value) => /简单|无需/.test(value)));
});

test('a shared thinking method cannot silently change authority or manufacture evidence', () => {
  const skill = read('SKILL.md');
  const patternsFile = patterns();
  assert.match(skill, /宿主.*权限/);
  assert.match(skill, /未.*提交/);
  assert.match(skill, /证据/);
  assert.equal(patternsFile.defaultBehavior, 'select-relevant-only');
  assert.equal(patternsFile.runtimeInvocation, 'host-dependent');
});
