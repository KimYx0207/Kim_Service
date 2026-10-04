import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildCapabilityIndex,
  discoverComponents,
  serializeCapabilityIndex,
  writeOutputAtomically
} from './capability-catalog.mjs';

const SCRIPT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'capability-catalog.mjs');
const SCHEMA_PATH = path.join(path.dirname(SCRIPT_PATH), '..', 'schemas', 'capability.schema.json');

function temporaryRepository(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-capability-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function baseContract(id, componentType, capabilityId = `${id}-run`) {
  return {
    schemaVersion: 1,
    id,
    componentType,
    componentVersion: '1.2.0-rc.1',
    entrypoint: 'index.mjs',
    capabilities: [
      {
        id: capabilityId,
        summary: `Run the ${id} capability.`,
        useWhen: ['The requested task matches this capability.'],
        doNotUseWhen: ['The requested task is outside this capability.'],
        input: {
          type: 'object',
          properties: {},
          required: []
        },
        output: {
          type: 'object',
          properties: {},
          required: []
        },
        permissions: [],
        sideEffects: [],
        humanGate: {
          required: false,
          when: []
        },
        validation: ['tests/check.mjs']
      }
    ]
  };
}

function addComponent(root, group, id, options = {}) {
  const componentRoot = path.join(root, group, id);
  fs.mkdirSync(path.join(componentRoot, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(componentRoot, 'index.mjs'), 'export default true;\n');
  fs.writeFileSync(path.join(componentRoot, 'tests', 'check.mjs'), 'process.exitCode = 0;\n');
  const componentType = options.componentType ?? {
    hooks: 'hook',
    skills: 'skill',
    agents: 'agent',
    apps: 'app',
    tools: 'tool'
  }[group];
  const contract = options.contract ?? baseContract(id, componentType, options.capabilityId);
  fs.writeFileSync(path.join(componentRoot, 'capability.json'), JSON.stringify(contract, null, 2) + '\n');
  return { componentRoot, contract };
}

function rewriteContract(componentRoot, contract) {
  fs.writeFileSync(path.join(componentRoot, 'capability.json'), JSON.stringify(contract, null, 2) + '\n');
}

test('discovers a newly added component directory, including tool components', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'reader');
  const before = buildCapabilityIndex(root);
  assert.equal(before.componentCount, 1);

  addComponent(root, 'tools', 'ccg');
  const after = buildCapabilityIndex(root);
  assert.equal(after.componentCount, 2);
  assert.equal(after.capabilityCount, 2);
  assert.deepEqual(after.components.map((component) => component.path), ['skills/reader', 'tools/ccg']);
  assert.equal(after.components[1].componentType, 'tool');
});

test('build output is byte-for-byte deterministic', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'tools', 'zeta');
  addComponent(root, 'hooks', 'alpha');
  const first = serializeCapabilityIndex(buildCapabilityIndex(root));
  const second = serializeCapabilityIndex(buildCapabilityIndex(root));
  assert.equal(first, second);
  assert.match(first, /"contentSha256": "[0-9a-f]{64}"/);
  assert.match(first, /"contractSha256": "[0-9a-f]{64}"/);
});

test('optional local invocation is validated in the package and omitted from the index', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'local-scan');
  fs.mkdirSync(path.join(componentRoot, 'scripts'));
  fs.writeFileSync(path.join(componentRoot, 'scripts', 'scan.py'), 'print("synthetic")\n');
  const invocation = { schemaVersion: 1, type: 'local_cli', runtime: 'python', entrypoint: 'scripts/scan.py', argv: ['--input-json', '-'], inputTransport: 'stdin_json', outputTransport: 'stdout_json', shell: false };
  contract.capabilities[0].invocation = invocation;
  rewriteContract(componentRoot, contract);
  assert.equal(Object.hasOwn(buildCapabilityIndex(root).capabilities[0], 'invocation'), false);
  for (const change of [{ shell: true }, { entrypoint: '../outside.py' }, { entrypoint: 'scripts/missing.py' }, { argv: ['--autofix'] }, { executable: 'arbitrary' }]) {
    contract.capabilities[0].invocation = { ...invocation, ...change };
    rewriteContract(componentRoot, contract);
    assert.throws(() => discoverComponents(root), /invocation/);
  }
});

