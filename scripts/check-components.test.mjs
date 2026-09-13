import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildValidationInvocation, runComponentChecks } from './check-components.mjs';

function temporaryRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-component-runner-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function addComponent(root, validationPath = 'tests/check.mjs') {
  const componentRoot = path.join(root, 'tools', 'runner-test');
  fs.mkdirSync(path.dirname(path.join(componentRoot, validationPath)), { recursive: true });
  fs.writeFileSync(path.join(componentRoot, 'index.mjs'), 'export default true;\n');
  fs.writeFileSync(path.join(componentRoot, validationPath), 'process.exitCode = 0;\n');
  fs.writeFileSync(path.join(componentRoot, 'capability.json'), JSON.stringify({
    schemaVersion: 1,
    id: 'runner-test',
    componentType: 'tool',
    componentVersion: '1.0.0',
    entrypoint: 'index.mjs',
    capabilities: [{
      id: 'runner-test-run',
      summary: 'Exercise the restricted component validation runner.',
      useWhen: ['The component runner is under test.'],
      doNotUseWhen: ['The test is outside the runner contract.'],
      input: { type: 'object', required: [] },
      output: { type: 'object', required: [] },
      permissions: [],
      sideEffects: [],
      humanGate: { required: false, when: [] },
      validation: [validationPath]
    }]
  }, null, 2) + '\n');
  return componentRoot;
}

test('maps JavaScript and Python files to argv invocations without a shell', (t) => {
  const root = temporaryRepository(t);
  const componentRoot = addComponent(root, 'tests/check;still-one-argument.mjs');
  const javascript = buildValidationInvocation(componentRoot, 'tests/check;still-one-argument.mjs');
  assert.equal(javascript.command, process.execPath);
  assert.equal(javascript.args.length, 1);
  assert.match(javascript.args[0], /check;still-one-argument\.mjs$/);

  fs.writeFileSync(path.join(componentRoot, 'tests', 'check.py'), 'raise SystemExit(0)\n');
  const python = buildValidationInvocation(componentRoot, 'tests/check.py');
  assert.equal(python.command, process.platform === 'win32' ? 'python.exe' : 'python3');
  assert.deepEqual(python.args, [path.join(componentRoot, 'tests', 'check.py')]);
});

test('runs discovered validation files with shell false', (t) => {
  const root = temporaryRepository(t);
  addComponent(root);
  const calls = [];
  const result = runComponentChecks(root, {
    log: () => {},
    spawn: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, error: null };
    }
  });

  assert.deepEqual(result, { componentCount: 1, validationCount: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, process.execPath);
  assert.equal(calls[0].options.shell, false);
  assert.equal(calls[0].options.env.PYTHONDONTWRITEBYTECODE, '1');
  assert.equal(fs.existsSync(calls[0].options.env.PYTHONPYCACHEPREFIX), false);
  assert.deepEqual(calls[0].args, [path.join(root, 'tools', 'runner-test', 'tests', 'check.mjs')]);
});

test('rejects validation extensions outside the allowlist before spawn', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'tests/check.sh');
  let spawned = false;
  assert.throws(
    () => runComponentChecks(root, {
      log: () => {},
      spawn: () => {
        spawned = true;
        return { status: 0, error: null };
      }
    }),
    /Unsupported validation file type \.sh/
  );
  assert.equal(spawned, false);
});
