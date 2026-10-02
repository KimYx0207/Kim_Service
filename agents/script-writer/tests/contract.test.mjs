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

test('prose delivery is representable without voiceover or camera fields', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const output = contract.capabilities[0].output;
  assert.ok(output.properties.content.type.includes('string'), 'prose must not be forced into storyboard rows');
  assert.ok(output.properties.content.type.includes('array'), 'storyboards remain supported');
  assert.ok(!output.required.includes('fullVoiceover'));
  assert.ok(!output.required.includes('shotList'));
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  assert.match(agent, /图文正文和公众号文章不附口播或语速估算/);
  assert.doesNotMatch(agent, /图文正文同一套逻辑/);
});

test('unsupported claims cannot be converted into invented personal evidence', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  assert.doesNotMatch(agent, /稿子里用你自己的使用感受代替/);
  assert.match(agent, /只有用户明确提供真实使用感受时才能引用/);
  assert.match(agent, /也不能用使用感受替代无来源功效/);
  assert.match(contract.capabilities[0].humanGate.when.join('\n'), /不得改写为虚构个人经历或使用感受/);
});

test('provided parameters can retain provenance without implying firsthand observation', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const states = contract.capabilities[0].output.properties.claimsCheck.items.properties.status.enum;
  assert.ok(states.includes('用户提供'));
  assert.ok(states.includes('用户观察'));
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  assert.match(agent, /没有真实观察就不能用「用户观察」标签/);
});
