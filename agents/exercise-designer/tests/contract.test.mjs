import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('standalone agent has a bounded, readable contract', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  assert.equal(contract.id, path.basename(root));
  assert.equal(contract.componentType, 'agent');
  assert.equal(contract.entrypoint, 'AGENT.md');
  assert.ok(agent.includes('name: ' + contract.id));
  for (const section of ['角色定位', '需要你提供什么', '我会给你什么', '工作步骤', '边界与不确定时怎么办', '示例']) {
    assert.ok(agent.includes('## ' + section), section);
  }
  for (const capability of contract.capabilities) {
    assert.ok(capability.useWhen.length >= 3);
    assert.ok(capability.doNotUseWhen.length >= 3);
    assert.deepEqual(capability.sideEffects, []);
    assert.equal(capability.humanGate.required, true);
    for (const shape of [capability.input, capability.output]) {
      assert.ok(shape.required.length > 0);
      for (const field of shape.required) assert.ok(Object.hasOwn(shape.properties, field), field);
    }
  }
  for (const file of ['README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md']) assert.ok(fs.statSync(path.join(root, file)).isFile());
});

test('practice-first exercise delivery separates the prompt from its answer key', () => {
  const method = fs.readFileSync(path.join(root, 'references/professional-method.md'), 'utf8');
  const practice = method.split('## 练习先行与答案延迟展示\n')[1]?.split('\n## ')[0] ?? '';
  assert.match(practice, /学习者.*只.*(题目|任务)/, 'learner sees the task, not the key');
  assert.match(practice, /答案钥匙.*(评分者|教师|内部)/, 'keep the answer key for evaluation');
  assert.match(practice, /无法.*区分.*(接收者|读者)/, 'avoid leaking the answer in a shared view');
  assert.match(practice, /收到.*(作答|提交).*再.*反馈/, 'feedback is evidence-based');
  assert.match(practice, /不.*(提前|直接).*展示.*答案/, 'never pre-reveal the target answer');
});
