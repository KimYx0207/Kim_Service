#!/usr/bin/env node

// This is a view of the existing contracts, not another capability registry.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildCapabilityIndex, writeOutputAtomically } from './capability-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'scripts', 'start-page');
const EXAMPLE_FILES = ['example.json', 'examples/example-input.md', 'examples/example-output.md', 'docs/examples.md', 'assets/case-study.md'];

function existsFile(root, relative) {
  const file = path.join(root, ...relative.split('/'));
  if (!fs.existsSync(file)) return false;
  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`Start-page source must be a regular file: ${relative}`);
  return true;
}

export function buildStartPageData(root = ROOT) {
  const index = buildCapabilityIndex(root);
  return {
    componentCount: index.componentCount,
    capabilityCount: index.capabilityCount,
    capabilities: index.capabilities.map((capability) => {
      const base = capability.componentPath;
      const readme = `${base}/README.md`;
      const examples = EXAMPLE_FILES.filter((file) => existsFile(root, `${base}/${file}`)).map((file) => `${base}/${file}`);
      return {
        ...capability,
        readme: existsFile(root, readme) ? readme : null,
        examples
      };
    })
  };
}

export function serializePageData(data) {
  // Source text is untrusted HTML input, including inside a JSON script element.
  return JSON.stringify(data).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
}

export function renderStartPage(root = ROOT) {
  const data = buildStartPageData(root);
  const template = fs.readFileSync(path.join(TEMPLATE, 'page.html'), 'utf8');
  const css = fs.readFileSync(path.join(TEMPLATE, 'page.css'), 'utf8');
  const script = fs.readFileSync(path.join(TEMPLATE, 'page.js'), 'utf8');
  return template.replace('/* PAGE_STYLE */', () => css)
    .replace('/* PAGE_DATA */', () => serializePageData(data))
    .replace('/* PAGE_SCRIPT */', () => script);
}

function outputPath(root, create) {
  const target = path.join(root, 'docs', 'start.html');
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Repository root must be a real directory');
  const directory = path.dirname(target);
  if (!fs.existsSync(directory) && create) fs.mkdirSync(directory);
  if (fs.existsSync(directory)) {
    const parent = fs.lstatSync(directory);
    if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error('docs must be a real directory');
  }
  if (fs.existsSync(target)) {
    const output = fs.lstatSync(target);
    if (!output.isFile() || output.isSymbolicLink()) throw new Error('docs/start.html must be a regular file');
  }
  return target;
}

export function main(args = process.argv.slice(2)) {
  const [command, ...flags] = args;
  if (!['build', 'check'].includes(command) || (flags.length && (flags.length !== 2 || flags[0] !== '--root'))) {
    throw new Error('Usage: node scripts/start-page.mjs build|check [--root <repository>]');
  }
  const root = flags.length ? path.resolve(flags[1]) : ROOT;
  const html = renderStartPage(root);
  const target = outputPath(root, command === 'build');
  if (command === 'check') {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) {
      throw new Error('docs/start.html is missing or stale. Run: node scripts/start-page.mjs build');
    }
    console.log('Start page is current (capability contracts and page templates).');
  } else {
    writeOutputAtomically(target, html);
    console.log('Built docs/start.html. Open this file in a browser; no server or installation required to browse.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
