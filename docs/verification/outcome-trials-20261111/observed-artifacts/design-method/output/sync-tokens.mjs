import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const folder = path.dirname(fileURLToPath(import.meta.url));
export const tokens = JSON.parse(fs.readFileSync(path.join(folder, 'tokens.json'), 'utf8'));

function flatten(value, prefix, target = {}) {
  if (value && Object.hasOwn(value, '$value')) {
    if (!value.$type) throw new Error(`Token type missing: ${prefix}`);
    target[prefix] = value;
  } else {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, target);
  }
  return target;
}

export function resolveTheme(theme) {
  if (!tokens.semantic[theme]) throw new Error(`Unknown theme: ${theme}`);
  const all = {
    ...flatten(tokens.primitive, 'primitive'),
    ...flatten(tokens.semantic.common, 'semantic'),
    ...flatten(tokens.semantic[theme], 'semantic'),
    ...flatten(tokens.component, 'component')
  };
  const cache = {};
  function resolve(name, visiting = []) {
    if (Object.hasOwn(cache, name)) return cache[name];
    if (visiting.includes(name)) throw new Error(`Token cycle: ${[...visiting, name].join(' → ')}`);
    const token = all[name];
    if (!token) throw new Error(`Missing token: ${name}`);
    const match = typeof token.$value === 'string' && token.$value.match(/^\{([^}]+)\}$/);
    if (match) {
      const source = all[match[1]];
      if (!source) throw new Error(`Missing reference: ${name} → ${match[1]}`);
      if (source.$type !== token.$type) throw new Error(`Type mismatch: ${name} → ${match[1]}`);
      cache[name] = resolve(match[1], [...visiting, name]);
    } else {
      cache[name] = token.$value;
    }
    return cache[name];
  }
  Object.keys(all).forEach(name => resolve(name));
  return { all, values: cache };
}

function serialize(type, value) {
  if (type === 'dimension' || type === 'duration') {
    if (typeof value.value !== 'number' || typeof value.unit !== 'string') throw new Error(`Invalid ${type}`);
    return `${value.value}${value.unit}`;
  }
  if (type === 'fontFamily') return value.map(name => /\s/.test(name) ? JSON.stringify(name) : name).join(', ');
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error(`Cannot serialize ${type}`);
  return String(value);
}

export function cssName(name) {
  return '--ds-' + name.replace(/^(semantic|component)\./, '').replaceAll('.', '-');
}

export function buildCss() {
  const chunks = ['/* Generated from tokens.json by node sync-tokens.mjs. Edit tokens.json first. */'];
  for (const theme of ['light', 'dark']) {
    const { all, values } = resolveTheme(theme);
    const used = new Set();
    const rows = Object.keys(all).filter(name => !name.startsWith('primitive.')).map(name => {
      const variable = cssName(name);
      if (used.has(variable)) throw new Error(`Duplicate CSS name: ${variable}`);
      used.add(variable);
      return `  ${variable}: ${serialize(all[name].$type, values[name])};`;
    });
    chunks.push(`${theme === 'light' ? ':root, [data-theme="light"]' : '[data-theme="dark"]'} {\n${rows.join('\n')}\n}`);
  }
  return chunks.join('\n\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const generated = buildCss();
  const destination = path.join(folder, 'tokens.css');
  if (process.argv.includes('--check')) {
    if (fs.readFileSync(destination, 'utf8') !== generated) throw new Error('tokens.css is out of sync; run node sync-tokens.mjs');
    console.log('PASS: both token themes resolve without cycles; tokens.css matches tokens.json.');
  } else {
    fs.writeFileSync(destination, generated);
    console.log('Wrote tokens.css from typed primitive → semantic → component tokens.');
  }
}
