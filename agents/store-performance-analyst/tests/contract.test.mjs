import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('fixed calculation helper contract is discoverable without expanding agent permissions', () => {
  const capability = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8')).capabilities[0];
  assert.equal(capability.helperContract, 'calculation-tool.json');
  const tool = JSON.parse(fs.readFileSync(path.join(root, capability.helperContract), 'utf8'));
  assert.deepEqual(tool, {
    schemaVersion: 1, id: 'store-performance-calculator', componentId: 'store-performance-analyst', toolVersion: '0.2.0',
    invocation: { type: 'local_cli', runtime: 'python', entrypoint: 'scripts/calculate.py', argv: ['--input-json', '-'],
      inputTransport: 'stdin_json', outputTransport: 'stdout_json', shell: false },
    requiredMaterials: ['rows'], maxInputBytes: 65536, inputContract: 'docs/examples.md',
    sideEffects: [], networkUsed: false, filesModified: false, nativeAgentInvocation: false,
  });
  assert.ok(fs.statSync(path.join(root, tool.invocation.entrypoint)).isFile());
  assert.ok(fs.statSync(path.join(root, tool.inputContract)).isFile());
  assert.equal(Object.hasOwn(capability, 'invocation'), false);
  assert.match(fs.readFileSync(path.join(root, 'README.md'), 'utf8'), /缺少或空`rows`/);
});

test('standalone agent has a bounded, readable contract', () => {
  const contract = JSON.parse(fs.readFileSync(path.join(root, 'capability.json'), 'utf8'));
  const agent = fs.readFileSync(path.join(root, contract.entrypoint), 'utf8');
  assert.equal(contract.id, path.basename(root));
  assert.equal(contract.componentType, 'agent');
  assert.equal(contract.componentVersion, '0.2.0');
  assert.equal(contract.entrypoint, 'AGENT.md');
  assert.ok(agent.includes('name: ' + contract.id));
  for (const section of ['角色定位', '需要你提供什么', '我会给你什么', '工作步骤', '边界与不确定时怎么办', '示例']) {
    assert.ok(agent.includes('## ' + section), section);
  }
  for (const capability of contract.capabilities) {
    assert.equal(capability.id, 'store-performance-analyst-assist');
    assert.deepEqual(capability.input.required, ['metrics']);
    assert.deepEqual(capability.output.required, ['dataQuality', 'metricsTable', 'findings', 'hypotheses', 'experiments']);
    assert.equal(capability.output.deliveryFormat, 'conceptual-human-delivery');
    assert.deepEqual(capability.permissions, ['filesystem:read-user-materials']);
    assert.equal(Object.hasOwn(capability, 'invocation'), false);
    assert.ok(capability.useWhen.length >= 3);
    assert.ok(capability.doNotUseWhen.length >= 3);
    assert.deepEqual(capability.sideEffects, []);
    assert.equal(capability.humanGate.required, true);
    assert.equal(capability.humanGate.when.some(text => /分母|缺失/.test(text)), false);
    for (const shape of [capability.input, capability.output]) {
      assert.ok(shape.required.length > 0);
      for (const field of shape.required) assert.ok(Object.hasOwn(shape.properties, field), field);
    }
  }
  for (const file of ['README.md', 'LICENSE', 'NOTICE', 'CHANGELOG.md']) assert.ok(fs.statSync(path.join(root, file)).isFile());
});

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', name + '.json'), 'utf8'));
function run(input, args = ['--input-json', '-']) {
  const executed = spawnSync('python', [path.join(root, 'scripts/calculate.py'), ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' }
  });
  assert.equal(executed.error, undefined, 'Python helper must actually execute: ' + executed.error?.code);
  assert.equal(executed.stderr, '');
  const result = JSON.parse(executed.stdout);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.tool, 'store-performance-calculator');
  assert.equal(result.version, '0.2.0');
  assert.equal(result.networkUsed, false);
  assert.equal(result.filesModified, false);
  return { ...executed, result };
}

test('normal fixture computes refund net revenue, contribution and arithmetic decomposition', () => {
  const { status, result } = run(fixture('normal'));
  assert.equal(status, 0);
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.quality, []);
  const [previous, current] = result.calculationTable;
  assert.equal(previous.metrics.netRevenue, '450');
  assert.equal(current.metrics.netRevenue, '220');
  assert.equal(current.metrics.contributionAfterListedCosts, '95');
  assert.equal(current.metrics.grossRevenuePerPaidOrder, '60');
  assert.equal(result.comparisons[0].deltas.paidOrdersPerVisitorPercent, '-4');
  assert.deepEqual(result.comparisons[0].revenueDecomposition, {
    trafficEffect: '0', conversionEffect: '-240', basketEffect: '0',
    grossRevenueDelta: '-240', refundEffect: '10', netRevenueDelta: '-230'
  });
});

test('missing fields remain unknown; blended ad spend is not attributed CAC', () => {
  const { result } = run(fixture('missing-fields'));
  assert.equal(result.status, 'partial');
  for (const row of result.calculationTable) {
    assert.equal(row.metrics.netRevenue, null);
    assert.equal(row.metrics.contributionAfterListedCosts, null);
    assert.equal(row.inputs.refundAmount, null);
  }
  assert.equal(result.calculationTable[1].metrics.adSpendPerAllPaidOrders, '15');
  assert.equal(result.comparisons[0].revenueDecomposition.netRevenueDelta, null);
  assert.ok(result.quality.some(q => q.code === 'missing_fields'));
});

