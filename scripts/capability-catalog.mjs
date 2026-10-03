#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const GROUP_TYPES = Object.freeze({
  hooks: 'hook',
  skills: 'skill',
  agents: 'agent',
  apps: 'app',
  tools: 'tool'
});
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const INDEX_SCHEMA_VERSION = 1;
const CONTRACT_SCHEMA_VERSION = 1;
const GENERATED_INDEX_RELATIVE_PATH = path.join('generated', 'capabilities.json');
const NON_EMPTY_TEXT_PATTERN = /\S/;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableClone(value) {
  if (Array.isArray(value)) return value.map(stableClone);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort(compareText).map((key) => [key, stableClone(value[key])])
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableClone(value), null, 2) + '\n';
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    assert(allowed.includes(key), `${label} contains unsupported field: ${key}`);
  }
}

function assertObject(value, label) {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
}

function assertId(value, label) {
  assert(typeof value === 'string' && ID_PATTERN.test(value), `${label} must be a lowercase kebab-case id`);
}

function assertStringArray(value, label, { minItems = 0 } = {}) {
  assert(Array.isArray(value), `${label} must be an array`);
  assert(value.length >= minItems, `${label} must contain at least ${minItems} item(s)`);
  const seen = new Set();
  for (const item of value) {
    assert(typeof item === 'string' && NON_EMPTY_TEXT_PATTERN.test(item), `${label} entries must be non-empty strings`);
    assert(!seen.has(item), `${label} entries must be unique: ${item}`);
    seen.add(item);
  }
}

function assertIoSchema(value, label) {
  assertObject(value, label);
  assert(value.type === 'object', `${label}.type must be object`);
  assertStringArray(value.required, `${label}.required`);
}

