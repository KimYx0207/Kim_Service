import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { checkZcodeRelease } from './check-zcode-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'kim-zcode-release-check-')));
after(() => {
  assert.equal(path.dirname(scratch), fs.realpathSync.native(os.tmpdir()));
  assert(path.basename(scratch).startsWith('kim-zcode-release-check-'));
  fs.rmSync(scratch, { recursive: true, force: true });
});
let sequence = 0;
const ids = ['meta-kim-local', 'kim-service-local'];
const json = (target, data) => fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
function bundle(versions = ['3.6.2', '1.9.0']) {
  const directory = path.join(scratch, 'bundle-' + sequence++);
  fs.mkdirSync(directory);
  json(path.join(directory, 'marketplace.json'), { name: 'kim-local-reviewed', description: 'Reviewed Beta content.', plugins: ids.map((name, index) => ({ name, source: './plugins/' + name, version: versions[index], description: 'Reviewed plugin.', strict: true })) });
  for (const [index, id] of ids.entries()) {
    const plugin = path.join(directory, 'plugins', id);
    fs.mkdirSync(path.join(plugin, '.zcode-plugin'), { recursive: true });
    fs.mkdirSync(path.join(plugin, 'skills', 'fixture'), { recursive: true });
    json(path.join(plugin, '.zcode-plugin/plugin.json'), { name: id, version: versions[index], description: 'Reviewed plugin.', license: 'MIT', agents: './agents', skills: './skills' });
    fs.writeFileSync(path.join(plugin, 'skills/fixture/SKILL.md'), '# Reviewed skill\n');
    fs.writeFileSync(path.join(plugin, 'README.md'), '# Plugin usage\n');
  }
  json(path.join(directory, 'source-manifest.json'), { commit: 'a'.repeat(40) });
  json(path.join(directory, 'bundle-manifest.json'), { untrusted: 'not used as actual file evidence' });
  return directory;
}
const update = (directory, relative, content) => fs.writeFileSync(path.join(directory, relative), content);

test('changed Skill bytes require a newer plugin version even when declared hashes are unchanged', () => {
  const previousRoot = bundle(), candidateRoot = bundle();
  update(candidateRoot, 'plugins/kim-service-local/skills/fixture/SKILL.md', '# Changed skill\n');
  assert.throws(() => checkZcodeRelease({ candidateRoot, previousRoot }), /kim-service-local: consumer payload changed without a newer plugin version/);
});

test('wrapper, sidecar, added file and removed file are all consumer payload changes', () => {
  const previousRoot = bundle();
  for (const change of ['readme', 'sidecar', 'add', 'remove']) {
    const candidateRoot = bundle();
    if (change === 'readme') update(candidateRoot, 'plugins/meta-kim-local/README.md', '# Changed wrapper\n');
    if (change === 'sidecar') update(candidateRoot, 'plugins/meta-kim-local/sidecar.json', '{}\n');
    if (change === 'add') update(candidateRoot, 'plugins/meta-kim-local/new.md', '# Added\n');
    if (change === 'remove') fs.unlinkSync(path.join(candidateRoot, 'plugins/meta-kim-local/README.md'));
    assert.throws(() => checkZcodeRelease({ candidateRoot, previousRoot }), /consumer payload changed without a newer plugin version/, change);
  }
});

test('proper numeric version increase permits changed content and unchanged plugins stay reusable', () => {
  const previousRoot = bundle(), candidateRoot = bundle(['3.6.2', '1.10.0']);
  update(candidateRoot, 'plugins/kim-service-local/skills/fixture/SKILL.md', '# Changed skill\n');
  const result = checkZcodeRelease({ candidateRoot, previousRoot });
  assert.equal(result.ok, true);
  assert.deepEqual(result.plugins.map(row => row.decision), ['unchanged', 'version_increased']);
  assert.equal(result.published, false);
  assert.equal(result.baselineAuthenticity, 'caller_must_verify_public_release');
});

