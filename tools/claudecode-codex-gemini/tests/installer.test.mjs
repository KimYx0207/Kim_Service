import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyInstall, planInstall, rollbackInstall } from '../installer.mjs';

async function project() {
  const root = await mkdtemp(path.join(tmpdir(), 'kim-ccg-install-'));
  await mkdir(path.join(root, 'project'));
  return path.join(root, 'project');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function targetState(files) {
  return sha256(files.map((item) => `${item.target}\0${item.installedSha256}`).sort().join('\n'));
}

function sealReceipt(receipt) {
  const { receiptSha256: _old, ...core } = receipt;
  return { ...core, receiptSha256: sha256(JSON.stringify(core)) };
}

test('plan is dry-run and reports every host asset without writing target', async () => {
  const root = await project();
  const result = await planInstall({ target: root });
  assert.equal(result.mode, 'plan');
  assert.equal(result.operations.length, 16);
  assert.equal(result.operations.every((item) => item.action === 'create'), true);
  await assert.rejects(() => access(path.join(root, '.claude')));
  await assert.rejects(() => access(path.join(root, '.kim-service')));
});

test('apply requires confirmation and creates a hash receipt', async () => {
  const root = await project();
  await assert.rejects(() => applyInstall({ target: root }), /confirm-project-write/);
  const applied = await applyInstall({ target: root, confirm: true });
  assert.equal(applied.mode, 'apply');
  assert.match(applied.receiptId, /^[0-9a-f-]{36}$/);
  assert.match(applied.targetStateSha256, /^[0-9a-f]{64}$/);
  const receipt = JSON.parse(await readFile(applied.receiptFile, 'utf8'));
  assert.equal(receipt.sourceCommit, 'fce3202fc48d98173d8756f8002809cefb28fca5');
  assert.equal(receipt.files.length, 16);
  assert.match(receipt.receiptSha256, /^[0-9a-f]{64}$/);
  await access(path.join(root, '.claude', 'commands', 'kim-team.md'));
});

test('rollback verifies receipt hashes and removes newly installed files', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  const rolledBack = await rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true });
  assert.equal(rolledBack.mode, 'rollback');
  await assert.rejects(() => access(path.join(root, '.claude', 'commands', 'kim-team.md')));
});

test('conflict is refused unless replace is explicit, then rollback restores original bytes', async () => {
  const root = await project();
  const destination = path.join(root, '.claude', 'commands', 'kim-api.md');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, 'local original\n');
  await assert.rejects(() => applyInstall({ target: root, confirm: true }), /without --replace/);
  assert.equal(await readFile(destination, 'utf8'), 'local original\n');
  const applied = await applyInstall({ target: root, confirm: true, replace: true });
  assert.notEqual(await readFile(destination, 'utf8'), 'local original\n');
  await rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true });
  assert.equal(await readFile(destination, 'utf8'), 'local original\n');
});

test('rollback fails closed when an installed target drifts', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  const destination = path.join(root, '.claude', 'commands', 'kim-api.md');
  await writeFile(destination, 'changed after install\n');
  await assert.rejects(
    () => rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true }),
    /installed file drifted/
  );
  assert.equal(await readFile(destination, 'utf8'), 'changed after install\n');
});

test('apply restores the original file when atomic replacement rename fails', async () => {
  const root = await project();
  const destination = path.join(root, '.claude', 'commands', 'kim-api.md');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, 'original before failed apply\n');
  let renameCalls = 0;
  const injectedRename = async (...args) => {
    renameCalls++;
    if (renameCalls === 2) throw new Error('injected apply rename failure');
    return rename(...args);
  };
  await assert.rejects(
    () => applyInstall({ target: root, confirm: true, replace: true, _io: { rename: injectedRename } }),
    /injected apply rename failure/
  );
  assert.equal(await readFile(destination, 'utf8'), 'original before failed apply\n');
});

test('rollback rejects a checksum-consistent receipt target outside the bundled manifest', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  let receipt = JSON.parse(await readFile(applied.receiptFile, 'utf8'));
  receipt.files[0].target = '.claude/commands/not-bundled.md';
  receipt.targetStateSha256 = targetState(receipt.files);
  receipt = sealReceipt(receipt);
  await writeFile(applied.receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  await assert.rejects(
    () => rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true }),
    /not in the bundled asset manifest/
  );
});

test('rollback rejects a checksum-consistent backup path outside the receipt-owned location', async () => {
  const root = await project();
  const destination = path.join(root, '.claude', 'commands', 'kim-api.md');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, 'original\n');
  const applied = await applyInstall({ target: root, confirm: true, replace: true });
  let receipt = JSON.parse(await readFile(applied.receiptFile, 'utf8'));
  const item = receipt.files.find((entry) => entry.target === '.claude/commands/kim-api.md');
  item.backup = `backups/${applied.receiptId}/../foreign/kim-api.md`;
  receipt = sealReceipt(receipt);
  await writeFile(applied.receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  await assert.rejects(
    () => rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true }),
    /not receipt-owned/
  );
  assert.notEqual(await readFile(destination, 'utf8'), 'original\n');
});

test('rollback rejects targetStateSha256 drift even when receipt checksum is recomputed', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  let receipt = JSON.parse(await readFile(applied.receiptFile, 'utf8'));
  receipt.targetStateSha256 = '0'.repeat(64);
  receipt = sealReceipt(receipt);
  await writeFile(applied.receiptFile, `${JSON.stringify(receipt, null, 2)}\n`);
  await assert.rejects(
    () => rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true }),
    /targetStateSha256 mismatch/
  );
});

test('rollback restores all installed files when a mutation rename fails', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  const first = path.join(root, '.claude', 'commands', 'kim-api.md');
  const second = path.join(root, '.claude', 'commands', 'kim-code.md');
  const beforeFirst = await readFile(first, 'utf8');
  const beforeSecond = await readFile(second, 'utf8');
  let renameCalls = 0;
  const injectedRename = async (...args) => {
    renameCalls++;
    if (renameCalls === 2) throw new Error('injected rollback rename failure');
    return rename(...args);
  };
  await assert.rejects(
    () => rollbackInstall({ target: root, receiptId: applied.receiptId, confirm: true, _io: { rename: injectedRename } }),
    /injected rollback rename failure/
  );
  assert.equal(await readFile(first, 'utf8'), beforeFirst);
  assert.equal(await readFile(second, 'utf8'), beforeSecond);
});

test('rollback restores all installed files when rollback record write fails', async () => {
  const root = await project();
  const applied = await applyInstall({ target: root, confirm: true });
  const destination = path.join(root, '.claude', 'commands', 'kim-api.md');
  const installed = await readFile(destination, 'utf8');
  await assert.rejects(
    () => rollbackInstall({
      target: root, receiptId: applied.receiptId, confirm: true,
      _io: { writeFile: async () => { throw new Error('injected rollback record failure'); } }
    }),
    /injected rollback record failure/
  );
  assert.equal(await readFile(destination, 'utf8'), installed);
});
