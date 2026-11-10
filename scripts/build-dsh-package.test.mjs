import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { discoverComponents } from './capability-catalog.mjs';
import { buildDshFiles, writeDshPackage } from './build-dsh-package.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// macOS exposes os.tmpdir() beneath /var -> /private/var. Fixtures use the
// physical root so ordinary tests reach their subject; explicit link tests
// below still exercise the production refusal of linked source/output paths.
const TEMP_ROOT = fs.realpathSync.native(os.tmpdir());
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function resourceParts(files, indexPath) {
  const index = JSON.parse(files.get(indexPath));
  const dir = path.posix.dirname(indexPath);
  const parts = index.parts ?? index.pages.flatMap((page) => {
    const bytes = files.get(`${dir}/${page.path}`); assert.equal(sha(bytes), page.sha256);
    return JSON.parse(bytes).parts;
  });
  return parts.map((part) => ({ ...part, file: `${dir}/${part.path}` }));
}
function fixture(t) {
  const temp = fs.mkdtempSync(path.join(TEMP_ROOT, 'service-dsh-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const root = path.join(temp, 'source');
  fs.mkdirSync(root);
  for (const item of ['agents/frontend-engineer', 'skills/find-skill', 'LICENSE', 'NOTICE']) {
    fs.mkdirSync(path.dirname(path.join(root, item)), { recursive: true });
    fs.cpSync(path.join(ROOT, item), path.join(root, item), { recursive: true });
  }
  return { temp, root, output: path.join(temp, 'bundle') };
}

test('every catalogue agent/skill has a complete native loader and matching method bytes', () => {
  const { files, manifest } = buildDshFiles();
  const components = discoverComponents(ROOT).filter(({ contract }) => ['agent', 'skill'].includes(contract.componentType));
  assert.equal(manifest.componentCount, components.length);
  assert.equal(manifest.skillCount, components.length + 1);
  assert.equal(manifest.nativeCustomAgentPresets, false);
  assert.equal(manifest.nativeHookEnforcement, false);
  for (const component of manifest.components) {
    const base = `skills/${component.skill}`;
    const entry = files.get(`${base}/SKILL.md`).toString('utf8');
    assert.match(entry, new RegExp(`name: ${component.skill}\\n`, 'u'));
    assert.ok(entry.replace(/^---\n[\s\S]*?\n---\n/u, '').length <= 6000);
    const method = JSON.parse(files.get(`${base}/method.json`));
    const original = path.posix.normalize(`${base}/${method.original}`);
    const parts = resourceParts(files, path.posix.normalize(`${base}/${method.partsIndex}`)).map((part) => {
      const bytes = files.get(part.file);
      assert.equal(sha(bytes), part.sha256);
      assert.ok(bytes.toString('utf8').length <= 6000);
      return bytes;
    });
    assert.deepEqual(Buffer.concat(parts), files.get(original));
    assert.equal(sha(Buffer.concat(parts)), method.sourceSha256);
    assert.ok(files.has(path.posix.normalize(`${base}/${method.capabilityContract}`)));
    for (const key of ['capabilityContractIndex', 'componentMethodIndex']) {
      if (!method[key]) continue;
      const indexPath = path.posix.normalize(`${base}/${method[key]}`);
      const assembled = Buffer.concat(resourceParts(files, indexPath).map((part) => files.get(part.file)));
      assert.deepEqual(assembled, files.get(indexPath.replace(/\.dsh-parts\/index\.json$/u, '')));
      assert.doesNotThrow(() => JSON.parse(assembled));
    }
  }
  for (const file of manifest.files) {
    assert.equal(files.get(file.path).length, file.size);
    assert.equal(sha(files.get(file.path)), file.sha256);
  }
  assert.ok(files.has('skills/kim-service/source/LICENSE'));
  assert.ok(files.has('skills/kim-service/source/NOTICE'));
});

test('shared contact and payment image links resolve inside the generated package with original bytes', () => {
  const { files } = buildDshFiles();
  const assets = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'))).assets;
  for (const asset of assets) {
    const generated = `skills/kim-service/source/${asset.path}`;
    assert.deepEqual(files.get(generated), fs.readFileSync(path.join(ROOT, asset.path)));
    assert.equal(sha(files.get(generated)), asset.sha256);
  }
  let sharedLinks = 0;
  for (const [file, bytes] of files) {
    if (!/^skills\/kim-service\/source\/skills\/[^/]+\/README\.md$/u.test(file)) continue;
    for (const [, source] of bytes.toString('utf8').matchAll(/<img\b[^>]*\bsrc="(\.\.\/\.\.\/docs\/images\/[^"]+)"/gu)) {
      sharedLinks += 1;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), source));
      assert.ok(files.has(target), `${file}: missing shared image ${source}`);
    }
  }
  assert.ok(sharedLinks > 0, 'exercise real skills that share canonical public images');
});