function assertRelativeFileSyntax(value, label) {
  assert(typeof value === 'string' && NON_EMPTY_TEXT_PATTERN.test(value), `${label} must be a relative file path`);
  assert(!path.isAbsolute(value) && !/^[A-Za-z]:/.test(value) && !value.startsWith('\\\\'), `${label} must not be absolute: ${value}`);
  const segments = value.replaceAll('\\', '/').split('/');
  assert(segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..'), `${label} must not contain empty, current, or parent segments: ${value}`);
  return segments;
}

function assertHumanGate(value, label) {
  assertObject(value, label);
  assertExactKeys(value, ['required', 'when'], label);
  assert(typeof value.required === 'boolean', `${label}.required must be a boolean`);
  assertStringArray(value.when, `${label}.when`, { minItems: value.required ? 1 : 0 });
}

function assertInvocation(value, label) {
  assertObject(value, label);
  assertExactKeys(value, ['schemaVersion', 'type', 'runtime', 'entrypoint', 'argv', 'inputTransport', 'outputTransport', 'shell'], label);
  assert(value.schemaVersion === 1 && value.type === 'local_cli' && value.runtime === 'python', `${label} must describe a version-1 local Python CLI`);
  assertRelativeFileSyntax(value.entrypoint, `${label}.entrypoint`);
  assert(value.entrypoint.endsWith('.py'), `${label}.entrypoint must be a Python file`);
  assert(Array.isArray(value.argv) && value.argv.length === 2 && value.argv[0] === '--input-json' && value.argv[1] === '-', `${label}.argv must be the fixed stdin JSON invocation`);
  assert(value.inputTransport === 'stdin_json' && value.outputTransport === 'stdout_json' && value.shell === false, `${label} must use JSON transports without a shell`);
}

function validateContract(contract, label) {
  assertObject(contract, label);
  assertExactKeys(contract, [
    'schemaVersion', 'id', 'componentType', 'componentVersion',
    'entrypoint', 'capabilities'
  ], label);
  assert(contract.schemaVersion === CONTRACT_SCHEMA_VERSION, `${label}.schemaVersion must be ${CONTRACT_SCHEMA_VERSION}`);
  assertId(contract.id, `${label}.id`);
  assert(Object.values(GROUP_TYPES).includes(contract.componentType), `${label}.componentType is unsupported`);
  assert(typeof contract.componentVersion === 'string' && SEMVER_PATTERN.test(contract.componentVersion), `${label}.componentVersion must be valid SemVer`);
  assertRelativeFileSyntax(contract.entrypoint, `${label}.entrypoint`);
  assert(Array.isArray(contract.capabilities) && contract.capabilities.length > 0, `${label}.capabilities must contain at least one capability`);

  for (const [index, capability] of contract.capabilities.entries()) {
    const capabilityLabel = `${label}.capabilities[${index}]`;
    assertObject(capability, capabilityLabel);
    assertExactKeys(capability, [
      'id', 'summary', 'useWhen', 'doNotUseWhen', 'input', 'output',
      'permissions', 'sideEffects', 'humanGate', 'validation', 'invocation'
    ], capabilityLabel);
    assertId(capability.id, `${capabilityLabel}.id`);
    assert(typeof capability.summary === 'string' && NON_EMPTY_TEXT_PATTERN.test(capability.summary), `${capabilityLabel}.summary must be a non-empty string`);
    assertStringArray(capability.useWhen, `${capabilityLabel}.useWhen`, { minItems: 1 });
    assertStringArray(capability.doNotUseWhen, `${capabilityLabel}.doNotUseWhen`, { minItems: 1 });
    assertIoSchema(capability.input, `${capabilityLabel}.input`);
    assertIoSchema(capability.output, `${capabilityLabel}.output`);
    assertStringArray(capability.permissions, `${capabilityLabel}.permissions`);
    assertStringArray(capability.sideEffects, `${capabilityLabel}.sideEffects`);
    assertHumanGate(capability.humanGate, `${capabilityLabel}.humanGate`);
    if (Object.hasOwn(capability, 'invocation')) assertInvocation(capability.invocation, `${capabilityLabel}.invocation`);
    assertStringArray(capability.validation, `${capabilityLabel}.validation`, { minItems: 1 });
    capability.validation.forEach((item, validationIndex) => {
      assertRelativeFileSyntax(item, `${capabilityLabel}.validation[${validationIndex}]`);
    });
  }
}

function safeRelativeFile(componentRoot, relativePath, label) {
  const segments = assertRelativeFileSyntax(relativePath, label);

  const absolutePath = path.resolve(componentRoot, ...segments);
  const relativeFromRoot = path.relative(componentRoot, absolutePath);
  assert(relativeFromRoot && relativeFromRoot !== '..' && !relativeFromRoot.startsWith(`..${path.sep}`) && !path.isAbsolute(relativeFromRoot), `${label} escapes its component: ${relativePath}`);

  let current = componentRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    assert(fs.existsSync(current), `${label} does not exist: ${relativePath}`);
    const stat = fs.lstatSync(current);
    assert(!stat.isSymbolicLink(), `${label} must not traverse a symlink or junction: ${relativePath}`);
  }
  assert(fs.lstatSync(absolutePath).isFile(), `${label} must point to a file: ${relativePath}`);
  return normalize(relativeFromRoot);
}