test('conflicting definitions keep row metrics but produce no comparison or totals', () => {
  const { result } = run(fixture('definition-conflict'));
  assert.equal(result.status, 'partial');
  assert.equal(result.calculationTable[1].metrics.paidOrdersPerVisitorPercent, '3.333333');
  assert.equal(result.comparisons[0].status, 'not_comparable');
  assert.deepEqual(result.comparisons[0].conflictingFields, ['visitorBasis', 'refundBasis']);
  assert.equal(Object.hasOwn(result.comparisons[0], 'deltas'), false);
  assert.equal(Object.hasOwn(result.comparisons[0], 'revenueDecomposition'), false);
  for (const key of ['totals', 'aggregates', 'storeVisitors']) assert.equal(Object.hasOwn(result, key), false);
  for (const field of ['currency', 'periodDays', 'orderBasis', 'adAttributionWindow']) {
    const data = fixture('normal');
    data.definitions = { byPeriod: { previous: data.definitions, current: { ...data.definitions,
      [field]: field === 'periodDays' ? 14 : 'other basis' } } };
    assert.equal(run(data).result.comparisons[0].status, 'not_comparable', field);
  }
});

test('missing definitions prevent comparison; no explicit comparison means rows only', () => {
  const data = fixture('normal');
  delete data.definitions.refundBasis;
  const { result } = run(data);
  assert.equal(result.status, 'partial');
  assert.equal(result.comparisons[0].status, 'not_comparable');
  assert.ok(result.quality.some(q => q.code === 'missing_definitions'));
  delete data.comparison;
  assert.deepEqual(run(data).result.comparisons, []);
  delete data.definitions;
  assert.equal(run(data).result.status, 'partial');
});

test('nonzero traffic, conversion and basket changes reconcile without causal claims', () => {
  const data = fixture('normal');
  Object.assign(data.rows[1], { visitors: 200, paidOrders: 20, grossRevenue: 1400 });
  const parts = run(data).result.comparisons[0].revenueDecomposition;
  assert.equal(parts.trafficEffect, '480');
  assert.equal(parts.conversionEffect, '240');
  assert.equal(parts.basketEffect, '200');
  assert.equal(parts.grossRevenueDelta, '920');
  assert.equal(parts.netRevenueDelta, '930');
});

test('zero denominators remain undefined while paid orders may exceed visitors', () => {
  const data = fixture('normal');
  Object.assign(data.rows[1], { visitors: 0, paidOrders: 0, grossRevenue: 0, refundAmount: 0 });
  const { result } = run(data);
  assert.equal(result.status, 'partial');
  assert.equal(result.calculationTable[1].metrics.paidOrdersPerVisitorPercent, null);
  assert.equal(result.calculationTable[1].metrics.grossRevenuePerPaidOrder, null);
  assert.equal(result.comparisons[0].revenueDecomposition, null);
  Object.assign(data.rows[1], { visitors: 2, paidOrders: 4 });
  assert.equal(run(data).result.calculationTable[1].metrics.paidOrdersPerVisitorPercent, '200');
});

test('decimal monetary inputs avoid float artifacts and negative net revenue is meaningful', () => {
  const data = fixture('normal');
  data.rows[1].grossRevenue = 0.3;
  data.rows[1].refundAmount = 0.1;
  assert.equal(run(data).result.calculationTable[1].metrics.netRevenue, '0.2');
  data.rows[1].refundAmount = 0.4;
  assert.equal(run(data).result.calculationTable[1].metrics.netRevenue, '-0.1');
});

test('invalid numbers, malformed protocol and excess resources fail with sanitized JSON', () => {
  for (const value of [-1, true, '123', 1.5]) {
    const data = fixture('normal');
    data.rows[0].visitors = value;
    const { status, result } = run(data);
    assert.equal(status, 2);
    assert.equal(result.status, 'invalid_input');
  }
  for (const literal of ['NaN', 'Infinity', '-Infinity', '1e999999999', '1e-999999999', '1000000000000000001', '0.0000001']) {
    const input = JSON.stringify(fixture('normal')).replace('"grossRevenue":480', '"grossRevenue":' + literal);
    assert.equal(run(input).result.status, 'invalid_input', literal);
  }
  const privateMarker = 'PRIVATE_TEST_MARKER_DO_NOT_ECHO';
  for (const input of ['{broken ' + privateMarker, ' '.repeat(65537), '{"schemaVersion":1,"schemaVersion":1}', JSON.stringify({ schemaVersion: true, rows: [] })]) {
    const result = run(input);
    assert.equal(result.status, 2);
    assert.equal(result.result.status, 'invalid_input');
    assert.equal(result.stdout.includes(privateMarker), false);
  }
  const data = fixture('normal');
  data.rows.push({ ...data.rows[0] });
  assert.equal(run(data).status, 2);
  data.rows = Array.from({ length: 201 }, (_, i) => ({ period: 'p', sku: 's' + i, channel: 'c' }));
  assert.equal(run(data).status, 2);
  assert.equal(run(fixture('normal'), ['--input-json', privateMarker]).status, 2);
});