test('shared public assets reject missing files, changed bytes and unsafe source paths', (t) => {
  const opts = fixture(t);
  const assetPath = 'docs/images/contact.png';
  const target = path.join(opts.root, assetPath);
  const contents = Buffer.from('original public image');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  const catalogPath = path.join(opts.root, 'catalog.json');
  const write = (value) => fs.writeFileSync(catalogPath, JSON.stringify({ assets: value }));
  write([{ path: assetPath, sha256: sha(contents) }]);
  assert.ok(buildDshFiles(opts.root).files.has(`skills/kim-service/source/${assetPath}`));
  fs.writeFileSync(target, 'changed image');
  assert.throws(() => buildDshFiles(opts.root), /asset hash differs/u);
  fs.unlinkSync(target);
  assert.throws(() => buildDshFiles(opts.root), /ENOENT/u);
  write([{ path: '../outside.png', sha256: sha(contents) }]);
  assert.throws(() => buildDshFiles(opts.root), /Invalid shared public asset path/u);
});

test('new canonical components are discovered without editing a fixed role list', (t) => {
  const opts = fixture(t);
  const before = buildDshFiles(opts.root);
  const target = path.join(opts.root, 'agents/new-method');
  fs.cpSync(path.join(opts.root, 'agents/frontend-engineer'), target, { recursive: true });
  const contractPath = path.join(target, 'capability.json');
  const contract = JSON.parse(fs.readFileSync(contractPath));
  contract.id = 'new-method';
  contract.capabilities = contract.capabilities.map((item, index) => ({ ...item, id: `new-method-${index}` }));
  fs.writeFileSync(contractPath, JSON.stringify(contract));
  const after = buildDshFiles(opts.root);
  assert.equal(after.manifest.componentCount, before.manifest.componentCount + 1);
  assert.ok(after.files.has('skills/kim-new-method/SKILL.md'));
});

