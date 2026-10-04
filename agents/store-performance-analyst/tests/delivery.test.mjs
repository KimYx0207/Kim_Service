import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';
const task = '只核算本次材料，不执行任何业务操作';
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
function invoke(input, script = 'deliver.py', args = ['--input-json', '-']) {
  const child = spawnSync(python, ['-I', '-B', path.join(root, 'scripts', script), ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    timeout: 10000, maxBuffer: 4 * 1024 * 1024, cwd: root, shell: false,
  });
  assert.ifError(child.error);
  assert.equal(child.stderr, '');
  const output = JSON.parse(child.stdout);
  assert.equal(child.status, output.status === 'invalid_input' ? 2 : 0);
  return output;
}
function run(materials, request = task) {
  const output = invoke({ task: request, inputJson: typeof materials === 'string' ? materials : JSON.stringify(materials) });
  assert.deepEqual(Object.keys(output).sort(), ['schemaVersion', 'status', 'tool', 'toolVersion', 'calculationPerformed',
    'brief', 'missing', 'questions', 'issues', 'receipt', 'receiptJson', 'receiptSha256', 'delivery', 'handoff', 'networkUsed', 'filesModified'].sort());
  assert.equal(output.schemaVersion, 1);
  assert.equal(output.tool, TOOL);
  assert.equal(output.toolVersion, VERSION);
  assert.equal(output.networkUsed, false);
  assert.equal(output.filesModified, false);
  assert.equal(output.brief.request, request);
  assert.equal(typeof output.calculationPerformed, 'boolean');
  for (const key of ['missing', 'questions', 'issues']) assert(Array.isArray(output[key]));
  assert(['ready', 'needs_input', 'blocked'].includes(output.handoff.status));
  assert.deepEqual(output.handoff.questions, output.questions);
  assert.deepEqual(output.receiptJson === null ? null : JSON.parse(output.receiptJson), output.receipt);
  assert.equal(output.receiptSha256, output.receipt === null ? null
    : createHash('sha256').update(output.receiptJson).digest('hex'));
  return output;
}

function checkMutations(mutations) {
  const code = `import copy, importlib.util, json, sys
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('delivery', sys.argv[1])
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
materials = m.parse_json(sys.stdin.read())
receipt = m.calculate_receipt(materials)
m.validate_receipt(receipt, materials)
for mutation in json.loads(sys.argv[2]):
    changed = copy.deepcopy(receipt)
    exec(mutation, {}, {'r': changed})
    try:
        m.validate_receipt(changed, materials)
    except Exception:
        continue
    raise AssertionError('accepted invalid domain receipt: ' + mutation)
print('validated')`;
  const child = spawnSync(python, ['-I', '-B', '-c', code, path.join(root, 'scripts/deliver.py'), JSON.stringify(mutations)], {
    input: JSON.stringify(fixture('normal')), encoding: 'utf8', shell: false, timeout: 10000,
  });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'validated');
}

test('component-owned delivery descriptor is optional and never expands agent permissions', () => {
  const cap = JSON.parse(read('capability.json')).capabilities[0];
  assert.equal(cap.deliveryContract, 'delivery-tool.json');
  assert.equal(cap.helperContract, 'calculation-tool.json');
  assert.equal(Object.hasOwn(cap, 'invocation'), false);
  assert.deepEqual(cap.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(JSON.parse(read(cap.deliveryContract)), {
    schemaVersion: 1, protocol: 'calculation-delivery-v1',
    invocation: { type: 'local_cli', runtime: 'python', entrypoint: 'scripts/deliver.py', argv: ['--input-json', '-'],
      inputTransport: 'stdin_json', outputTransport: 'stdout_json', shell: false },
    files: ['scripts/deliver.py', 'scripts/calculate.py'], maxInputBytes: MAX_BYTES,
    sideEffects: [], networkUsed: false, filesModified: false,
  });
});

test('delivery uses real original calculator receipts and preserves partial unknowns', () => {
  for (const name of ['normal', 'missing-fields', 'definition-conflict']) {
    const materials = fixture(name);
    const output = run(materials);
    assert.deepEqual(output.receipt, invoke(materials, 'calculate.py'));
    assert.equal(output.status, output.receipt.status);
    assert.equal(output.calculationPerformed, true);
    assert.equal(typeof output.delivery, 'string');
    assert.equal(output.brief.scope, SCOPE);
  }
});

test('missing materials ask component questions without calculating; zero and false are not missing', () => {
  for (const missing of [undefined, null, '', '  ', []]) {
    const materials = fixture('normal');
    materials[REQUIRED] = missing;
    const output = run(materials);
    assert.equal(output.status, 'needs_input');
    assert.deepEqual(output.missing, [REQUIRED]);
    assert.equal(output.calculationPerformed, false);
    assert.equal(output.receipt, null);
    assert.equal(output.delivery, null);
    assert.equal(output.handoff.status, 'needs_input');
    assert.match(output.questions[0], QUESTION_PATTERN);
  }
  for (const value of [0, false]) {
    const materials = fixture('normal');
    materials[REQUIRED] = value;
    const output = run(materials);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.calculationPerformed, true);
    assert.deepEqual(output.missing, []);
    assert.equal(output.handoff.status, 'blocked');
  }
});

