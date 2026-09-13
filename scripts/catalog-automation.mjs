#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildCapabilityIndex,
  serializeCapabilityIndex
} from './capability-catalog.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CATALOG_RELATIVE_PATH = 'catalog.json';
export const GENERATED_CAPABILITIES_RELATIVE_PATH = 'generated/capabilities.json';
const DERIVED_COMPONENT_KEYS = new Set([
  'id', 'kind', 'path', 'version', 'contractSha256', 'contentSha256',
  'required', 'validation'
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareText(left, right) {
  return left.localeCompare(right, 'en');
}

function unique(values) {
  return [...new Set(values)];
}

function catalogValidationCommand(relativePath) {
  const extension = path.posix.extname(relativePath).toLowerCase();
  const runtime = ['.js', '.cjs', '.mjs'].includes(extension)
    ? 'node'
    : extension === '.py'
      ? 'python'
      : null;
  assert(runtime, `Unsupported validation file type ${extension || '(none)'}: ${relativePath}`);
  assert(
    /^[A-Za-z0-9._/-]+$/.test(relativePath),
    `Validation path is incompatible with the legacy command field: ${relativePath}`
  );
  return `${runtime} ${relativePath}`;
}

function derivedRequired(component) {
  return unique([
    'capability.json',
    component.entrypoint,
    ...component.validation
  ]).sort(compareText);
}

function compatibilityFields(component) {
  return Object.fromEntries(
    Object.entries(component ?? {}).filter(([key]) => !DERIVED_COMPONENT_KEYS.has(key))
  );
}

export function buildCatalogDocument(currentCatalog, capabilityIndex) {
  assert(currentCatalog && typeof currentCatalog === 'object' && !Array.isArray(currentCatalog), 'catalog.json must contain an object');
  assert(Array.isArray(currentCatalog.components), 'catalog.json components must be an array');

  const previousById = new Map();
  for (const component of currentCatalog.components) {
    assert(component && typeof component.id === 'string' && component.id, 'Existing catalog components must have ids');
    assert(!previousById.has(component.id), `Duplicate existing catalog component id: ${component.id}`);
    previousById.set(component.id, component);
  }

  const discoveredIds = new Set(capabilityIndex.components.map((component) => component.id));
  for (const previousId of previousById.keys()) {
    assert(
      discoveredIds.has(previousId),
      `Catalog contains a previously published component missing from discovery: ${previousId}`
    );
  }

  const components = capabilityIndex.components.map((component) => {
    const previous = previousById.get(component.id);
    const compatibility = compatibilityFields(previous);
    const required = unique([
      ...(Array.isArray(previous?.required) ? previous.required : []),
      ...derivedRequired(component)
    ]);
    const source = previous?.source ?? `canonical:${component.path}`;
    const revision = previous?.revision ?? `pending-local:${component.contractSha256}`;
    const snapshot = previous?.snapshot ?? 'capability-contract-pending-release';

    return {
      id: component.id,
      kind: component.componentType,
      path: component.path,
      source,
      revision,
      snapshot,
      ...compatibility,
      version: component.componentVersion,
      contractSha256: component.contractSha256,
      contentSha256: component.contentSha256,
      required,
      validation: component.validation.map(catalogValidationCommand)
    };
  });

  return {
    ...currentCatalog,
    componentCount: components.length,
    components
  };
}

export function serializeCatalogDocument(catalog) {
  return JSON.stringify(catalog, null, 2) + '\n';
}

function assertFixedRegularOutput(root, relativePath, { createParent = false } = {}) {
  const rootStat = fs.lstatSync(root);
  assert(rootStat.isDirectory() && !rootStat.isSymbolicLink(), `Repository root must be a real directory: ${root}`);
  const output = path.join(root, ...relativePath.split('/'));
  const outputDirectory = path.dirname(output);
  if (!fs.existsSync(outputDirectory) && createParent) fs.mkdirSync(outputDirectory);
  assert(fs.existsSync(outputDirectory), `Output directory is missing: ${outputDirectory}`);
  const directoryStat = fs.lstatSync(outputDirectory);
  assert(directoryStat.isDirectory() && !directoryStat.isSymbolicLink(), `Output directory must be a real repository directory: ${outputDirectory}`);
  if (fs.existsSync(output)) {
    const outputStat = fs.lstatSync(output);
    assert(outputStat.isFile() && !outputStat.isSymbolicLink(), `Output must be a regular file: ${output}`);
  }
  return output;
}

function stageDurableFile(outputPath, bytes) {
  const temporaryPath = path.join(
    path.dirname(outputPath),
    `.${path.basename(outputPath)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  );
  let descriptor;
  try {
    descriptor = fs.openSync(temporaryPath, 'wx');
    fs.writeFileSync(descriptor, bytes, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    return temporaryPath;
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(temporaryPath); } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') error.cleanupError = cleanupError;
    }
    throw error;
  }
}

function replaceStagedFile(temporaryPath, outputPath) {
  try {
    fs.renameSync(temporaryPath, outputPath);
  } catch (error) {
    try { fs.unlinkSync(temporaryPath); } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') error.cleanupError = cleanupError;
    }
    throw error;
  }
}

export function computeCatalogArtifacts(rootPath) {
  const root = path.resolve(rootPath);
  const catalogPath = path.join(root, CATALOG_RELATIVE_PATH);
  assert(fs.existsSync(catalogPath) && fs.lstatSync(catalogPath).isFile(), `Missing catalog.json: ${catalogPath}`);
  assert(!fs.lstatSync(catalogPath).isSymbolicLink(), `catalog.json must not be a symlink: ${catalogPath}`);
  const currentCatalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const capabilityIndex = buildCapabilityIndex(root);
  const catalog = buildCatalogDocument(currentCatalog, capabilityIndex);
  return {
    capabilityIndex,
    catalog,
    catalogBytes: serializeCatalogDocument(catalog),
    capabilitiesBytes: serializeCapabilityIndex(capabilityIndex)
  };
}

export function buildCatalogArtifacts(rootPath = DEFAULT_ROOT) {
  const root = path.resolve(rootPath);
  const artifacts = computeCatalogArtifacts(root);
  const catalogPath = assertFixedRegularOutput(root, CATALOG_RELATIVE_PATH, { createParent: true });
  const capabilitiesPath = assertFixedRegularOutput(root, GENERATED_CAPABILITIES_RELATIVE_PATH, { createParent: true });

  // Both payloads are completely computed before either output is touched. A
  // process interruption between the two renames is detected by `check` as a
  // freshness failure; no partially written JSON is ever exposed.
  let stagedCapabilities;
  let stagedCatalog;
  try {
    stagedCapabilities = stageDurableFile(capabilitiesPath, artifacts.capabilitiesBytes);
    stagedCatalog = stageDurableFile(catalogPath, artifacts.catalogBytes);
    replaceStagedFile(stagedCapabilities, capabilitiesPath);
    stagedCapabilities = undefined;
    replaceStagedFile(stagedCatalog, catalogPath);
    stagedCatalog = undefined;
  } catch (error) {
    if (stagedCapabilities) try { fs.unlinkSync(stagedCapabilities); } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') error.capabilitiesCleanupError = cleanupError;
    }
    if (stagedCatalog) try { fs.unlinkSync(stagedCatalog); } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') error.catalogCleanupError = cleanupError;
    }
    throw error;
  }
  return artifacts;
}

export function checkCatalogArtifacts(rootPath = DEFAULT_ROOT) {
  const root = path.resolve(rootPath);
  const artifacts = computeCatalogArtifacts(root);
  const catalogPath = assertFixedRegularOutput(root, CATALOG_RELATIVE_PATH);
  const capabilitiesPath = assertFixedRegularOutput(root, GENERATED_CAPABILITIES_RELATIVE_PATH);
  assert(fs.existsSync(capabilitiesPath), `Missing generated capability index: ${capabilitiesPath}`);
  assert(fs.readFileSync(catalogPath).equals(Buffer.from(artifacts.catalogBytes)), `Derived catalog fields are stale: ${catalogPath}`);
  assert(fs.readFileSync(capabilitiesPath).equals(Buffer.from(artifacts.capabilitiesBytes)), `Generated capability index is stale: ${capabilitiesPath}`);
  return artifacts;
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  assert(['build', 'check'].includes(command), 'Usage: catalog-automation.mjs build|check [--root <path>]');
  let root = DEFAULT_ROOT;
  if (rest.length) {
    assert(rest.length === 2 && rest[0] === '--root', 'Usage: catalog-automation.mjs build|check [--root <path>]');
    root = path.resolve(rest[1]);
  }
  return { command, root };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  try {
    const { command, root } = parseArguments(process.argv.slice(2));
    const artifacts = command === 'build'
      ? buildCatalogArtifacts(root)
      : checkCatalogArtifacts(root);
    console.log(
      `Catalog automation ${command} passed: ${artifacts.capabilityIndex.componentCount} components, ` +
      `${artifacts.capabilityIndex.capabilityCount} capabilities.`
    );
  } catch (error) {
    console.error(`Catalog automation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
