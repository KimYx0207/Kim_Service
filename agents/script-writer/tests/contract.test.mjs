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

test('source-based writing is additive to the existing input and delivery contract', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const capability = contract.capabilities[0];
  assert.equal(contract.id, 'script-writer');
  assert.equal(capability.id, 'script-writer-write-script');
  assert.deepEqual(capability.input.required, ['topicAndAngle']);
  assert.equal(capability.input.properties.audience.type, 'string');
  const inputs = [
    { topicAndAngle: '30 秒理线视频', format: '分镜', materials: ['两条魔术贴和前后照片'] },
    { topicAndAngle: '试新看板，先验证能否退出', format: '公众号文章', audience: '团队试用组织者', materials: ['合成更新说明：CSV 不含附件', '合成记录：仅检查 10 条任务'], persona: '我的立场是先小样验证再考虑迁移' }
  ];
  for (const input of inputs) {
    for (const key of capability.input.required) assert.ok(Object.hasOwn(input, key), key);
    for (const [key, value] of Object.entries(input)) {
      const field = capability.input.properties[key];
      assert.ok(field, key);
      if (field.enum) assert.ok(field.enum.includes(value), key);
      else assert.equal(Array.isArray(value) ? 'array' : typeof value, field.type, key);
    }
  }
  assert.deepEqual(Object.keys(capability.output.properties), ['oneLiner', 'hooks', 'content', 'fullVoiceover', 'ending', 'shotList', 'claimsCheck', 'assumptions', 'executionAuthorized']);
  assert.deepEqual(capability.output.required, ['oneLiner', 'hooks', 'content', 'ending', 'claimsCheck']);
  assert.deepEqual(capability.output.properties.claimsCheck.items.properties.status.enum, ['用户提供', '用户亲历', '用户观察', '待核实', '已删']);
  assert.deepEqual(capability.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(capability.sideEffects, []);
});

test('adapted method keeps pinned upstream attribution and a finished prose example', () => {
  for (const file of ['LICENSE', 'NOTICE']) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(text.includes('2025 Michael Sitarzewski'), file);
    assert.ok(text.includes('2026 jnMetaCode'), file);
  }
  const notice = fs.readFileSync(path.join(root, 'NOTICE'), 'utf8');
  assert.ok(notice.includes('811e51c370f26ec4f37ca277b4368b4ff895741f/marketing/marketing-content-creator.md'));
  const agent = fs.readFileSync(path.join(root, 'AGENT.md'), 'utf8');
  const prose = agent.split('主稿（正文）：\n')[1]?.split('\n结尾互动：')[0];
  assert.ok(prose && prose.length > 300, 'the example must deliver prose rather than only an outline');
  assert.ok(agent.includes('材料和立场均为合成案例'), 'synthetic sources must not appear as public results');
  assert.ok(agent.includes('| 21—30秒 |'), 'the existing storyboard example must remain');
});
