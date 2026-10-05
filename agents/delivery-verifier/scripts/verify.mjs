#!/usr/bin/env node
// Component-owned, read-only local evidence checking. Not an authorization boundary.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export const LIMITS = Object.freeze({ inputBytes: 262144, fileBytes: 8388608, totalBytes: 33554432,
  jsonBytes: 1048576, artifacts: 64, criteria: 128, assertions: 32, depth: 32, nodes: 50000 });
const VERSION = '0.1.0';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
class Rejected extends Error { constructor(code) { super(code); this.code = code; } }
const reject = code => { throw new Rejected(code); };
const requireThat = (condition, code = 'invalid_input') => { if (!condition) reject(code); };

// JSON.parse alone discards duplicate object keys. This bounded parser rejects them,
// including escape-equivalent keys, before interpreting the envelope or evidence.
export function parseStrict(bytes, maxBytes = LIMITS.inputBytes) {
  requireThat(Buffer.isBuffer(bytes) && bytes.length <= maxBytes, 'input_size');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { reject('invalid_utf8'); }
  let i = 0, nodes = 0;
  const whitespace = () => { while (i < text.length && /[\x20\t\r\n]/.test(text[i])) i++; };
  const string = () => {
    requireThat(text[i] === '"', 'invalid_json');
    const start = i++;
    while (i < text.length) {
      const c = text[i++];
      if (c === '\\') { i++; continue; }
      if (c === '"') {
        try { return JSON.parse(text.slice(start, i)); } catch { reject('invalid_json'); }
      }
    }
    reject('invalid_json');
  };
  const value = depth => {
    requireThat(depth <= LIMITS.depth && ++nodes <= LIMITS.nodes, 'json_complexity');
    whitespace();
    const c = text[i];
    if (c === '"') return string();
    if (c === '{') {
      i++; whitespace();
      const result = Object.create(null);
      if (text[i] === '}') { i++; return result; }
      while (true) {
        whitespace(); const key = string(); whitespace();
        requireThat(!Object.hasOwn(result, key), 'duplicate_json_key');
        requireThat(text[i++] === ':', 'invalid_json');
        result[key] = value(depth + 1); whitespace();
        if (text[i] === '}') { i++; return result; }
        requireThat(text[i++] === ',', 'invalid_json');
      }
    }
    if (c === '[') {
      i++; whitespace(); const result = [];
      if (text[i] === ']') { i++; return result; }
      while (true) {
        result.push(value(depth + 1)); whitespace();
        if (text[i] === ']') { i++; return result; }
        requireThat(text[i++] === ',', 'invalid_json');
      }
    }
    for (const [literal, result] of [['true', true], ['false', false], ['null', null]]) {
      if (text.startsWith(literal, i)) { i += literal.length; return result; }
    }
    const match = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    requireThat(match, 'invalid_json');
    i += match[0].length; const number = Number(match[0]);
    requireThat(Number.isFinite(number) && (!Number.isInteger(number) || Number.isSafeInteger(number)), 'invalid_number');
    return number;
  };
  const result = value(0); whitespace();
  requireThat(i === text.length, 'invalid_json');
  return result;
}

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function keys(value, required, optional = []) {
  requireThat(object(value) && required.every(key => Object.hasOwn(value, key)) &&
    Object.keys(value).every(key => [...required, ...optional].includes(key)));
}
const id = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const shortText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500 && !/[\x00-\x1f\x7f]/.test(value);
const boundedArray = (value, min, max) => Array.isArray(value) && value.length >= min && value.length <= max;
const unique = values => new Set(values).size === values.length;
function relativeFile(value) {
  // Portable ASCII filenames avoid Windows drive/ADS, separator and encoding ambiguity.
  requireThat(typeof value === 'string' && value.length <= 240 && value.split('/').every(segment =>
    /^[a-zA-Z0-9][a-zA-Z0-9._ -]*$/.test(segment) && !segment.endsWith('.') && !segment.endsWith(' ') &&
    !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)), 'unsafe_path');
}
function pointerParts(pointer) {
  requireThat(typeof pointer === 'string' && pointer.length <= 500 &&
    (pointer === '' || pointer.startsWith('/')) && !/~(?:[^01]|$)/.test(pointer));
  return pointer === '' ? [] : pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}
