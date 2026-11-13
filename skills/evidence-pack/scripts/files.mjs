import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createHelper, hash, bytes, receipt, requireValue as assert } from './runtime.mjs';
import { run as runCore } from './run.mjs';

function rootDirectory(value) {
  assert(path.isAbsolute(value), 'workspaceRoot must be an explicit absolute directory');
  const root = path.resolve(value); let current = path.parse(root).root;
  for (const part of root.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part); const stat = fs.lstatSync(current);
    assert(stat.isDirectory() && !stat.isSymbolicLink(), 'workspaceRoot must not traverse symlinks');
  }
  return root;
}
function workspaceFile(root, relative, { output = false } = {}) {
  assert(typeof relative === 'string' && relative.length <= 512 && !path.isAbsolute(relative) && !/[\\\x00-\x1f:]/u.test(relative), 'File reference must be a bounded workspace-relative path');
  const parts = relative.split('/'); assert(parts.every(part => part && part !== '.' && part !== '..'), 'File reference must stay inside workspaceRoot');
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part); const last = index === parts.length - 1;
    if (last && output) { assert(!fs.existsSync(current), 'Pack output already exists; use a new version path'); return current; }
    const stat = fs.lstatSync(current); assert(!stat.isSymbolicLink() && (last ? stat.isFile() : stat.isDirectory()), 'Evidence paths must be regular files without symlink ancestors');
  }
  return current;
}
function readBounded(filename, limit) {
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const before = fs.fstatSync(fd); assert(before.isFile() && before.size <= limit, 'File exceeds configured byte budget');
    const buffer = Buffer.alloc(before.size + 1); const size = fs.readSync(fd, buffer, 0, buffer.length, 0);
    const after = fs.fstatSync(fd); assert(size === before.size && before.size === after.size && before.mtimeMs === after.mtimeMs, 'Source changed while reading');
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, size));
  } finally { fs.closeSync(fd); }
}
function writeNew(filename, content) {
  const temp = filename + '.' + crypto.randomBytes(10).toString('hex') + '.tmp';
  let fd;
  try {
    fd = fs.openSync(temp, 'wx', 0o600); fs.writeFileSync(fd, content, 'utf8'); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.linkSync(temp, filename); // Atomic no-clobber publication on the same filesystem.
  } finally { if (fd !== undefined) fs.closeSync(fd); if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
export const run = createHelper(import.meta.url, 'evidence-pack', (input, policy) => {
  assert(bytes(JSON.stringify(input)) <= policy.maxFileRequestBytes, 'File request exceeds configured byte budget');
  const root = rootDirectory(input.workspaceRoot);
  const options = Object.fromEntries(['indexOffset','indexPageSize','contextBudgetBytes','chunkIds','selectionOffset'].filter(key => Object.hasOwn(input,key)).map(key=>[key,input[key]]));
  let outcome; let packText; let packFile;
  if (input.operation === 'build') {
    assert(input.sourceFiles?.length, 'build requires sourceFiles');
    let total = 0;
    const sources = input.sourceFiles.map(source => {
      const text = readBounded(workspaceFile(root, source.path), policy.maxSourceBytes - total); total += bytes(text);
      return { id: source.id, title: source.title, revision: source.revision, uri: source.path, text,
        ...(source.expectedSha256 ? { expectedSha256:source.expectedSha256 } : {}), ...(source.pages ? { pages:source.pages } : {}) };
    });
    packFile = workspaceFile(root, input.packPath, { output:true });
    outcome = runCore({ context:input.context, operation:'build', sources, ...options, ...(input.chunkBytes ? {chunkBytes:input.chunkBytes} : {}) });
    packText = JSON.stringify(outcome.result.pack);
    // Reserve space for the next file request's selectors/context as well as
    // the pack. A successful build must be re-readable by this same interface.
    assert(bytes(packText) <= policy.maxInputBytes - policy.maxFileRequestBytes,
      'Pack cannot be re-read within the configured input budget; split the source into smaller packs');
  } else {
    assert(input.expectedPackSha256, 'read requires expectedPackSha256');
    packFile = workspaceFile(root, input.packPath);
    packText = readBounded(packFile, policy.maxInputBytes);
    assert(hash(packText) === input.expectedPackSha256, 'Pack file hash changed; do not use stale references');
    const pack = JSON.parse(packText);
    if (input.verifySourceFiles !== false) {
      for (const source of pack.sources) {
        const text = readBounded(workspaceFile(root, source.uri), policy.maxSourceBytes);
        assert(hash(text) === source.sha256, 'Source drift detected; build a new version of the evidence pack');
      }
    }
    outcome = runCore({context:input.context, operation:'read', pack, ...options});
  }
  const { pack, ...summary } = outcome.result;
  const result = { ...summary, coreInputSha256: outcome.inputSha256,
    packRef: { path:input.packPath, sha256:hash(packText), bytes:bytes(packText), sourceVerification: input.operation === 'build' || input.verifySourceFiles !== false ? 'verified_against_supplied_files' : 'snapshot_only' } };
  const response = receipt(input,policy,'evidence-pack',{result});
  assert(bytes(JSON.stringify(response)+'\n') <= policy.maxFileResponseBytes, 'Response exceeds configured file-interface budget; reduce indexPageSize/contextBudgetBytes');
  if (input.operation === 'build') writeNew(packFile, packText);
  return {result};
});