test('helper contract references survive discovery without granting agent invocation', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'agents', 'reader');
  fs.writeFileSync(path.join(componentRoot, 'helper.json'), '{}\n');
  contract.capabilities[0].helperContract = 'helper.json';
  rewriteContract(componentRoot, contract);
  const capability = buildCapabilityIndex(root).capabilities[0];
  assert.equal(capability.helperContract, 'helper.json');
  assert.equal(Object.hasOwn(capability, 'invocation'), false);
  assert.deepEqual(capability.permissions, []);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH));
  assert.equal(schema.$defs.capability.properties.helperContract.$ref, '#/$defs/relativeFile');
  for (const invalid of ['../outside.json', '/absolute.json', 'missing.json', 'index.mjs']) {
    contract.capabilities[0].helperContract = invalid;
    rewriteContract(componentRoot, contract);
    assert.throws(() => buildCapabilityIndex(root), /helperContract/);
  }
});

test('helper references normalize separators for consumers while retaining raw contract identity', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'agents', 'reader');
  fs.mkdirSync(path.join(componentRoot, 'contracts'));
  fs.writeFileSync(path.join(componentRoot, 'contracts/helper.json'), '{"fixture":true}\n');
  const hashes = [];
  for (const reference of ['contracts/helper.json', 'contracts\\helper.json']) {
    contract.capabilities[0].helperContract = reference;
    rewriteContract(componentRoot, contract);
    const index = buildCapabilityIndex(root);
    const capability = index.capabilities[0];
    assert.equal(capability.helperContract, 'contracts/helper.json');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, capability.componentPath, capability.helperContract))), { fixture: true });
    assert.equal(discoverComponents(root)[0].contract.capabilities[0].helperContract, reference);
    hashes.push(capability.contractSha256);
  }
  assert.notEqual(hashes[0], hashes[1], 'normalized projection must not rewrite the source contract hash');
});

test('ordinary catalog and generated index discover the real supplier helper and execute supplied quotes', () => {
  const root = path.resolve(path.dirname(SCRIPT_PATH), '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json')));
  const generated = JSON.parse(fs.readFileSync(path.join(root, 'generated/capabilities.json')));
  const indexed = generated.capabilities.find((entry) => entry.id === 'supplier-comparison-analyze');
  const component = catalog.components.find((entry) => entry.id === indexed.componentId);
  const contract = JSON.parse(fs.readFileSync(path.join(root, component.path, 'capability.json')));
  const canonical = contract.capabilities.find((entry) => entry.id === indexed.id);
  assert.equal(indexed.helperContract, canonical.helperContract);
  assert.ok(indexed.helperContract, 'ordinary discovery must expose the helper reference');
  const tool = JSON.parse(fs.readFileSync(path.join(root, component.path, indexed.helperContract)));
  assert.equal(tool.componentId, component.id);
  const input = fs.readFileSync(path.join(root, component.path, 'tests/fixtures/normal.json'), 'utf8');
  const child = spawnSync(process.platform === 'win32' ? 'python' : 'python3',
    ['-I', '-B', path.join(root, component.path, tool.invocation.entrypoint), ...tool.invocation.argv],
    { input, encoding: 'utf8', shell: false, timeout: 10000 });
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  const receipt = JSON.parse(child.stdout);
  assert.equal(receipt.tool, tool.id);
  assert.deepEqual(receipt.normalizedQuotes.map((quote) => quote.landedTotal), ['335', '275']);
  assert.equal(receipt.networkUsed, false); assert.equal(receipt.filesModified, false);
});

test('ordinary catalog and generated index discover the existing store helper and calculate supplied rows', () => {
  const root = path.resolve(path.dirname(SCRIPT_PATH), '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'catalog.json')));
  const generated = JSON.parse(fs.readFileSync(path.join(root, 'generated/capabilities.json')));
  const indexed = generated.capabilities.find((entry) => entry.id === 'store-performance-analyst-assist');
  const component = catalog.components.find((entry) => entry.id === indexed.componentId);
  const capability = JSON.parse(fs.readFileSync(path.join(root, component.path, 'capability.json'))).capabilities[0];
  assert.equal(indexed.helperContract, capability.helperContract);
  assert.equal(indexed.helperContract, 'calculation-tool.json');
  assert.equal(Object.hasOwn(indexed, 'invocation'), false);
  assert.deepEqual(indexed.input.required, ['metrics']);
  assert.deepEqual(indexed.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(indexed.sideEffects, []);
  const tool = JSON.parse(fs.readFileSync(path.join(root, component.path, indexed.helperContract)));
  assert.equal(tool.componentId, component.id);
  const input = fs.readFileSync(path.join(root, component.path, 'fixtures/normal.json'), 'utf8');
  const child = spawnSync(process.platform === 'win32' ? 'python' : 'python3',
    ['-I', '-B', path.join(root, component.path, tool.invocation.entrypoint), ...tool.invocation.argv],
    { input, encoding: 'utf8', shell: false, timeout: 10000 });
  assert.ifError(child.error); assert.equal(child.status, 0, child.stderr);
  const receipt = JSON.parse(child.stdout);
  assert.equal(receipt.tool, tool.id); assert.equal(receipt.version, tool.toolVersion);
  assert.deepEqual(receipt.calculationTable.map((row) => row.metrics.netRevenue), ['450', '220']);
  assert.equal(receipt.networkUsed, false); assert.equal(receipt.filesModified, false);
});

test('rejects duplicate component ids across component groups', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'shared', { capabilityId: 'shared-skill' });
  addComponent(root, 'tools', 'shared', { capabilityId: 'shared-tool' });
  assert.throws(() => discoverComponents(root), /Duplicate component id: shared/);
});

