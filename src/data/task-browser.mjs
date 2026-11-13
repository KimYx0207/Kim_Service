import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCapabilityIndex } from './capability-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXAMPLE_FILES = ['example.json', 'examples/example-input.md', 'examples/example-output.md', 'docs/examples.md', 'assets/case-study.md'];

function regularFile(root, relative, { optional = false } = {}) {
  if (typeof relative !== 'string' || /[\\:#?\u0000-\u001f]/u.test(relative) ||
      relative.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid task-browser file reference: ${relative}`);
  }
  let current = root;
  for (const [index, part] of relative.split('/').entries()) {
    current = path.join(current, part);
    if (!fs.existsSync(current) && optional) return null;
    const stat = fs.lstatSync(current);
    const last = index === relative.split('/').length - 1;
    if (stat.isSymbolicLink() || (last ? !stat.isFile() : !stat.isDirectory())) {
      throw new Error(`Task-browser source must be a regular file: ${relative}`);
    }
  }
  return current;
}

export function readBrowserConfig(root = ROOT) {
  const config = fs.existsSync(path.join(root, 'config/task-browser.json'))
    ? regularFile(root, 'config/task-browser.json') : regularFile(ROOT, 'config/task-browser.json');
  const ui = JSON.parse(fs.readFileSync(config, 'utf8'));
  if (ui.schemaVersion !== 1 || !Array.isArray(ui.hosts) || !ui.hosts.length ||
      !Array.isArray(ui.synonyms) || !Array.isArray(ui.typeOrder) ||
      !Array.isArray(ui.commonFields) || !Array.isArray(ui.suggestions) ||
      !ui.typeNames || !ui.fieldNames || !ui.repository?.ref ||
      typeof ui.drafts?.storageKeyPrefix !== 'string' || !ui.drafts.storageKeyPrefix ||
      ['inlineGoalBytes','inlineMaterialBytes','maxDraftBytes'].some(key =>
        !Number.isSafeInteger(ui.contentPolicy?.[key]) || ui.contentPolicy[key] < 1) ||
      ui.contentPolicy.inlineGoalBytes > ui.contentPolicy.maxDraftBytes ||
      ui.contentPolicy.inlineMaterialBytes > ui.contentPolicy.maxDraftBytes) throw new Error('Invalid task-browser configuration');
  for (const value of [ui.repository.url, ui.repository.publishedUrl]) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new Error('Task-browser repository URLs must use HTTPS without credentials or queries');
    }
  }
  const ids = new Set();
  for (const host of ui.hosts) {
    if (!/^[a-z0-9-]+$/u.test(host.id) || ids.has(host.id) || !host.label || typeof host.prefix !== 'string') {
      throw new Error('Task-browser hosts must have unique IDs, labels and request prefixes');
    }
    ids.add(host.id);
  }
  const readLocaleFile = relative => JSON.parse(fs.readFileSync(
    regularFile(fs.existsSync(path.join(root, relative)) ? root : ROOT, relative), 'utf8'));
  const languagePack = readLocaleFile('config/task-browser-locales.json');
  const translations = readLocaleFile('config/task-browser-capabilities.en.json');
  if (languagePack.schemaVersion !== 1 || languagePack.defaultLocale !== 'zh-CN' ||
      !languagePack.locales?.['zh-CN']?.messages || !languagePack.locales?.en?.messages ||
      translations.schemaVersion !== 1 || translations.locale !== 'en' ||
      !translations.capabilities || typeof translations.capabilities !== 'object') {
    throw new Error('Invalid task-browser localization configuration');
  }
  const sourceKeys = Object.keys(languagePack.locales['zh-CN'].messages).sort();
  if (JSON.stringify(sourceKeys) !== JSON.stringify(Object.keys(languagePack.locales.en.messages).sort()) ||
      Object.values(languagePack.locales).some(locale => Object.values(locale.messages).some(value => typeof value !== 'string'))) {
    throw new Error('Task-browser languages must contain the same UI message keys');
  }
  return { ...ui, defaultLocale: languagePack.defaultLocale,
    locales: languagePack.locales, capabilityTranslations: translations.capabilities };
}

export function readShowcases(root, capabilities) {
  const filename = regularFile(root, 'samples/index.json', { optional: true });
  if (!filename) return [];
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.samples)) throw new Error('Invalid showcase index');
  const ids = new Set();
  return manifest.samples.map((sample) => {
    const capability = capabilities.find((item) => item.id === sample.capabilityId);
    if (!/^[a-z0-9-]+$/u.test(sample.id) || ids.has(sample.id) || !sample.title || !sample.description ||
        !capability || typeof sample.entrypoint !== 'string' || !sample.entrypoint.startsWith(capability.componentPath + '/') ||
        !sample.entrypoint.endsWith('.html') || !Array.isArray(sample.inputs) || !Array.isArray(sample.outputs) ||
        typeof sample.exampleData !== 'boolean') throw new Error(`Invalid showcase: ${sample.id}`);
    regularFile(root, sample.entrypoint);
    ids.add(sample.id);
    return { ...sample, componentPath: capability.componentPath };
  });
}

/** Repository declarations remain the only capability source; the page is a view. */
export function buildStartPageData(root = ROOT) {
  const index = buildCapabilityIndex(root);
  const capabilities = index.capabilities.map((capability) => {
    const base = capability.componentPath;
    const readme = `${base}/README.md`;
    return {
      ...capability,
      readme: regularFile(root, readme, { optional: true }) ? readme : null,
      examples: EXAMPLE_FILES.map((file) => `${base}/${file}`).filter((file) => regularFile(root, file, { optional: true }))
    };
  });
  return { componentCount: index.componentCount, capabilityCount: index.capabilityCount,
    ui: readBrowserConfig(root), showcases: readShowcases(root, capabilities), capabilities };
}
