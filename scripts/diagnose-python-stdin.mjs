#!/usr/bin/env node
// Temporary, offline CI diagnosis. Exactly one invocation per stdin transport.
// Fixed public synthetic material only; production helpers remain unchanged.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const component = path.join(root, 'agents/supplier-comparison-analyst');
const script = path.join(component, 'scripts/deliver.py');
const python = process.platform === 'win32' ? 'python' : 'python3';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = digest(fs.readFileSync(script));
const materials = JSON.parse(fs.readFileSync(path.join(component, 'tests/fixtures/normal.json')));
const input = JSON.stringify({ task: '只核算本次材料，不执行任何业务操作', inputJson: JSON.stringify(materials).padEnd(262144, ' ') });
const inputSha256 = digest(input);
if (Buffer.byteLength(input) !== 262305 || inputSha256 !== 'b9767a4bd25023419b630b35e507acbd99ffe4fe2851d77b7cc4006f598ca679') throw Error('fixed synthetic fixture drift');
const timeoutMs = 10000;
const wrapper = `import sys, runpy, time, json
started = time.monotonic()
def mark(stage, **fields):
    sys.stderr.write('DIAG ' + json.dumps(dict(stage=stage, elapsedMs=round((time.monotonic()-started)*1000), **fields)) + '\\n')
    sys.stderr.flush()
mark('started')
source = sys.argv[1]
class ReadObserver:
    def read(self, count=-1):
        mark('stdin_read_started', limit=count)
        value = sys.__stdin__.buffer.read(count)
        mark('stdin_read_finished', bytes=len(value))
        return value
class StdinObserver:
    buffer = ReadObserver()
sys.stdin = StdinObserver()
def profile(frame, event, arg):
    if frame.f_code.co_filename == source and frame.f_code.co_name in ('parse_json', 'deliver', 'main') and event in ('call', 'return'):
        mark(frame.f_code.co_name + '_' + event)
sys.argv = [source, '--input-json', '-']
sys.setprofile(profile)
try:
    runpy.run_path(source, run_name='__main__')
except SystemExit as error:
    mark('exit', code=error.code)
    raise
finally:
    sys.setprofile(None)
`;
const args = ['-I', '-B', '-c', wrapper, script];
function report(transport, started, result) {
  const stdout = Buffer.from(result.stdout ?? '');
  const stderr = Buffer.from(result.stderr ?? '');
  let protocolStatus = null;
  try { protocolStatus = JSON.parse(stdout.toString('utf8')).status; } catch {}
  return { transport, elapsedMs: Math.round(performance.now() - started), timeoutMs,
    exitCode: result.status ?? null, signal: result.signal ?? null, errorCode: result.error?.code ?? null,
    stdinErrorCode: result.stdinErrorCode ?? null, stdoutBytes: stdout.length, stderrBytes: stderr.length,
    stdoutSha256: digest(stdout), stderrSha256: digest(stderr), protocolStatus,
    progress: stderr.toString('utf8').split('\n').filter(line => line.startsWith('DIAG ')).map(line => {
      try { return JSON.parse(line.slice(5)); } catch { return { stage: 'invalid_diagnostic' }; }
    }),
    passed: !result.error && !result.signal && !result.stdinErrorCode && result.status === 0 && protocolStatus === 'completed' };
}
function syncPipe() {
  const started = performance.now();
  return report('spawnSync_pipe', started, spawnSync(python, args, { input, encoding: 'utf8',
    timeout: timeoutMs, maxBuffer: 1024 * 1024, shell: false, cwd: component }));
}
async function asyncPipe() {
  const started = performance.now();
  return new Promise(resolve => {
    const child = spawn(python, args, { stdio: ['pipe', 'pipe', 'pipe'], shell: false, cwd: component });
    const output = [], errors = []; let bytes = 0, err, stdinErrorCode = null, escalation;
    const stop = code => {
      err ??= Object.assign(new Error(code), { code });
      child.kill('SIGTERM');
      escalation ??= setTimeout(() => child.kill('SIGKILL'), 1000);
    };
    const timer = setTimeout(() => stop('ETIMEDOUT'), timeoutMs);
    child.on('error', error => { err = error; });
    child.stdout.on('data', part => { bytes += part.length; if (bytes > 1024 * 1024) stop('ENOBUFS'); else output.push(part); });
    child.stderr.on('data', part => { bytes += part.length; if (bytes > 1024 * 1024) stop('ENOBUFS'); else errors.push(part); });
    child.stdin.on('error', error => { stdinErrorCode = error.code; });
    child.on('close', (status, signal) => {
      clearTimeout(timer); clearTimeout(escalation);
      resolve(report('spawn_async_pipe', started, { status, signal, error: err, stdinErrorCode,
        stdout: Buffer.concat(output), stderr: Buffer.concat(errors) }));
    });
    child.stdin.end(input);
  });
}
function fileStdin() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'service-stdin-diagnostic-'));
  let fd;
  try {
    const filename = path.join(temp, 'synthetic-input.json');
    fs.writeFileSync(filename, input, { flag: 'wx', mode: 0o600 });
    fd = fs.openSync(filename, 'r');
    const started = performance.now();
    return report('spawnSync_file_stdin', started, spawnSync(python, args, { stdio: [fd, 'pipe', 'pipe'],
      encoding: 'utf8', timeout: timeoutMs, maxBuffer: 1024 * 1024, shell: false, cwd: component }));
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
const results = [syncPipe(), await asyncPipe(), fileStdin()];
const sourceUnchanged = digest(fs.readFileSync(script)) === sourceHash;
const outputHashesAgree = new Set(results.filter(row => row.passed).map(row => row.stdoutSha256)).size === 1;
const allPassed = sourceUnchanged && outputHashesAgree && results.every(row => row.passed);
console.log(JSON.stringify({ scope: 'fixed_synthetic_transport_diagnosis_only', inputBytes: Buffer.byteLength(input),
  inputSha256, helperSha256: sourceHash, sourceUnchanged, outputHashesAgree, allPassed, results,
  networkUsed: false, paidModelsUsed: false, productionAcceptance: false }, null, 2));
process.exitCode = allPassed ? 0 : 1;