test('identical rebuild and root commit/tree metadata-only change permit the same plugin versions', () => {
  const previousRoot = bundle(), candidateRoot = bundle();
  assert(checkZcodeRelease({ candidateRoot, previousRoot }).plugins.every(row => row.decision === 'unchanged'));
  json(path.join(candidateRoot, 'source-manifest.json'), { commit: 'b'.repeat(40), tree: 'c'.repeat(40) });
  json(path.join(candidateRoot, 'bundle-manifest.json'), { changed: 'root provenance only' });
  assert(checkZcodeRelease({ candidateRoot, previousRoot }).plugins.every(row => row.decision === 'unchanged'));
});

test('rollback and invalid or mismatched versions refuse publication inputs', () => {
  const previousRoot = bundle();
  assert.throws(() => checkZcodeRelease({ candidateRoot: bundle(['3.6.1', '1.9.0']), previousRoot }), /version rollback/);
  const candidateRoot = bundle();
  const market = JSON.parse(fs.readFileSync(path.join(candidateRoot, 'marketplace.json')));
  market.plugins[1].version = '1.10.0';
  json(path.join(candidateRoot, 'marketplace.json'), market);
  assert.throws(() => checkZcodeRelease({ candidateRoot, previousRoot }), /marketplace and plugin versions differ/);
  for (const invalid of ['1.09.0', '1.9', '1.9.0-hash_abc']) {
    assert.throws(() => checkZcodeRelease({ candidateRoot: bundle(['3.6.2', invalid]), initial: true }), /invalid plugin semantic version/);
  }
});

test('SemVer prerelease ordering is numeric, releases follow prereleases and build metadata cannot evade the guard', () => {
  const previousRoot = bundle(['3.6.2-rc.9', '1.9.0']);
  assert.equal(checkZcodeRelease({ candidateRoot: bundle(['3.6.2-rc.10', '1.9.0']), previousRoot }).plugins[0].decision, 'version_increased');
  assert.equal(checkZcodeRelease({ candidateRoot: bundle(['3.6.2', '1.9.0']), previousRoot }).plugins[0].decision, 'version_increased');
  assert.throws(() => checkZcodeRelease({ candidateRoot: bundle(['3.6.2+new', '1.9.0']), previousRoot: bundle(['3.6.2+old', '1.9.0']) }), /consumer payload changed without a newer plugin version/);
});

test('first publication is explicit and cannot be combined with a previous baseline', () => {
  const candidateRoot = bundle();
  assert.throws(() => checkZcodeRelease({ candidateRoot }), /provide a previous public bundle or explicitly select initial publication/);
  assert.throws(() => checkZcodeRelease({ candidateRoot, previousRoot: bundle(), initial: true }), /initial publication cannot include a previous bundle/);
  assert.equal(checkZcodeRelease({ candidateRoot, initial: true }).mode, 'initial_publication_input_check');
  assert.throws(() => checkZcodeRelease({ candidateRoot, initial: true, expectedKimVersion: '1.10.0' }), /candidate Kim plugin does not match repository VERSION/);
});

test('unexpected plugin identities, external source paths and linked or non-regular payloads refuse', () => {
  for (const field of ['name', 'source']) {
    const candidateRoot = bundle();
    const market = JSON.parse(fs.readFileSync(path.join(candidateRoot, 'marketplace.json')));
    market.plugins[0][field] = field === 'name' ? 'unknown-plugin' : '../outside';
    json(path.join(candidateRoot, 'marketplace.json'), market);
    assert.throws(() => checkZcodeRelease({ candidateRoot, initial: true }), /reviewed plugin identities|plugin source must stay/);
  }
  const candidateRoot = bundle();
  fs.linkSync(path.join(candidateRoot, 'plugins/meta-kim-local/README.md'), path.join(candidateRoot, 'plugins/meta-kim-local/linked.md'));
  assert.throws(() => checkZcodeRelease({ candidateRoot, initial: true }), /links and non-regular files are forbidden/);
});

