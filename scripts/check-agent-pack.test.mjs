import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkAgentPack, REQUIRED_SECTIONS, METHOD_CONTENT_LIMITS } from './check-agent-pack.mjs';

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

function writeKnowledge(root) {
  const method = { schemaVersion: 1, roleId: 'sample-agent', protocol: 'host-bound-task-method-v1', runtimeStatus: 'needs_probe',
    automaticInvocation: false, steps: ['Use supplied materials'], acceptance: ['Observe the result'], coordinationOwner: 'caller', finalAcceptance: 'caller_only',
    knowledgeAssets: [{ id: 'sample-core', path: 'references/core.md', appliesTo: ['always'], sourceRefs: ['sample-source'] }] };
  fs.mkdirSync(path.join(root, 'references'));
  fs.writeFileSync(path.join(root, 'references/core.md'), '# Original task method\n\nCheck actual behavior.\n');
  fs.writeFileSync(path.join(root, 'PROVENANCE.md'), '| sourceRef | source | adopted | not adopted |\n| sample-source | https://example.test/fixed | inspect facts | grant authority |\n');
  const save = () => fs.writeFileSync(path.join(root, 'method.json'), JSON.stringify(method));
  save(); return { method, save };
}

test('optional knowledge files are checked through the actual pack validator and legacy methods still work', (t) => {
  const root = writePack(temporaryRoot(t)); const { method, save } = writeKnowledge(root);
  assert.deepEqual(checkAgentPack(root), []);
  delete method.knowledgeAssets; save();
  fs.rmSync(path.join(root, 'PROVENANCE.md'));
  assert.deepEqual(checkAgentPack(root), [], 'existing structured methods need no new knowledge metadata');
});

test('dangling provenance and nonexistent knowledge files fail actual package checks', (t) => {
  const root = writePack(temporaryRoot(t)); const { method, save } = writeKnowledge(root);
  method.knowledgeAssets[0].sourceRefs = ['not-declared']; save();
  assert.ok(checkAgentPack(root).some(error => error.includes('sourceRefs must name rows')));
  method.knowledgeAssets[0].sourceRefs = ['sample-source']; save();
  fs.rmSync(path.join(root, 'references/core.md'));
  assert.ok(checkAgentPack(root).some(error => error.includes('knowledge file must be bounded')));
});

test('knowledge paths reject traversal, absolute paths and duplicated identities', (t) => {
  const root = writePack(temporaryRoot(t)); const { method, save } = writeKnowledge(root);
  for (const unsafe of ['../private.md', '/private.md', 'C:/private.md', 'references/../private.md', 'references\\core.md']) {
    method.knowledgeAssets[0].path = unsafe; save();
    assert.ok(checkAgentPack(root).some(error => error.includes('path must be unique package-relative')));
  }
  method.knowledgeAssets[0].path = 'references/core.md'; method.knowledgeAssets.push(structuredClone(method.knowledgeAssets[0])); save();
  assert.ok(checkAgentPack(root).some(error => error.includes('id must be unique')));
});

