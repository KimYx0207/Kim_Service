#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PLUGINS = ['meta-kim-local', 'kim-service-local'];
const MAX_FILES = 4096;
const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_BYTES = 256 * 1024 * 1024;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireInput = (condition, message) => { if (!condition) throw new Error(message); };
const hasKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

/** Parse SemVer precedence; build metadata never creates a newer update version. */
function semanticVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(value);
  requireInput(match && (!match[4] || match[4].split('.').every(part => !/^\d+$/.test(part) || part === '0' || !part.startsWith('0'))), 'invalid plugin semantic version');
  return { core: match.slice(1, 4).map(BigInt), prerelease: match[4]?.split('.') ?? [] };
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.core[index] !== right.core[index]) return left.core[index] < right.core[index] ? -1 : 1;
  }
  if (!left.prerelease.length || !right.prerelease.length) return Math.sign(right.prerelease.length) - Math.sign(left.prerelease.length);
  for (let index = 0; index < Math.max(left.prerelease.length, right.prerelease.length); index += 1) {
    const a = left.prerelease[index], b = right.prerelease[index];
    if (a === undefined || b === undefined) return a === undefined ? -1 : 1;
    if (a === b) continue;
    const aNumeric = /^\d+$/.test(a), bNumeric = /^\d+$/.test(b);
    if (aNumeric && bNumeric) return BigInt(a) < BigInt(b) ? -1 : 1;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a < b ? -1 : 1;
  }
  return 0;
}

/** Reject linked ancestors rather than trusting a manifest's claimed closure. */
function realDirectory(value) {
  requireInput(typeof value === 'string' && path.isAbsolute(value), 'explicit absolute bundle directory required');
  for (let cursor = path.resolve(value); ; cursor = path.dirname(cursor)) {
    const stat = fs.lstatSync(cursor);
    requireInput(stat.isDirectory() && !stat.isSymbolicLink(), 'bundle directories must be real directories without links');
    if (path.dirname(cursor) === cursor) break;
  }
  return fs.realpathSync.native(value);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
}

/** Read bounded regular files from disk; declared bundle hashes are not evidence. */
function readBundle(directory) {
  try {
    const root = realDirectory(directory), files = new Map();
    let totalBytes = 0;
    const walk = (current, prefix = '') => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
        requireInput(!/[\x00-\x1f\\:]/.test(entry.name) && !/[. ]$/.test(entry.name), 'unsupported bundle filename');
        const absolute = path.join(current, entry.name), relative = prefix + entry.name;
        const before = fs.lstatSync(absolute);
        requireInput(!before.isSymbolicLink() && (before.isDirectory() || (before.isFile() && before.nlink === 1)), 'links and non-regular files are forbidden');
        requireInput(inside(root, fs.realpathSync.native(absolute)), 'bundle file escaped its directory');
        if (before.isDirectory()) { walk(absolute, relative + '/'); continue; }
        requireInput(files.size < MAX_FILES && before.size <= MAX_FILE_BYTES && totalBytes + before.size <= MAX_BYTES, 'bundle size bound exceeded');
        const fd = fs.openSync(absolute, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
        let bytes;
        try {
          const opened = fs.fstatSync(fd);
          requireInput(opened.isFile() && opened.nlink === 1 && opened.dev === before.dev && opened.ino === before.ino && opened.size === before.size, 'bundle changed during inspection');
          bytes = fs.readFileSync(fd);
          const after = fs.fstatSync(fd);
          requireInput(bytes.length === before.size && after.mtimeMs === opened.mtimeMs && after.ctimeMs === opened.ctimeMs && after.size === opened.size, 'bundle changed during inspection');
        } finally { fs.closeSync(fd); }
        totalBytes += bytes.length;
        files.set(relative, bytes);
      }
    };
    walk(root);
    const readJson = relative => {
      requireInput(files.has(relative), 'required bundle manifest is missing');
      try { return JSON.parse(files.get(relative).toString('utf8')); }
      catch { throw new Error('invalid bundle manifest JSON'); }
    };
    const marketplace = readJson('marketplace.json');
    requireInput(hasKeys(marketplace, ['name', 'description', 'plugins']), 'marketplace fields must match the reviewed builder format; source overrides and cross-market dependencies are forbidden');
    requireInput(marketplace.name === 'kim-local-reviewed' && typeof marketplace.description === 'string' && Array.isArray(marketplace.plugins) && marketplace.plugins.length === PLUGINS.length && PLUGINS.every(id => marketplace.plugins.filter(plugin => plugin?.name === id).length === 1), 'marketplace must retain the two reviewed plugin identities');
    const actualPluginIds = new Set([...files.keys()].filter(name => name.startsWith('plugins/')).map(name => name.split('/')[1]));
    requireInput(actualPluginIds.size === PLUGINS.length && PLUGINS.every(id => actualPluginIds.has(id)), 'bundle must contain only the reviewed plugin identities');
    const plugins = PLUGINS.map(id => {
      const entry = marketplace.plugins.find(plugin => plugin.name === id);
      requireInput(hasKeys(entry, ['name', 'source', 'version', 'description', 'strict']) && entry.strict === true && typeof entry.description === 'string', 'marketplace plugin fields must match the reviewed strict local source format');
      requireInput(entry.source === './plugins/' + id, 'plugin source must stay in its reviewed bundle directory');
      const plugin = readJson('plugins/' + id + '/.zcode-plugin/plugin.json');
      requireInput(hasKeys(plugin, ['name', 'version', 'description', 'license', 'agents', 'skills']) && plugin.agents === './agents' && plugin.skills === './skills' && typeof plugin.description === 'string' && typeof plugin.license === 'string', 'plugin manifest must retain the reviewed local agents and skills format');
      requireInput(plugin?.name === id, 'plugin manifest identity mismatch');
      requireInput(typeof plugin.version === 'string', 'invalid plugin semantic version');
      const version = semanticVersion(plugin.version);
      requireInput(entry.version === plugin.version, id + ': marketplace and plugin versions differ');
      const prefix = 'plugins/' + id + '/';
      const closure = [...files].filter(([relative]) => relative.startsWith(prefix)).map(([relative, bytes]) => ({ path: relative.slice(prefix.length), bytes: bytes.length, sha256: hash(bytes) }));
      return { name: id, version: plugin.version, parsedVersion: version, payloadSha256: hash(JSON.stringify(closure)), files: closure.length };
    });
    return { plugins };
  } catch (error) {
    // Filesystem/JSON diagnostics can contain private absolute paths or source text.
    if (error.code) throw new Error('unable to inspect bundle filesystem safely');
    throw error;
  }
}