function pointerValue(data, pointer) {
  for (const part of pointerParts(pointer)) {
    if ((typeof data !== 'object' || data === null) || !Object.hasOwn(data, part) ||
      (Array.isArray(data) && !/^(?:0|[1-9]\d*)$/.test(part))) return { found: false };
    data = data[part];
  }
  return { found: true, value: data };
}
function validate(input) {
  keys(input, ['schemaVersion', 'taskId', 'artifacts', 'criteria']);
  requireThat(input.schemaVersion === 1 && id(input.taskId));
  requireThat(boundedArray(input.artifacts, 1, LIMITS.artifacts) && boundedArray(input.criteria, 1, LIMITS.criteria));
  let total = 0;
  for (const artifact of input.artifacts) {
    keys(artifact, ['id', 'path', 'bytes', 'sha256']); relativeFile(artifact.path);
    requireThat(id(artifact.id) && Number.isSafeInteger(artifact.bytes) && artifact.bytes >= 0 &&
      artifact.bytes <= LIMITS.fileBytes && digest(artifact.sha256)); total += artifact.bytes;
  }
  requireThat(total <= LIMITS.totalBytes, 'manifest_size');
  requireThat(unique(input.artifacts.map(a => a.id)) && unique(input.artifacts.map(a => a.path.toLowerCase())), 'duplicate_artifact');
  const ids = new Set(input.artifacts.map(a => a.id));
  for (const criterion of input.criteria) {
    requireThat(object(criterion) && id(criterion.id) && shortText(criterion.description));
    const base = ['id', 'description', 'type'];
    if (criterion.type === 'artifact_integrity') {
      keys(criterion, [...base, 'artifactId']); requireThat(ids.has(criterion.artifactId));
    } else if (criterion.type === 'json_equals') {
      keys(criterion, [...base, 'artifactId', 'pointer', 'equals']); requireThat(ids.has(criterion.artifactId));
      pointerParts(criterion.pointer);
    } else if (criterion.type === 'tool_receipt') {
      keys(criterion, [...base, 'receiptArtifactId', 'inputArtifactId', 'outputArtifactIds', 'tool', 'toolVersion', 'invocationId', 'assertions']);
      requireThat(ids.has(criterion.receiptArtifactId) && ids.has(criterion.inputArtifactId) &&
        id(criterion.tool) && id(criterion.toolVersion) && id(criterion.invocationId));
      requireThat(boundedArray(criterion.outputArtifactIds, 1, LIMITS.artifacts) &&
        unique(criterion.outputArtifactIds) && criterion.outputArtifactIds.every(item => ids.has(item)));
      requireThat(!criterion.outputArtifactIds.includes(criterion.receiptArtifactId) &&
        !criterion.outputArtifactIds.includes(criterion.inputArtifactId) && criterion.inputArtifactId !== criterion.receiptArtifactId);
      requireThat(boundedArray(criterion.assertions, 1, LIMITS.assertions));
      for (const assertion of criterion.assertions) {
        keys(assertion, ['pointer', 'equals']); pointerParts(assertion.pointer);
        requireThat(assertion.pointer.startsWith('/result/'));
      }
      requireThat(unique(criterion.assertions.map(a => a.pointer)));
    } else if (criterion.type === 'external_review') {
      keys(criterion, [...base, 'capability']); requireThat(id(criterion.capability));
    } else reject('unsupported_criterion');
  }
  requireThat(unique(input.criteria.map(c => c.id)), 'duplicate_criterion');
}