test('rejects duplicate capability ids globally', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'first', { capabilityId: 'shared-run' });
  addComponent(root, 'hooks', 'second', { capabilityId: 'shared-run' });
  assert.throws(() => discoverComponents(root), /Duplicate capability id: shared-run/);
});

test('rejects a component directory without capability.json', (t) => {
  const root = temporaryRepository(t);
  fs.mkdirSync(path.join(root, 'skills', 'missing-contract'), { recursive: true });
  assert.throws(() => discoverComponents(root), /Missing capability\.json: skills\/missing-contract/);
});

test('rejects missing required contract fields', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'incomplete');
  delete contract.capabilities[0].permissions;
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /permissions must be an array/);
});

test('rejects a capability without a non-empty summary', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'missing-summary');
  delete contract.capabilities[0].summary;
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /summary must be a non-empty string/);
});

test('schema and runtime both reject whitespace-only contract text', (t) => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const nonEmptyPattern = new RegExp(schema.$defs.nonEmptyString.pattern);
  assert.equal(nonEmptyPattern.test('   \t'), false);
  assert.equal(nonEmptyPattern.test(' useful '), true);

  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'blank-text');
  contract.capabilities[0].summary = '   ';
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /summary must be a non-empty string/);
});

test('schema and runtime require non-empty input.required entries', (t) => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  assert.equal(schema.$defs.ioSchema.required.includes('required'), true);
  assert.equal(schema.$defs.ioSchema.properties.required.items.$ref, '#/$defs/nonEmptyString');

  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'blank-required');
  contract.capabilities[0].input.required = ['   '];
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /input\.required entries must be non-empty strings/);
});

test('schema and runtime reject ambiguous relative paths', (t) => {
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const relativeFilePattern = new RegExp(schema.$defs.relativeFile.pattern);
  for (const invalidPath of ['   ', './index.mjs', 'tests//check.mjs', '../outside.mjs', '/absolute.mjs', 'C:\\absolute.mjs']) {
    assert.equal(relativeFilePattern.test(invalidPath), false, invalidPath);
  }
  assert.equal(relativeFilePattern.test('tests/check.mjs'), true);

  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'ambiguous-path');
  contract.entrypoint = './index.mjs';
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /entrypoint must not contain empty, current, or parent segments/);
});

test('requires human gate reasons when a gate is required', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'tools', 'dangerous');
  contract.capabilities[0].humanGate = { required: true, when: [] };
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /humanGate\.when must contain at least 1 item/);
});

test('rejects a missing entrypoint file', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'missing-entry');
  contract.entrypoint = 'does-not-exist.mjs';
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /entrypoint does not exist/);
});

test('rejects validation paths that escape the component', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'escape');
  fs.writeFileSync(path.join(root, 'outside.mjs'), 'process.exitCode = 0;\n');
  contract.capabilities[0].validation = ['../../outside.mjs'];
  rewriteContract(componentRoot, contract);
  assert.throws(() => discoverComponents(root), /must not contain empty, current, or parent segments/);
});

test('keeps per-capability validation while deriving a deterministic component validation union', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'tools', 'multi');
  fs.writeFileSync(path.join(componentRoot, 'tests', 'other.mjs'), 'process.exitCode = 0;\n');
  contract.capabilities[0].validation = ['tests/check.mjs'];
  contract.capabilities.push({
    ...structuredClone(contract.capabilities[0]),
    id: 'multi-other',
    summary: 'Run the other multi capability.',
    validation: ['tests/other.mjs']
  });
  rewriteContract(componentRoot, contract);

  const index = buildCapabilityIndex(root);
  assert.deepEqual(index.components[0].validation, ['tests/check.mjs', 'tests/other.mjs']);
  const validationByCapability = Object.fromEntries(
    index.capabilities.map((item) => [item.id, item.validation])
  );
  assert.deepEqual(validationByCapability, {
    'multi-other': ['tests/other.mjs'],
    'multi-run': ['tests/check.mjs']
  });
  assert.equal(index.capabilities[0].contractSha256, index.capabilities[1].contractSha256);
  assert.equal(index.components[0].contractSha256, index.capabilities[0].contractSha256);
});