test('strict inner parsing rejects duplicate keys before missing preflight and preserves the task', () => {
  for (const inputJson of ['{"rows":[],"rows":[]}', '{"quotes":[{"supplierId":"A","supplierId":"B"}]}',
    '{"a":1,"\\u0061":2}', '{', 'null', '[]', '{"schemaVersion":NaN}', ' '.repeat(MAX_BYTES + 1)]) {
    const output = run(inputJson);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.calculationPerformed, true);
    assert.equal(output.receipt.status, 'invalid_input');
    assert.equal(output.handoff.status, 'blocked');
    assert.deepEqual(output.missing, []);
    assert.deepEqual(output.questions, []);
  }
});

test('fixed CLI and bounded envelope reject malformed shapes without raw input or traces', () => {
  const marker = 'PRIVATE_TEST_MARKER';
  for (const envelope of [null, [], {}, { task, inputJson: 1 }, { task: ' ', inputJson: '{}' },
    { task, inputJson: '{}', receipt: { marker } }, '{broken' + marker,
    '{"task":"x","task":"y","inputJson":"{}"}', ' '.repeat(1600001)]) {
    const output = invoke(envelope);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.handoff.status, 'blocked');
    assert.equal(JSON.stringify(output).includes(marker), false);
  }
  assert.equal(invoke({ task, inputJson: '{}' }, 'deliver.py', ['--file', marker]).status, 'invalid_input');
  const output = run(JSON.stringify(fixture('normal')).padEnd(MAX_BYTES, ' '));
  assert.equal(output.status, 'completed', 'original raw byte boundary remains inclusive');
});

test('delivery imports the adjacent helper without bytecode, subprocesses, network or file writes', () => {
  run(fixture('normal'));
  assert.equal(fs.existsSync(path.join(root, 'scripts/__pycache__')), false);
  const script = read('scripts/deliver.py');
  assert.match(script, /importlib\.util\.spec_from_file_location/);
  assert.match(script, /sys\.dont_write_bytecode = True/);
  assert.doesNotMatch(script, /\b(?:subprocess|socket|urllib|requests|write_text|write_bytes|open)\s*[.(]/);
});

const TOOL = 'store-performance-calculator', VERSION = '0.2.0', MAX_BYTES = 65536;
const SCOPE = 'review_supplied_store_rows_only', REQUIRED = 'rows', QUESTION_PATTERN = /期间、SKU、渠道.*未知退款或成本可留空/;
const fixture = name => JSON.parse(read(`fixtures/${name}.json`));

test('store delivery preserves net revenue, contribution, percentage points and uncertainty', () => {
  const output = run(fixture('normal'));
  assert.match(output.delivery, /支付订单\/访客 4%.*退款净收入 220 CNY.*所列成本后贡献 95/);
  assert.match(output.delivery, /变化 -4 个百分点；收入分解仅为算术，不证明因果/);
  assert.match(run(fixture('missing-fields')).delivery, /退款净收入 未知 CNY.*所列成本后贡献 未知/);
  assert.match(run(fixture('definition-conflict')).delivery, /不作跨期比较和收入分解/);
  assert.equal(output.brief.permitsBusinessChanges, false);
  assert.equal(run(fixture('definition-conflict')).handoff.status, 'ready');
  assert(run(fixture('missing-fields')).issues.some(issue => issue.row === 0));
});

test('store domain validation rejects exact shape, identity, row binding, numeric and comparison corruption', () => {
  checkMutations(["r['tool'] = 'other'", "r['version'] = '9'", "r['schemaVersion'] = True", "r['filesModified'] = True",
    "r['unexpected'] = True", "r['calculationTable'].pop()", "r['calculationTable'][0]['period'] = 'unbound'",
    "r['calculationTable'][0]['sku'] = 'unbound'", "r['calculationTable'][0]['channel'] = 'unbound'",
    "r['calculationTable'][0]['metrics']['netRevenue'] = 450", "r['calculationTable'][0]['metrics']['contributionAfterListedCosts'] = 'NaN'",
    "r['calculationTable'][0]['metrics']['paidOrdersPerVisitorPercent'] = '0.0000001'",
    "r['calculationTable'][0]['definitions']['currency'] = 1", "r['quality'] = [{}]", "r['status'] = 'partial'",
    "r['comparisons'][0]['deltas']['paidOrdersPerVisitorPercent'] = 4",
    "r['comparisons'][0]['status'] = 'not_comparable'"]);
});
