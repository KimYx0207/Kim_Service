#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fixture } from '../tests/fixture.mjs';

const demo = fixture();
try {
  const child = spawnSync(process.execPath, [fileURLToPath(new URL('./verify.mjs', import.meta.url)),
    '--artifact-root', demo.root, '--input-json', '-'], {
    input: JSON.stringify(demo.request), encoding: 'utf8', shell: false, timeout: 10000, maxBuffer: 1048576
  });
  if (child.error) throw child.error;
  if (child.stderr) throw new Error('Unexpected local demo error output.');
  const output = JSON.parse(child.stdout);
  if (output.status === 'blocked' && output.stopReason === 'safe_open_unavailable') {
    process.stdout.write(JSON.stringify({ demo: 'unsupported platform; safe-open checks were not run', result: output }, null, 2) + '\n');
    process.exitCode = 2;
  } else {
    if (child.status !== 0) throw new Error('The local demo did not complete.');
    if (output.status !== 'completed' || output.artifactRefs.length !== 3) throw new Error('Unexpected local verification result.');
    process.stdout.write(JSON.stringify({ demo: 'real temporary synthetic files and local consistency checks only', result: output }, null, 2) + '\n');
  }
} finally { demo.cleanup(); }
