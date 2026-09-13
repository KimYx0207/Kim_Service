import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import {
  copyFile, lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile
} from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const ASSET_ROOT = path.join(PACKAGE_ROOT, 'host', 'claude');
const SOURCE_COMMIT = 'fce3202fc48d98173d8756f8002809cefb28fca5';
const HEX_256 = /^[0-9a-f]{64}$/;
const RECEIPT_ID = /^[0-9a-f-]{36}$/i;
const NATIVE_IO = Object.freeze({ copyFile, rename, rm, writeFile });

function mutationIo(overrides) {
  return { ...NATIVE_IO, ...(overrides || {}) };
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function fileHash(filename) {
  try { return sha256(await readFile(filename)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function existingLstat(filename) {
  try { return await lstat(filename); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function validateProjectRoot(target) {
  if (typeof target !== 'string' || target.trim() === '') throw new TypeError('target must be an existing project directory');
  const root = await realpath(path.resolve(target));
  const info = await lstat(root);
  if (!info.isDirectory()) throw new TypeError('target must be a directory');
  let home;
  try { home = await realpath(homedir()); } catch { home = path.resolve(homedir()); }
  if (root === home || ['.claude', '.codex'].includes(path.basename(root).toLowerCase())) {
    throw new Error('user-wide configuration targets are not allowed; select a project root');
  }
  return root;
}

async function assertSafePath(root, candidate) {
  const absolute = path.resolve(candidate);
  if (!isContained(root, absolute)) throw new Error(`path escapes target root: ${candidate}`);
  const relative = path.relative(root, absolute);
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const info = await existingLstat(current);
    if (info?.isSymbolicLink()) throw new Error(`symbolic link is not allowed in managed path: ${current}`);
  }
  return absolute;
}

async function walkFiles(root, relative = '') {
  const entries = await readdir(path.join(root, relative), { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`bundled asset must not be a symlink: ${child}`);
    if (entry.isDirectory()) files.push(...await walkFiles(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function bundledManifest() {
  const manifest = new Map();
  for (const relative of await walkFiles(ASSET_ROOT)) {
    const source = path.join(ASSET_ROOT, relative);
    const target = path.join('.claude', relative).replaceAll('\\', '/');
    manifest.set(target, {
      source,
      sourceRelative: path.relative(PACKAGE_ROOT, source).replaceAll('\\', '/'),
      sourceSha256: await fileHash(source)
    });
  }
  return manifest;
}

function targetStateSha256(files) {
  return sha256(files.map((item) => `${item.target}\0${item.installedSha256}`).sort().join('\n'));
}

function receiptChecksum(receiptWithoutChecksum) {
  return sha256(JSON.stringify(receiptWithoutChecksum));
}

async function writeJsonAtomic(filename, value, transactionId, io) {
  const temporary = `${filename}.kim-ccg-${transactionId}.tmp`;
  try {
    await io.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await io.rename(temporary, filename);
  } catch (error) {
    await NATIVE_IO.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function atomicReplaceFromFile({ source, destination, transactionId, expectedSha256, io }) {
  const staged = `${destination}.kim-ccg-${transactionId}.new`;
  const held = `${destination}.kim-ccg-${transactionId}.old`;
  await mkdir(path.dirname(destination), { recursive: true });
  await io.copyFile(source, staged);
  if (expectedSha256 && await fileHash(staged) !== expectedSha256) {
    await NATIVE_IO.rm(staged, { force: true }).catch(() => {});
    throw new Error(`staged hash mismatch for ${destination}`);
  }
  const existed = await fileHash(destination) !== null;
  if (!existed) {
    try { await io.rename(staged, destination); }
    catch (error) { await NATIVE_IO.rm(staged, { force: true }).catch(() => {}); throw error; }
    return;
  }
  await io.rename(destination, held);
  try {
    await io.rename(staged, destination);
  } catch (error) {
    await io.rename(held, destination);
    await NATIVE_IO.rm(staged, { force: true }).catch(() => {});
    throw error;
  }
  try { await io.rm(held, { force: true }); }
  catch (error) {
    await NATIVE_IO.rm(destination, { force: true });
    await io.rename(held, destination);
    throw error;
  }
}

async function atomicRemove({ destination, transactionId, io, retainHeld = false }) {
  if (await fileHash(destination) === null) return null;
  const held = `${destination}.kim-ccg-${transactionId}.removed`;
  await io.rename(destination, held);
  if (retainHeld) return held;
  try { await io.rm(held, { force: true }); }
  catch (error) { await io.rename(held, destination); throw error; }
  return null;
}

export async function planInstall({ target }) {
  const targetRoot = await validateProjectRoot(target);
  const manifest = await bundledManifest();
  const operations = [];
  for (const [targetRelative, asset] of manifest) {
    const destination = await assertSafePath(targetRoot, path.join(targetRoot, targetRelative));
    const currentSha256 = await fileHash(destination);
    operations.push({
      source: asset.sourceRelative,
      target: targetRelative,
      action: currentSha256 === null ? 'create' : currentSha256 === asset.sourceSha256 ? 'unchanged' : 'conflict',
      sourceSha256: asset.sourceSha256,
      currentSha256
    });
  }
  return { mode: 'plan', targetRoot, operations };
}

async function restoreApplyTransaction(targetRoot, applied, transactionId, io) {
  const failures = [];
  for (const item of [...applied].reverse()) {
    try {
      const destination = await assertSafePath(targetRoot, path.join(targetRoot, item.target));
      if (item.backup) {
        await atomicReplaceFromFile({
          source: item.backup, destination, transactionId: `${transactionId}-restore`,
          expectedSha256: item.beforeSha256, io
        });
      } else {
        await atomicRemove({ destination, transactionId: `${transactionId}-restore`, io });
      }
    } catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'apply transaction recovery failed');
}

export async function applyInstall({ target, confirm = false, replace = false, _io } = {}) {
  if (!confirm) throw new Error('apply requires --confirm-project-write');
  const plan = await planInstall({ target });
  const conflicts = plan.operations.filter((item) => item.action === 'conflict');
  if (conflicts.length && !replace) throw new Error(`refusing to replace ${conflicts.length} conflicting file(s) without --replace`);
  const io = mutationIo(_io);
  const targetRoot = plan.targetRoot;
  const transactionId = randomUUID();
  const stateRoot = await assertSafePath(targetRoot, path.join(targetRoot, '.kim-service', 'ccg'));
  const backupRoot = await assertSafePath(targetRoot, path.join(stateRoot, 'backups', transactionId));
  const receiptRoot = await assertSafePath(targetRoot, path.join(stateRoot, 'receipts'));
  const applied = [];
  try {
    for (const operation of plan.operations) {
      if (operation.action === 'unchanged') continue;
      const source = path.join(PACKAGE_ROOT, operation.source);
      const destination = await assertSafePath(targetRoot, path.join(targetRoot, operation.target));
      let backup = null;
      if (operation.currentSha256 !== null) {
        backup = await assertSafePath(targetRoot, path.join(backupRoot, operation.target));
        await mkdir(path.dirname(backup), { recursive: true });
        await io.copyFile(destination, backup);
        if (await fileHash(backup) !== operation.currentSha256) throw new Error(`backup hash mismatch for ${operation.target}`);
      }
      const recovery = {
        target: operation.target,
        beforeSha256: operation.currentSha256,
        installedSha256: operation.sourceSha256,
        backup
      };
      applied.push(recovery); // register recovery before the first destructive rename
      await atomicReplaceFromFile({
        source, destination, transactionId, expectedSha256: operation.sourceSha256, io
      });
    }
    const files = applied.map((item) => ({
      target: item.target,
      beforeSha256: item.beforeSha256,
      installedSha256: item.installedSha256,
      backup: item.backup ? path.relative(stateRoot, item.backup).replaceAll('\\', '/') : null
    }));
    const receiptCore = {
      schemaVersion: 1,
      receiptId: transactionId,
      sourceCommit: SOURCE_COMMIT,
      targetRoot,
      targetStateSha256: targetStateSha256(files),
      createdAt: new Date().toISOString(),
      files
    };
    const receipt = { ...receiptCore, receiptSha256: receiptChecksum(receiptCore) };
    await mkdir(receiptRoot, { recursive: true });
    const receiptFile = path.join(receiptRoot, `${transactionId}.json`);
    await writeJsonAtomic(receiptFile, receipt, transactionId, io);
    return {
      mode: 'apply', targetRoot, operations: plan.operations, receiptId: transactionId,
      receiptFile, targetStateSha256: receipt.targetStateSha256, receiptSha256: receipt.receiptSha256
    };
  } catch (error) {
    try { await restoreApplyTransaction(targetRoot, applied, transactionId, io); }
    catch (recoveryError) { throw new AggregateError([error, recoveryError], 'apply failed and recovery was incomplete'); }
    throw error;
  }
}

function validateReceiptShape(receipt, { receiptId, targetRoot, manifest }) {
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw new Error('receipt is invalid');
  const { receiptSha256, ...core } = receipt;
  if (!HEX_256.test(receiptSha256 || '') || receiptChecksum(core) !== receiptSha256) {
    throw new Error('receipt integrity checksum mismatch (checksum is corruption detection, not a signature)');
  }
  if (core.schemaVersion !== 1 || core.receiptId !== receiptId || core.targetRoot !== targetRoot || core.sourceCommit !== SOURCE_COMMIT || !Array.isArray(core.files)) {
    throw new Error('receipt does not match the selected target or source');
  }
  const seen = new Set();
  for (const item of core.files) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('receipt file entry is invalid');
    const asset = manifest.get(item.target);
    if (!asset || seen.has(item.target)) throw new Error(`receipt target is not in the bundled asset manifest: ${String(item.target)}`);
    seen.add(item.target);
    if (item.installedSha256 !== asset.sourceSha256) throw new Error(`receipt installed hash differs from bundled asset: ${item.target}`);
    if (item.beforeSha256 !== null && !HEX_256.test(item.beforeSha256 || '')) throw new Error(`receipt before hash is invalid: ${item.target}`);
    const expectedBackup = item.beforeSha256 === null ? null : `backups/${receiptId}/${item.target}`;
    if (item.backup !== expectedBackup) throw new Error(`receipt backup path is not receipt-owned: ${item.target}`);
  }
  if (core.targetStateSha256 !== targetStateSha256(core.files)) throw new Error('receipt targetStateSha256 mismatch');
  return core;
}

async function restoreRollbackTransaction(targetRoot, applied, transactionId, io) {
  const failures = [];
  for (const item of [...applied].reverse()) {
    try {
      const destination = await assertSafePath(targetRoot, path.join(targetRoot, item.target));
      if (item.deletedHold && await fileHash(item.deletedHold) !== null && await fileHash(destination) === null) {
        await io.rename(item.deletedHold, destination);
      } else {
        await atomicReplaceFromFile({
          source: item.currentSnapshot, destination, transactionId: `${transactionId}-revert`,
          expectedSha256: item.installedSha256, io
        });
        if (item.deletedHold) await NATIVE_IO.rm(item.deletedHold, { force: true }).catch(() => {});
      }
    } catch (error) { failures.push(error); }
  }
  if (failures.length) throw new AggregateError(failures, 'rollback transaction recovery failed');
}

export async function rollbackInstall({ target, receiptId, confirm = false, _io } = {}) {
  if (!confirm) throw new Error('rollback requires --confirm-project-write');
  if (typeof receiptId !== 'string' || !RECEIPT_ID.test(receiptId)) throw new TypeError('receiptId is invalid');
  const io = mutationIo(_io);
  const targetRoot = await validateProjectRoot(target);
  const stateRoot = await assertSafePath(targetRoot, path.join(targetRoot, '.kim-service', 'ccg'));
  const receiptFile = await assertSafePath(targetRoot, path.join(stateRoot, 'receipts', `${receiptId}.json`));
  const manifest = await bundledManifest();
  const receipt = JSON.parse(await readFile(receiptFile, 'utf8'));
  const core = validateReceiptShape(receipt, { receiptId, targetRoot, manifest });
  const transactionId = randomUUID();
  const transactionRoot = await assertSafePath(targetRoot, path.join(stateRoot, 'rollback-transactions', transactionId));
  const prepared = [];

  // Validate every target and backup, then snapshot/stage all bytes before mutation.
  for (const item of core.files) {
    const destination = await assertSafePath(targetRoot, path.join(targetRoot, item.target));
    if (await fileHash(destination) !== item.installedSha256) throw new Error(`refusing rollback because installed file drifted: ${item.target}`);
    const currentSnapshot = await assertSafePath(targetRoot, path.join(transactionRoot, 'current', item.target));
    await mkdir(path.dirname(currentSnapshot), { recursive: true });
    await io.copyFile(destination, currentSnapshot);
    if (await fileHash(currentSnapshot) !== item.installedSha256) throw new Error(`rollback snapshot hash mismatch: ${item.target}`);
    let restoreStage = null;
    if (item.backup) {
      const expectedBackup = `backups/${receiptId}/${item.target}`;
      if (item.backup !== expectedBackup) throw new Error(`receipt backup path is not receipt-owned: ${item.target}`);
      const backup = await assertSafePath(targetRoot, path.join(stateRoot, ...item.backup.split('/')));
      if (await fileHash(backup) !== item.beforeSha256) throw new Error(`backup hash mismatch: ${item.target}`);
      restoreStage = await assertSafePath(targetRoot, path.join(transactionRoot, 'restore', item.target));
      await mkdir(path.dirname(restoreStage), { recursive: true });
      await io.copyFile(backup, restoreStage);
      if (await fileHash(restoreStage) !== item.beforeSha256) throw new Error(`staged backup hash mismatch: ${item.target}`);
    }
    prepared.push({ ...item, destination, currentSnapshot, restoreStage, deletedHold: null });
  }

  const applied = [];
  let committed = false;
  try {
    for (const item of [...prepared].reverse()) {
      applied.push(item); // register recovery before mutation
      if (item.restoreStage) {
        await atomicReplaceFromFile({
          source: item.restoreStage, destination: item.destination, transactionId,
          expectedSha256: item.beforeSha256, io
        });
      } else {
        item.deletedHold = await atomicRemove({
          destination: item.destination, transactionId, io, retainHeld: true
        });
      }
    }
    const rollbackRoot = await assertSafePath(targetRoot, path.join(stateRoot, 'rollbacks'));
    await mkdir(rollbackRoot, { recursive: true });
    const record = {
      schemaVersion: 1,
      receiptId,
      sourceReceiptSha256: receipt.receiptSha256,
      rolledBackAt: new Date().toISOString(),
      files: core.files.map((item) => ({ target: item.target, restoredSha256: item.beforeSha256 }))
    };
    await writeJsonAtomic(path.join(rollbackRoot, `${receiptId}.json`), record, transactionId, io);
    committed = true;
    for (const item of applied) {
      if (item.deletedHold) await NATIVE_IO.rm(item.deletedHold, { force: true }).catch(() => {});
    }
    await NATIVE_IO.rm(transactionRoot, { recursive: true, force: true }).catch(() => {});
    return {
      mode: 'rollback', targetRoot,
      operations: core.files.map((item) => ({ target: item.target, action: item.backup ? 'restore' : 'remove' }))
    };
  } catch (error) {
    if (!committed) {
      try { await restoreRollbackTransaction(targetRoot, applied, transactionId, io); }
      catch (recoveryError) { throw new AggregateError([error, recoveryError], 'rollback failed and recovery was incomplete'); }
    }
    throw error;
  }
}
