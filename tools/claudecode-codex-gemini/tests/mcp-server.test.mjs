import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createCodexAdapter, createGeminiAdapter } from '../mcp/adapters.mjs';
import { handleRequest, resolveCliLaunch, runCli, sanitizeEnvironment, terminateProcessTree } from '../mcp/runtime.mjs';

async function workspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'kim-ccg-mcp-'));
  await mkdir(path.join(root, 'nested'));
  return root;
}

test('Codex adapter defaults to read-only, passes prompt on stdin, and uses constructed arguments', async () => {
  const root = await workspace();
  let invocation;
  const adapter = createCodexAdapter({ workspaceRoot: root, runner: async (value) => {
    invocation = value;
    return { stdout: 'ok', stderr: '' };
  } });
  const result = await adapter.call({ prompt: 'review this', cwd: 'nested' });
  assert.equal(result.content[0].text, 'ok');
  assert.equal(invocation.engine, 'codex');
  assert.deepEqual(invocation.args, ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-']);
  assert.equal(invocation.input, 'review this');
  assert.equal(invocation.cwd, await realpath(path.join(root, 'nested')));
});

test('workspace aliases resolve canonically while linked cwd escapes are rejected', async (t) => {
  const parent = await mkdtemp(path.join(tmpdir(), 'kim-ccg-alias-'));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const root = path.join(parent, 'workspace');
  const outside = path.join(parent, 'outside');
  const alias = path.join(parent, 'alias');
  await mkdir(path.join(root, 'nested'), { recursive: true });
  await mkdir(outside);
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  await symlink(root, alias, linkType);
  await symlink(outside, path.join(root, 'escape'), linkType);
  let invocation;
  const adapter = createCodexAdapter({ workspaceRoot: alias, runner: async (value) => {
    invocation = value;
    return { stdout: 'ok', stderr: '' };
  } });
  await adapter.call({ prompt: 'review', cwd: 'nested' });
  assert.equal(invocation.cwd, await realpath(path.join(root, 'nested')));
  await assert.rejects(() => adapter.call({ prompt: 'review', cwd: 'escape' }), /outside/);
});

test('Codex adapter rejects unknown arguments and uncontained cwd', async () => {
  const root = await workspace();
  const outside = await workspace();
  const adapter = createCodexAdapter({ workspaceRoot: root, runner: async () => ({ stdout: '', stderr: '' }) });
  await assert.rejects(() => adapter.call({ prompt: 'x', command: 'evil' }), /not allowed/);
  await assert.rejects(() => adapter.call({ prompt: 'x', cwd: outside }), /outside/);
});

test('mutating sandbox, disabled Gemini sandbox, and proxy forwarding fail closed without operator gates', async () => {
  const root = await workspace();
  const codex = createCodexAdapter({ workspaceRoot: root, runner: async () => ({ stdout: '', stderr: '' }) });
  const gemini = createGeminiAdapter({ workspaceRoot: root, runner: async () => ({ stdout: '', stderr: '' }) });
  await assert.rejects(() => codex.call({ prompt: 'x', sandbox: 'workspace-write' }), /operator gate/);
  await assert.rejects(() => codex.call({ prompt: 'x', forwardProxy: true }), /operator gate/);
  await assert.rejects(() => gemini.call({ prompt: 'x', sandbox: false }), /operator gate/);
});

test('Gemini adapter never adds yolo and prevents leading prompt option smuggling', async () => {
  const root = await workspace();
  let invocation;
  const adapter = createGeminiAdapter({ workspaceRoot: root, runner: async (value) => {
    invocation = value;
    return { stdout: '{"type":"message","role":"assistant","content":"safe","session_id":"s1"}\n', stderr: '' };
  } });
  const result = await adapter.call({ prompt: '--yolo', sandbox: true });
  assert.equal(result.content[0].text, 'safe');
  assert.equal(result.sessionId, 's1');
  assert.equal(invocation.engine, 'gemini');
  assert.equal(invocation.args.includes('--yolo'), false);
  assert.deepEqual(invocation.args.slice(0, 4), ['-o', 'stream-json', '--approval-mode', 'plan']);
  assert.equal(invocation.input, '--yolo');
});

test('environment forwarding is engine-scoped and proxy forwarding is explicit', () => {
  const source = {
    PATH: 'bin', SECRET_TOKEN: 'test', HTTP_PROXY: 'http://127.0.0.1:8080',
    OPENAI_API_KEY: 'test', GEMINI_API_KEY: 'test', GOOGLE_API_KEY: 'test'
  };
  const safe = sanitizeEnvironment(source);
  assert.deepEqual({ ...safe }, { PATH: 'bin' });
  const codex = sanitizeEnvironment(source, { secretScope: 'codex' });
  assert.deepEqual({ ...codex }, { PATH: 'bin', OPENAI_API_KEY: 'test' });
  const gemini = sanitizeEnvironment(source, { secretScope: 'gemini' });
  assert.deepEqual({ ...gemini }, { PATH: 'bin', GEMINI_API_KEY: 'test', GOOGLE_API_KEY: 'test' });
  const proxy = sanitizeEnvironment(source, { forwardProxy: true, secretScope: 'codex' });
  assert.equal(proxy.HTTP_PROXY, 'http://127.0.0.1:8080/');
  assert.throws(() => sanitizeEnvironment({ HTTP_PROXY: 'http://user:pass@example.com' }, { forwardProxy: true }), /credential-free/);
});

test('output-limit rejection waits for confirmed process-tree termination', async () => {
  const root = await workspace();
  const script = path.join(root, 'overflow.mjs');
  await writeFile(script, "process.stdout.write('x'.repeat(4096)); setInterval(() => {}, 1000);\n");
  let terminationFinished = false;
  const started = Date.now();
  await assert.rejects(() => runCli({
    engine: 'codex', args: [], cwd: root, input: '', timeoutMs: 5000,
    env: sanitizeEnvironment(process.env), maxOutputBytes: 32,
    _resolveCliLaunch: async () => ({ command: process.execPath, argsPrefix: [script], entry: script }),
    _terminateProcessTree: async (child) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await terminateProcessTree(child);
      terminationFinished = true;
    }
  }), /output exceeded/);
  assert.equal(terminationFinished, true);
  assert.ok(Date.now() - started >= 90);
});

