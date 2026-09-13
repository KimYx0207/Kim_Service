#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCapabilityIndex } from './capability-catalog.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

export function buildValidationInvocation(componentRoot, relativeValidationPath) {
  const absoluteValidationPath = path.resolve(
    componentRoot,
    ...relativeValidationPath.replaceAll('\\', '/').split('/')
  );
  assert(
    isInside(componentRoot, absoluteValidationPath),
    `Validation path escapes its component: ${relativeValidationPath}`
  );
  assert(
    fs.existsSync(absoluteValidationPath) && fs.lstatSync(absoluteValidationPath).isFile(),
    `Validation file is missing: ${relativeValidationPath}`
  );
  assert(
    !fs.lstatSync(absoluteValidationPath).isSymbolicLink(),
    `Validation file must not be a symlink: ${relativeValidationPath}`
  );

  const extension = path.extname(absoluteValidationPath).toLowerCase();
  if (['.js', '.cjs', '.mjs'].includes(extension)) {
    return { command: process.execPath, args: [absoluteValidationPath] };
  }
  if (extension === '.py') {
    return { command: process.platform === 'win32' ? 'python.exe' : 'python3', args: [absoluteValidationPath] };
  }
  throw new Error(
    `Unsupported validation file type ${extension || '(none)'}: ${relativeValidationPath}`
  );
}

export function runComponentChecks(rootPath = DEFAULT_ROOT, options = {}) {
  const root = path.resolve(rootPath);
  const spawn = options.spawn ?? spawnSync;
  const log = options.log ?? console.log;
  const index = buildCapabilityIndex(root);
  let validationCount = 0;

  for (const component of index.components) {
    const componentRoot = path.resolve(root, ...component.path.split('/'));
    assert(isInside(root, componentRoot), `Component path escapes repository: ${component.path}`);

    for (const validationPath of component.validation) {
      const invocation = buildValidationInvocation(componentRoot, validationPath);
      log(`[run] ${component.id}: ${validationPath}`);
      const pythonCacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-pycache-'));
      let result;
      try {
        result = spawn(invocation.command, invocation.args, {
          cwd: componentRoot,
          encoding: 'utf8',
          env: {
            ...process.env,
            PYTHONDONTWRITEBYTECODE: '1',
            PYTHONPYCACHEPREFIX: pythonCacheRoot
          },
          shell: false,
          stdio: 'inherit'
        });
      } finally {
        fs.rmSync(pythonCacheRoot, { recursive: true, force: true });
      }
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(
          `Component validation failed (${String(result.status)}): ${component.id}: ${validationPath}`
        );
      }
      validationCount += 1;
    }
  }

  log(
    `Declared validation execution completed: ${String(index.componentCount)} components, ` +
    `${String(validationCount)} validation files. Exit status alone is not lifecycle or promotion evidence.`
  );
  return { componentCount: index.componentCount, validationCount };
}

function parseRootArgument(argv) {
  if (argv.length === 0) return DEFAULT_ROOT;
  assert(argv.length === 2 && argv[0] === '--root', 'Usage: check-components.mjs [--root <path>]');
  return path.resolve(argv[1]);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    runComponentChecks(parseRootArgument(process.argv.slice(2)));
  } catch (error) {
    console.error(`Component validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
