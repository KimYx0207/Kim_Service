import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkAgentPack, REQUIRED_SECTIONS } from './check-agent-pack.mjs';

function temporaryRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-agent-pack-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function filler(count) {
  return Array.from({ length: count }, (_, index) => '- 第 ' + String(index + 1) + ' 条说明。');
}

function agentDocument({ tools = 'Read', extraLines = [], dropSection = null, plainRefusalLabel = false } = {}) {
  const sections = {
    '角色定位': ['我在这个行业里只做一件事。', ...filler(4)],
    '什么情况找我，什么情况别找我': ['**找我**：', ...filler(3), '', (plainRefusalLabel ? '别找我：' : '**别找我**：'), ...filler(3)],
    '需要你提供什么': filler(4),
    '我会给你什么': filler(5),
    '工作步骤': filler(5),
    '边界与不确定时怎么办': ['- **停机规则**：涉及医疗、法律、金融结论时我停下。', ...filler(3)],
    '示例': ['**用户输入**：一句话。', '', '**我的输出**：完整输出。', ...filler(4)],
    '交付前自查清单': [...filler(4), '- [ ] 禁用词：赋能、一站式，一个没用。']
  };
  const lines = [
    '---',
    'name: sample-agent',
    'description: 示例 agent（sample / example）。当用户说「示例」时使用。',
    'tools: ' + tools,
    '---',
    '',
    '# 示例'
  ];
  for (const section of REQUIRED_SECTIONS) {
    if (section === dropSection) continue;
    lines.push('', '## ' + section, ...sections[section]);
  }
  lines.push(...extraLines);
  return lines.join('\n') + '\n';
}

function contract({ capability = {}, top = {} } = {}) {
  return {
    schemaVersion: 1,
    id: 'sample-agent',
    componentType: 'agent',
    componentVersion: '0.1.0',
    entrypoint: 'AGENT.md',
    capabilities: [{
      id: 'sample-agent-run',
      summary: '示例能力。',
      useWhen: ['用户说「示例一」', '用户说「示例二」', '用户说「示例三」'],
      doNotUseWhen: ['用户要别的：改用 other-agent', '用户要图片：不属于本包', '用户要发布：不属于本包'],
      input: { type: 'object', required: ['request'] },
      output: { type: 'object', required: ['content'] },
      permissions: ['filesystem:read-user-materials'],
      sideEffects: [],
      humanGate: { required: true, when: ['涉及医疗、法律、金融结论时停下'] },
      validation: ['tests/contract.test.mjs'],
      ...capability
    }],
    ...top
  };
}

function writePack(root, { agent = agentDocument(), pack = contract() } = {}) {
  const componentRoot = path.join(root, 'agents', 'sample-agent');
  fs.mkdirSync(path.join(componentRoot, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(componentRoot, 'AGENT.md'), agent);
  fs.writeFileSync(path.join(componentRoot, 'capability.json'), JSON.stringify(pack, null, 2) + '\n');
  fs.writeFileSync(path.join(componentRoot, 'README.md'), '# sample-agent\n\n示例。\n');
  fs.writeFileSync(path.join(componentRoot, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026 KimYx0207\n');
  fs.writeFileSync(path.join(componentRoot, 'NOTICE'), 'sample-agent\n\nMIT License 授权。\n');
  fs.writeFileSync(path.join(componentRoot, 'CHANGELOG.md'), '# Changelog\n\n## 0.1.0 - 2026-09-14\n');
  fs.writeFileSync(path.join(componentRoot, 'tests', 'contract.test.mjs'), 'process.exitCode = 0;\n');
  return componentRoot;
}

function errorsMatching(errors, pattern) {
  return errors.filter((error) => pattern.test(error));
}

test('a pack that follows the contract produces no errors', (t) => {
  const componentRoot = writePack(temporaryRoot(t));
  assert.deepEqual(checkAgentPack(componentRoot), []);
});

test('the 禁用词 checklist line is the only place a forbidden phrase may appear', (t) => {
  const clean = writePack(temporaryRoot(t));
  assert.equal(errorsMatching(checkAgentPack(clean), /forbidden phrase/).length, 0);
  const polluted = writePack(temporaryRoot(t), { agent: agentDocument({ extraLines: ['', '这个 agent 可以赋能创作者。'] }) });
  assert.equal(errorsMatching(checkAgentPack(polluted), /forbidden phrase "赋能"/).length, 1);
});

test('write-capable or shell tools are rejected by the read-only allowlist', (t) => {
  const componentRoot = writePack(temporaryRoot(t), { agent: agentDocument({ tools: 'Read, Bash' }) });
  assert.equal(errorsMatching(checkAgentPack(componentRoot), /outside the read-only allowlist: Bash/).length, 1);
});

test('frontmatter tools and capability permissions must describe the same grants', (t) => {
  const undeclared = writePack(temporaryRoot(t), { agent: agentDocument({ tools: 'Read, WebSearch' }) });
  assert.equal(errorsMatching(checkAgentPack(undeclared), /must declare network:read-web-search/).length, 1);
  const ungranted = writePack(temporaryRoot(t), {
    pack: contract({ capability: { permissions: ['filesystem:read-user-materials', 'network:read-web-search'] } })
  });
  assert.equal(errorsMatching(checkAgentPack(ungranted), /declares network:read-web-search but no frontmatter tool grants it/).length, 1);
});

test('every required section must exist and the refusal label must be bold', (t) => {
  const missing = writePack(temporaryRoot(t), { agent: agentDocument({ dropSection: '工作步骤' }) });
  assert.equal(errorsMatching(checkAgentPack(missing), /missing the section: ## 工作步骤/).length, 1);
  const plain = writePack(temporaryRoot(t), { agent: agentDocument({ plainRefusalLabel: true }) });
  assert.equal(errorsMatching(checkAgentPack(plain), /\*\*别找我\*\*/).length, 1);
});

test('the human gate must be required and name the medical, legal, financial stop rule', (t) => {
  const optional = writePack(temporaryRoot(t), { pack: contract({ capability: { humanGate: { required: false, when: [] } } }) });
  assert.equal(errorsMatching(checkAgentPack(optional), /humanGate must be required/).length, 1);
  const vague = writePack(temporaryRoot(t), { pack: contract({ capability: { humanGate: { required: true, when: ['涉及敏感话题时停下'] } } }) });
  assert.equal(errorsMatching(checkAgentPack(vague), /medical, legal, and financial stop rule/).length, 1);
});

test('side effects, thin routing lists, and oversized documents are rejected', (t) => {
  const effects = writePack(temporaryRoot(t), { pack: contract({ capability: { sideEffects: ['写入文件'] } }) });
  assert.equal(errorsMatching(checkAgentPack(effects), /sideEffects must be an empty array/).length, 1);
  const thin = writePack(temporaryRoot(t), { pack: contract({ capability: { useWhen: ['用户说「示例一」', '用户说「示例二」'] } }) });
  assert.equal(errorsMatching(checkAgentPack(thin), /useWhen needs at least 3/).length, 1);
  const oversized = writePack(temporaryRoot(t), { agent: agentDocument({ extraLines: filler(80) }) });
  assert.equal(errorsMatching(checkAgentPack(oversized), /must have 60-130 lines/).length, 1);
});
