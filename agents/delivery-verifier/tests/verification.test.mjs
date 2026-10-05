import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture, digest } from './fixture.mjs';
import { LIMITS, parseStrict, verify } from '../scripts/verify.mjs';

const script = fileURLToPath(new URL('../scripts/verify.mjs', import.meta.url));
const safeOpenSupported = process.platform !== 'win32' && typeof fs.constants.O_NOFOLLOW === 'number' && typeof fs.constants.O_NONBLOCK === 'number';
const posixTest = (name, callback) => test(name, { skip: safeOpenSupported ? false : 'POSIX safe-open support required; Windows rejection is tested separately' }, callback);
const serialized = value => Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
function run(f, input = f.request, args = ['--artifact-root', f.root, '--input-json', '-']) {
  const child = spawnSync(process.execPath, [script, ...args], { input: serialized(input), encoding: 'utf8',
    shell: false, timeout: 10000, maxBuffer: 1048576 });
  assert.ifError(child.error); assert.equal(child.stderr, '');
  const output = JSON.parse(child.stdout);
  assert.equal(child.status, { completed: 0, partial: 1, blocked: 2 }[output.status]);
  assert.equal(output.schemaVersion, 1); assert.equal(output.tool, 'delivery-verify'); assert.equal(output.toolVersion, '0.1.0');
  assert.equal(output.verificationScope, 'local_manifest_and_evidence_consistency');
  assert.equal(output.networkUsed, false); assert.equal(output.filesModified, false);
  assert.equal(output.receiptAuthenticity, 'not_verified');
  assert.deepEqual(output.runtimeVerification, { host: 'not_tested', browser: 'not_tested', model: 'not_tested', nativeAgent: 'needs_probe', hostBinding: 'requires_host_binding' });
  assert.equal(output.handoff.finalAcceptance, 'not_decided'); assert.equal(output.handoff.decisionOwner, 'caller_or_meta');
  assert.equal(child.stdout.includes(f.root), false, 'absolute root is never echoed');
  assert.deepEqual(Object.keys(output).sort(), ['schemaVersion', 'tool', 'toolVersion', 'taskId', 'status', 'verificationScope', 'artifactRefs',
    'criterionResults', 'missingCapabilities', 'failures', 'stopReason', 'handoff', 'runtimeVerification', 'receiptAuthenticity', 'networkUsed', 'filesModified'].sort());
  return output;
}
function using(callback) { const f = fixture(); try { return callback(f); } finally { f.cleanup(); } }
const receiptWrite = f => f.put('receipt', 'receipt.json', f.receipt);
const code = (output, expected) => assert.ok(output.failures.some(item => item.code === expected), JSON.stringify(output.failures));

posixTest('real files pass bytes/hash, output JSON and individually bound receipt checks without writes', () => using(f => {
  const before = f.request.artifacts.map(item => fs.statSync(path.join(f.root, item.path), { bigint: true }));
  const output = run(f);
  assert.equal(output.status, 'completed'); assert.equal(output.handoff.status, 'ready_for_caller_review');
  assert.equal(output.stopReason, 'local_checks_completed');
  assert.equal(output.artifactRefs.length, 3); assert.equal(output.criterionResults.length, 3);
  assert.ok(output.artifactRefs.every(item => item.status === 'verified' && item.bytes === item.actualBytes && item.sha256 === item.actualSha256));
  assert.ok(output.criterionResults.every(item => item.status === 'passed'));
  assert.deepEqual(output.missingCapabilities, []); assert.deepEqual(output.failures, []);
  assert.deepEqual(fs.readdirSync(f.root).sort(), ['input.json', 'receipt.json', 'report.json']);
  f.request.artifacts.forEach((item, index) => {
    const after = fs.statSync(path.join(f.root, item.path), { bigint: true });
    for (const key of ['size', 'mtimeNs', 'ctimeNs', 'ino']) assert.equal(after[key], before[index][key]);
  });
}));

posixTest('manual/browser/model requirements remain unverified with explicit gaps', () => using(f => {
  for (const capability of ['human-review', 'browser-session', 'model-evaluation'])
    f.request.criteria.push({ id: capability, type: 'external_review', description: 'External review required', capability });
  const output = run(f);
  assert.equal(output.status, 'partial'); assert.equal(output.handoff.status, 'needs_evidence');
  assert.equal(output.stopReason, 'verification_incomplete');
  assert.equal(output.missingCapabilities.length, 3);
  assert.ok(output.criterionResults.slice(3).every(item => item.status === 'unverified'));
}));

