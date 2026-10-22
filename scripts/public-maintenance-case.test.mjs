import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { CASE_ROOT, verifyPublicCase } from '../docs/cases/maintenance-handoff-20261022/verify.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const request = JSON.parse(fs.readFileSync(path.join(CASE_ROOT, 'verification-request.json'), 'utf8'));

test('public manifest binds real included files and retains historical evidence boundaries', () => {
  assert.equal(request.artifacts.length, 4);
  for (const row of request.artifacts) {
    const bytes = fs.readFileSync(path.join(CASE_ROOT, row.path));
    assert.equal(bytes.length, row.bytes, row.path);
    assert.equal(sha(bytes), row.sha256, row.path);
  }
  const mapping = JSON.parse(fs.readFileSync(path.join(CASE_ROOT, 'mapping.json'), 'utf8'));
  assert.equal(mapping.publicEvidenceAvailability.historicalRawEvidence, 'caller_held_not_public');
  assert.equal(mapping.publicEvidenceAvailability.historicalExecutionReproduced, false);
  assert.equal(mapping.sourceArtifacts.filter(row => row.sourceRef.startsWith('caller-held:')).length, 9);
  assert.equal(mapping.acceptance.finalAcceptance, 'not_decided');
  assert.equal(mapping.acceptance.artifactIntegrityHelper, 'not_run_by_writer');
  const frozen = {
    'input.json': 'f9981d9d65866c23768d6ccb7082917c4b8486cf0a7c5cf1f5328bf343479382',
    'draft.md': '8b7f331c39d04c55bc6adf876bd0b642abb92f617abf49a3a9904be8c9f1210c',
    'revision.md': 'db66e95d38941778565e4a33d78c5066aac2c4d9283c398f2d37319e017ddc33'
  };
  for (const [name, digest] of Object.entries(frozen)) assert.equal(sha(fs.readFileSync(path.join(CASE_ROOT, name))), digest, name);
});

test('existing verifier checks public case while external acceptance stays partial or platform-blocked', () => {
  const result = verifyPublicCase();
  assert.equal(result.receiptAuthenticity, 'not_verified');
  assert.equal(result.handoff.finalAcceptance, 'not_decided');
  if (process.platform === 'win32') {
    assert.equal(result.status, 'blocked');
    assert.equal(result.stopReason, 'safe_open_unavailable');
    assert(!result.artifactRefs.some(row => row.status === 'verified'));
  } else {
    assert.equal(result.status, 'partial');
    assert.equal(result.artifactRefs.length, 4);
    assert(result.artifactRefs.every(row => row.status === 'verified'));
    assert(result.criterionResults.filter(row => row.type !== 'external_review').every(row => row.status === 'passed'));
    assert.deepEqual(result.missingCapabilities.map(row => row.capability).sort(), ['browser-review', 'human-review']);
    assert(result.criterionResults.filter(row => row.type === 'external_review').every(row => row.status === 'unverified'));
  }
});

test('copy with content drift or missing file cannot pass the fixed public manifest', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-public-case-'));
  t.after(() => {
    assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(root).startsWith('kim-service-public-case-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  for (const row of request.artifacts) fs.copyFileSync(path.join(CASE_ROOT, row.path), path.join(root, row.path));
  fs.appendFileSync(path.join(root, 'revision.md'), '\nchanged after manifest\n');
  fs.unlinkSync(path.join(root, 'draft.md'));
  const result = verifyPublicCase(root);
  assert.notEqual(result.status, 'completed');
  if (process.platform === 'win32') assert.equal(result.stopReason, 'safe_open_unavailable');
  else {
    assert(result.artifactRefs.some(row => row.id === 'revision' && row.status === 'failed'));
    assert(result.artifactRefs.some(row => row.id === 'draft' && row.status === 'failed'));
  }
  assert.equal(result.handoff.finalAcceptance, 'not_decided');
});
