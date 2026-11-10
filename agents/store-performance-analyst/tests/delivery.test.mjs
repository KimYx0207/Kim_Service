import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';
const task = '只核算本次材料，不执行任何业务操作';
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const processTimeout = 10000;
// Use an asynchronous pipe with an explicit EOF. A synchronous pipe can
// stall before delivering EOF on some macOS runtimes; changing the reader or
// using a temporary input file would stop exercising the real stdin protocol.
function executeProcess(args, options, timeoutMs = processTimeout) {
  const { input = '', encoding = 'utf8', maxBuffer = 4 * 1024 * 1024, ...rest } = options;
  return new Promise((resolve) => {
    let spawned = false, stdinFinished = false, stdinError;
    const child = execFile(python, args, {
      ...rest, encoding, maxBuffer, timeout: timeoutMs, shell: false,
    }, (error, stdout, stderr) => {
      // Exit 2 is the tool's deliberate invalid_input result, not a transport
      // failure. Timeouts, signals, spawn/stream errors and buffer exhaustion
      // still fail. The caller checks the exact exit code and JSON status.
      const deliberateEarlyRejection = error?.code === 2 && stdinError?.code === 'EPIPE';
      const transportError = error && (error.killed || typeof error.code !== 'number')
        ? error : (stdinError && !deliberateEarlyRejection ? stdinError : undefined);
      resolve({ error: transportError, signal: error?.signal ?? null,
        status: error ? (typeof error.code === 'number' ? error.code : null) : 0,
        stdout, stderr, spawned, stdinFinished, stdinError: stdinError?.code ?? null });
    });
    child.once('spawn', () => { spawned = true; });
    child.stdin.once('finish', () => { stdinFinished = true; });
    child.stdin.once('error', (error) => { stdinError = error; });
    child.stdin.end(input);
  });
}
function assertProcessFinished(child, diagnostic) {
  assert.equal(child.error, undefined, diagnostic);
  assert.equal(child.signal, null, diagnostic);
}
async function checkedSpawn(args, options, label) {
  const child = await executeProcess(args, options);
  const diagnostic = JSON.stringify({ label, timeoutMs: processTimeout,
    errorCode: child.error?.code ?? null, status: child.status, signal: child.signal,
    childSpawned: child.spawned, stdinFinished: child.stdinFinished, stdinError: child.stdinError,
    inputBytes: Buffer.byteLength(options.input ?? ''),
    inputSha256: createHash('sha256').update(options.input ?? '').digest('hex') });
  assertProcessFinished(child, diagnostic);
  return { child, diagnostic };
}
async function invoke(input, script = 'deliver.py', args = ['--input-json', '-']) {
  const { child, diagnostic } = await checkedSpawn(['-I', '-B', path.join(root, 'scripts', script), ...args], {
    input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024, cwd: root,
  }, `${script}:${args.join(' ')}`);
  assert.equal(child.stderr, '', diagnostic);
  const output = JSON.parse(child.stdout);
  assert.equal(child.status, output.status === 'invalid_input' ? 2 : 0, diagnostic);
  return output;
}
async function run(materials, request = task) {
  const output = await invoke({ task: request, inputJson: typeof materials === 'string' ? materials : JSON.stringify(materials) });
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

async function checkMutations(mutations) {
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
  const { child, diagnostic } = await checkedSpawn(['-I', '-B', '-c', code, path.join(root, 'scripts/deliver.py'), JSON.stringify(mutations)], {
    input: JSON.stringify(fixture('normal')), encoding: 'utf8', cwd: root,
  }, 'domain-receipt-mutations');
  assert.equal(child.status, 0, diagnostic);
  assert.equal(child.stdout.trim(), 'validated');
}

test('async stdin delivers all UTF-8 bytes and a real EOF before reading a receipt', async () => {
  const input = '纸'.repeat(100000);
  const { child } = await checkedSpawn(['-I', '-B', '-c',
    'import sys, hashlib; data=sys.stdin.buffer.read(); print(len(data)); print(hashlib.sha256(data).hexdigest())'],
    { input, encoding: 'utf8', cwd: root }, 'stdin-eof-probe');
  assert.equal(child.status, 0);
  assert.equal(child.spawned, true);
  assert.equal(child.stdinFinished, true);
  assert.equal(child.stdinError, null);
  assert.equal(child.stdout, `${Buffer.byteLength(input)}\n${createHash('sha256').update(input).digest('hex')}\n`);
});

test('async process deadlines and output limits remain terminal failures', async () => {
  const timeout = await executeProcess(['-I', '-B', '-c', 'import time; time.sleep(10)'],
    { encoding: 'utf8', cwd: root }, 50);
  assert.throws(() => assertProcessFinished(timeout, 'deadline exceeded'), /deadline exceeded/);
  const oversized = await executeProcess(['-I', '-B', '-c', "print('x' * 100000)"],
    { encoding: 'utf8', cwd: root, maxBuffer: 1024 });
  assert.equal(oversized.error?.code, 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER');
  assert.throws(() => assertProcessFinished(oversized, 'output limit exceeded'), /output limit exceeded/);
});

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

test('delivery uses real original calculator receipts and preserves partial unknowns', async () => {
  for (const name of ['normal', 'missing-fields', 'definition-conflict']) {
    const materials = fixture(name);
    const output = await run(materials);
    assert.deepEqual(output.receipt, await invoke(materials, 'calculate.py'));
    assert.equal(output.status, output.receipt.status);
    assert.equal(output.calculationPerformed, true);
    assert.equal(typeof output.delivery, 'string');
    assert.equal(output.brief.scope, SCOPE);
  }
});

test('missing materials ask component questions without calculating; zero and false are not missing', async () => {
  for (const missing of [undefined, null, '', '  ', []]) {
    const materials = fixture('normal');
    materials[REQUIRED] = missing;
    const output = await run(materials);
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
    const output = await run(materials);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.calculationPerformed, true);
    assert.deepEqual(output.missing, []);
    assert.equal(output.handoff.status, 'blocked');
  }
});

test('strict inner parsing rejects duplicate keys before missing preflight and preserves the task', async () => {
  for (const inputJson of ['{"rows":[],"rows":[]}', '{"quotes":[{"supplierId":"A","supplierId":"B"}]}',
    '{"a":1,"\\u0061":2}', '{', 'null', '[]', '{"schemaVersion":NaN}', ' '.repeat(MAX_BYTES + 1)]) {
    const output = await run(inputJson);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.calculationPerformed, true);
    assert.equal(output.receipt.status, 'invalid_input');
    assert.equal(output.handoff.status, 'blocked');
    assert.deepEqual(output.missing, []);
    assert.deepEqual(output.questions, []);
  }
});

