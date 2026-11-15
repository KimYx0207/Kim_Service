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

test('practice-first route waits for learner work and retains the explanation route', () => {
  const method = fs.readFileSync(path.join(root, 'references/professional-method.md'), 'utf8');
  const practice = method.split('## 先练后评的可选路径\n')[1]?.split('\n## ')[0] ?? '';
  assert.match(practice, /学习者.*先.*(动手|独立)/, 'practice-first requires learner intent');
  assert.match(practice, /先.*(小题|微任务)/, 'a concrete task comes before the answer');
  assert.match(practice, /提交.*(作答|作品|测试)/, 'feedback follows submitted evidence');
  assert.match(practice, /不.*提前.*(答案|解法)/, 'do not spoil the independent attempt');
  assert.match(practice, /未.*提交.*(not_run|未验证)/, 'no mastery claim before observation');
  assert.match(practice, /直接解释/, 'existing explanation remains available when needed');
});
