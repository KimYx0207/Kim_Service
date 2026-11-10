import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { before, after } from 'node:test';
import { AGENTS, META_RESOURCE_FILES, buildMarketplace, safeRelative, sha256 } from './build-zcode-marketplace.mjs';
import { checkZcodeRelease } from './check-zcode-release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = ['goalpro', 'find-skill'];
const ROLES = ['frontend-engineer', 'workplace-writer'];
const META_FILES = ['LICENSE', 'NOTICE', ...AGENTS.map(id => `canonical/agents/${id}.md`), 'canonical/skills/meta-theory/SKILL.md', 'canonical/skills/meta-theory/references/current-method.md', 'config/contracts/fixture.json', ...META_RESOURCE_FILES];
let scratch, metaRoot, kimRoot, sequence = 0;
const git = (root, args) => execFileSync('git', ['-c', 'core.hooksPath=' + path.join(scratch, 'no-hooks'), '-c', 'commit.gpgsign=false', ...args], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function commit(root) { git(root, ['add', '--all']); git(root, ['commit', '-qm', 'fixture source']); }
function fixture(kind, files) {
  const root = path.join(scratch, kind);
  fs.mkdirSync(root);
  git(root, ['-c', 'init.templateDir=', 'init', '-q']);
  git(root, ['config', 'user.name', 'Fixture']);
  git(root, ['config', 'user.email', 'fixture@example.invalid']);
  git(root, ['config', 'core.autocrlf', 'false']);
  git(root, ['remote', 'add', 'origin', `https://github.com/KimYx0207/${kind === 'meta' ? 'Meta_Kim' : 'Kim_Service'}.git`]);
  for (const file of files) {
    let text = 'Fixture source; retained, never executed.\n';
    if (file.endsWith('AGENT.md') || file.startsWith('canonical/agents/')) {
      const id = file.startsWith('canonical/') ? path.basename(file, '.md') : file.split('/')[1];
      text = `---\nname: ${id}\ndescription: Fixture role.\n---\n# Fixture\n`;
    } else if (file.endsWith('SKILL.md')) text = `---\nname: ${file.split('/').at(-2)}\ndescription: Fixture skill.\n---\n# Fixture\n`;
    else if (file.startsWith('agents/') && file.endsWith('/method.json')) text = JSON.stringify({ roleId: file.split('/')[1] }) + '\n';
    else if (file.endsWith('.gitattributes')) text = '*.md text eol=lf\n';
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  }
  fs.writeFileSync(path.join(root, kind === 'meta' ? 'package.json' : 'VERSION'), kind === 'meta' ? '{"version":"3.6.2"}\n' : 'V1.9\n');
  commit(root);
  return root;
}
before(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-zcode-public-'));
  metaRoot = fixture('meta', META_FILES);
  kimRoot = fixture('kim', ['LICENSE', 'NOTICE']);
  for (const item of [...ROLES.map(id => `agents/${id}`), ...SKILLS.map(id => `skills/${id}`), 'docs/images']) {
    fs.mkdirSync(path.dirname(path.join(kimRoot, item)), { recursive: true });
    fs.cpSync(path.join(ROOT, item), path.join(kimRoot, item), { recursive: true });
  }
  fs.writeFileSync(path.join(kimRoot, 'catalog.json'), JSON.stringify({ assets: JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'))).assets }));
  commit(kimRoot);
});
after(() => {
  assert(path.resolve(scratch).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(scratch).startsWith('kim-service-zcode-public-'));
  fs.rmSync(scratch, { recursive: true, force: true });
});
const options = () => ({ metaRoot, kimRoot, metaCommit: git(metaRoot, ['rev-parse', 'HEAD']).trim(), kimCommit: git(kimRoot, ['rev-parse', 'HEAD']).trim(), outputRoot: path.join(scratch, `output-${sequence++}`) });
const readJson = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
function walk(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(root, prefix + e.name + '/') : [prefix + e.name]);
}

test('fresh deterministic bundle copies exact committed payloads, licenses and only selected entrypoints', () => {
  const first = options(), second = options();
  const a = buildMarketplace(first), b = buildMarketplace(second);
  assert.equal(a.closureSha256, b.closureSha256);
  assert.ok(a.sourceCopies > META_FILES.length + ROLES.length);
  assert.equal(a.agentEntrypoints, AGENTS.length + ROLES.length);
  assert.equal(a.derivedEntrypoints, ROLES.length + AGENTS.length + 1);
  assert.equal(a.skillRoots, SKILLS.length + 1);
  assert.equal(a.installed, false);
  assert.equal(a.nativeInvocation, false);
  const manifest = readJson(first.outputRoot, 'source-manifest.json');
  assert.equal(manifest.meta.commit, first.metaCommit);
  assert.equal(manifest.kim.commit, first.kimCommit);
  assert.equal(manifest.kim.repository, 'https://github.com/KimYx0207/Kim_Service');
  for (const row of manifest.files) {
    const bytes = fs.readFileSync(path.join(first.outputRoot, row.destination));
    const sourceRoot = row.source === 'meta' ? metaRoot : kimRoot;
    const original = execFileSync('git', ['cat-file', 'blob', row.gitBlob], { cwd: sourceRoot });
    assert(bytes.equals(original), row.destination);
    assert.equal(bytes.length, row.bytes);
    assert.equal(sha256(bytes), row.sha256);
  }
  assert.deepEqual(walk(path.join(first.outputRoot, 'plugins/meta-kim-local/agents')).sort(), AGENTS.map(id => id + '.md').sort());
  for (const sourcePath of [...META_RESOURCE_FILES, 'config/contracts/fixture.json']) assert.equal(fs.readFileSync(path.join(first.outputRoot, 'plugins/meta-kim-local/source', sourcePath), 'utf8'), fs.readFileSync(path.join(metaRoot, sourcePath), 'utf8'));
  assert.deepEqual(walk(path.join(first.outputRoot, 'plugins/kim-service-local/agents')).sort(), ROLES.map(id => id + '.md').sort());
  for (const row of manifest.derivedEntrypoints) {
    const bytes = fs.readFileSync(path.join(first.outputRoot, row.destination));
    const original = execFileSync('git', ['cat-file', 'blob', row.sourceGitBlob], { cwd: row.source === 'meta' ? metaRoot : kimRoot });
    if (row.source === 'kim') assert(bytes.subarray(0, original.length).equals(original));
    else { assert.deepEqual(fs.readFileSync(path.join(first.outputRoot, row.originalPath)), original); assert.match(bytes.toString(), /Resolve repository-relative/); }
    assert.equal(sha256(bytes), row.sha256);
    assert.equal(bytes.length, row.bytes);
    if (row.source === 'kim') {
      assert.match(bytes.toString(), /Resolve method.json, knowledgeAssets/);
      assert.equal(JSON.parse(fs.readFileSync(path.join(first.outputRoot, row.methodPath))).roleId, row.sourcePath.split('/')[1]);
    }
    assert(!manifest.files.some(source => source.destination === row.destination), 'derived entry must not claim byte-identical Git copy');
  }
  for (const id of ROLES) for (const file of ['AGENT.md', 'LICENSE', 'NOTICE', 'capability.json']) assert(fs.existsSync(path.join(first.outputRoot, 'plugins/kim-service-local/components/agents', id, file)));
  assert(!fs.existsSync(path.join(first.outputRoot, 'plugins/kim-service-local/agents/method.json')), 'roles use their own bound method, not a shared frontend sidecar');
  for (const asset of readJson(kimRoot, 'catalog.json').assets) assert.equal(sha256(fs.readFileSync(path.join(first.outputRoot, 'plugins/kim-service-local', asset.path))), asset.sha256);
  for (const id of SKILLS) assert(fs.existsSync(path.join(first.outputRoot, 'plugins/kim-service-local/skills', id, 'SKILL.md')));
  const closure = readJson(first.outputRoot, 'bundle-manifest.json');
  assert.deepEqual(walk(first.outputRoot).filter(f => f !== 'bundle-manifest.json').sort(), closure.files.map(f => f.path).sort());
  assert.equal(sha256(Buffer.from(JSON.stringify(closure.files, null, 2) + '\n')), closure.closureSha256);
  for (const row of closure.files) {
    const bytes = fs.readFileSync(path.join(first.outputRoot, row.path));
    assert.equal(bytes.length, row.bytes, row.path);
    assert.equal(sha256(bytes), row.sha256, row.path);
  }
});

test('metadata preserves update IDs and has no executable registrations or private loader/home data', () => {
  const opts = options(); buildMarketplace(opts);
  const market = readJson(opts.outputRoot, 'marketplace.json');
  assert.equal(market.name, 'kim-local-reviewed');
  assert.deepEqual(market.plugins.map(p => p.name), ['meta-kim-local', 'kim-service-local']);
  assert.equal(market.plugins[1].version, '1.9.0');
  for (const id of ['meta-kim-local', 'kim-service-local']) {
    const plugin = readJson(opts.outputRoot, `plugins/${id}/.zcode-plugin/plugin.json`);
    assert.deepEqual(Object.keys(plugin).sort(), ['agents', 'description', 'license', 'name', 'skills', 'version']);
    assert.equal(plugin.agents, './agents'); assert.equal(plugin.skills, './skills');
  }
  const source = readJson(opts.outputRoot, 'source-manifest.json');
  assert.equal(source.policy.formalMetaZcodeProjection, false);
  assert.equal(source.policy.hookPrompt, 'deferred_no_native_zcode_adapter');
  for (const file of ['source-manifest.json', 'marketplace.json', 'README.md']) {
    const text = fs.readFileSync(path.join(opts.outputRoot, file), 'utf8');
    assert(!text.includes(scratch));
    assert(!/boundedSource|Program Files|vendorPath|\.codex\/worktrees/.test(text));
  }
  assert(!fs.existsSync(path.join(opts.outputRoot, 'loader-static-evidence.json')));
});

test('existing output and unknown files are preserved without merging or deletion', () => {
  const opts = options(); fs.mkdirSync(opts.outputRoot); fs.writeFileSync(path.join(opts.outputRoot, 'user.txt'), 'keep');
  assert.throws(() => buildMarketplace(opts), /already exists/);
  assert.equal(fs.readFileSync(path.join(opts.outputRoot, 'user.txt'), 'utf8'), 'keep');
  assert.deepEqual(fs.readdirSync(opts.outputRoot), ['user.txt']);
});

test('wrong commit/origin or dirty source refuses before creating output', () => {
  let opts = options(); opts.metaCommit = '0'.repeat(40);
  assert.throws(() => buildMarketplace(opts), /HEAD mismatch/); assert(!fs.existsSync(opts.outputRoot));
  git(kimRoot, ['remote', 'set-url', 'origin', 'https://example.invalid/untrusted.git']);
  try { opts = options(); assert.throws(() => buildMarketplace(opts), /origin mismatch/); assert(!fs.existsSync(opts.outputRoot)); }
  finally { git(kimRoot, ['remote', 'set-url', 'origin', 'https://github.com/KimYx0207/Kim_Service.git']); }
  const unknown = path.join(kimRoot, 'user.txt'); fs.writeFileSync(unknown, 'unknown source file');
  try { opts = options(); assert.throws(() => buildMarketplace(opts), /must be clean/); assert(!fs.existsSync(opts.outputRoot)); assert.equal(fs.readFileSync(unknown, 'utf8'), 'unknown source file'); }
  finally { fs.unlinkSync(unknown); }
});

test('CLI rejects a credential-bearing origin without disclosing placeholder credentials', () => {
  const username = 'fake-origin-user';
  const token = 'FAKE_ORIGIN_TOKEN_NOT_A_SECRET_20261022';
  const origin = `https://${username}:${token}@github.com/KimYx0207/Kim_Service.git`;
  git(kimRoot, ['remote', 'set-url', 'origin', origin]);
  try {
    const opts = options();
    const cli = spawnSync(process.execPath, [fileURLToPath(new URL('./build-zcode-marketplace.mjs', import.meta.url)),
      '--meta-root', opts.metaRoot, '--meta-commit', opts.metaCommit, '--kim-root', opts.kimRoot,
      '--kim-commit', opts.kimCommit, '--output', opts.outputRoot], {
      encoding: 'utf8', shell: false, timeout: 30000, maxBuffer: 1048576
    });
    assert.equal(cli.error, undefined);
    assert.equal(cli.signal, null);
    assert.equal(cli.status, 1);
    assert.equal(cli.stdout, '');
    const output = cli.stdout + cli.stderr;
    for (const privateValue of [username, token, origin]) assert(!output.includes(privateValue), 'CLI disclosed a placeholder origin credential');
    assert.equal(cli.stderr.trim(), 'Marketplace build failed: source origin mismatch');
    assert(!fs.existsSync(opts.outputRoot));
  } finally { git(kimRoot, ['remote', 'set-url', 'origin', 'https://github.com/KimYx0207/Kim_Service.git']); }
});

test('ambiguous output paths, output/source overlap and missing parents are refused', () => {
  for (const value of ['../escape', '/absolute', 'a\\b', 'C:/home', 'a//b', 'a/../b', 'NUL.txt', 'a./b', 'a /b']) assert.throws(() => safeRelative(value));
  for (const outputRoot of [path.join(kimRoot, 'dist'), scratch, path.join(scratch, 'missing', 'output')]) assert.throws(() => buildMarketplace({ ...options(), outputRoot }));
});

test('Git filters cannot execute source commands during clean checks', () => {
  const sentinel = path.join(scratch, 'filter-executed');
  const script = path.join(scratch, 'filter.cjs');
  fs.writeFileSync(script, `require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'executed');process.stdin.pipe(process.stdout);`);
  git(kimRoot, ['config', 'filter.probe.clean', '"' + process.execPath + '" "' + script + '"']);
  git(kimRoot, ['config', 'filter.probe.process', '"' + process.execPath + '" "' + script + '"']);
  fs.mkdirSync(path.join(kimRoot, '.git/info'), { recursive: true });
  fs.writeFileSync(path.join(kimRoot, '.git/info/attributes'), '*.md filter=probe\n');
  try { buildMarketplace(options()); assert(!fs.existsSync(sentinel)); }
  finally { fs.unlinkSync(path.join(kimRoot, '.git/info/attributes')); git(kimRoot, ['config', '--remove-section', 'filter.probe']); }
});

test('symlink output parent is refused without touching its target', t => {
  const target = path.join(scratch, 'link-target'), alias = path.join(scratch, 'alias'); fs.mkdirSync(target);
  try { fs.symlinkSync(target, alias, 'junction'); }
  catch (error) { if (['EPERM', 'EACCES'].includes(error.code)) return t.skip('symlink creation unavailable'); throw error; }
  assert.throws(() => buildMarketplace({ ...options(), outputRoot: path.join(alias, 'output') }), /symbolic/);
  assert.deepEqual(fs.readdirSync(target), []);
  const sourceAlias = path.join(scratch, 'meta-alias');
  fs.symlinkSync(metaRoot, sourceAlias, 'junction');
  assert.throws(() => buildMarketplace({ ...options(), metaRoot: sourceAlias }), /symbolic/);
});

test('hardlinked selected source files cannot enter a generated bundle', () => {
  const original = path.join(kimRoot, 'agents/frontend-engineer/README.md');
  const alias = path.join(scratch, 'hardlink');
  fs.linkSync(original, alias);
  try {
    const opts = options();
    assert.throws(() => buildMarketplace(opts), /ordinary unlinked file/);
    assert(!fs.existsSync(opts.outputRoot));
    assert.equal(fs.lstatSync(alias).nlink, 2);
  } finally { fs.unlinkSync(alias); }
});

test('committed new knowledge and canonical roles are included with their complete resource trees', () => {
  const extra = path.join(kimRoot, 'agents/frontend-engineer/references/new-knowledge.md');
  fs.writeFileSync(extra, 'New reviewed knowledge in this explicitly selected commit.');
  const newRole = path.join(kimRoot, 'agents/business-finance-analyst');
  fs.cpSync(path.join(ROOT, 'agents/business-finance-analyst'), newRole, { recursive: true });
  commit(kimRoot);
  try {
    const opts = options(); const result = buildMarketplace(opts);
    assert.equal(result.agentEntrypoints, AGENTS.length + ROLES.length + 1);
    assert.equal(fs.readFileSync(path.join(opts.outputRoot, 'plugins/kim-service-local/components/agents/frontend-engineer/references/new-knowledge.md'), 'utf8'), fs.readFileSync(extra, 'utf8'));
    assert(fs.existsSync(path.join(opts.outputRoot, 'plugins/kim-service-local/agents/business-finance-analyst.md')));
    const method = readJson(opts.outputRoot, 'plugins/kim-service-local/components/agents/business-finance-analyst/method.json');
    for (const asset of method.knowledgeAssets) assert(fs.existsSync(path.join(opts.outputRoot, 'plugins/kim-service-local/components/agents/business-finance-analyst', asset.path)));
  } finally { fs.unlinkSync(extra); fs.rmSync(newRole, { recursive: true }); commit(kimRoot); }
});

test('committed missing professional knowledge fails before packaging rather than hiding a broken source', () => {
  const file = path.join(kimRoot, 'agents/frontend-engineer/references/professional-method.md');
  const original = fs.readFileSync(file);
  fs.unlinkSync(file); commit(kimRoot);
  try {
    const opts = options();
    assert.throws(() => buildMarketplace(opts), /professional method resources or quality contract are incomplete/u);
    assert(!fs.existsSync(opts.outputRoot));
  } finally { fs.writeFileSync(file, original); commit(kimRoot); }
});

test('missing public Meta registries fail before output and unselected private config stays excluded', () => {
  const file = path.join(metaRoot, META_RESOURCE_FILES[0]);
  const original = fs.readFileSync(file);
  fs.unlinkSync(file); commit(metaRoot);
  try {
    const opts = options(); assert.throws(() => buildMarketplace(opts), /Meta method source resource missing/u);
    assert(!fs.existsSync(opts.outputRoot));
  } finally { fs.writeFileSync(file, original); commit(metaRoot); }
  const privatePath = path.join(metaRoot, 'config/private-local-settings.json');
  fs.writeFileSync(privatePath, '{"fixture":"not included"}'); commit(metaRoot);
  try {
    const opts = options(); buildMarketplace(opts);
    assert(!walk(opts.outputRoot).some(file => file.includes('private-local-settings')));
  } finally { fs.unlinkSync(privatePath); commit(metaRoot); }
});

test('Windows physical root aliases work without weakening output overlap checks', { skip: process.platform !== 'win32' }, () => {
  const alias = value => value.replace(/[a-zA-Z]/g, c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase());
  const opts = options();
  const aliased = { ...opts, metaRoot: alias(metaRoot), kimRoot: alias(kimRoot), outputRoot: alias(opts.outputRoot) };
  assert.notEqual(aliased.metaRoot, metaRoot);
  assert.equal(fs.realpathSync.native(aliased.metaRoot), fs.realpathSync.native(metaRoot));
  assert.equal(fs.realpathSync.native(aliased.kimRoot), fs.realpathSync.native(kimRoot));
  assert(!fs.lstatSync(aliased.metaRoot).isSymbolicLink());
  const result = buildMarketplace(aliased);
  assert.ok(result.sourceCopies > META_FILES.length + ROLES.length);
  assert(fs.existsSync(path.join(opts.outputRoot, 'bundle-manifest.json')));
  assert.equal(readJson(opts.outputRoot, 'source-manifest.json').meta.commit, opts.metaCommit);
  const overlap = path.join(aliased.metaRoot, 'new-output');
  assert.throws(() => buildMarketplace({ ...aliased, outputRoot: overlap }), /separate from source roots/);
  assert(!fs.existsSync(overlap));
  const wrongRoot = path.join(aliased.metaRoot, 'canonical');
  const wrongOutput = options().outputRoot;
  assert.throws(() => buildMarketplace({ ...aliased, metaRoot: wrongRoot, outputRoot: wrongOutput }), /repository root/);
  assert(!fs.existsSync(wrongOutput));
});

test('real builder candidates with changed Skill bytes and unchanged versions are blocked only at publication', () => {
  const previous = options(); buildMarketplace(previous);
  const skillPath = path.join(kimRoot, 'skills/goalpro/SKILL.md');
  const original = fs.readFileSync(skillPath);
  try {
    fs.appendFileSync(skillPath, '\nReviewed fixture change without a release version bump.\n');
    commit(kimRoot);
    const candidate = options(); buildMarketplace(candidate);
    for (const directory of [previous.outputRoot, candidate.outputRoot]) {
      assert.equal(readJson(directory, 'plugins/kim-service-local/.zcode-plugin/plugin.json').version, '1.9.0');
      assert.equal(readJson(directory, 'marketplace.json').plugins[1].version, '1.9.0');
    }
    assert.notEqual(readJson(previous.outputRoot, 'source-manifest.json').kim.commit, readJson(candidate.outputRoot, 'source-manifest.json').kim.commit);
    assert.throws(() => checkZcodeRelease({ candidateRoot: candidate.outputRoot, previousRoot: previous.outputRoot }), /kim-service-local: consumer payload changed without a newer plugin version/);
  } finally {
    fs.writeFileSync(skillPath, original);
    commit(kimRoot);
  }
  const restored = options(); buildMarketplace(restored);
  assert.notEqual(restored.kimCommit, previous.kimCommit);
  assert(checkZcodeRelease({ candidateRoot: restored.outputRoot, previousRoot: previous.outputRoot }).plugins.every(plugin => plugin.decision === 'unchanged'));
});
