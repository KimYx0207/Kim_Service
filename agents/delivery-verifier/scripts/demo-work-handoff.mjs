#!/usr/bin/env node
// Creates disposable synthetic fixtures, then runs the actual read-only CLI.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { workFixture } from '../tests/work-fixture.mjs';

const scenarios = [
  ['adopted-v1-produced-v2', () => {}, 'passed'],
  ['rejected-with-unknown-effect', f => {
    f.handoff.workReceipt.adopted.status = 'rejected'; f.handoff.adoptionObservation.status = 'rejected';
    f.handoff.workReceipt.adopted.reason = 'unknown'; f.handoff.adoptionObservation.reason = 'unknown';
    f.handoff.receiving.status = 'pending'; f.handoff.receiving.receipt = null;
    f.handoff.workReceipt.verified.status = 'failed';
  }, 'passed'],
  ['stale-receiving-receipt', f => {
    f.handoff.receiving.receipt.workBinding = { ...f.handoff.receiving.receipt.workBinding, contextRevision: 'revision:1' };
  }, 'failed'],
  ['adoption-version-substitution', f => {
    f.handoff.workReceipt.adopted.artifactRefs = ['artifact:course-v2'];
  }, 'failed']
];
const results = [];
for (const [scenario, mutate, expected] of scenarios) {
  const f = workFixture();
  try {
    mutate(f); f.save();
    const child = spawnSync(process.execPath, [fileURLToPath(new URL('./verify.mjs', import.meta.url)),
      '--artifact-root', f.root, '--input-json', '-'], { input: JSON.stringify(f.request), encoding: 'utf8', shell: false,
      timeout: 10000, maxBuffer: 1048576 });
    if (child.error) throw child.error;
    if (child.stderr) throw new Error('Unexpected demo error output.');
    const result = JSON.parse(child.stdout);
    if (result.stopReason === 'safe_open_unavailable') {
      process.stdout.write(JSON.stringify({ synthetic: true, status: 'not_run', reason: 'POSIX safe-open support required' }) + '\n');
      process.exitCode = 2;
      break;
    }
    if (result.criterionResults[0]?.status !== expected) throw new Error(`Unexpected local result for ${scenario}`);
    results.push({ scenario, expected, result });
  } finally { f.cleanup(); }
}
if (results.length) process.stdout.write(JSON.stringify({ synthetic: true, productionVerified: false,
  scope: 'Actual temporary files and local consistency checks; human identities, adoption, effects and receiving are not authenticated.', results }, null, 2) + '\n');
