#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { componentFilesSha256, discoverComponents } from './capability-catalog.mjs';
import { checkComponentMethod } from './check-agent-pack.mjs';

export const AGENTS = Object.freeze(['meta-artisan', 'meta-chrysalis', 'meta-conductor', 'meta-genesis', 'meta-librarian', 'meta-prism', 'meta-scout', 'meta-sentinel', 'meta-warden']);
export const MARKETPLACE = 'kim-local-reviewed';
// Public repository facts referenced by meta-theory, aligned with Meta_Kim's
// DSH projection. This bounded selection excludes private/local config state.
export const META_RESOURCE_FILES = Object.freeze([
  'canonical/runtime-assets/dsh/host-contract.json',
  'config/runtime-capability-matrix.json',
  'config/os-compatibility-matrix.json',
  'config/runtime-compatibility-catalog.json',
  'config/skills.json',
  'config/sync.json',
  'config/capability-index/agent-eligibility.json',
  'config/capability-index/dependency-project-registry.json',
  'config/capability-index/meta-kim-capabilities.json',
  'config/capability-index/provider-registry.json',
  'config/capability-index/weapon-registry.json',
  'config/governance/decision-pattern-catalog.json'
]);
const REPOSITORIES = { meta: 'KimYx0207/Meta_Kim', kim: 'KimYx0207/Kim_Service' };
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export const sha256 = value => createHash('sha256').update(value).digest('hex');

function gitEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^GIT_(?:DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG(?:_|$))/i.test(key)) delete env[key];
  return { ...env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
}

/** Reject ambiguous paths before any filesystem write. */
export function safeRelative(value) {
  assert(typeof value === 'string' && value.length > 0 && value.length <= 240, 'invalid relative path');
  assert(value.split('/').every(part => /^[\p{L}\p{N}._-][\p{L}\p{N}._ -]*$/u.test(part) && part !== '.' && part !== '..' &&
    !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), 'unsafe relative path');
  return value;
}

function noLinks(absolute, file = false) {
  assert(path.isAbsolute(absolute), 'explicit absolute path required');
  const parts = path.resolve(absolute).slice(path.parse(absolute).root.length).split(path.sep).filter(Boolean);
  let current = path.parse(absolute).root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    assert(!stat.isSymbolicLink(), 'symbolic links are unsupported');
    if (current !== path.resolve(absolute) || !file) assert(stat.isDirectory(), 'directory required');
    else assert(stat.isFile() && stat.nlink === 1, 'ordinary unlinked file required');
  }
}

/** Resolve filesystem aliases only after rejecting linked input paths. */
function physicalDirectory(absolute) {
  noLinks(absolute);
  const physical = fs.realpathSync.native(path.resolve(absolute));
  noLinks(physical);
  return physical;
}