test('resource trees and long Unicode methods are preserved with original link bases', (t) => {
  const opts = fixture(t);
  const original = path.join(opts.root, 'agents/frontend-engineer/AGENT.md');
  fs.appendFileSync(original, '\n' + 'x'.repeat(5999) + '😀界'.repeat(5000) + '\nTAIL\n');
  const data = Buffer.from([0, 255, 13, 10, 99]);
  fs.mkdirSync(path.join(opts.root, 'agents/frontend-engineer/assets'), { recursive: true });
  fs.writeFileSync(path.join(opts.root, 'agents/frontend-engineer/assets/fixture.bin'), data);
  const { files } = buildDshFiles(opts.root);
  assert.deepEqual(files.get('skills/kim-service/source/agents/frontend-engineer/assets/fixture.bin'), data);
  const method = JSON.parse(files.get('skills/kim-frontend-engineer/method.json'));
  const actual = Buffer.concat(resourceParts(files, path.posix.normalize(`skills/kim-frontend-engineer/${method.partsIndex}`)).map((part) => files.get(part.file)));
  assert.deepEqual(actual, fs.readFileSync(original));
  assert.match(files.get('skills/kim-frontend-engineer/SKILL.md').toString(), /original source file's directory/u);
});

test('long JSON rule files keep outputChecks and bounded indexes instead of truncated contracts', (t) => {
  const opts = fixture(t);
  const original = Buffer.from(JSON.stringify({ knowledge: '🧭专业知识'.repeat(10000), outputChecks: ['must review the final criterion'] }));
  fs.writeFileSync(path.join(opts.root, 'agents/frontend-engineer/long-rules.json'), original);
  const { files } = buildDshFiles(opts.root);
  const indexPath = 'skills/kim-service/source/agents/frontend-engineer/long-rules.json.dsh-parts/index.json';
  const parts = resourceParts(files, indexPath);
  const bytes = Buffer.concat(parts.map((part) => files.get(part.file)));
  assert.deepEqual(bytes, original);
  assert.deepEqual(JSON.parse(bytes).outputChecks, ['must review the final criterion']);
  for (const [file, content] of files) {
    if (/\.dsh-parts\/\d+\.(?:md|txt)$/u.test(file)) {
      const text = content.toString('utf8');
      assert.ok(text.length <= 6000); assert.ok(text.split('\n').length <= 121);
      assert.ok(text.split('\n').every((line) => line.length <= 1500));
    }
    if (/\.dsh-parts\/index(?:-\d+)?\.json$/u.test(file)) assert.ok(content.toString('utf8').length <= 5000);
  }
});

test('long executable validators have lossless readable views and unchanged runnable sources', (t) => {
  const opts = fixture(t);
  const source = Buffer.from(`${'# Checked source context\n'.repeat(700)}raise ValueError('reject incomplete acceptance')\n`);
  const script = path.join(opts.root, 'agents/frontend-engineer/scripts/verify.py');
  fs.mkdirSync(path.dirname(script), { recursive: true }); fs.writeFileSync(script, source);
  const { files } = buildDshFiles(opts.root);
  const original = 'skills/kim-service/source/agents/frontend-engineer/scripts/verify.py';
  const parts = resourceParts(files, `${original}.dsh-parts/index.json`);
  assert.ok(parts.length > 1);
  assert.deepEqual(files.get(original), source);
  assert.deepEqual(Buffer.concat(parts.map((part) => files.get(part.file))), source);
  assert.match(files.get(parts.at(-1).file).toString('utf8'), /reject incomplete acceptance/u);
  assert.match(files.get('skills/kim-frontend-engineer/SKILL.md').toString('utf8'), /Run the unchanged original script/u);
});

test('build is deterministic, closure checking catches drift and rebuild never removes output', (t) => {
  const opts = fixture(t);
  const built = writeDshPackage(opts);
  assert.equal(built.status, 'built_package');
  assert.equal(built.nativeExecutionVerified, false);
  assert.equal(writeDshPackage({ ...opts, check: true }).status, 'verified_package');
  assert.throws(() => writeDshPackage(opts), /already exists/u);
  const entry = path.join(opts.output, 'skills/kim-frontend-engineer/SKILL.md');
  fs.appendFileSync(entry, '\nuser change\n');
  assert.throws(() => writeDshPackage({ ...opts, check: true }), /stale or changed/u);
  assert.match(fs.readFileSync(entry, 'utf8'), /user change/u);
  fs.writeFileSync(path.join(opts.output, 'unlisted.txt'), 'extra');
  assert.throws(() => writeDshPackage({ ...opts, check: true }), /closure differs/u);
});

test('source, output and ancestor links are refused', (t) => {
  const opts = fixture(t);
  const other = path.join(opts.temp, 'other'); fs.mkdirSync(other);
  const linked = path.join(opts.temp, 'linked');
  fs.symlinkSync(other, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => writeDshPackage({ ...opts, output: path.join(linked, 'new') }), /links or junctions/u);
  assert.deepEqual(fs.readdirSync(other), []);
  fs.symlinkSync(path.join(opts.root, 'LICENSE'), path.join(opts.root, 'agents/frontend-engineer/leak.txt'));
  assert.throws(() => buildDshFiles(opts.root), /symlink|link/iu);
});