test('output limit applies to stdout and stderr combined', async () => {
  const root = await workspace();
  const script = path.join(root, 'combined-overflow.mjs');
  await writeFile(script, [
    "process.stdout.write(Buffer.alloc(3 * 1024 * 1024, 'a'));",
    "process.stderr.write(Buffer.alloc(2 * 1024 * 1024, 'b'));",
    'setInterval(() => {}, 1000);'
  ].join('\n'));
  await assert.rejects(() => runCli({
    engine: 'codex', args: [], cwd: root, input: '', timeoutMs: 10000,
    env: sanitizeEnvironment(process.env), maxOutputBytes: 4 * 1024 * 1024,
    _resolveCliLaunch: async () => ({ command: process.execPath, argsPrefix: [script], entry: script })
  }), /output exceeded/);
});

function fakeTaskkill({ code, stderr = '' }) {
  const killer = new EventEmitter();
  killer.stderr = new EventEmitter();
  killer.kill = () => true;
  queueMicrotask(() => {
    if (stderr) killer.stderr.emit('data', Buffer.from(stderr));
    killer.emit('close', code, null);
  });
  return killer;
}

test('Windows taskkill Access denied is not reported as termination without child exit confirmation', async () => {
  const child = new EventEmitter();
  Object.assign(child, { pid: 4242, exitCode: null, signalCode: null, kill: () => true });
  await assert.rejects(() => terminateProcessTree(child, {
    platform: 'win32',
    spawnProcess: () => fakeTaskkill({ code: 1, stderr: 'ERROR: Access is denied.' }),
    taskkillTimeoutMs: 20,
    childExitTimeoutMs: 20
  }), /unable to confirm.*Access is denied/s);
});

test('Windows taskkill nonzero uses direct fallback and resolves only after child exit', async () => {
  const child = new EventEmitter();
  let fallbackUsed = false;
  Object.assign(child, {
    pid: 4343,
    exitCode: null,
    signalCode: null,
    kill: () => {
      fallbackUsed = true;
      child.signalCode = 'SIGKILL';
      queueMicrotask(() => child.emit('close', null, 'SIGKILL'));
      return true;
    }
  });
  await terminateProcessTree(child, {
    platform: 'win32',
    spawnProcess: () => fakeTaskkill({ code: 1, stderr: 'ERROR: Access is denied.' }),
    taskkillTimeoutMs: 20,
    childExitTimeoutMs: 50
  });
  assert.equal(fallbackUsed, true);
  assert.equal(child.signalCode, 'SIGKILL');
});

test('JSON-RPC handler supports initialize, list, call, and bounded validation errors', async () => {
  const root = await workspace();
  const adapter = createCodexAdapter({ workspaceRoot: root, runner: async () => ({ stdout: 'done', stderr: '' }) });
  const initialized = await handleRequest(adapter, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  assert.equal(initialized.result.serverInfo.name, 'kim-service-codex-mcp');
  const listed = await handleRequest(adapter, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal(listed.result.tools[0].name, 'codex');
  const called = await handleRequest(adapter, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'codex', arguments: { prompt: 'x' } } });
  assert.equal(called.result.content[0].text, 'done');
  const invalid = await handleRequest(adapter, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'codex', arguments: { prompt: '' } } });
  assert.equal(invalid.error.code, -32602);
});

test('hardened MCP source has no shell true, yolo default, or user-profile context writes', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'mcp');
  const source = `${await readFile(path.join(root, 'runtime.mjs'), 'utf8')}\n${await readFile(path.join(root, 'adapters.mjs'), 'utf8')}`;
  assert.doesNotMatch(source, /shell\s*:\s*true/);
  assert.doesNotMatch(source, /\.mcp-context|appendFileSync|--yolo/);
});

test('Windows resolver ignores shim text and selects only the fixed contained npm JavaScript entry', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'kim-ccg-npm-'));
  const entry = path.join(root, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  await mkdir(path.dirname(entry), { recursive: true });
  await writeFile(path.join(root, 'codex.cmd'), '@echo malicious text that must never be parsed\n');
  await writeFile(entry, 'console.log("ok")\n');
  const launch = await resolveCliLaunch('codex', { platform: 'win32', env: { PATH: root } });
  assert.equal(launch.command, process.execPath);
  assert.equal(launch.entry, await realpath(entry));
  assert.deepEqual(launch.argsPrefix, [await realpath(entry)]);
});

test('installed Windows npm CLI entries can execute version probes without a shell', {
  skip: process.platform !== 'win32' || process.env.KIM_CCG_RUN_INTEGRATION !== '1'
}, async () => {
  const root = await workspace();
  for (const engine of ['codex', 'gemini']) {
    const result = await runCli({
      engine, args: ['--version'], cwd: root, timeoutMs: 15000,
      env: sanitizeEnvironment(process.env), maxOutputBytes: 64 * 1024
    });
    assert.match(result.stdout.trim(), /\d+\.\d+/);
  }
});