posixTest('actual same-size tampering and declared bytes mismatch never pass integrity', () => using(f => {
  fs.writeFileSync(path.join(f.root, 'report.json'), '{"count":4}');
  let output = run(f); assert.equal(output.status, 'partial'); code(output, 'sha256_mismatch');
  assert.equal(output.criterionResults[0].status, 'failed');
  assert.equal(output.criterionResults[2].status, 'failed');
  f.request.artifacts.find(item => item.id === 'report').bytes++;
  output = run(f); code(output, 'bytes_mismatch');
}));

posixTest('missing files continue other safe checks; no verifiable evidence blocks', () => using(f => {
  fs.unlinkSync(path.join(f.root, 'report.json'));
  let output = run(f); assert.equal(output.status, 'partial'); code(output, 'artifact_missing');
  assert.equal(output.artifactRefs.find(item => item.id === 'report').actualBytes, null);
  fs.unlinkSync(path.join(f.root, 'input.json')); fs.unlinkSync(path.join(f.root, 'receipt.json'));
  output = run(f); assert.equal(output.status, 'blocked'); assert.equal(output.stopReason, 'no_verifiable_evidence');
}));

posixTest('receipt success labels, task/tool/version/input/output/result mismatches all fail', () => {
  const mutations = [
    f => { f.receipt = 'passed'; }, f => { f.receipt = { status: 'completed' }; },
    f => { f.receipt.taskId = 'other'; }, f => { f.receipt.tool = 'other'; },
    f => { f.receipt.toolVersion = '9.0.0'; }, f => { f.receipt.invocationId = 'other'; },
    f => { f.receipt.inputSha256 = '0'.repeat(64); }, f => { f.receipt.status = 'partial'; },
    f => { f.receipt.exitCode = 1; }, f => { f.receipt.result.count = 4; },
    f => { delete f.receipt.result.count; }, f => { f.receipt.outputArtifacts = []; },
    f => { f.receipt.outputArtifacts[0].id = 'input'; }, f => { f.receipt.outputArtifacts[0].bytes++; },
    f => { f.receipt.outputArtifacts[0].sha256 = '0'.repeat(64); },
    f => { f.receipt.outputArtifacts.push({ ...f.receipt.outputArtifacts[0] }); },
    f => { f.receipt.passed = true; }
  ];
  for (const mutation of mutations) using(f => {
    mutation(f); receiptWrite(f); const output = run(f);
    assert.equal(output.status, 'partial'); assert.equal(output.criterionResults[2].status, 'failed');
    assert.equal(output.artifactRefs[2].status, 'verified', 'receipt bytes alone are insufficient');
  });
});

posixTest('self-consistent evidence still never certifies authenticity or external execution', () => using(f => {
  const output = run(f);
  assert.equal(output.status, 'completed'); assert.equal(output.receiptAuthenticity, 'not_verified');
  assert.equal(output.handoff.finalAcceptance, 'not_decided');
}));

posixTest('JSON pointer checks actual values, ordered arrays, escaped keys and absent nulls', () => using(f => {
  const json = { 'a/b': { '~': [0, false, null, { b: 2, a: 1 }] } };
  f.put('report', 'report.json', json); f.request.criteria = [
    { id: 'zero', description: 'Zero is data', type: 'json_equals', artifactId: 'report', pointer: '/a~1b/~0/0', equals: 0 },
    { id: 'false', description: 'False is data', type: 'json_equals', artifactId: 'report', pointer: '/a~1b/~0/1', equals: false },
    { id: 'null', description: 'Explicit null', type: 'json_equals', artifactId: 'report', pointer: '/a~1b/~0/2', equals: null },
    { id: 'object', description: 'Object key order is irrelevant', type: 'json_equals', artifactId: 'report', pointer: '/a~1b/~0/3', equals: { a: 1, b: 2 } }
  ];
  assert.equal(run(f).status, 'completed');
  f.request.criteria[0].pointer = '/a~1b/~0/00';
  f.request.criteria[2].pointer = '/absent';
  let output = run(f); assert.equal(output.status, 'partial');
  assert.equal(output.criterionResults[0].status, 'failed'); assert.equal(output.criterionResults[2].status, 'failed');
  f.request.criteria = [{ id: 'whole', description: 'Whole document', type: 'json_equals', artifactId: 'report', pointer: '', equals: json }];
  assert.equal(run(f).status, 'completed');
}));