function overlaps(a, b) {
  const rel = path.relative(a, b);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

function repositoryIdentity(value) {
  return value.trim().replace(/^git@github\.com:/i, '').replace(/^https:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase();
}

/** Git is used only for local metadata/blobs; filters and fsmonitor cannot execute source commands. */
function gitReader(root) {
  const options = { cwd: root, encoding: null, timeout: 15000, maxBuffer: MAX_BYTES,
    env: gitEnvironment() };
  const nullFile = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const base = ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false',
    '-c', 'core.excludesFile=' + nullFile, '-c', 'core.attributesFile=' + nullFile, '-c', 'submodule.recurse=false'];
  const config = execFileSync('git', [...base, 'config', '--no-includes', '--name-only', '--list'], options).toString('utf8');
  assert(!config.split(/\r?\n/).some(key => /^include(?:if\..+)?\.path$/i.test(key)), 'Git config includes are unsupported');
  const filters = [...new Set(config.split(/\r?\n/).filter(key => /^filter\..+\.(clean|smudge|process|required)$/i.test(key)))];
  assert(filters.length <= 128, 'too many Git filter settings');
  for (const key of filters) {
    assert(!/[\x00-\x20]/.test(key) && key.length <= 512, 'unsupported Git filter key');
    base.push('-c', key + (/\.required$/i.test(key) ? '=false' : '='));
    base.push('-c', key.replace(/\.(clean|smudge|process|required)$/i, '.required') + '=false');
  }
  return args => execFileSync('git', [...base, ...args], options);
}

function sourceSnapshot(root, commit, kind) {
  assert(typeof root === 'string' && path.isAbsolute(root), 'explicit absolute source root required');
  assert(/^[a-f0-9]{40}$/.test(commit ?? ''), 'exact 40-hex source commit required');
  root = physicalDirectory(root);
  const git = gitReader(root);
  const gitRoot = physicalDirectory(git(['rev-parse', '--show-toplevel']).toString().trim());
  assert(path.relative(root, gitRoot) === '', 'source must be repository root');
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), commit, 'source HEAD mismatch');
  assert(repositoryIdentity(git(['config', '--get', 'remote.origin.url']).toString()) === REPOSITORIES[kind].toLowerCase(), 'source origin mismatch');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']).length, 0, 'source checkout must be clean');
  // Use the canonical capability contracts from this exact clean source, then
  // bind their complete resource trees to committed Git blobs below. Adding
  // knowledge/cases must not leave a hardcoded old projection silently stale.
  const components = kind === 'kim'
    ? discoverComponents(root).filter(({ contract }) => ['agent', 'skill'].includes(contract.componentType))
    : [];
  if (kind === 'kim') assert(components.length > 0, 'no canonical agent/skill components');
  for (const component of components) assert.deepEqual(checkComponentMethod(path.join(root, component.path)), [], 'professional method resources or quality contract are incomplete');
  const assets = kind === 'kim' ? JSON.parse(git(['show', `${commit}:catalog.json`])).assets ?? [] : [];
  for (const asset of assets) assert(typeof asset.path === 'string' && /^docs\/images\/[^/\\]+\.(?:png|jpe?g|webp|gif|svg)$/iu.test(asset.path), 'invalid shared public asset path');
  const prefixes = kind === 'meta'
    ? ['LICENSE', 'NOTICE', ...AGENTS.map(id => `canonical/agents/${id}.md`), 'canonical/skills/meta-theory', 'config/contracts', ...META_RESOURCE_FILES]
    : ['LICENSE', 'NOTICE', ...components.map(component => component.path), ...assets.map(asset => asset.path)];
  const entries = git(['ls-tree', '-rz', commit, '--', ...prefixes]).toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
    assert(match, 'selected source must contain regular committed files');
    safeRelative(match[3]);
    noLinks(path.join(root, match[3]), true);
    return { mode: match[1], blob: match[2], path: match[3] };
  });
  assert(entries.length > 0 && entries.length <= 4096, 'selected source file count bound exceeded');
  const versionFile = kind === 'meta' ? 'package.json' : 'VERSION';
  const version = kind === 'meta' ? JSON.parse(git(['show', `${commit}:${versionFile}`])).version : git(['show', `${commit}:${versionFile}`]).toString().trim();
  if (kind === 'meta') assert(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-zA-Z0-9.-]+)?$/.test(version), 'invalid Meta package version');
  else assert(/^V(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), 'invalid Kim VERSION');
  const oids = [...new Set(entries.map(row => row.blob))];
  const payload = execFileSync('git', ['--no-optional-locks', 'cat-file', '--batch'], {
    cwd: root, input: oids.join('\n') + '\n', timeout: 15000, maxBuffer: MAX_BYTES,
    env: gitEnvironment()
  });
  const blobs = new Map();
  let cursor = 0;
  for (const oid of oids) {
    const end = payload.indexOf(10, cursor);
    const header = /^([a-f0-9]{40}) blob (\d+)$/.exec(payload.subarray(cursor, end).toString('ascii'));
    assert(header && header[1] === oid, 'invalid local Git blob response');
    const size = Number(header[2]);
    assert(size <= MAX_FILE_BYTES && end + 1 + size < payload.length, 'source size bound exceeded');
    blobs.set(oid, Buffer.from(payload.subarray(end + 1, end + 1 + size)));
    cursor = end + 1 + size + 1;
  }
  assert.equal(cursor, payload.length, 'unexpected Git blob bytes');
  const files = new Map(entries.map(row => [row.path, blobs.get(row.blob)]));
  for (const name of ['LICENSE', 'NOTICE']) assert(files.has(name), 'root license/notice missing');
  if (kind === 'meta') {
    for (const name of [...META_RESOURCE_FILES, 'canonical/skills/meta-theory/SKILL.md']) assert(files.has(name), 'Meta method source resource missing');
    assert([...files.keys()].some(name => name.startsWith('config/contracts/') && name.endsWith('.json')), 'Meta machine contract sources missing');
  }
  for (const component of components) {
    const prefix = component.path + '/';
    const committed = entries.filter(row => row.path.startsWith(prefix)).map(row => ({ relativePath: row.path.slice(prefix.length), contents: files.get(row.path) }));
    assert.equal(componentFilesSha256(committed), component.contentSha256, 'canonical component differs from its committed complete resource tree');
    for (const name of [component.entrypoint, 'capability.json', 'method.json', 'LICENSE', 'NOTICE']) assert(files.has(prefix + name), 'complete component source is missing a required file');
  }
  for (const asset of assets) assert(files.has(asset.path) && sha256(files.get(asset.path)) === asset.sha256, 'shared public asset is missing or has changed');
  return { root, commit, version, git, files, entries, components,
    metadata: { repository: `https://github.com/${REPOSITORIES[kind]}`, commit,
      tree: git(['rev-parse', `${commit}^{tree}`]).toString().trim(), version } };
}