const sameIdentity = (a, b) => a.dev === b.dev && a.ino === b.ino;
const sameFile = (a, b) => sameIdentity(a, b) && a.size === b.size && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
function directoryChain(absolute) {
  const root = path.parse(absolute).root;
  const result = [], segments = absolute.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  for (const segment of [null, ...segments]) {
    if (segment !== null) current = path.join(current, segment);
    const stat = fs.lstatSync(current, { bigint: true });
    requireThat(!stat.isSymbolicLink() && stat.isDirectory(), 'unsafe_scope');
    result.push({ path: current, stat });
  }
  return result;
}
function checkChain(chain) {
  for (const entry of chain) {
    const stat = fs.lstatSync(entry.path, { bigint: true });
    requireThat(!stat.isSymbolicLink() && stat.isDirectory() && sameIdentity(entry.stat, stat), 'scope_changed');
  }
}
function bindRoot(root) {
  requireThat(typeof root === 'string' && path.isAbsolute(root) && root === path.resolve(root) && root !== path.parse(root).root, 'invalid_artifact_root');
  requireThat(process.platform !== 'win32' && typeof fs.constants.O_NOFOLLOW === 'number' && typeof fs.constants.O_NONBLOCK === 'number', 'safe_open_unavailable');
  const chain = directoryChain(root);
  requireThat(fs.realpathSync(root) === root, 'unsafe_scope');
  return { root, chain };
}
function readArtifact(scope, artifact) {
  checkChain(scope.chain);
  const file = path.join(scope.root, ...artifact.path.split('/'));
  requireThat(file.startsWith(scope.root + path.sep), 'unsafe_path');
  const chain = directoryChain(path.dirname(file));
  const before = fs.lstatSync(file, { bigint: true });
  requireThat(!before.isSymbolicLink() && before.isFile() && before.nlink === 1n, 'unsafe_file');
  requireThat(before.size <= BigInt(LIMITS.fileBytes), 'artifact_size');
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    const opened = fs.fstatSync(fd, { bigint: true });
    requireThat(opened.isFile() && opened.nlink === 1n && sameFile(before, opened), 'artifact_changed');
    const bytes = Buffer.alloc(Number(opened.size) + 1); let count = 0;
    while (count < bytes.length) {
      const length = fs.readSync(fd, bytes, count, bytes.length - count, null);
      if (!length) break;
      count += length;
    }
    requireThat(count === Number(opened.size), 'artifact_changed');
    requireThat(sameFile(opened, fs.fstatSync(fd, { bigint: true })), 'artifact_changed');
    const after = fs.lstatSync(file, { bigint: true });
    requireThat(!after.isSymbolicLink() && after.isFile() && sameFile(opened, after), 'artifact_changed');
    checkChain(chain); checkChain(scope.chain);
    return bytes.subarray(0, count);
  } finally { if (fd !== undefined) fs.closeSync(fd); }
}

function baseResult(taskId = null) {
  return { schemaVersion: 1, tool: 'delivery-verify', toolVersion: VERSION, taskId, status: 'blocked',
    verificationScope: 'local_manifest_and_evidence_consistency', artifactRefs: [], criterionResults: [],
    missingCapabilities: [], failures: [], stopReason: null,
    handoff: { status: 'blocked', decisionOwner: 'caller_or_meta', finalAcceptance: 'not_decided', nextActions: [] },
    runtimeVerification: { host: 'not_tested', browser: 'not_tested', model: 'not_tested', nativeAgent: 'needs_probe', hostBinding: 'requires_host_binding' },
    receiptAuthenticity: 'not_verified', networkUsed: false, filesModified: false };
}
function safeCode(error) {
  if (error instanceof Rejected) return error.code;
  if (error?.code === 'ENOENT') return 'artifact_missing';
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'artifact_unreadable';
  if (error?.code === 'ELOOP' || error?.code === 'ENOTDIR') return 'unsafe_file';
  return 'local_read_failed';
}
function blocked(result, code, target = null) {
  result.status = 'blocked'; result.stopReason = code;
  result.failures.push({ target, code });
  result.handoff.status = 'blocked';
  result.handoff.nextActions = ['Caller must resolve the reported input or scope failure before retrying.'];
  return result;
}

function inspectReceipt(data, criterion, input, artifactMap) {
  keys(data, ['schemaVersion', 'taskId', 'tool', 'toolVersion', 'invocationId', 'inputSha256', 'status', 'exitCode', 'outputArtifacts', 'result']);
  requireThat(data.schemaVersion === 1 && data.taskId === input.taskId && data.tool === criterion.tool &&
    data.toolVersion === criterion.toolVersion && data.invocationId === criterion.invocationId &&
    data.inputSha256 === artifactMap.get(criterion.inputArtifactId).sha256, 'receipt_binding_mismatch');
  requireThat(data.status === 'completed' && data.exitCode === 0, 'receipt_not_successful');
  requireThat(object(data.result) && boundedArray(data.outputArtifacts, 1, LIMITS.artifacts), 'receipt_shape');
  const expected = criterion.outputArtifactIds.map(id => artifactMap.get(id));
  requireThat(data.outputArtifacts.length === expected.length && unique(data.outputArtifacts.map(a => a?.id)), 'receipt_artifact_mismatch');
  for (const reference of data.outputArtifacts) {
    keys(reference, ['id', 'bytes', 'sha256']);
    const match = expected.find(item => item.id === reference.id);
    requireThat(match && reference.bytes === match.bytes && reference.sha256 === match.sha256, 'receipt_artifact_mismatch');
  }
  for (const assertion of criterion.assertions) {
    const actual = pointerValue(data, assertion.pointer);
    requireThat(actual.found && isDeepStrictEqual(actual.value, assertion.equals), 'receipt_assertion_mismatch');
  }
}

