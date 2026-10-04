import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const fixture = (name) => JSON.parse(read(`tests/fixtures/${name}.json`));
const python = process.platform === 'win32' ? 'python' : 'python3';
function run(input, args = ['-B', path.join(root, 'scripts/calculate.py'), '--input-json', '-']) {
  const child = spawnSync(python, args, {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }, timeout: 10000, maxBuffer: 1024 * 1024,
    windowsHide: true, shell: false, cwd: root
  });
  assert.ifError(child.error);
  assert.equal(child.stderr, '', 'bounded helper emits only stdout JSON');
  assert.ok([0, 2].includes(child.status), `unexpected exit ${child.status}`);
  const output = JSON.parse(child.stdout);
  assert.equal(output.schemaVersion, 1);
  assert.equal(output.tool, 'supplier-comparison-calculate');
  assert.equal(output.toolVersion, '0.1.0');
  assert.equal(output.networkUsed, false);
  assert.equal(output.filesModified, false);
  assert.equal(output.quality.certifiedSuppliers, false);
  assert.deepEqual(Object.keys(output).sort(), ['schemaVersion', 'tool', 'toolVersion', 'status', 'normalizedQuotes', 'ranking', 'sensitivity', 'quality', 'limitations', 'networkUsed', 'filesModified'].sort());
  assert.equal(child.status, output.status === 'invalid_input' ? 2 : 0);
  return { output, stdout: child.stdout };
}
function scored() {
  const input = fixture('normal');
  input.weights = { cost: '1', delivery: '0', quality: '10' };
  input.qualityScale = { definition: 'user inspected sample checklist / 100', minimum: 0, maximum: 100 };
  input.quotes.forEach((quote, index) => {
    quote.qualityScore = index === 0 ? 95 : 80;
    quote.qualityDefinition = input.qualityScale.definition;
  });
  return input;
}

test('fixed calculation helper contract stays separate from the read-only agent', () => {
  const capability = JSON.parse(read('capability.json')).capabilities[0];
  assert.equal(capability.helperContract, 'calculation-tool.json');
  const tool = JSON.parse(read(capability.helperContract));
  assert.deepEqual(tool, {
    schemaVersion: 1, id: 'supplier-comparison-calculate', componentId: 'supplier-comparison-analyst', toolVersion: '0.1.0',
    invocation: { type: 'local_cli', runtime: 'python', entrypoint: 'scripts/calculate.py', argv: ['--input-json', '-'],
      inputTransport: 'stdin_json', outputTransport: 'stdout_json', shell: false },
    requiredMaterials: ['quantity', 'currency', 'specification', 'quotes'], inputContract: 'docs/tool-api.md',
    sideEffects: [], networkUsed: false, filesModified: false, nativeAgentInvocation: false,
  });
  assert.ok(fs.statSync(path.join(root, tool.invocation.entrypoint)).isFile());
  assert.ok(fs.statSync(path.join(root, tool.inputContract)).isFile());
  assert.equal(Object.hasOwn(JSON.parse(read('capability.json')).capabilities[0], 'invocation'), false);
  assert.match(read('README.md'), /候选报价（quotes 缺失或为空）先合并澄清/);
});