test('marketplace source overrides, cross-market dependencies and non-strict entries cannot evade payload binding', () => {
  for (const [scope, field, value] of [
    ['root', 'pluginRoot', '../outside'],
    ['root', 'allowCrossMarketplaceDependenciesOn', ['unknown-marketplace']],
    ['entry', 'dependencies', ['unknown-plugin']],
    ['entry', 'strict', false]
  ]) {
    const candidateRoot = bundle();
    const market = JSON.parse(fs.readFileSync(path.join(candidateRoot, 'marketplace.json')));
    (scope === 'root' ? market : market.plugins[0])[field] = value;
    json(path.join(candidateRoot, 'marketplace.json'), market);
    assert.throws(() => checkZcodeRelease({ candidateRoot, initial: true }), /fields must match the reviewed/);
  }
  const candidateRoot = bundle();
  const manifestPath = path.join(candidateRoot, 'plugins/meta-kim-local/.zcode-plugin/plugin.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));
  manifest.agents = '../../outside';
  json(manifestPath, manifest);
  assert.throws(() => checkZcodeRelease({ candidateRoot, initial: true }), /reviewed local agents and skills format/);
});

test('the standalone CLI requires explicit publication mode and returns input evidence only', () => {
  const candidateRoot = bundle();
  const cli = path.join(root, 'scripts/check-zcode-release.mjs');
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(run(['--candidate', candidateRoot]).status, 1);
  const accepted = run(['--candidate', candidateRoot, '--initial']);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(JSON.parse(accepted.stdout).published, false);
});

test('normal release gate checks Beta payloads and source-only checks are explicitly separate', () => {
  const checkout = path.join(scratch, 'release-checkout');
  const git = args => execFileSync('git', ['-c', 'core.hooksPath=' + path.join(scratch, 'no-hooks'), '-c', 'commit.gpgsign=false', ...args], { cwd: checkout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  // The public tree is portable; a Windows worktree's .git pointer is not a Linux Git repository.
  fs.cpSync(root, checkout, { recursive: true, filter: source => path.relative(root, source).split(path.sep)[0] !== '.git' });
  git(['-c', 'init.templateDir=', 'init', '-q', '-b', 'main']);
  git(['remote', 'add', 'origin', 'https://github.com/KimYx0207/Kim_Service.git']);
  git(['config', 'user.name', 'Fixture']);
  git(['config', 'user.email', 'fixture@example.invalid']);
  for (const filename of ['check-repository.mjs', 'check-zcode-release.mjs']) fs.copyFileSync(path.join(root, 'scripts', filename), path.join(checkout, 'scripts', filename));
  git(['add', '--all']);
  git(['commit', '--allow-empty', '-qm', 'fixture release gate']);
  const run = args => spawnSync(process.execPath, [path.join(checkout, 'scripts/check-repository.mjs'), '--release', ...args], { cwd: checkout, encoding: 'utf8', timeout: 30000 });
  const missing = run([]);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /release requires --zcode-candidate or explicit --source-only/);
  const noBaseline = run(['--zcode-candidate', bundle()]);
  assert.equal(noBaseline.status, 1);
  assert.match(noBaseline.stderr, /provide a previous public bundle or explicitly select initial publication/);
  const conflicting = run(['--source-only', '--zcode-candidate', bundle(), '--zcode-initial']);
  assert.equal(conflicting.status, 1);
  assert.match(conflicting.stderr, /--source-only cannot include Zcode asset arguments/);
  const previousRoot = bundle(), candidateRoot = bundle();
  update(candidateRoot, 'plugins/kim-service-local/README.md', '# Changed wrapper\n');
  const rejected = run(['--zcode-candidate', candidateRoot, '--zcode-previous', previousRoot]);
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /consumer payload changed without a newer plugin version/);
  const bumped = run(['--zcode-candidate', bundle(['3.6.2', '1.9.0']), '--zcode-previous', bundle(['3.6.2', '1.8.0'])]);
  assert.equal(bumped.status, 0, bumped.stderr);
  assert.match(bumped.stdout, /Zcode publication input check passed/);
  const initial = run(['--zcode-candidate', bundle(), '--zcode-initial']);
  assert.equal(initial.status, 0, initial.stderr);
  const sourceOnly = run(['--source-only']);
  assert.equal(sourceOnly.status, 0, sourceOnly.stderr);
  assert.match(sourceOnly.stdout, /source-only; Zcode assets not checked/);
});
