#!/usr/bin/env node
// Stable CLI and import facade; repository reads live in the data layer.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCapabilityIndex, serializeCapabilityIndex, discoveryReport, writeOutputAtomically } from '../src/data/capability-catalog.mjs';
export * from '../src/data/capability-catalog.mjs';
const GENERATED_INDEX_RELATIVE_PATH = path.join('generated', 'capabilities.json');
function assert(condition,message){if(!condition)throw new Error(message);}
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

export function runCli(argv = process.argv.slice(2)) {
  const { command, root, output } = parseArguments(argv);
  if (command === 'discover') {
    process.stdout.write(serializeCapabilityIndex(discoveryReport(root)));
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