/**
 * Check publication inputs against a caller-verified previous public bundle.
 * This offline gate neither authenticates GitHub history nor publishes anything.
 */
export function checkZcodeRelease({ candidateRoot, previousRoot, initial = false, expectedKimVersion } = {}) {
  requireInput(typeof initial === 'boolean', 'initial publication flag must be boolean');
  requireInput(!(initial && previousRoot), 'initial publication cannot include a previous bundle');
  requireInput(initial || previousRoot, 'provide a previous public bundle or explicitly select initial publication');
  const candidate = readBundle(candidateRoot);
  if (expectedKimVersion !== undefined) requireInput(candidate.plugins[1].version === expectedKimVersion, 'candidate Kim plugin does not match repository VERSION');
  const previous = previousRoot ? readBundle(previousRoot) : null;
  const plugins = candidate.plugins.map(plugin => {
    const old = previous?.plugins.find(row => row.name === plugin.name);
    let decision = 'initial_publication';
    if (old) {
      const comparison = compareVersions(plugin.parsedVersion, old.parsedVersion);
      requireInput(comparison >= 0, plugin.name + ': plugin version rollback is forbidden');
      requireInput(comparison > 0 || plugin.payloadSha256 === old.payloadSha256, plugin.name + ': consumer payload changed without a newer plugin version');
      decision = comparison > 0 ? 'version_increased' : 'unchanged';
    }
    return { name: plugin.name, version: plugin.version, previousVersion: old?.version ?? null, payloadSha256: plugin.payloadSha256, previousPayloadSha256: old?.payloadSha256 ?? null, files: plugin.files, decision };
  });
  return { ok: true, mode: initial ? 'initial_publication_input_check' : 'previous_public_bundle_input_check', baselineAuthenticity: 'caller_must_verify_public_release', plugins, published: false, consumerUpdateVerified: false };
}

function argumentsFor(args) {
  const options = {};
  const names = { '--candidate': 'candidateRoot', '--previous': 'previousRoot' };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--initial') { requireInput(!options.initial, 'duplicate initial flag'); options.initial = true; continue; }
    const name = names[args[index]];
    requireInput(name && !Object.hasOwn(options, name) && args[index + 1] && !args[index + 1].startsWith('--'), 'invalid or duplicate publication-check argument');
    options[name] = args[++index];
  }
  return options;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(checkZcodeRelease(argumentsFor(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error('Zcode publication input check failed: ' + error.message); process.exitCode = 1; }
}