export function componentFilesSha256(files) {
  const hash = crypto.createHash('sha256');
  for (const file of [...files].sort((left, right) => compareText(left.relativePath, right.relativePath))) {
    hash.update(file.relativePath, 'utf8');
    hash.update('\0');
    hash.update(file.contents);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function componentTreeSha256(componentRoot) {
  const files = [];
  function walk(directory, relativeDirectory = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = normalize(path.join(relativeDirectory, entry.name));
      const stat = fs.lstatSync(absolutePath);
      assert(!entry.isSymbolicLink() && !stat.isSymbolicLink(), `Component tree contains a symlink or junction: ${relativePath}`);
      if (entry.isDirectory()) {
        walk(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }
  walk(componentRoot);
  return componentFilesSha256(files.map((relativePath) => ({
    relativePath,
    contents: fs.readFileSync(path.join(componentRoot, ...relativePath.split('/')))
  })));
}

function readContract(contractPath) {
  let contract;
  try {
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid capability contract ${normalize(contractPath)}: ${error.message}`);
  }
  validateContract(contract, normalize(contractPath));
  return contract;
}

export function discoverComponents(rootPath) {
  const root = path.resolve(rootPath);
  assert(fs.existsSync(root) && fs.lstatSync(root).isDirectory(), `Repository root does not exist: ${root}`);
  assert(!fs.lstatSync(root).isSymbolicLink(), `Repository root must not be a symlink or junction: ${root}`);
  const components = [];
  const componentIds = new Set();
  const capabilityIds = new Set();

  for (const [group, expectedType] of Object.entries(GROUP_TYPES)) {
    const groupPath = path.join(root, group);
    if (!fs.existsSync(groupPath)) continue;
    const groupStat = fs.lstatSync(groupPath);
    assert(!groupStat.isSymbolicLink() && groupStat.isDirectory(), `Component group must be a real directory: ${group}`);

    const entries = fs.readdirSync(groupPath, { withFileTypes: true }).sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const componentRoot = path.join(groupPath, entry.name);
      const stat = fs.lstatSync(componentRoot);
      assert(!entry.isSymbolicLink() && !stat.isSymbolicLink(), `Component directory must not be a symlink or junction: ${group}/${entry.name}`);
      if (!entry.isDirectory()) continue;

      const relativeComponentPath = `${group}/${entry.name}`;
      const contractPath = path.join(componentRoot, 'capability.json');
      assert(fs.existsSync(contractPath) && fs.lstatSync(contractPath).isFile(), `Missing capability.json: ${relativeComponentPath}`);
      assert(!fs.lstatSync(contractPath).isSymbolicLink(), `capability.json must not be a symlink: ${relativeComponentPath}`);
      const contract = readContract(contractPath);
      assert(contract.id === entry.name, `Component id must match directory name ${entry.name}: ${contract.id}`);
      assert(contract.componentType === expectedType, `Component type must match ${group} directory (${expectedType}): ${contract.id}`);
      assert(!componentIds.has(contract.id), `Duplicate component id: ${contract.id}`);
      componentIds.add(contract.id);

      const entrypoint = safeRelativeFile(componentRoot, contract.entrypoint, `${contract.id}.entrypoint`);
      const capabilityValidation = new Map();
      for (const capability of contract.capabilities) {
        assert(!capabilityIds.has(capability.id), `Duplicate capability id: ${capability.id}`);
        capabilityIds.add(capability.id);
        if (capability.invocation) {
          safeRelativeFile(componentRoot, capability.invocation.entrypoint, `${capability.id}.invocation.entrypoint`);
        }
        capabilityValidation.set(
          capability.id,
          capability.validation.map((item, index) => safeRelativeFile(componentRoot, item, `${capability.id}.validation[${index}]`))
        );
      }
      const validation = [...new Set([...capabilityValidation.values()].flat())].sort(compareText);

      components.push({
        contract,
        path: relativeComponentPath,
        entrypoint,
        validation,
        capabilityValidation,
        contractSha256: sha256(stableJson(contract)),
        contentSha256: componentTreeSha256(componentRoot)
      });
    }
  }

  return components.sort((left, right) => compareText(left.path, right.path));
}

export function buildCapabilityIndex(rootPath) {
  const discovered = discoverComponents(rootPath);
  const components = discovered.map(({ contract, path: componentPath, entrypoint, validation, contractSha256, contentSha256 }) => ({
    id: contract.id,
    componentType: contract.componentType,
    componentVersion: contract.componentVersion,
    path: componentPath,
    entrypoint,
    validation,
    contractSha256,
    contentSha256,
    capabilityIds: contract.capabilities.map((item) => item.id).sort(compareText)
  }));
  const capabilities = discovered.flatMap(({ contract, path: componentPath, entrypoint, capabilityValidation, contractSha256, contentSha256 }) =>
    contract.capabilities.map((capability) => ({
      id: capability.id,
      summary: capability.summary,
      componentId: contract.id,
      componentType: contract.componentType,
      componentVersion: contract.componentVersion,
      componentPath,
      entrypoint,
      useWhen: capability.useWhen,
      doNotUseWhen: capability.doNotUseWhen,
      input: capability.input,
      output: capability.output,
      permissions: capability.permissions,
      sideEffects: capability.sideEffects,
      humanGate: capability.humanGate,
      validation: capabilityValidation.get(capability.id),
      componentContentSha256: contentSha256,
      contractSha256
    }))
  ).sort((left, right) => compareText(left.id, right.id));

  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    componentCount: components.length,
    capabilityCount: capabilities.length,
    components,
    capabilities
  };
}

export function serializeCapabilityIndex(index) {
  return stableJson(index);
}

function discoveryReport(rootPath) {
  const components = discoverComponents(rootPath);
  return {
    schemaVersion: INDEX_SCHEMA_VERSION,
    componentCount: components.length,
    components: components.map(({ contract, path: componentPath }) => ({
      id: contract.id,
      componentType: contract.componentType,
      path: componentPath,
      contract: `${componentPath}/capability.json`
    }))
  };
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  assert(['discover', 'build', 'check'].includes(command), 'Usage: capability-catalog.mjs discover|build|check [--root <path>] [--output <path>]');
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let output = null;
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    assert(argument === '--root' || argument === '--output', `Unknown argument: ${argument}`);
    const value = rest[index + 1];
    assert(value && !value.startsWith('--'), `Missing value for ${argument}`);
    if (argument === '--root') root = path.resolve(value);
    if (argument === '--output') output = path.resolve(value);
    index += 1;
  }
  assert(command !== 'discover' || output === null, 'discover does not accept --output');
  return { command, root, output };
}

function pathsEqual(left, right) {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function resolveSafeOutputPath(rootPath, requestedOutput, { createParent = false } = {}) {
  const root = path.resolve(rootPath);
  const outputPath = path.resolve(requestedOutput);
  const expectedOutput = path.join(root, GENERATED_INDEX_RELATIVE_PATH);
  assert(pathsEqual(outputPath, expectedOutput), `Capability index output must be the fixed repository path: ${expectedOutput}`);

  // This protects a static, trusted worktree. Re-check path types immediately
  // before use, but do not pretend to provide a system-wide lock against an
  // actor concurrently replacing directories between these operations.
  const rootStat = fs.lstatSync(root);
  assert(rootStat.isDirectory() && !rootStat.isSymbolicLink(), `Repository root must be a real directory: ${root}`);

  const outputDirectory = path.dirname(expectedOutput);
  if (!fs.existsSync(outputDirectory)) {
    if (createParent) fs.mkdirSync(outputDirectory);
  }
  if (fs.existsSync(outputDirectory)) {
    const directoryStat = fs.lstatSync(outputDirectory);
    assert(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), `Capability index directory must be a real repository directory: ${outputDirectory}`);
  }
  if (fs.existsSync(expectedOutput)) {
    const outputStat = fs.lstatSync(expectedOutput);
    assert(outputStat.isFile() && !outputStat.isSymbolicLink(), `Capability index output must be a regular file, not a symlink or junction: ${expectedOutput}`);
  }
  return expectedOutput;
}

export function writeOutputAtomically(outputPath, bytes, { renameSync = fs.renameSync } = {}) {
  const outputDirectory = path.dirname(outputPath);
  const temporaryPath = path.join(
    outputDirectory,
    `.${path.basename(outputPath)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
    fs.writeFileSync(descriptor, bytes, { encoding: 'utf8' });
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch (closeError) {
        error.closeError = closeError;
      }
    }
    try {
      fs.unlinkSync(temporaryPath);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') error.cleanupError = cleanupError;
    }
    throw error;
  }
}

export function runCli(argv = process.argv.slice(2)) {
  const { command, root, output } = parseArguments(argv);
  if (command === 'discover') {
    process.stdout.write(stableJson(discoveryReport(root)));
    return;
  }

  const index = buildCapabilityIndex(root);
  const generated = serializeCapabilityIndex(index);
  if (command === 'build') {
    if (output) {
      const safeOutput = resolveSafeOutputPath(root, output, { createParent: true });
      writeOutputAtomically(safeOutput, generated);
    }
    else process.stdout.write(generated);
    return;
  }

  if (output) {
    const safeOutput = resolveSafeOutputPath(root, output);
    assert(fs.existsSync(safeOutput) && fs.lstatSync(safeOutput).isFile(), `Capability index is missing: ${safeOutput}`);
    const current = fs.readFileSync(safeOutput);
    const expected = Buffer.from(generated, 'utf8');
    assert(current.equals(expected), `Capability index is stale: ${safeOutput}`);
  }
  process.stdout.write(`Capability contracts passed: ${index.componentCount} components.\n`);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    runCli();
  } catch (error) {
    console.error(`Capability catalog failed: ${error.message}`);
    process.exitCode = 1;
  }
}