// The caller binds authorization and a stable directory snapshot before invoking.
// A caller-controlled approval flag in task JSON is never accepted as authority.
export function verify(bytes, artifactRoot) {
  let result = baseResult(), input, scope;
  try {
    input = parseStrict(bytes); validate(input); result.taskId = input.taskId;
    scope = bindRoot(artifactRoot);
  } catch (error) { return blocked(result, safeCode(error)); }
  const artifactMap = new Map(input.artifacts.map(item => [item.id, item]));
  const evidence = new Map(), good = new Set(); let totalRead = 0;
  for (const artifact of input.artifacts) {
    let bytes;
    try {
      bytes = readArtifact(scope, artifact); totalRead += bytes.length;
      requireThat(totalRead <= LIMITS.totalBytes, 'artifact_total_size');
    } catch (error) {
      const code = safeCode(error);
      result.artifactRefs.push({ ...artifact, actualBytes: null, actualSha256: null, status: 'failed', code });
      if (!['artifact_missing', 'artifact_unreadable'].includes(code)) return blocked(result, code, artifact.id);
      result.failures.push({ target: artifact.id, code }); continue;
    }
    const actualSha256 = sha(bytes), matches = bytes.length === artifact.bytes && actualSha256 === artifact.sha256;
    const code = bytes.length !== artifact.bytes ? 'bytes_mismatch' : actualSha256 !== artifact.sha256 ? 'sha256_mismatch' : null;
    result.artifactRefs.push({ ...artifact, actualBytes: bytes.length, actualSha256, status: matches ? 'verified' : 'failed', code });
    if (matches) { evidence.set(artifact.id, bytes); good.add(artifact.id); }
    else result.failures.push({ target: artifact.id, code });
  }
  for (const criterion of input.criteria) {
    const row = { id: criterion.id, type: criterion.type, status: 'failed', code: null, evidenceArtifactIds: [] };
    if (criterion.type === 'external_review') {
      row.status = 'unverified'; row.code = 'missing_capability';
      result.missingCapabilities.push({ criterionId: criterion.id, capability: criterion.capability });
    } else {
      row.evidenceArtifactIds = criterion.type === 'tool_receipt'
        ? [criterion.receiptArtifactId, criterion.inputArtifactId, ...criterion.outputArtifactIds] : [criterion.artifactId];
      try {
        requireThat(row.evidenceArtifactIds.every(id => good.has(id)), 'artifact_not_verified');
        if (criterion.type === 'json_equals') {
          const actual = pointerValue(parseStrict(evidence.get(criterion.artifactId), LIMITS.jsonBytes), criterion.pointer);
          requireThat(actual.found && isDeepStrictEqual(actual.value, criterion.equals), 'json_assertion_mismatch');
        } else if (criterion.type === 'tool_receipt') {
          inspectReceipt(parseStrict(evidence.get(criterion.receiptArtifactId), LIMITS.jsonBytes), criterion, input, artifactMap);
        }
        row.status = 'passed';
      } catch (error) { row.code = safeCode(error); result.failures.push({ target: criterion.id, code: row.code }); }
    }
    result.criterionResults.push(row);
  }
  try { checkChain(scope.chain); } catch (error) { return blocked(result, safeCode(error)); }
  const all = result.failures.length === 0 && result.missingCapabilities.length === 0;
  const useful = good.size > 0 || result.criterionResults.some(item => item.status === 'passed');
  result.status = all ? 'completed' : useful ? 'partial' : 'blocked';
  result.stopReason = all ? 'local_checks_completed' : useful ? 'verification_incomplete' : 'no_verifiable_evidence';
  result.handoff.status = all ? 'ready_for_caller_review' : useful ? 'needs_evidence' : 'blocked';
  result.handoff.nextActions = all
    ? ['Caller must verify evidence provenance and decide final acceptance.']
    : ['Resolve listed failures or supply missing review evidence; caller decides final acceptance.'];
  return result;
}

async function main() {
  let result;
  try {
    const args = process.argv.slice(2);
    requireThat(args.length === 4 && args[0] === '--artifact-root' && args[2] === '--input-json' && args[3] === '-', 'invalid_arguments');
    let size = 0; const chunks = [];
    for await (const chunk of process.stdin) {
      size += chunk.length; requireThat(size <= LIMITS.inputBytes, 'input_size'); chunks.push(chunk);
    }
    result = verify(Buffer.concat(chunks), args[1]);
  } catch (error) { result = blocked(baseResult(), safeCode(error)); }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.status === 'completed' ? 0 : result.status === 'partial' ? 1 : 2;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
