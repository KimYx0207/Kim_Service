import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';
const task = '只核算本次材料，不执行任何业务操作';
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
// Test harness only. Keep every failure terminal; never retry or change the
// production host's process policy to compensate for a slow CI machine.
function testTimeout(value) {
  if (value === undefined) return 30000;
  assert.match(value, /^[0-9]+$/, 'test timeout must be integer milliseconds');
  const milliseconds = Number(value);
  assert(Number.isSafeInteger(milliseconds) && milliseconds >= 10000 && milliseconds <= 60000,
    'test timeout must be between 10000 and 60000 milliseconds');
  return milliseconds;
}
const processTimeout = testTimeout(process.env.KIM_SERVICE_TEST_PROCESS_TIMEOUT_MS);
function checkedSpawn(args, options, label) {
  const started = performance.now();
  const child = spawnSync(python, args, { ...options, timeout: processTimeout, shell: false });
  const diagnostic = JSON.stringify({ label, elapsedMs: Math.round(performance.now() - started),
    timeoutMs: processTimeout, errorCode: child.error?.code ?? null,
    status: child.status, signal: child.signal,
    inputBytes: Buffer.byteLength(options.input ?? ''),
    inputSha256: createHash('sha256').update(options.input ?? '').digest('hex'),
    stdoutBytes: Buffer.byteLength(child.stdout ?? ''), stderrBytes: Buffer.byteLength(child.stderr ?? '') });
  assertProcessFinished(child, diagnostic);
  return { child, diagnostic };
}
function assertProcessFinished(child, diagnostic) {
  assert.equal(child.error, undefined, diagnostic);
  assert.equal(child.signal, null, diagnostic);
}
test('process timeouts and signals remain hard failures without retries', () => {
  assert.throws(() => assertProcessFinished({ error: { code: 'ETIMEDOUT' }, signal: 'SIGTERM' }, 'timeout'), /timeout/);
  assert.throws(() => assertProcessFinished({ error: undefined, signal: 'SIGTERM' }, 'signal'), /signal/);
  assert.doesNotThrow(() => assertProcessFinished({ error: undefined, signal: null }, 'finished'));
});
test('test process budget has a finite default and rejects malformed or unbounded overrides', () => {
  assert.equal(testTimeout(undefined), 30000);
  assert.equal(testTimeout('10000'), 10000);
  assert.equal(testTimeout('60000'), 60000);
  for (const value of ['0', '9999', '60001', 'Infinity', '1e4', '-1', '', ' 30000']) assert.throws(() => testTimeout(value));
});
test('Python test interpreter starts in isolation before delivery cases', (t) => {
  const { child, diagnostic } = checkedSpawn(['-I', '-B', '-c', 'import sys; print(sys.version.split()[0])'],
    { encoding: 'utf8', cwd: root }, 'python-startup-preflight');
  t.diagnostic(diagnostic);
  assert.equal(child.status, 0, diagnostic);
  assert.equal(child.stderr, '', diagnostic);
  assert.match(child.stdout.trim(), /^3\.\d+\.\d+$/);
});

function invoke(input, script = 'deliver.py', args = ['--input-json', '-']) {
  const { child, diagnostic } = checkedSpawn(['-I', '-B', path.join(root, 'scripts', script), ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024, cwd: root,
  }, `${script}:${args.join(' ')}`);
  assert.equal(child.stderr, '', diagnostic);
  const output = JSON.parse(child.stdout);
  assert.equal(child.status, output.status === 'invalid_input' ? 2 : 0, diagnostic);
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
  const { child, diagnostic } = checkedSpawn(['-I', '-B', '-c', code, path.join(root, 'scripts/deliver.py'), JSON.stringify(mutations)], {
    input: JSON.stringify(fixture('normal')), encoding: 'utf8',
  }, 'domain-receipt-mutations');
  assert.equal(child.status, 0, diagnostic);
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
    assert.deepEqual(output.receipt, invoke(inputJson, 'calculate.py'), 'rejected receipt matches the original calculator');
    assert.equal(output.handoff.status, 'blocked');
    assert.deepEqual(output.missing, []);
    assert.deepEqual(output.questions, []);
  }
});

test('nonfinite and oversized UTF-8 inputs retain actionable original error codes', () => {
  for (const raw of ['{"quantity":NaN}', '{"quantity":Infinity}', '{"quantity":-Infinity}',
    '{"quotes":[{"packPrice":NaN}]}']) {
    const output = run(raw);
    assert.deepEqual(output.receipt, invoke(raw, 'calculate.py'));
    assert.equal(output.receipt.quality.issues[0].code, 'nonfinite_number');
  }
  const oversized = JSON.stringify({ specification: '纸'.repeat(Math.ceil(MAX_BYTES / 3)) });
  assert.ok(Buffer.byteLength(oversized) > MAX_BYTES);
  const output = run(oversized);
  assert.deepEqual(output.receipt, invoke(oversized, 'calculate.py'));
  assert.equal(output.receipt.quality.issues[0].code, 'input_size');
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

const TOOL = 'supplier-comparison-calculate', VERSION = '0.1.0', MAX_BYTES = 262144;
const SCOPE = 'compare_supplied_materials_only', REQUIRED = 'quantity', QUESTION_PATTERN = /采购数量.*不需要为了核算先设置权重/;
const fixture = name => JSON.parse(read(`tests/fixtures/${name}.json`));

test('supplier delivery renders totals, zero excess and unknown fees without choosing a supplier', () => {
  const output = run(fixture('normal'));
  assert.match(output.delivery, /A：到货总支出 335 CNY，实收 150，超购 30/);
  assert.match(output.delivery, /B：到货总支出 275 CNY，实收 120，超购 0/);
  assert.match(output.delivery, /未合成排名/);
  assert.match(run(fixture('missing-fields')).delivery, /到货总支出 待确认/);
  assert.equal(output.brief.permitsContactOrPurchase, false);
});

test('supplier conflicts keep partial receipt and ask the unified-definition handoff question', () => {
  const output = run(fixture('definition-conflict'));
  assert.equal(output.status, 'partial');
  assert.equal(output.receipt.status, 'partial');
  assert.deepEqual(output.handoff, { status: 'needs_input', code: 'calculation_definition_conflict',
    questions: ['请确认候选报价的规格与单位、币种采用什么统一口径；当前不作横向排名。'] });
  assert.deepEqual(output.issues.filter(issue => issue.code === 'definition_conflict'), [
    { code: 'definition_conflict', field: 'specification' }, { code: 'definition_conflict', field: 'currency' },
  ]);
});

test('supplier domain validation rejects identity, flags, shape, row binding, and numeric corruption', () => {
  checkMutations(["r['tool'] = 'other'", "r['toolVersion'] = '9'", "r['networkUsed'] = True",
    "r['quality']['certifiedSuppliers'] = True", "r['unexpected'] = True", "r['normalizedQuotes'].pop()",
    "r['normalizedQuotes'][0]['supplierId'] = 'unbound'", "r['normalizedQuotes'][0]['landedTotal'] = 335",
    "r['normalizedQuotes'][0]['costPerDeliveredUnit'] = 'NaN'", "r['normalizedQuotes'][0]['constraintStatus'] = 'approved'",
    "r['status'] = 'partial'", "r['quality']['issues'] = [{}]"]);
});
