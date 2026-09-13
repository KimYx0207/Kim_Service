import { spawn } from 'node:child_process';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export const LIMITS = Object.freeze({
  frameBytes: 1024 * 1024,
  promptChars: 128 * 1024,
  outputBytes: 4 * 1024 * 1024,
  queueDepth: 8,
  minTimeoutMs: 1000,
  maxTimeoutMs: 10 * 60 * 1000
});

const BASE_ENV_ALLOWLIST = new Set([
  'PATH', 'Path', 'PATHEXT', 'SYSTEMROOT', 'SystemRoot', 'WINDIR',
  'TEMP', 'TMP', 'USERPROFILE', 'HOME', 'LOCALAPPDATA', 'APPDATA',
  'LANG', 'LC_ALL', 'TERM', 'NO_COLOR'
]);
const ENGINE_SECRETS = Object.freeze({
  none: [],
  codex: ['OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'GOOGLE_API_KEY']
});
const PROXY_NAMES = ['HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'http_proxy', 'https_proxy', 'no_proxy'];
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

export function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

export function assertOnlyKeys(value, allowed, label = 'arguments') {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label}.${key} is not allowed`);
  }
}

export function requirePrompt(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('prompt must be a non-empty string');
  }
  if (value.length > LIMITS.promptChars) throw new RangeError('prompt exceeds the 128 KiB character limit');
  return value;
}

export function optionalModel(value) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !MODEL_PATTERN.test(value)) {
    throw new TypeError('model contains unsupported characters or is too long');
  }
  return value;
}

export function boundedTimeout(value, fallback = 300000) {
  const timeout = value === undefined ? fallback : value;
  if (!Number.isInteger(timeout) || timeout < LIMITS.minTimeoutMs || timeout > LIMITS.maxTimeoutMs) {
    throw new RangeError(`timeoutMs must be an integer from ${LIMITS.minTimeoutMs} to ${LIMITS.maxTimeoutMs}`);
  }
  return timeout;
}

function validateProxy(name, raw) {
  if (name.toLowerCase() === 'no_proxy') {
    if (raw.length > 2048 || /[\r\n\0]/.test(raw)) throw new TypeError(`${name} is invalid`);
    return raw;
  }
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || raw.length > 2048) {
    throw new TypeError(`${name} must be a credential-free HTTP(S) URL`);
  }
  return url.toString();
}

export function sanitizeEnvironment(source = process.env, { forwardProxy = false, secretScope = 'none' } = {}) {
  if (!Object.hasOwn(ENGINE_SECRETS, secretScope)) throw new TypeError('secretScope is invalid');
  const result = Object.create(null);
  for (const [key, value] of Object.entries(source)) {
    if (BASE_ENV_ALLOWLIST.has(key) && typeof value === 'string' && !/[\0]/.test(value)) result[key] = value;
  }
  for (const name of ENGINE_SECRETS[secretScope]) {
    const value = source[name];
    if (typeof value === 'string' && value.length > 0 && !value.includes('\0')) result[name] = value;
  }
  if (forwardProxy) {
    for (const name of PROXY_NAMES) {
      const value = source[name];
      if (typeof value === 'string' && value.length > 0) result[name] = validateProxy(name, value);
    }
  }
  return result;
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export async function resolveContainedCwd(requested, workspaceRoot = process.env.KIM_CCG_WORKSPACE_ROOT || process.cwd()) {
  const root = await realpath(path.resolve(workspaceRoot));
  const candidatePath = path.resolve(root, requested || '.');
  const candidate = await realpath(candidatePath);
  if (!isContained(root, candidate)) throw new Error('cwd resolves outside KIM_CCG_WORKSPACE_ROOT');
  return { root, cwd: candidate };
}

function childAlreadyExited(child) {
  return child.exitCode !== null && child.exitCode !== undefined || child.signalCode !== null && child.signalCode !== undefined;
}

function waitForChildExit(child, timeoutMs) {
  if (childAlreadyExited(child)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off?.('close', onExit);
      child.off?.('exit', onExit);
      resolve(value);
    };
    const onExit = () => finish(true);
    child.once('close', onExit);
    child.once('exit', onExit);
    const timer = setTimeout(() => finish(childAlreadyExited(child)), timeoutMs);
    timer.unref();
  });
}

function runTaskkill(child, { spawnProcess, timeoutMs }) {
  return new Promise((resolve) => {
    let settled = false;
    let stderr = '';
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ...result, stderr: stderr.slice(0, 1024) });
    };
    let killer;
    try {
      killer = spawnProcess('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
        shell: false, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']
      });
    } catch (error) {
      resolve({ ok: false, reason: error.message, stderr: '' });
      return;
    }
    killer.stderr?.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    killer.once('error', (error) => finish({ ok: false, reason: error.message }));
    killer.once('close', (code, signal) => finish({
      ok: code === 0,
      reason: code === 0 ? '' : `taskkill exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}`
    }));
    const timer = setTimeout(() => {
      try { killer.kill('SIGKILL'); } catch {}
      finish({ ok: false, reason: `taskkill timed out after ${timeoutMs} ms` });
    }, timeoutMs);
    timer.unref();
  });
}

export async function terminateProcessTree(child, {
  platform = process.platform,
  spawnProcess = spawn,
  taskkillTimeoutMs = 3000,
  childExitTimeoutMs = 3000
} = {}) {
  if (!child || !child.pid || childAlreadyExited(child)) return;
  if (platform === 'win32') {
    const taskkill = await runTaskkill(child, { spawnProcess, timeoutMs: taskkillTimeoutMs });
    let confirmed = await waitForChildExit(child, Math.min(500, childExitTimeoutMs));
    if (!confirmed) {
      try { child.kill('SIGKILL'); } catch {}
      confirmed = await waitForChildExit(child, childExitTimeoutMs);
    }
    if (!confirmed) {
      const detail = [taskkill.reason, taskkill.stderr].filter(Boolean).join(': ');
      throw new Error(`unable to confirm child process-tree termination${detail ? `: ${detail}` : ''}`);
    }
    return;
  }
  try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  let confirmed = await waitForChildExit(child, Math.min(1000, childExitTimeoutMs));
  if (!confirmed) {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch {} }
    confirmed = await waitForChildExit(child, childExitTimeoutMs);
  }
  if (!confirmed) throw new Error('unable to confirm child process-tree termination');
}

const WINDOWS_NPM_ENTRIES = Object.freeze({
  codex: ['node_modules', '@openai', 'codex', 'bin', 'codex.js'],
  gemini: ['node_modules', '@google', 'gemini-cli', 'bundle', 'gemini.js']
});

export async function resolveCliLaunch(engine, { env = process.env, platform = process.platform } = {}) {
  if (!['codex', 'gemini'].includes(engine)) throw new TypeError('engine is outside the codex/gemini allowlist');
  if (platform !== 'win32') return { command: engine, argsPrefix: [], entry: null };
  const pathValue = env.PATH || env.Path || '';
  for (const rawDirectory of pathValue.split(path.delimiter).filter(Boolean)) {
    const directory = path.resolve(rawDirectory.replace(/^"|"$/g, ''));
    const shim = path.join(directory, `${engine}.cmd`);
    try {
      const shimInfo = await lstat(shim);
      if (!shimInfo.isFile() && !shimInfo.isSymbolicLink()) continue;
      const realDirectory = await realpath(directory);
      const entry = await realpath(path.join(realDirectory, ...WINDOWS_NPM_ENTRIES[engine]));
      if (!isContained(realDirectory, entry)) continue;
      const entryInfo = await lstat(entry);
      if (!entryInfo.isFile()) continue;
      return { command: process.execPath, argsPrefix: [entry], entry };
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR', 'EACCES'].includes(error.code)) throw error;
    }
  }
  throw new Error(`Unable to resolve the known npm ${engine} JavaScript entry from PATH`);
}

export async function runCli({
  engine, args, cwd, input, timeoutMs, env, maxOutputBytes = LIMITS.outputBytes,
  _resolveCliLaunch = resolveCliLaunch, _terminateProcessTree = terminateProcessTree
}) {
  if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string' && !arg.includes('\0'))) {
    throw new TypeError('CLI arguments must be NUL-free strings');
  }
  const launch = await _resolveCliLaunch(engine, { env });
  const command = launch.command;
  const spawnArgs = [...launch.argsPrefix, ...args];
  return new Promise((resolve, reject) => {
    const child = spawn(command, spawnArgs, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let totalOutputBytes = 0;
    let settled = false;
    let terminating = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };
    const append = (current, chunk) => {
      totalOutputBytes += chunk.length;
      const next = Buffer.concat([current, chunk]);
      if (totalOutputBytes > maxOutputBytes) {
        if (!terminating) {
          terminating = true;
          void _terminateProcessTree(child).then(
            () => finish(new Error('CLI output exceeded the configured limit')),
            (error) => finish(new AggregateError([new Error('CLI output exceeded the configured limit'), error], 'CLI output limit termination failed'))
          );
        }
        return current;
      }
      return next;
    };
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.once('error', (error) => finish(new Error(`Unable to start ${command}: ${error.message}`)));
    child.once('close', (code, signal) => {
      if (settled || terminating) return;
      const output = stdout.toString('utf8');
      const errorText = stderr.toString('utf8');
      if (code !== 0) finish(new Error(`${command} exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}: ${errorText.slice(0, 4096)}`));
      else finish(null, { stdout: output, stderr: errorText });
    });
    const timer = setTimeout(async () => {
      if (terminating) return;
      terminating = true;
      try {
        await _terminateProcessTree(child);
        finish(new Error(`${command} timed out after ${timeoutMs} ms`));
      } catch (error) {
        finish(new AggregateError([new Error(`${command} timed out after ${timeoutMs} ms`), error], 'CLI timeout termination failed'));
      }
    }, timeoutMs);
    timer.unref();
    child.stdin.on('error', () => {});
    if (input !== undefined) child.stdin.end(input);
    else child.stdin.end();
  });
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

export async function handleRequest(adapter, request) {
  if (!request || typeof request !== 'object' || Array.isArray(request) || request.jsonrpc !== '2.0') {
    return jsonRpcError(request?.id, -32600, 'Invalid Request');
  }
  if (request.method === 'notifications/initialized') return null;
  if (request.method === 'initialize') {
    return {
      jsonrpc: '2.0', id: request.id,
      result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: adapter.serverInfo }
    };
  }
  if (request.method === 'tools/list') {
    return { jsonrpc: '2.0', id: request.id, result: { tools: [adapter.tool] } };
  }
  if (request.method !== 'tools/call') return jsonRpcError(request.id, -32601, 'Method not found');
  try {
    const params = assertPlainObject(request.params, 'params');
    if (params.name !== adapter.tool.name) return jsonRpcError(request.id, -32601, `Unknown tool: ${String(params.name)}`);
    const result = await adapter.call(params.arguments || {});
    return { jsonrpc: '2.0', id: request.id, result };
  } catch (error) {
    const invalid = error instanceof TypeError || error instanceof RangeError;
    return jsonRpcError(request.id, invalid ? -32602 : -32603, error.message);
  }
}

export function runStdioServer(adapter, { input = process.stdin, output = process.stdout } = {}) {
  let buffer = Buffer.alloc(0);
  let queued = 0;
  let chain = Promise.resolve();
  let stopped = false;
  const send = (message) => { if (message !== null) output.write(`${JSON.stringify(message)}\n`); };
  const enqueue = (line) => {
    if (++queued > LIMITS.queueDepth) {
      queued--;
      send(jsonRpcError(null, -32000, 'MCP request queue is full'));
      return;
    }
    chain = chain.then(async () => {
      let request;
      try { request = JSON.parse(line.toString('utf8')); }
      catch { send(jsonRpcError(null, -32700, 'Parse error')); return; }
      send(await handleRequest(adapter, request));
    }).catch((error) => send(jsonRpcError(null, -32603, error.message))).finally(() => { queued--; });
  };
  input.on('data', (chunk) => {
    if (stopped) return;
    buffer = Buffer.concat([buffer, chunk]);
    if (buffer.length > LIMITS.frameBytes && !buffer.includes(0x0a)) {
      stopped = true;
      send(jsonRpcError(null, -32001, 'MCP frame exceeds 1 MiB'));
      input.destroy();
      return;
    }
    let newline;
    while ((newline = buffer.indexOf(0x0a)) !== -1) {
      const line = buffer.subarray(0, newline);
      buffer = buffer.subarray(newline + 1);
      if (line.length > LIMITS.frameBytes) send(jsonRpcError(null, -32001, 'MCP frame exceeds 1 MiB'));
      else if (line.length > 0) enqueue(line);
    }
  });
  input.on('end', () => { if (buffer.length) enqueue(buffer); });
  return { done: () => chain };
}
