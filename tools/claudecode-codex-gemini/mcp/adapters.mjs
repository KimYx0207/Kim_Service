import {
  assertOnlyKeys, assertPlainObject, boundedTimeout, optionalModel,
  requirePrompt, resolveContainedCwd, runCli, sanitizeEnvironment
} from './runtime.mjs';

function textResult(text, metadata = {}) {
  return { content: [{ type: 'text', text }], metadata };
}

function runtimeOptions(args, fallbackTimeout, engine) {
  const forwardProxy = args.forwardProxy === true;
  if (args.forwardProxy !== undefined && typeof args.forwardProxy !== 'boolean') {
    throw new TypeError('forwardProxy must be boolean');
  }
  if (forwardProxy && process.env.KIM_CCG_FORWARD_PROXY !== '1') {
    throw new Error('proxy forwarding requires operator gate KIM_CCG_FORWARD_PROXY=1');
  }
  return {
    timeoutMs: boundedTimeout(args.timeoutMs, fallbackTimeout),
    env: sanitizeEnvironment(process.env, { forwardProxy, secretScope: engine })
  };
}

export function createCodexAdapter({ runner = runCli, workspaceRoot, defaultTimeoutMs = 300000 } = {}) {
  return {
    serverInfo: { name: 'kim-service-codex-mcp', version: '1.0.0' },
    tool: {
      name: 'codex',
      description: 'Invoke the local Codex CLI inside a realpath-contained workspace. Defaults to read-only.',
      inputSchema: {
        type: 'object', additionalProperties: false, required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 131072 },
          cwd: { type: 'string' },
          model: { type: 'string' },
          sandbox: { enum: ['read-only', 'workspace-write'] },
          timeoutMs: { type: 'integer', minimum: 1000, maximum: 600000 },
          forwardProxy: { type: 'boolean', default: false }
        }
      }
    },
    async call(rawArgs) {
      const args = assertPlainObject(rawArgs, 'arguments');
      assertOnlyKeys(args, new Set(['prompt', 'cwd', 'model', 'sandbox', 'timeoutMs', 'forwardProxy']));
      const prompt = requirePrompt(args.prompt);
      const model = optionalModel(args.model);
      const sandbox = args.sandbox ?? 'read-only';
      if (!['read-only', 'workspace-write'].includes(sandbox)) throw new TypeError('sandbox is not allowed');
      if (sandbox === 'workspace-write' && process.env.KIM_CCG_ALLOW_WORKSPACE_WRITE !== '1') {
        throw new Error('workspace-write requires operator gate KIM_CCG_ALLOW_WORKSPACE_WRITE=1');
      }
      const { cwd } = await resolveContainedCwd(args.cwd, workspaceRoot);
      const options = runtimeOptions(args, defaultTimeoutMs, 'codex');
      const cliArgs = ['exec', '--skip-git-repo-check', '--sandbox', sandbox];
      if (model) cliArgs.push('--model', model);
      cliArgs.push('-');
      const result = await runner({ engine: 'codex', args: cliArgs, cwd, input: prompt, ...options });
      return textResult(result.stdout, { sandbox, stderrBytes: Buffer.byteLength(result.stderr || '') });
    }
  };
}

function parseGeminiOutput(stdout) {
  let text = '';
  let sessionId = null;
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const item = JSON.parse(line);
      if (typeof item.session_id === 'string') sessionId = item.session_id;
      if (item.type === 'message' && item.role === 'assistant' && typeof item.content === 'string') text += item.content;
    } catch {
      text += `${raw}\n`;
    }
  }
  return { text, sessionId };
}

export function createGeminiAdapter({ runner = runCli, workspaceRoot, defaultTimeoutMs = 300000 } = {}) {
  return {
    serverInfo: { name: 'kim-service-gemini-mcp', version: '1.0.0' },
    tool: {
      name: 'gemini',
      description: 'Invoke the local Gemini CLI inside a realpath-contained workspace without automatic approval mode.',
      inputSchema: {
        type: 'object', additionalProperties: false, required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 131072 },
          cwd: { type: 'string' },
          model: { type: 'string' },
          sandbox: { type: 'boolean', default: true },
          sessionId: { type: 'string', maxLength: 256 },
          timeoutMs: { type: 'integer', minimum: 1000, maximum: 600000 },
          forwardProxy: { type: 'boolean', default: false }
        }
      }
    },
    async call(rawArgs) {
      const args = assertPlainObject(rawArgs, 'arguments');
      assertOnlyKeys(args, new Set(['prompt', 'cwd', 'model', 'sandbox', 'sessionId', 'timeoutMs', 'forwardProxy']));
      const prompt = requirePrompt(args.prompt);
      const model = optionalModel(args.model);
      if (args.sandbox !== undefined && typeof args.sandbox !== 'boolean') throw new TypeError('sandbox must be boolean');
      if (args.sandbox === false && process.env.KIM_CCG_ALLOW_GEMINI_NO_SANDBOX !== '1') {
        throw new Error('disabling Gemini sandbox requires operator gate KIM_CCG_ALLOW_GEMINI_NO_SANDBOX=1');
      }
      if (args.sessionId !== undefined && (typeof args.sessionId !== 'string' || !/^[A-Za-z0-9._:-]{1,256}$/.test(args.sessionId))) {
        throw new TypeError('sessionId contains unsupported characters');
      }
      const { cwd } = await resolveContainedCwd(args.cwd, workspaceRoot);
      const options = runtimeOptions(args, defaultTimeoutMs, 'gemini');
      const cliArgs = ['-o', 'stream-json', '--approval-mode', 'plan'];
      if (args.sandbox !== false) cliArgs.push('--sandbox');
      if (model) cliArgs.push('--model', model);
      if (args.sessionId) cliArgs.push('--resume', args.sessionId);
      const result = await runner({ engine: 'gemini', args: cliArgs, cwd, input: prompt, ...options });
      const parsed = parseGeminiOutput(result.stdout);
      return { ...textResult(parsed.text, { stderrBytes: Buffer.byteLength(result.stderr || '') }), sessionId: parsed.sessionId };
    }
  };
}