test('symlink ancestors do not make external content a package knowledge asset', (t) => {
  const temp = temporaryRoot(t); const root = writePack(temp); writeKnowledge(root);
  fs.mkdirSync(path.join(temp, 'external'));
  fs.writeFileSync(path.join(temp, 'external/core.md'), 'outside-package');
  fs.rmSync(path.join(root, 'references'), { recursive: true });
  try { fs.symlinkSync(path.join(temp, 'external'), path.join(root, 'references'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.skip('symlink creation unavailable'); return; } throw error; }
  assert.ok(checkAgentPack(root).some(error => error.includes('without symlinks')));
});

test('empty, invalid UTF-8 and over-budget documents cannot masquerade as loaded knowledge', (t) => {
  const root = writePack(temporaryRoot(t)); writeKnowledge(root);
  fs.writeFileSync(path.join(root, 'references/core.md'), '  \n');
  assert.ok(checkAgentPack(root).some(error => error.includes('must not be empty')));
  fs.writeFileSync(path.join(root, 'references/core.md'), Buffer.from([0xff, 0xfe]));
  assert.ok(checkAgentPack(root).some(error => error.includes('bounded UTF-8')));
  fs.writeFileSync(path.join(root, 'references/core.md'), 'a'.repeat(METHOD_CONTENT_LIMITS.assetBytes + 1));
  assert.ok(checkAgentPack(root).some(error => error.includes('bounded UTF-8')));
});

function writeExpertise(root) {
  const { method, save } = writeKnowledge(root);
  const capability = contract();
  capability.capabilities[0].input.properties = { request: { type: 'string' } };
  capability.capabilities[0].output.properties = { content: { type: 'string' } };
  fs.writeFileSync(path.join(root, 'capability.json'), JSON.stringify(capability));
  method.expertise = {
    schemaVersion: 1, domain: 'An example decision with traceable evidence', scope: ['Bounded source review'],
    knowledgeAssetIds: ['sample-core'],
    diagnosticSequence: [
      { id: 'claim', question: 'What claim is being tested?', evidenceRequired: ['Original statement'], whenMissing: 'Separate the unverified claim' },
      { id: 'scope', question: 'Does the evidence cover the claim?', evidenceRequired: ['Observed object and date'], whenMissing: 'Limit the conclusion to the observed scope' },
    ],
    decisionRules: [
      { id: 'trace', when: 'A fact has an original source', action: 'Describe the supported scope', avoid: 'Treating repetition as independent evidence' },
      { id: 'bound', when: 'Source coverage is incomplete', action: 'Name the missing evidence', avoid: 'Claiming a universal result' },
    ],
    contractGuidance: [{ capabilityId: 'sample-agent-run',
      inputGuidance: [{ field: 'request', interpretation: 'The specific claim to inspect', onMissing: 'Request the claim before evaluating it' }],
      outputChecks: [{ field: 'content', criterion: 'Bind the conclusion to the observed material', rejectWhen: 'It claims more than the source supports' }],
    }],
    reviewBoundary: { humanReviewTriggers: ['High-stakes domain judgment'], prohibitedClaims: ['Metadata proves professional accuracy'] },
    evaluation: { casesPath: 'evals/professional-cases.json', professionalEffect: 'not_evaluated', evidenceKind: 'authored_examples' },
  };
  const examples = { schemaVersion: 1, roleId: 'sample-agent', protocol: 'professional-review-cases-v1', inputProvenance: 'synthetic', evaluationStatus: 'not_evaluated', cases: [
    { id: 'bounded-fact', capabilityId: 'sample-agent-run', category: 'worked_example', scenario: 'One reviewed sample', input: { request: 'One sample returned 200' },
      candidateOutputExcerpt: { content: 'This observed sample returned 200; other samples are untested.' }, expectedAssessment: 'acceptable_example', reason: 'The scope matches the evidence', diagnosticRefs: ['claim'], decisionRuleRefs: ['trace'] },
    { id: 'false-generalization', capabilityId: 'sample-agent-run', category: 'failure_boundary', scenario: 'One reviewed sample is used to claim a universal result', input: { request: 'One sample returned 200' },
      candidateOutputExcerpt: { content: 'All requests always succeed.' }, expectedAssessment: 'reject_example', reason: 'The statement exceeds the observed scope', diagnosticRefs: ['scope'], decisionRuleRefs: ['bound'] },
  ] };
  fs.mkdirSync(path.join(root, 'evals'));
  const saveCases = () => fs.writeFileSync(path.join(root, 'evals/professional-cases.json'), JSON.stringify(examples));
  save(); saveCases();
  return { method, save, examples, saveCases };
}

test('an authored rejection case is valid review material, not a professional success receipt', (t) => {
  const root = writePack(temporaryRoot(t)); const { examples } = writeExpertise(root);
  assert.deepEqual(checkAgentPack(root), []);
  assert.equal(examples.cases[1].candidateOutputExcerpt.content, 'All requests always succeed.');
  assert.equal(examples.evaluationStatus, 'not_evaluated');
});

test('expertise references are bound to real assets, capability fields and case decisions', (t) => {
  const root = writePack(temporaryRoot(t)); const { method, save, examples, saveCases } = writeExpertise(root);
  method.expertise.knowledgeAssetIds = ['missing-core'];
  method.expertise.contractGuidance[0].inputGuidance[0].field = 'inventedInput'; save();
  examples.cases[0].diagnosticRefs = ['undeclared-diagnosis']; saveCases();
  const errors = checkAgentPack(root);
  assert.ok(errors.some(error => error.includes('knowledgeAssetIds')));
  assert.ok(errors.some(error => error.includes('guidance must name declared capability fields')));
  assert.ok(errors.some(error => error.includes('guidance must cover required capability fields')));
  assert.ok(errors.some(error => error.includes('must reference declared diagnostics')));
});

test('actual example input and output types are checked without accepting missing required inputs', (t) => {
  const root = writePack(temporaryRoot(t)); const { examples, saveCases } = writeExpertise(root);
  examples.cases[0].input = {};
  examples.cases[1].candidateOutputExcerpt.content = 42; saveCases();
  const errors = checkAgentPack(root);
  assert.ok(errors.some(error => error.includes('input requires request')));
  assert.ok(errors.some(error => error.includes('output excerpt.content must have declared type string')));
});

test('expertise metadata cannot promote itself to verified quality or add tool authority', (t) => {
  const root = writePack(temporaryRoot(t)); const { method, save } = writeExpertise(root);
  method.expertise.evaluation.professionalEffect = 'verified';
  method.expertise.permissions = ['execute:anything']; save();
  const errors = checkAgentPack(root);
  assert.ok(errors.some(error => error.includes('must equal not_evaluated')));
  assert.ok(errors.some(error => error.includes('unsupported field permissions')));
});

test('review cases need a real counterexample and cannot be replaced with an execution claim', (t) => {
  const root = writePack(temporaryRoot(t)); const { examples, saveCases } = writeExpertise(root);
  examples.cases[1].expectedAssessment = 'acceptable_example'; saveCases();
  assert.ok(checkAgentPack(root).some(error => error.includes('both acceptable and rejected examples')));
  examples.evaluationStatus = 'all_models_passed'; saveCases();
  assert.ok(checkAgentPack(root).some(error => error.includes('evaluationStatus must equal not_evaluated')));
});

test('case resources reject traversal, symlinks, oversized and deeply nested data before use', (t) => {
  const temp = temporaryRoot(t); const root = writePack(temp); const { method, save, examples, saveCases } = writeExpertise(root);
  method.expertise.evaluation.casesPath = '../outside.json'; save();
  assert.ok(checkAgentPack(root).some(error => error.includes('casesPath')));
  method.expertise.evaluation.casesPath = 'evals/professional-cases.json'; save();
  fs.writeFileSync(path.join(root, 'evals/professional-cases.json'), ' '.repeat(METHOD_CONTENT_LIMITS.expertiseCasesBytes + 1));
  assert.ok(checkAgentPack(root).some(error => error.includes('cases must be bounded')));
  let nested = {};
  for (let i = 0; i < 35; i++) nested = { child: nested };
  examples.cases[0].input.request = nested; saveCases();
  assert.ok(checkAgentPack(root).some(error => error.includes('cases must be bounded')));
  fs.rmSync(path.join(root, 'evals/professional-cases.json'));
  fs.writeFileSync(path.join(temp, 'outside.json'), JSON.stringify(examples));
  try { fs.symlinkSync(path.join(temp, 'outside.json'), path.join(root, 'evals/professional-cases.json')); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) { t.diagnostic('Symlink creation unavailable; other bounds exercised'); return; } throw error; }
  assert.ok(checkAgentPack(root).some(error => error.includes('cases must be bounded')));
});