test('standalone contract, eight sections and minimal readonly permissions', () => {
  const contract = JSON.parse(read('capability.json'));
  const agent = read(contract.entrypoint);
  assert.equal(contract.id, path.basename(root));
  assert.equal(contract.componentType, 'agent');
  assert.equal(contract.componentVersion, '0.1.0');
  assert.equal(contract.entrypoint, 'AGENT.md');
  assert.ok(agent.startsWith('---\nname: supplier-comparison-analyst\n'));
  assert.ok(agent.includes('tools: Read\n'));
  assert.equal(agent.includes('\r'), false);
  assert.ok(agent.trimEnd().split('\n').length >= 60 && agent.trimEnd().split('\n').length <= 130);
  assert.deepEqual([...agent.matchAll(/^## (.+)$/gm)].map((match) => match[1]), [
    '角色定位', '什么情况找我，什么情况别找我', '需要你提供什么', '我会给你什么',
    '工作步骤', '边界与不确定时怎么办', '示例', '交付前自查清单'
  ]);
  assert.ok(read('README.md').trimEnd().split('\n').length <= 40);
  assert.equal(contract.capabilities.length, 1);
  const cap = contract.capabilities[0];
  assert.equal(cap.id, 'supplier-comparison-analyze');
  assert.equal(Object.hasOwn(cap, 'invocation'), false);
  assert.deepEqual(cap.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(cap.sideEffects, []);
  assert.equal(cap.humanGate.required, true);
  for (const word of ['医疗', '法律', '金融', '停']) assert.ok(cap.humanGate.when.join('').includes(word));
  assert.ok(cap.useWhen.length >= 3 && cap.doNotUseWhen.length >= 3);
  for (const shape of [cap.input, cap.output]) {
    assert.ok(shape.required.length > 0);
    for (const field of shape.required) assert.ok(Object.hasOwn(shape.properties, field));
  }
  assert.equal(cap.output.deliveryFormat, 'conceptual-human-delivery');
  assert.deepEqual(cap.validation, ['tests/contract.test.mjs', 'tests/delivery.test.mjs']);
  for (const file of ['README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md', 'docs/tool-api.md', 'docs/examples.md']) assert.ok(fs.statSync(path.join(root, file)).isFile());
  for (const attribution of ['2025 Michael Sitarzewski', '2026 jnMetaCode', '2026 KimYx0207']) assert.ok(read('LICENSE').includes(attribution));
  assert.ok(read('NOTICE').includes('811e51c370f26ec4f37ca277b4368b4ff895741f'));
  assert.ok(agent.includes('needs_probe') && agent.includes('calculationReceipt') && agent.includes('nativeDecision'));
});

test('normal fixture matches hand-calculated cost and MOQ; no weights means no ranking', () => {
  const { output } = run(fixture('normal'));
  assert.equal(output.status, 'completed');
  const [a, b] = output.normalizedQuotes;
  assert.equal(a.requiredPacks, '12');
  assert.equal(a.purchasePacks, '15');
  assert.equal(a.deliveredQuantity, '150');
  assert.equal(a.excessQuantity, '30');
  assert.equal(a.goodsSubtotal, '300');
  assert.equal(a.landedTotal, '335');
  assert.equal(a.quotedUnitPrice, '2');
  assert.equal(a.costPerDeliveredUnit, '2.233333');
  assert.equal(b.requiredPacks, '6');
  assert.equal(b.purchasePacks, '6');
  assert.equal(b.excessQuantity, '0');
  assert.equal(b.landedTotal, '275');
  assert.equal(b.quotedUnitPrice, '2.25');
  assert.equal(b.costPerDeliveredUnit, '2.291667');
  assert.equal(output.ranking, null);
  assert.deepEqual(output.sensitivity, []);
});

test('MOQ exact boundary, ceiling, zero MOQ, decimal money stay precise', () => {
  const input = fixture('normal');
  input.quantity = 150;
  assert.equal(run(input).output.normalizedQuotes[0].purchasePacks, '15');
  input.quantity = 151;
  const a = run(input).output.normalizedQuotes[0];
  assert.equal(a.requiredPacks, '16');
  assert.equal(a.purchasePacks, '16');
  input.quantity = 1;
  input.quotes[0].minimumPacks = 0;
  input.quotes[0].packPrice = '0.1';
  input.quotes[0].freight = '0.2';
  input.quotes[0].otherFees = '0';
  const small = run(input).output.normalizedQuotes[0];
  assert.equal(small.purchasePacks, '1');
  assert.equal(small.landedTotal, '0.3');
});

test('missing costs and quality remain null/unknown and do not redistribute weights', () => {
  const { output } = run(fixture('missing-fields'));
  assert.equal(output.status, 'partial');
  const a = output.normalizedQuotes[0];
  assert.equal(a.goodsSubtotal, '300');
  assert.equal(a.freight, null);
  assert.equal(a.landedTotal, null);
  assert.equal(a.qualityScore, null);
  assert.equal(a.qualityEvidence, null);
  assert.ok(a.missingFields.includes('freight'));
  assert.ok(a.missingFields.includes('qualityEvidence_or_qualityScore'));
  assert.equal(output.ranking, null);
  assert.deepEqual(output.sensitivity, []);
});

test('missing root quantity produces partial with no invented purchase quantity', () => {
  const input = fixture('normal');
  delete input.quantity;
  const { output } = run(input);
  assert.equal(output.status, 'partial');
  assert.equal(output.normalizedQuotes[0].purchasePacks, null);
  assert.equal(output.normalizedQuotes[0].landedTotal, null);
  assert.equal(output.ranking, null);
});

test('specification/currency conflict stops normalization and global ranking', () => {
  const { output } = run(fixture('definition-conflict'));
  assert.equal(output.status, 'partial');
  const b = output.normalizedQuotes[1];
  assert.equal(b.comparable, false);
  assert.deepEqual(b.conflicts, ['specification', 'currency']);
  assert.equal(b.purchasePacks, null);
  assert.equal(b.landedTotal, null);
  assert.equal(output.ranking, null);
});

test('quality definition conflict or missing scale cannot support ranking', () => {
  const input = scored();
  input.quotes[1].qualityDefinition = 'different denominator';
  assert.equal(run(input).output.status, 'partial');
  assert.equal(run(input).output.ranking, null);
  delete input.qualityScale;
  assert.equal(run(input).output.ranking, null);
});

test('user quality weights and user sensitivity visibly reverse conditional ranking', () => {
  const input = scored();
  input.sensitivityDelta = '0.5';
  const { output } = run(input);
  assert.equal(output.status, 'completed');
  assert.equal(output.ranking[0].supplierId, 'A');
  assert.equal(output.ranking[0].score, '0.863636');
  assert.equal(output.ranking[1].score, '0.818182');
  assert.equal(output.sensitivity.length, 4);
  const reducedQuality = output.sensitivity.find((item) => item.dimension === 'quality' && item.relativeChange === '-0.5');
  assert.deepEqual(reducedQuality.weights, { cost: '1', delivery: '0', quality: '5' });
  assert.equal(reducedQuality.ranking[0].supplierId, 'B');
  assert.equal(reducedQuality.ranking[0].score, '0.833333');
});

test('equal candidates get equal scores and tied ranks; IDs only stabilize display', () => {
  const input = scored();
  input.quotes[1] = { ...input.quotes[0], supplierId: 'B' };
  const { output } = run(input);
  assert.equal(output.ranking[0].score, output.ranking[1].score);
  assert.equal(output.ranking[0].rank, 1);
  assert.equal(output.ranking[1].rank, 1);
  assert.equal(output.ranking[0].components.cost, '1');
  assert.equal(output.ranking[1].components.delivery, '1');
});

test('zero quality weight never converts absent score to zero', () => {
  const input = fixture('normal');
  input.weights = { cost: 1, delivery: 1, quality: 0 };
  input.quotes.forEach((quote) => { delete quote.qualityEvidence; });
  const { output } = run(input);
  assert.equal(output.status, 'partial');
  assert.equal(output.ranking[0].supplierId, 'B');
  assert.equal(output.ranking[0].components.quality, null);
});

test('user hard constraints exclude known failures and block unknowns', () => {
  const input = scored();
  input.maxLeadDays = 6;
  let output = run(input).output;
  assert.equal(output.normalizedQuotes[0].constraintStatus, 'excluded');
  assert.equal(output.ranking.length, 1);
  assert.equal(output.ranking[0].supplierId, 'B');
  input.maxLeadDays = 8;
  input.minimumQualityScore = 90;
  output = run(input).output;
  assert.equal(output.normalizedQuotes[1].constraintStatus, 'excluded');
  assert.equal(output.ranking[0].supplierId, 'A');
  delete input.quotes[0].qualityScore;
  output = run(input).output;
  assert.equal(output.normalizedQuotes[0].constraintStatus, 'unknown');
  assert.equal(output.ranking, null);
  assert.equal(output.status, 'partial');
});

test('quality photograph without a quantified score cannot be scored by positive quality weight', () => {
  const input = fixture('normal');
  input.weights = { cost: 1, delivery: 1, quality: 1 };
  const { output } = run(input);
  assert.equal(output.ranking, null);
  assert.equal(output.normalizedQuotes[0].qualityScore, null);
});

test('invalid numerical values, bounds, shapes and duplicate IDs reject with bounded JSON', () => {
  const mutations = [
    (i) => { i.quantity = true; }, (i) => { i.quantity = -1; },
    (i) => { i.quantity = 1.5; }, (i) => { i.quantity = 0; },
    (i) => { i.quantity = 1000000001; }, (i) => { i.quotes[0].packSize = 0; },
    (i) => { i.quotes[0].minimumPacks = 1.5; }, (i) => { i.quotes[0].freight = null; },
    (i) => { i.quotes[0].packPrice = 'NaN'; }, (i) => { i.quotes[0].packPrice = 'Infinity'; },
    (i) => { i.quotes[0].packPrice = '1e999999999'; }, (i) => { i.quotes[0].packPrice = '0.0000001'; },
    (i) => { i.quotes[0].packPrice = '1000000000000001'; }, (i) => { i.quotes[0].supplierId = 'B'; },
    (i) => { i.weights = { cost: 0, delivery: 0, quality: 0 }; },
    (i) => { i.weights = { cost: 1, delivery: 1 }; }, (i) => { i.sensitivityDelta = '0.5'; },
    (i) => { i.minimumQualityScore = 50; }, (i) => { i.quotes[0].command = 'secret-not-echoed'; },
    (i) => { i.quotes = []; }, (i) => { i.quotes = Array.from({ length: 101 }, (_, n) => ({ ...i.quotes[0], supplierId: String(n) })); }
  ];
  for (const mutation of mutations) {
    const input = fixture('normal');
    mutation(input);
    const { output, stdout } = run(input);
    assert.equal(output.status, 'invalid_input');
    assert.ok(stdout.length < 600);
    assert.equal(stdout.includes('secret-not-echoed'), false);
    assert.deepEqual(output.normalizedQuotes, []);
  }
});

test('malformed JSON, huge numeric exponent, duplicate keys, oversized input and arguments reject', () => {
  for (const raw of ['{', '{"schemaVersion":1,"schemaVersion":1}', '{"schemaVersion":1,"quotes":[{"supplierId":"A","packPrice":1e999999999}]}', '{"schemaVersion":1,"quotes":[{"supplierId":"A","packPrice":NaN}]}', ' '.repeat(262145)]) {
    const { output, stdout } = run(raw);
    assert.equal(output.status, 'invalid_input');
    assert.ok(stdout.length < 600);
  }
  assert.equal(run('{}', ['-B', path.join(root, 'scripts/calculate.py'), '--file', 'private']).output.status, 'invalid_input');
});

test('helper package tree does not accumulate Python bytecode', () => {
  assert.equal(fs.existsSync(path.join(root, 'scripts/__pycache__')), false);
});
