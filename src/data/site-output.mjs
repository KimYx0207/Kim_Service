import fs from 'node:fs';
import path from 'node:path';
import { writeOutputAtomically } from './capability-catalog.mjs';

const MANIFEST = 'site-manifest.json';
const OWNER = 'kim-service-task-browser';

function safePath(root, relative) {
  if (typeof relative !== 'string' || /[\\:\u0000-\u001f]/u.test(relative) ||
      relative.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Unsafe site path');
  const result = path.join(root, ...relative.split('/'));
  let cursor = root;
  for (const part of relative.split('/')) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Site paths must not traverse symlinks');
  }
  return result;
}

export function writeStaticSite({ root, output, html, componentPaths, sourceRef }) {
  const files = new Map([['index.html', Buffer.from(html)], ['.nojekyll', Buffer.alloc(0)]]);
  function collect(relative) {
    const filename = safePath(root, relative);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(filename).sort()) collect(relative + '/' + name);
    } else if (stat.isFile()) files.set(relative, fs.readFileSync(filename));
    else throw new Error('Site content must be regular files');
  }
  componentPaths.forEach(collect);
  let previous = [];
  if (fs.existsSync(output)) {
    if (!fs.lstatSync(output).isDirectory() || fs.lstatSync(output).isSymbolicLink()) throw new Error('Site output must be a real directory');
    if (fs.readdirSync(output).length) {
      const manifestPath = safePath(output, MANIFEST);
      if (!fs.existsSync(manifestPath)) throw new Error('Refusing to overwrite an unmanaged site directory');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest.owner !== OWNER || !Array.isArray(manifest.files)) throw new Error('Unrecognized site ownership manifest');
      previous = manifest.files;
    }
  } else fs.mkdirSync(output, { recursive: true });
  // Validate the complete replacement set before the first write, so a foreign
  // file late in traversal cannot leave an otherwise valid site half-updated.
  for (const relative of [...files.keys(), ...previous]) {
    const target = safePath(output, relative);
    if (files.has(relative) && fs.existsSync(target) && !previous.includes(relative)) throw new Error(`Preserving unowned site file: ${relative}`);
  }
  for (const [relative, bytes] of files) {
    const target = safePath(output, relative);
    if (fs.existsSync(target) && !previous.includes(relative)) throw new Error(`Preserving unowned site file: ${relative}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    writeOutputAtomically(target, bytes);
  }
  for (const relative of previous.filter((file) => !files.has(file))) {
    const target = safePath(output, relative);
    if (fs.existsSync(target) && fs.lstatSync(target).isFile()) fs.unlinkSync(target);
  }
  writeOutputAtomically(path.join(output, MANIFEST), JSON.stringify({ schemaVersion: 1, owner: OWNER,
    sourceRef, files: [...files.keys()].sort() }, null, 2) + '\n');
  return { output, sourceRef, fileCount: files.size, componentCount: componentPaths.length };
}