posixTest('strict JSON evidence rejects duplicate keys and malformed/oversized JSON', () => using(f => {
  f.request.criteria = [f.request.criteria[1]];
  for (const content of ['{"count":3,"count":3}', '{"count":3,"\\u0063ount":3}', '{', ' '.repeat(LIMITS.jsonBytes + 1)]) {
    f.put('report', 'report.json', content); const output = run(f);
    assert.equal(output.status, 'partial'); assert.equal(output.criterionResults[0].status, 'failed');
  }
}));

test('paths reject traversal, absolute, ambiguous separators, aliases and device names', () => {
  for (const badPath of ['../outside', '/outside', 'C:/outside', 'C:\\outside', 'folder/../file', './file', 'a//b',
    'a\\b', 'a/', '.hidden', 'a\u0000', 'a\n', 'a:stream', '%2e%2e/file', 'con', 'NUL.txt', 'a.', 'a ']) using(f => {
    f.request.artifacts[0].path = badPath;
    const output = run(f); assert.equal(output.status, 'blocked'); code(output, 'unsafe_path'); assert.deepEqual(output.artifactRefs, []);
  });
});

posixTest('symlink file, directory, root and hardlinks are rejected without target bytes', () => {
  for (const kind of ['file-link', 'directory-link', 'root-link', 'hardlink', 'directory-file']) using(f => {
    let root = f.root;
    if (kind === 'file-link') { fs.unlinkSync(path.join(root, 'report.json')); fs.symlinkSync(path.join(root, 'input.json'), path.join(root, 'report.json')); }
    if (kind === 'directory-link') { fs.symlinkSync(root, path.join(root, 'linked')); f.request.artifacts[1].path = 'linked/report.json'; }
    if (kind === 'root-link') { fs.symlinkSync(root, path.join(root, 'linked')); root = path.join(root, 'linked'); }
    if (kind === 'hardlink') fs.linkSync(path.join(root, 'report.json'), path.join(root, 'copy.json'));
    if (kind === 'directory-file') { fs.unlinkSync(path.join(root, 'report.json')); fs.mkdirSync(path.join(root, 'report.json')); }
    const output = run(f, f.request, ['--artifact-root', root, '--input-json', '-']);
    assert.equal(output.status, 'blocked');
    assert.ok(['unsafe_file', 'unsafe_scope'].includes(output.stopReason));
    assert.equal(output.artifactRefs.find(item => item.id === 'report')?.actualBytes ?? null, null);
  });
});

posixTest('observed file mutation blocks rather than accepting a racing read', () => using(f => {
  const original = fs.readSync; let changed = false;
  try {
    fs.readSync = (...args) => {
      const count = original(...args);
      if (!changed) { changed = true; fs.appendFileSync(path.join(f.root, 'input.json'), ' '); }
      return count;
    };
    const output = verify(serialized(f.request), f.root);
    assert.equal(output.status, 'blocked'); code(output, 'artifact_changed');
  } finally { fs.readSync = original; }
}));