/** Parse only the name/description forms used by the selected, committed Markdown entries. */
function frontmatter(bytes, expectedName) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
  assert(match, 'entrypoint frontmatter missing');
  const name = /^name:\s*([^\n]+)$/m.exec(match[1])?.[1].trim().replace(/^['"]|['"]$/g, '');
  assert.equal(name, expectedName, 'entrypoint name mismatch');
  assert(/^description:\s*\S/m.test(match[1]), 'entrypoint description missing');
  return `---\n${match[1]}\n---\n`;
}

const LIMITS_TEXT = 'Beta compatibility content only; not a formal Meta_Kim Zcode runtime. Packaging is not installation, native Agent invocation, automatic method-file reading, model compliance, tool permission or final acceptance. HookPrompt is deferred: no native Zcode Hook adapter. No Hooks, MCP, Commands, automatic script execution, downloads or dependency installation are registered. Reference scripts and tests are retained as inert source. Preserve existing user and project capabilities.';

/** Build only a fresh caller-named directory from exact, clean, explicitly downloaded Git sources. */
export function buildMarketplace({ metaRoot, metaCommit, kimRoot, kimCommit, outputRoot }) {
  assert(typeof outputRoot === 'string' && path.isAbsolute(outputRoot), 'explicit absolute output required');
  const requestedOutput = path.resolve(outputRoot);
  const parent = physicalDirectory(path.dirname(requestedOutput));
  const output = path.join(parent, path.basename(requestedOutput));
  assert(!fs.existsSync(output), 'output already exists; existing directories are never merged or replaced');
  try { fs.lstatSync(output); assert.fail('output already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sourceRoots = [metaRoot, kimRoot].map(root => {
    assert(typeof root === 'string' && path.isAbsolute(root), 'explicit absolute source required');
    return physicalDirectory(root);
  });
  for (const root of sourceRoots) {
    assert(!overlaps(root, output) && !overlaps(output, root), 'output must be separate from source roots');
  }
  const meta = sourceSnapshot(sourceRoots[0], metaCommit, 'meta'), kim = sourceSnapshot(sourceRoots[1], kimCommit, 'kim');
  const files = new Map(), copies = [], entrypoints = [], derivedEntrypoints = [];
  const add = (relative, bytes) => { safeRelative(relative); assert(!files.has(relative), 'duplicate output path'); files.set(relative, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)); };
  const copy = (source, sourcePath, destination) => {
    const bytes = source.files.get(sourcePath);
    assert(bytes, 'selected file missing');
    add(destination, bytes);
    copies.push({ source: source === meta ? 'meta' : 'kim', sourcePath, destination, bytes: bytes.length, sha256: sha256(bytes), gitBlob: source.entries.find(row => row.path === sourcePath).blob });
  };
  // Keep the original repository-relative hierarchy for all governance
  // documents and their contracts/registries. Native wrappers are explicit
  // navigation into this readable tree, never a substitute for the methods.
  for (const [relative] of meta.files) {
    copy(meta, relative, relative === 'LICENSE' || relative === 'NOTICE' ? `plugins/meta-kim-local/${relative}` : `plugins/meta-kim-local/source/${relative}`);
  }
  const metaLoader = (id, sourcePath, destination) => {
    const header = frontmatter(meta.files.get(sourcePath), id);
    const sourceRoot = path.posix.relative(path.posix.dirname(destination), 'plugins/meta-kim-local/source');
    const original = `${sourceRoot}/${sourcePath}`;
    const body = `\n# ${id}\n\nBefore responding or delegating, read the complete original method at \`${original}\`. This entry only locates that method; its professional/governance instructions are not replaced by this short loader.\n\nResolve repository-relative \`config/\` and \`canonical/\` paths against \`${sourceRoot}/\`. Resolve relative links inside an original file against that file's own directory. The source tree includes the complete meta-theory references, all nine governance roles, machine contracts and the reviewed public runtime/capability registries. Read the task-relevant facts before choosing a runtime or capability; missing source material remains an explicit blocker, never an assumed successful check.\n\nUse the current host's real tools, permissions and completion receipts. Governance roles do not implement business tasks themselves. Native Agent/Skill discovery does not prove model compliance, tool authority or final user acceptance.\n`;
    const bytes = Buffer.from(header + body);
    add(destination, bytes);
    derivedEntrypoints.push({ source: 'meta', sourcePath, sourceGitBlob: meta.entries.find(row => row.path === sourcePath).blob, destination, transform: 'explicit_complete_governance_source_loader_v1', originalPath: `plugins/meta-kim-local/source/${sourcePath}`, sourceRoot: 'plugins/meta-kim-local/source', bytes: bytes.length, sha256: sha256(bytes) });
  };
  for (const id of AGENTS) {
    metaLoader(id, `canonical/agents/${id}.md`, `plugins/meta-kim-local/agents/${id}.md`);
    entrypoints.push({ plugin: 'meta-kim-local', name: id, qualifiedName: `meta-kim-local:${id}`, path: `agents/${id}.md` });
  }
  metaLoader('meta-theory', 'canonical/skills/meta-theory/SKILL.md', 'plugins/meta-kim-local/skills/meta-theory/SKILL.md');
  for (const [relative] of kim.files) copy(kim, relative, relative.startsWith('agents/') ? `plugins/kim-service-local/components/${relative}` : `plugins/kim-service-local/${relative}`);
  const roles = kim.components.filter(component => component.contract.componentType === 'agent');
  const skills = kim.components.filter(component => component.contract.componentType === 'skill');
  for (const component of skills) frontmatter(kim.files.get(`${component.path}/${component.entrypoint}`), component.contract.id);
  for (const component of roles) {
    const id = component.contract.id;
    const sourcePath = `${component.path}/${component.entrypoint}`;
    frontmatter(kim.files.get(sourcePath), id);
    const destination = `plugins/kim-service-local/agents/${id}.md`;
    const methodPath = `${component.path}/method.json`;
    assert.equal(JSON.parse(kim.files.get(methodPath)).roleId, id, 'professional method role mismatch');
    const binding = `\n\n## Zcode package resource binding\n\nThis entry retains the original role instructions above. The complete original component is at ../components/${component.path}/ relative to this entry file. Resolve method.json, knowledgeAssets, examples, scripts and all relative links against that original component directory, including nested reference paths. Read ../components/${methodPath} and the capability contract before acting, then load only task-relevant knowledge and its outputChecks. Do not use another role's method or infer missing tools. The caller retains permissions, scheduling and final acceptance. This binding registers no additional tools.\n`;
    const bytes = Buffer.concat([kim.files.get(sourcePath), Buffer.from(binding)]);
    add(destination, bytes);
    derivedEntrypoints.push({ source: 'kim', sourcePath, sourceGitBlob: kim.entries.find(row => row.path === sourcePath).blob, destination, transform: 'append_explicit_component_method_binding_v2', methodPath: `plugins/kim-service-local/components/${methodPath}`, bytes: bytes.length, sha256: sha256(bytes) });
    entrypoints.push({ plugin: 'kim-service-local', name: id, qualifiedName: `kim-service-local:${id}`, path: `agents/${id}.md` });
  }
  const manifests = [
    { name: 'meta-kim-local', version: meta.version, description: 'Nine canonical governance agents and complete meta-theory; Beta content.', license: 'Apache-2.0', agents: './agents', skills: './skills' },
    { name: 'kim-service-local', version: kim.version.slice(1) + '.0', description: `${skills.length} complete skills and ${roles.length} professional role components; Beta content.`, license: 'MIT', agents: './agents', skills: './skills' }
  ];
  for (const manifest of manifests) {
    add(`plugins/${manifest.name}/.zcode-plugin/plugin.json`, jsonBytes(manifest));
    add(`plugins/${manifest.name}/README.md`, `# ${manifest.name}\n\n${LIMITS_TEXT}\n\nThe source manifest pins repository/commit and every copied file. Each original license and notice is retained. Root licenses do not replace component licenses.\n\nUse qualified agent names. Meta native entries load their original methods from source/canonical/; repository-relative config/ references resolve under source/. Complete Kim role components live in components/agents/. Each generated role entry explicitly binds its own component method and resource directory. Shared contact/payment images retain their original source paths and bytes. No automatic file reading or host tool binding is asserted.\n`);
  }
  add('marketplace.json', jsonBytes({ name: MARKETPLACE, description: 'Pinned Meta_Kim and Kim_Service Beta compatibility content.', plugins: manifests.map(m => ({ name: m.name, source: `./plugins/${m.name}`, version: m.version, description: m.description, strict: true })) }));
  copies.sort((a, b) => a.destination < b.destination ? -1 : a.destination > b.destination ? 1 : 0);
  add('source-manifest.json', jsonBytes({ schemaVersion: 1, kind: 'beta_compatibility_content_not_runtime_certification',
    meta: meta.metadata, kim: kim.metadata, officialPluginDocs: 'https://zcode.z.ai/en/docs/plugin',
    policy: { sourceBytes: 'committed_git_blobs', symlinks: 'rejected', hooks: 'not_registered', mcp: 'not_registered', commands: 'not_registered', hookPrompt: 'deferred_no_native_zcode_adapter', formalMetaZcodeProjection: false, sourceSelection: 'canonical_agent_skill_contracts_with_committed_complete_resources', installation: 'not_performed', nativeInvocation: 'not_performed' },
    entrypoints, files: copies, derivedEntrypoints }));
  add('README.md', `# Zcode Beta compatibility content\n\n${LIMITS_TEXT}\n\nMarketplace: ${MARKETPLACE}. Source copies: ${copies.length}; Generated native entrypoints: ${derivedEntrypoints.length}; Agent entrypoints: ${entrypoints.length}; Skill roots: ${skills.length + 1}. No third-party loader code, vendor path, credentials or personal installation receipt is included. See source-manifest.json, bundle-manifest.json and each component LICENSE/NOTICE. Official format documentation: https://zcode.z.ai/en/docs/plugin\n\nAfter checking hashes, keep this complete directory at a persistent location you own. Review with the official Zcode plugins validate command before registering it. Normal commands:\n\n    zcode plugins validate <persistent-marketplace-directory>\n    zcode plugins marketplace add <persistent-marketplace-directory> --scope user\n    zcode plugins install meta-kim-local@${MARKETPLACE} -s user\n    zcode plugins install kim-service-local@${MARKETPLACE} -s user\n    zcode plugins list --json\n\nThese are user actions, not actions performed by the builder. Preserve unrelated plugins/capabilities. For existing entries use the normal marketplace refresh and plugins update route. Confirm actual enabled content and qualified names separately; successful install is not native model/Agent acceptance.\n`);
  const closure = [...files].map(([relative, bytes]) => ({ path: relative, bytes: bytes.length, sha256: sha256(bytes) })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert(closure.reduce((n, row) => n + row.bytes, 0) <= MAX_BYTES, 'bundle size bound exceeded');
  const closureSha256 = sha256(jsonBytes(closure));
  const bundleManifest = jsonBytes({ schemaVersion: 1, scope: 'all_files_except_bundle_manifest_itself', closureSha256, files: closure });
  // Recheck both sources immediately before the first write; no input program is run.
  for (const source of [meta, kim]) {
    assert.equal(source.git(['rev-parse', 'HEAD']).toString().trim(), source.commit, 'source changed during build');
    assert.equal(source.git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']).length, 0, 'source changed during build');
  }
  noLinks(parent);
  fs.mkdirSync(output);
  for (const [relative, bytes] of files) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  fs.writeFileSync(path.join(output, 'bundle-manifest.json'), bundleManifest, { flag: 'wx' });
  return { closureSha256, manifestSha256: sha256(bundleManifest), files: files.size + 1, sourceCopies: copies.length, derivedEntrypoints: derivedEntrypoints.length, agentEntrypoints: entrypoints.length, skillRoots: skills.length + 1, installed: false, nativeInvocation: false };
}

function parseArguments(args) {
  const names = { '--meta-root': 'metaRoot', '--meta-commit': 'metaCommit', '--kim-root': 'kimRoot', '--kim-commit': 'kimCommit', '--output': 'outputRoot' };
  const result = {};
  assert.equal(args.length, 10, 'provide --meta-root --meta-commit --kim-root --kim-commit --output');
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i]];
    assert(key && !Object.hasOwn(result, key) && args[i + 1] && !args[i + 1].startsWith('--'), 'invalid or duplicate argument');
    result[key] = args[i + 1];
  }
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(buildMarketplace(parseArguments(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(`Marketplace build failed: ${error.message}`); process.exitCode = 1; }
}
