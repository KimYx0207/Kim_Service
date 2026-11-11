#!/usr/bin/env node
// CLI adapter. Business rules, source reads and presentation have separate owners.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeOutputAtomically } from '../src/data/capability-catalog.mjs';
import { buildStartPageData } from '../src/data/task-browser.mjs';
import { renderPage } from '../src/presentation/task-browser/render-page.mjs';
export { buildStartPageData } from '../src/data/task-browser.mjs';
export { serializePageData } from '../src/presentation/task-browser/render-page.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VIEW = path.join(ROOT, 'src/presentation/task-browser');
export function renderStartPage(root = ROOT, { sourceRef } = {}) {
  const data = buildStartPageData(root);
  if (sourceRef) data.ui.repository.ref = sourceRef;
  const scripts = ['src/application/task-browser/model.mjs', 'src/data/task-drafts.mjs',
    'src/presentation/task-browser/copy-request.mjs', 'src/presentation/task-browser/page.js'];
  return renderPage({ data,
    template: fs.readFileSync(path.join(VIEW, 'page.html'), 'utf8'),
    css: fs.readFileSync(path.join(VIEW, 'page.css'), 'utf8'),
    script: scripts.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n') });
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