test('unknown fields/types, invalid references, empty criteria and forged approval reject', () => {
  const mutations = [
    f => { f.request.passed = true; }, f => { f.request.approved = true; }, f => { f.request.artifactRoot = f.root; },
    f => { f.request.command = 'PRIVATE_TEST_MARKER'; }, f => { f.request.schemaVersion = 2; },
    f => { f.request.taskId = ''; }, f => { f.request.artifacts = []; }, f => { f.request.criteria = []; },
    f => { f.request.criteria[0].type = 'shell'; }, f => { f.request.criteria[0].artifactId = 'absent'; },
    f => { f.request.criteria[0].passed = true; }, f => { f.request.criteria.push(f.request.criteria[0]); },
    f => { f.request.artifacts.push(f.request.artifacts[0]); }, f => { f.request.artifacts[1].path = 'INPUT.JSON'; },
    f => { f.request.artifacts[0].bytes = -1; }, f => { f.request.artifacts[0].bytes = true; },
    f => { f.request.artifacts[0].bytes = 1.5; }, f => { f.request.artifacts[0].sha256 = 'A'.repeat(64); },
    f => { f.request.criteria[1].pointer = '/bad~2pointer'; }, f => { f.request.criteria[2].assertions = []; },
    f => { f.request.criteria[2].assertions[0].pointer = '/status'; },
    f => { f.request.criteria[2].outputArtifactIds = ['receipt']; },
    f => { f.request.criteria[2].outputArtifactIds = ['report', 'report']; },
    f => { f.request.criteria[2].inputArtifactId = 'receipt'; }
  ];
  for (const mutation of mutations) using(f => {
    mutation(f); const output = run(f); assert.equal(output.status, 'blocked');
    assert.deepEqual(output.artifactRefs, []); assert.equal(JSON.stringify(output).includes('PRIVATE_TEST_MARKER'), false);
  });
});

test('invalid root, arguments, UTF-8, duplicate JSON keys, numbers, sizes and complexity reject', () => using(f => {
  for (const raw of ['{PRIVATE_TEST_MARKER', 'null', '[]', '{"x":1,"x":2}', '{"a":1,"\\u0061":2}',
    '{"x":1e999}', '{"x":9007199254740993}', Buffer.from([0xff]), ' '.repeat(LIMITS.inputBytes + 1), '['.repeat(40) + '0' + ']'.repeat(40)]) {
    const output = run(f, raw); assert.equal(output.status, 'blocked');
    assert.equal(JSON.stringify(output).includes('PRIVATE_TEST_MARKER'), false);
  }
  for (const root of ['relative/path', '/', f.root + '/..']) {
    const output = run(f, f.request, ['--artifact-root', root, '--input-json', '-']);
    assert.equal(output.status, 'blocked'); code(output, 'invalid_artifact_root');
  }
  for (const args of [[], ['--input-json', '-'], ['--artifact-root', f.root, '--file', 'private']]) {
    const output = run(f, f.request, args); assert.equal(output.status, 'blocked'); code(output, 'invalid_arguments');
  }
  const text = JSON.stringify(f.request);
  const boundary = run(f, text.padEnd(LIMITS.inputBytes, ' '));
  assert.equal(boundary.status, safeOpenSupported ? 'completed' : 'blocked', 'inclusive stdin byte boundary');
  if (!safeOpenSupported) code(boundary, 'safe_open_unavailable');
}));

posixTest('empty regular files and resource limits are deterministic', () => using(f => {
  f.put('empty', 'empty.txt', '');
  f.request.criteria.push({ id: 'empty', type: 'artifact_integrity', description: 'Empty file is legitimate', artifactId: 'empty' });
  assert.equal(run(f).status, 'completed');
  f.request.artifacts.at(-1).bytes = LIMITS.fileBytes + 1;
  assert.equal(run(f).status, 'blocked');
  f.request.artifacts.at(-1).bytes = 0;
  fs.writeFileSync(path.join(f.root, 'empty.txt'), Buffer.alloc(LIMITS.fileBytes + 1));
  let output = run(f); assert.equal(output.status, 'blocked'); code(output, 'artifact_size');
  const small = Buffer.from('{"a":1}'); assert.equal(parseStrict(small).a, 1);
  assert.equal(digest(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
}));

posixTest('real temporary-file demo succeeds and still reports no runtime proof', () => {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/demo.mjs', import.meta.url))],
    { encoding: 'utf8', shell: false, timeout: 10000, maxBuffer: 1048576 });
  assert.ifError(child.error); assert.equal(child.stderr, ''); assert.equal(child.status, 0);
  const output = JSON.parse(child.stdout);
  assert.equal(output.result.status, 'completed'); assert.match(output.demo, /synthetic/);
  assert.equal(output.result.runtimeVerification.host, 'not_tested');
});

test('unsupported platforms block before reading any artifact', { skip: safeOpenSupported ? 'Actual unsupported-platform case runs on Windows CI' : false }, () => using(f => {
  const output = run(f);
  assert.equal(output.status, 'blocked'); code(output, 'safe_open_unavailable');
  assert.deepEqual(output.artifactRefs, []); assert.deepEqual(output.criterionResults, []);
}));
