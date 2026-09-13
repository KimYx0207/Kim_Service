#!/usr/bin/env node
import { applyInstall, planInstall, rollbackInstall } from './installer.mjs';
import { createCodexAdapter, createGeminiAdapter } from './mcp/adapters.mjs';
import { runStdioServer } from './mcp/runtime.mjs';

function parseArgs(values) {
  const parsed = { positionals: [] };
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!value.startsWith('--')) { parsed.positionals.push(value); continue; }
    if (['--confirm-project-write', '--replace'].includes(value)) { parsed[value.slice(2)] = true; continue; }
    if (!['--target', '--receipt'].includes(value)) throw new Error(`unknown option: ${value}`);
    const next = values[++index];
    if (!next || next.startsWith('--')) throw new Error(`${value} requires a value`);
    parsed[value.slice(2)] = next;
  }
  return parsed;
}

function usage() {
  return [
    'kim-ccg mcp <codex|gemini>',
    'kim-ccg install [plan] --target <project>',
    'kim-ccg install apply --target <project> --confirm-project-write [--replace]',
    'kim-ccg install rollback --target <project> --receipt <id> --confirm-project-write'
  ].join('\n');
}

async function main() {
  const [group, ...rest] = process.argv.slice(2);
  if (group === 'mcp') {
    const [engine, ...extra] = rest;
    if (extra.length || !['codex', 'gemini'].includes(engine)) throw new Error(usage());
    runStdioServer(engine === 'codex' ? createCodexAdapter() : createGeminiAdapter());
    return;
  }
  if (group !== 'install') throw new Error(usage());
  const parsed = parseArgs(rest);
  const mode = parsed.positionals[0] || 'plan';
  if (parsed.positionals.length > 1 || !['plan', 'apply', 'rollback'].includes(mode)) throw new Error(usage());
  let result;
  if (mode === 'plan') result = await planInstall({ target: parsed.target });
  if (mode === 'apply') result = await applyInstall({ target: parsed.target, confirm: parsed['confirm-project-write'], replace: parsed.replace });
  if (mode === 'rollback') result = await rollbackInstall({ target: parsed.target, receiptId: parsed.receipt, confirm: parsed['confirm-project-write'] });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`kim-ccg: ${error.message}\n`);
  process.exitCode = 1;
});