test('rejects symlinks or junctions anywhere in a component tree', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot } = addComponent(root, 'tools', 'linked');
  const target = path.join(root, 'link-target');
  fs.mkdirSync(target);
  try {
    fs.symlinkSync(target, path.join(componentRoot, 'linked-directory'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
      t.skip(`This environment cannot create a test symlink or junction: ${error.code}`);
      return;
    }
    throw error;
  }
  assert.throws(() => discoverComponents(root), /symlink or junction/);
});

test('check detects byte-level freshness drift without Git', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'fresh');
  const output = path.join(root, 'generated', 'capabilities.json');
  const build = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);

  const fresh = spawnSync(process.execPath, [SCRIPT_PATH, 'check', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(fresh.status, 0, fresh.stderr);

  fs.appendFileSync(output, 'drift\n');
  const stale = spawnSync(process.execPath, [SCRIPT_PATH, 'check', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /Capability index is stale/);
});

test('build only writes the fixed generated index inside the repository', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'safe-output');

  const outsideOutput = path.join(path.dirname(root), `${path.basename(root)}-outside.json`);
  const outside = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', outsideOutput], { encoding: 'utf8' });
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /fixed repository path/);
  assert.equal(fs.existsSync(outsideOutput), false);

  const componentOutput = path.join(root, 'skills', 'safe-output', 'generated', 'capabilities.json');
  const insideComponent = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', componentOutput], { encoding: 'utf8' });
  assert.equal(insideComponent.status, 1);
  assert.match(insideComponent.stderr, /fixed repository path/);
  assert.equal(fs.existsSync(componentOutput), false);
});

test('build rejects a symlink or junction at the fixed generated directory', (t) => {
  const root = temporaryRepository(t);
  addComponent(root, 'skills', 'linked-output');
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-output-target-'));
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  try {
    fs.symlinkSync(target, path.join(root, 'generated'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
      t.skip(`This environment cannot create a test symlink or junction: ${error.code}`);
      return;
    }
    throw error;
  }

  const output = path.join(root, 'generated', 'capabilities.json');
  const build = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(build.status, 1);
  assert.match(build.stderr, /must be a real repository directory/);
  assert.equal(fs.existsSync(path.join(target, 'capabilities.json')), false);
});

test('generation failure preserves the previous generated index', (t) => {
  const root = temporaryRepository(t);
  const { componentRoot, contract } = addComponent(root, 'skills', 'preserved');
  const output = path.join(root, 'generated', 'capabilities.json');
  const firstBuild = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(firstBuild.status, 0, firstBuild.stderr);
  const previousBytes = fs.readFileSync(output);

  contract.capabilities[0].validation = [];
  rewriteContract(componentRoot, contract);
  const failedBuild = spawnSync(process.execPath, [SCRIPT_PATH, 'build', '--root', root, '--output', output], { encoding: 'utf8' });
  assert.equal(failedBuild.status, 1);
  assert.match(failedBuild.stderr, /validation must contain at least 1 item/);
  assert.deepEqual(fs.readFileSync(output), previousBytes);
});

test('atomic rename failure preserves the old file and removes the temporary file', (t) => {
  const root = temporaryRepository(t);
  const outputDirectory = path.join(root, 'generated');
  const output = path.join(outputDirectory, 'capabilities.json');
  fs.mkdirSync(outputDirectory);
  fs.writeFileSync(output, 'old index\n');

  assert.throws(
    () => writeOutputAtomically(output, 'new index\n', { renameSync: () => { throw new Error('injected rename failure'); } }),
    /injected rename failure/
  );
  assert.equal(fs.readFileSync(output, 'utf8'), 'old index\n');
  assert.deepEqual(fs.readdirSync(outputDirectory), ['capabilities.json']);
});

test('atomic output replaces an existing generated index', (t) => {
  const root = temporaryRepository(t);
  const outputDirectory = path.join(root, 'generated');
  const output = path.join(outputDirectory, 'capabilities.json');
  fs.mkdirSync(outputDirectory);
  fs.writeFileSync(output, 'old index\n');

  writeOutputAtomically(output, 'new index\n');
  assert.equal(fs.readFileSync(output, 'utf8'), 'new index\n');
  assert.deepEqual(fs.readdirSync(outputDirectory), ['capabilities.json']);
});
