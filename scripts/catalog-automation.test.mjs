import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildCatalogArtifacts,
  checkCatalogArtifacts,
  GENERATED_CAPABILITIES_RELATIVE_PATH
} from './catalog-automation.mjs';

function temporaryRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-catalog-automation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'catalog.json'), JSON.stringify({
    schemaVersion: 2,
    repository: 'KimYx0207/Kim_Service',
    componentCount: 1,
    release: { branch: 'main' },
    components: [{
      id: 'old-skill',
      kind: 'skill',
      path: 'skills/old-skill',
      source: 'https://example.test/old-skill',
      revision: 'recorded-revision',
      snapshot: 'recorded-snapshot',
      contentSha256: '0'.repeat(64),
      required: ['README.md'],
      validation: []
    }],
    assets: [],
    readmeLayout: { schemaVersion: 1 }
  }, null, 2) + '\n');
  return root;
}

function addComponent(root, group, id, validation = 'tests/check.mjs') {
  const componentRoot = path.join(root, group, id);
  fs.mkdirSync(path.dirname(path.join(componentRoot, validation)), { recursive: true });
  fs.writeFileSync(path.join(componentRoot, 'SKILL.md'), '# Skill\n');
  fs.writeFileSync(path.join(componentRoot, validation), 'process.exitCode = 0;\n');
  fs.writeFileSync(path.join(componentRoot, 'capability.json'), JSON.stringify({
    schemaVersion: 1,
    id,
    componentType: group === 'tools' ? 'tool' : 'skill',
    componentVersion: '1.2.3',
    entrypoint: 'SKILL.md',
    capabilities: [{
      id: `${id}-run`,
      summary: `Run ${id}.`,
      useWhen: ['The task matches.'],
      doNotUseWhen: ['The task does not match.'],
      input: { type: 'object', required: [] },
      output: { type: 'object', required: [] },
      permissions: [],
      sideEffects: [],
      humanGate: { required: false, when: [] },
      validation: [validation]
    }]
  }, null, 2) + '\n');
}

test('build preserves existing release provenance and derives component fields', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'old-skill');
  const { catalog } = buildCatalogArtifacts(root);
  assert.equal(catalog.release.branch, 'main');
  assert.equal(catalog.components[0].source, 'https://example.test/old-skill');
  assert.equal(catalog.components[0].revision, 'recorded-revision');
  assert.equal(catalog.components[0].snapshot, 'recorded-snapshot');
  assert.equal(catalog.components[0].version, '1.2.3');
  assert.match(catalog.components[0].contentSha256, /^[0-9a-f]{64}$/);
  assert.match(catalog.components[0].contractSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(catalog.components[0].validation, ['node tests/check.mjs']);
  assert.deepEqual(catalog.components[0].required, [
    'README.md', 'capability.json', 'SKILL.md', 'tests/check.mjs'
  ]);
  assert.equal(fs.existsSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH)), true);
});

test('new tool needs no root catalog entry and receives explicit pending provenance', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'old-skill');
  buildCatalogArtifacts(root);
  addComponent(root, 'tools', 'new-tool');
  const { catalog, capabilityIndex } = buildCatalogArtifacts(root);
  assert.equal(catalog.componentCount, 2);
  assert.equal(capabilityIndex.componentCount, 2);
  const tool = catalog.components.find((component) => component.id === 'new-tool');
  assert.equal(tool.kind, 'tool');
  assert.equal(tool.source, 'canonical:tools/new-tool');
  assert.match(tool.revision, /^pending-local:[0-9a-f]{64}$/);
  assert.equal(tool.snapshot, 'capability-contract-pending-release');
  assert.deepEqual(tool.required, ['capability.json', 'SKILL.md', 'tests/check.mjs']);
});

test('check detects component and generated-index freshness drift', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'old-skill');
  buildCatalogArtifacts(root);
  assert.doesNotThrow(() => checkCatalogArtifacts(root));

  fs.appendFileSync(path.join(root, 'skills', 'old-skill', 'SKILL.md'), 'drift\n');
  assert.throws(() => checkCatalogArtifacts(root), /Derived catalog fields are stale/);
  buildCatalogArtifacts(root);

  fs.appendFileSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH), 'drift\n');
  assert.throws(() => checkCatalogArtifacts(root), /Generated capability index is stale/);
});

test('invalid contract leaves both previous outputs untouched', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'old-skill');
  buildCatalogArtifacts(root);
  const catalogBefore = fs.readFileSync(path.join(root, 'catalog.json'));
  const generatedBefore = fs.readFileSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH));
  const contractPath = path.join(root, 'skills', 'old-skill', 'capability.json');
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  contract.capabilities[0].validation = [];
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2) + '\n');

  assert.throws(() => buildCatalogArtifacts(root), /validation must contain at least 1 item/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'catalog.json')), catalogBefore);
  assert.deepEqual(fs.readFileSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH)), generatedBefore);
});

test('legacy validation command output rejects shell metacharacters', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'old-skill', 'tests/check;second-command.mjs');
  assert.throws(
    () => buildCatalogArtifacts(root),
    /Validation path is incompatible with the legacy command field/
  );
  assert.equal(fs.existsSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH)), false);
});

test('build fails closed when a previously cataloged component disappears', (t) => {
  const root = temporaryRepository(t);
  assert.throws(
    () => buildCatalogArtifacts(root),
    /previously published component missing from discovery: old-skill/
  );
  assert.equal(fs.existsSync(path.join(root, GENERATED_CAPABILITIES_RELATIVE_PATH)), false);
});