test('fixed CLI and bounded envelope reject malformed shapes without raw input or traces', async () => {
  const marker = 'PRIVATE_TEST_MARKER';
  for (const envelope of [null, [], {}, { task, inputJson: 1 }, { task: ' ', inputJson: '{}' },
    { task, inputJson: '{}', receipt: { marker } }, '{broken' + marker,
    '{"task":"x","task":"y","inputJson":"{}"}', ' '.repeat(1600001)]) {
    const output = await invoke(envelope);
    assert.equal(output.status, 'invalid_input');
    assert.equal(output.handoff.status, 'blocked');
    assert.equal(JSON.stringify(output).includes(marker), false);
  }
  assert.equal((await invoke({ task, inputJson: '{}' }, 'deliver.py', ['--file', marker])).status, 'invalid_input');
  const output = await run(JSON.stringify(fixture('normal')).padEnd(MAX_BYTES, ' '));
  assert.equal(output.status, 'completed', 'original raw byte boundary remains inclusive');
});

test('delivery imports the adjacent helper without bytecode, subprocesses, network or file writes', async () => {
  await run(fixture('normal'));
  assert.equal(fs.existsSync(path.join(root, 'scripts/__pycache__')), false);
  const script = read('scripts/deliver.py');
  assert.match(script, /importlib\.util\.spec_from_file_location/);
  assert.match(script, /sys\.dont_write_bytecode = True/);
  assert.doesNotMatch(script, /\b(?:subprocess|socket|urllib|requests|write_text|write_bytes|open)\s*[.(]/);
});

const TOOL = 'store-performance-calculator', VERSION = '0.2.0', MAX_BYTES = 65536;
const SCOPE = 'review_supplied_store_rows_only', REQUIRED = 'rows', QUESTION_PATTERN = /期间、SKU、渠道.*未知退款或成本可留空/;
const fixture = name => JSON.parse(read(`fixtures/${name}.json`));

test('store delivery preserves net revenue, contribution, percentage points and uncertainty', async () => {
  const output = await run(fixture('normal'));
  assert.match(output.delivery, /支付订单\/访客 4%.*退款净收入 220 CNY.*所列成本后贡献 95/);
  assert.match(output.delivery, /变化 -4 个百分点；收入分解仅为算术，不证明因果/);
  assert.match((await run(fixture('missing-fields'))).delivery, /退款净收入 未知 CNY.*所列成本后贡献 未知/);
  assert.match((await run(fixture('definition-conflict'))).delivery, /不作跨期比较和收入分解/);
  assert.equal(output.brief.permitsBusinessChanges, false);
  assert.equal((await run(fixture('definition-conflict'))).handoff.status, 'ready');
  assert((await run(fixture('missing-fields'))).issues.some(issue => issue.row === 0));
});

test('store domain validation rejects exact shape, identity, row binding, numeric and comparison corruption', async () => {
  await checkMutations(["r['tool'] = 'other'", "r['version'] = '9'", "r['schemaVersion'] = True", "r['filesModified'] = True",
    "r['unexpected'] = True", "r['calculationTable'].pop()", "r['calculationTable'][0]['period'] = 'unbound'",
    "r['calculationTable'][0]['sku'] = 'unbound'", "r['calculationTable'][0]['channel'] = 'unbound'",
    "r['calculationTable'][0]['metrics']['netRevenue'] = 450", "r['calculationTable'][0]['metrics']['contributionAfterListedCosts'] = 'NaN'",
    "r['calculationTable'][0]['metrics']['paidOrdersPerVisitorPercent'] = '0.0000001'",
    "r['calculationTable'][0]['definitions']['currency'] = 1", "r['quality'] = [{}]", "r['status'] = 'partial'",
    "r['comparisons'][0]['deltas']['paidOrdersPerVisitorPercent'] = 4",
    "r['comparisons'][0]['status'] = 'not_comparable'"]);
});
