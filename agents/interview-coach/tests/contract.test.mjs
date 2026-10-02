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

test('rewrite delivery can close without another interview question', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const output = contract.capabilities[0].output;
  const rewrite = {
    question: '怎么处理突发问题',
    feedback: ['已提供本人动作；最终签收结果保留未知。'],
    revisedAnswer: '我核对打包记录，联系仓库补发，第二天复查进度；最终结果待核实。',
    followUp: null,
    practiceTask: '可选：试读这版回答。'
  };
  for (const key of output.required) assert.ok(Object.hasOwn(rewrite, key), key);
  assert.ok(output.properties.followUp.type.includes('null'), 'no-follow-up rewrite must be representable');
  assert.ok(output.properties.followUp.type.includes('string'), 'simulation still permits a follow-up');
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  const example = agent.split('## 示例')[1].split('## 交付前自查清单')[0];
  assert.match(example, /followUp 为 null/);
  assert.doesNotMatch(example, /请先说你的做法，我再反馈/);
  assert.match(agent, /改稿交付后结束本轮/);
});
