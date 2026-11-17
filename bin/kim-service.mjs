#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED_TARGETS = Object.freeze(['claude', 'codex', 'cursor', 'antigravity', 'gemini', 'openclaw']);
const SUPPORTED_SCOPES = Object.freeze(['project', 'global']);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

export function loadCatalogData() {
  const catalog = readJson('catalog.json');
  const packsConfig = readJson('config/packs.json');
  const capabilitiesIndex = readJson('generated/capabilities.json');
  const byComponentId = new Map();
  for (const cap of capabilitiesIndex.capabilities ?? []) {
    if (!byComponentId.has(cap.componentId)) byComponentId.set(cap.componentId, []);
    byComponentId.get(cap.componentId).push(cap);
  }
  const packByComponent = new Map();
  const featuredSet = new Set();
  for (const pack of packsConfig.packs ?? []) {
    for (const id of pack.featured ?? []) featuredSet.add(id);
    for (const id of pack.components ?? []) packByComponent.set(id, pack.id);
  }
  const components = (catalog.components ?? []).map(item => {
    const caps = byComponentId.get(item.id) ?? [];
    return {
      ...item,
      packId: packByComponent.get(item.id) ?? null,
      featured: featuredSet.has(item.id),
      summary: caps[0]?.summary ?? '',
      hasScripts: fs.existsSync(path.join(ROOT, item.path, 'scripts')),
      hasExamples: fs.existsSync(path.join(ROOT, item.path, 'examples'))
    };
  });
  return { catalog, packs: packsConfig.packs ?? [], components };
}

function resolveGlobalHome(target, env = process.env, userHome = os.homedir()) {
  const map = {
    claude: { keys: ['META_KIM_CLAUDE_HOME', 'CLAUDE_CONFIG_DIR', 'CLAUDE_HOME'], fallback: ['.claude'] },
    codex: { keys: ['META_KIM_CODEX_HOME', 'CODEX_HOME'], fallback: ['.codex'] },
    cursor: { keys: ['META_KIM_CURSOR_HOME', 'CURSOR_HOME'], fallback: ['.cursor'] },
    antigravity: { keys: ['META_KIM_ANTIGRAVITY_HOME', 'ANTIGRAVITY_HOME'], fallback: ['.gemini', 'config'] },
    gemini: { keys: ['META_KIM_GEMINI_HOME', 'GEMINI_HOME'], fallback: ['.gemini'] },
    openclaw: { keys: ['META_KIM_OPENCLAW_HOME', 'OPENCLAW_HOME'], fallback: ['.openclaw'] }
  };
  const spec = map[target];
  if (!spec) throw new Error('Unsupported target: ' + target);
  if (target === 'gemini' && env.GEMINI_CLI_HOME?.trim() && !env.META_KIM_GEMINI_HOME?.trim()) {
    return path.resolve(env.GEMINI_CLI_HOME.trim(), '.gemini');
  }
  for (const key of spec.keys) {
    if (env[key]?.trim()) return path.resolve(env[key].trim());
  }
  return path.join(userHome, ...spec.fallback);
}

function resolveTargetPaths({ target, scope, projectDir, env, userHome }) {
  if (!SUPPORTED_TARGETS.includes(target)) {
    throw new Error(`Unsupported --target "${target}". Choose one of: ${SUPPORTED_TARGETS.join(', ')}`);
  }
  if (!SUPPORTED_SCOPES.includes(scope)) {
    throw new Error(`Unsupported --scope "${scope}". Choose one of: ${SUPPORTED_SCOPES.join(', ')}`);
  }
  if (scope === 'global') {
    const home = resolveGlobalHome(target, env, userHome);
    return {
      root: home,
      skillsDir: path.join(home, 'skills'),
      agentsDir: ['claude', 'codex', 'cursor', 'gemini'].includes(target) ? path.join(home, 'agents') : null,
      bundleDir: path.join(home, 'kim-service'),
      agentFormat: target === 'codex' ? 'codex-toml' : ['claude', 'cursor', 'gemini'].includes(target) ? 'markdown' : 'skill-bundle'
    };
  }
  const base = path.resolve(projectDir);
  if (target === 'claude') {
    return { root: base, skillsDir: path.join(base, '.claude', 'skills'), agentsDir: path.join(base, '.claude', 'agents'), bundleDir: path.join(base, '.claude', 'kim-service'), agentFormat: 'markdown' };
  }
  if (target === 'codex') {
    return { root: base, skillsDir: path.join(base, '.agents', 'skills'), agentsDir: path.join(base, '.codex', 'agents'), bundleDir: path.join(base, '.codex', 'kim-service'), agentFormat: 'codex-toml' };
  }
  if (target === 'cursor') {
    return { root: base, skillsDir: path.join(base, '.cursor', 'skills'), agentsDir: path.join(base, '.cursor', 'agents'), bundleDir: path.join(base, '.cursor', 'kim-service'), agentFormat: 'markdown' };
  }
  if (target === 'antigravity') {
    return { root: base, skillsDir: path.join(base, '.agents', 'skills'), agentsDir: null, bundleDir: path.join(base, '.agents', 'kim-service'), agentFormat: 'skill-bundle' };
  }
  if (target === 'gemini') {
    return { root: base, skillsDir: path.join(base, '.agents', 'skills'), agentsDir: path.join(base, '.gemini', 'agents'), bundleDir: path.join(base, '.gemini', 'kim-service'), agentFormat: 'markdown' };
  }
  return { root: base, skillsDir: path.join(base, 'openclaw', 'skills'), agentsDir: null, bundleDir: path.join(base, 'openclaw', 'kim-service'), agentFormat: 'skill-bundle' };
}

function parseSimpleFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fields: {}, body: raw };
  const fields = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { fields, body: match[2] };
}

function rewriteBundleLinks(markdown, relativePrefix) {
  const normalized = relativePrefix.split(path.sep).join('/');
  return markdown.replace(/\]\(((?:references|examples|evals|scripts|schemas)\/[^)]+|method\.json|capability\.json|PROVENANCE\.md)\)/g, `](${normalized}/$1)`);
}

function toSkillBundleMarkdown(agentRaw) {
  const { fields, body } = parseSimpleFrontmatter(agentRaw);
  const name = fields.name || 'kim-service-agent';
  const desc = (fields.description || 'Kim Service professional workflow').replace(/^["']|["']$/g, '');
  return `---\nname: ${name}\ndescription: ${JSON.stringify(desc)}\n---\n\n${body.trimStart()}`;
}

function escapeTomlBasic(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function toCodexAgentToml(agentRaw, bundleEntryRel) {
  const { fields } = parseSimpleFrontmatter(agentRaw);
  const name = fields.name || 'kim-service-agent';
  const desc = (fields.description || 'Kim Service professional workflow').replace(/^["']|["']$/g, '');
  const instructions = [
    `You are the specialized Kim Service role "${name}".`,
    `Before executing, read "${bundleEntryRel}/AGENT.md" and "${bundleEntryRel}/method.json" (plus its referenced files under "${bundleEntryRel}/references/").`,
    'Follow its diagnostic steps, output schema, and verification checks strictly.'
  ].join('\n');
  return `name = "${escapeTomlBasic(name)}"\ndescription = "${escapeTomlBasic(desc)}"\ndeveloper_instructions = "${escapeTomlBasic(instructions)}"\n`;
}

function copyTreeSafe(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTreeSafe(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function planInstall({ selectors, target = 'claude', scope = 'project', projectDir = process.cwd(), featuredOnly = false, env = process.env, userHome = os.homedir() }) {
  const { packs, components } = loadCatalogData();
  const packMap = new Map(packs.map(pack => [pack.id, pack]));
  const compMap = new Map(components.map(comp => [comp.id, comp]));
  const selectedIds = new Set();

  for (const raw of selectors) {
    const id = String(raw || '').trim();
    if (!id) continue;
    if (id === 'all') {
      for (const comp of components) {
        if (!featuredOnly || comp.featured) selectedIds.add(comp.id);
      }
      continue;
    }
    if (packMap.has(id)) {
      const pack = packMap.get(id);
      const list = featuredOnly ? pack.featured : pack.components;
      for (const compId of list) selectedIds.add(compId);
      continue;
    }
    if (compMap.has(id)) {
      selectedIds.add(id);
      continue;
    }
    throw new Error(`Unknown pack or component "${id}". Run "kim-service packs" or "kim-service list" to browse.`);
  }

  const paths = resolveTargetPaths({ target, scope, projectDir, env, userHome });
  const operations = [];

  for (const id of selectedIds) {
    const comp = compMap.get(id);
    const srcRoot = path.join(ROOT, comp.path);
    if (comp.kind === 'skill') {
      operations.push({
        componentId: comp.id,
        kind: comp.kind,
        mode: 'skill-dir',
        sourceDir: srcRoot,
        destinationPath: path.join(paths.skillsDir, comp.id)
      });
    } else if (comp.kind === 'agent') {
      if (paths.agentFormat === 'skill-bundle') {
        operations.push({
          componentId: comp.id,
          kind: comp.kind,
          mode: 'agent-as-skill',
          sourceDir: srcRoot,
          destinationPath: path.join(paths.skillsDir, comp.id)
        });
      } else if (paths.agentFormat === 'codex-toml') {
        const bundleDest = path.join(paths.bundleDir, comp.id);
        const agentFile = path.join(paths.agentsDir, `${comp.id}.toml`);
        operations.push({
          componentId: comp.id,
          kind: comp.kind,
          mode: 'codex-agent',
          sourceDir: srcRoot,
          bundlePath: bundleDest,
          destinationPath: agentFile
        });
      } else {
        const bundleDest = path.join(paths.bundleDir, comp.id);
        const agentFile = path.join(paths.agentsDir, `${comp.id}.md`);
        operations.push({
          componentId: comp.id,
          kind: comp.kind,
          mode: 'markdown-agent',
          sourceDir: srcRoot,
          bundlePath: bundleDest,
          destinationPath: agentFile
        });
      }
    } else {
      operations.push({
        componentId: comp.id,
        kind: comp.kind,
        mode: 'support-bundle',
        sourceDir: srcRoot,
        destinationPath: path.join(paths.bundleDir, comp.kind + 's', comp.id)
      });
    }
  }

  return { target, scope, targetRoot: paths.root, count: operations.length, operations };
}

export function executeInstall(options) {
  const plan = planInstall(options);
  if (options.dryRun) return { ...plan, applied: false };

  for (const op of plan.operations) {
    if (op.mode === 'skill-dir' || op.mode === 'support-bundle') {
      copyTreeSafe(op.sourceDir, op.destinationPath);
    } else if (op.mode === 'agent-as-skill') {
      copyTreeSafe(op.sourceDir, op.destinationPath);
      const agentMd = fs.readFileSync(path.join(op.sourceDir, 'AGENT.md'), 'utf8');
      fs.writeFileSync(path.join(op.destinationPath, 'SKILL.md'), toSkillBundleMarkdown(agentMd), 'utf8');
    } else if (op.mode === 'codex-agent') {
      copyTreeSafe(op.sourceDir, op.bundlePath);
      fs.mkdirSync(path.dirname(op.destinationPath), { recursive: true });
      const agentMd = fs.readFileSync(path.join(op.sourceDir, 'AGENT.md'), 'utf8');
      const rel = path.relative(plan.targetRoot, op.bundlePath).split(path.sep).join('/');
      fs.writeFileSync(op.destinationPath, toCodexAgentToml(agentMd, rel), 'utf8');
    } else if (op.mode === 'markdown-agent') {
      copyTreeSafe(op.sourceDir, op.bundlePath);
      fs.mkdirSync(path.dirname(op.destinationPath), { recursive: true });
      const agentMd = fs.readFileSync(path.join(op.sourceDir, 'AGENT.md'), 'utf8');
      const relPrefix = path.relative(path.dirname(op.destinationPath), op.bundlePath);
      let rendered = rewriteBundleLinks(agentMd, relPrefix);
      if (plan.target === 'gemini') {
        const { fields, body } = parseSimpleFrontmatter(rendered);
        const desc = (fields.description || '').replace(/^["']|["']$/g, '');
        rendered = `---\nname: ${fields.name}\ndescription: ${JSON.stringify(desc)}\nkind: local\n---\n\n${body.trimStart()}`;
      }
      fs.writeFileSync(op.destinationPath, rendered, 'utf8');
    }
  }
  return { ...plan, applied: true };
}

function parseCliArgs(argv) {
  const positionals = [];
  const flags = { target: 'claude', scope: 'project', projectDir: process.cwd(), dryRun: false, json: false, featuredOnly: false, pack: '', kind: '', search: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--json') flags.json = true;
    else if (arg === '--featured') flags.featuredOnly = true;
    else if (arg === '-g' || arg === '--global') flags.scope = 'global';
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if ((arg === '--target' || arg === '-t') && argv[i + 1]) flags.target = argv[++i];
    else if (arg === '--scope' && argv[i + 1]) flags.scope = argv[++i];
    else if ((arg === '--dir' || arg === '-C') && argv[i + 1]) flags.projectDir = argv[++i];
    else if (arg === '--pack' && argv[i + 1]) flags.pack = argv[++i];
    else if (arg === '--kind' && argv[i + 1]) flags.kind = argv[++i];
    else if ((arg === '--search' || arg === '-q') && argv[i + 1]) flags.search = argv[++i];
    else if (arg.startsWith('--target=')) flags.target = arg.slice('--target='.length);
    else if (arg.startsWith('--scope=')) flags.scope = arg.slice('--scope='.length);
    else if (arg.startsWith('--dir=')) flags.projectDir = arg.slice('--dir='.length);
    else if (arg.startsWith('--pack=')) flags.pack = arg.slice('--pack='.length);
    else if (arg.startsWith('--kind=')) flags.kind = arg.slice('--kind='.length);
    else if (arg.startsWith('--search=')) flags.search = arg.slice('--search='.length);
    else positionals.push(arg);
  }
  return { positionals, flags };
}

function printHelp() {
  console.log([
    'Kim Service CLI — Curated AI Agent & Skill Packs',
    '',
    'Usage:',
    '  npx github:KimYx0207/Kim_Service packs',
    '  npx github:KimYx0207/Kim_Service list [--pack <pack-id>] [--kind agent|skill] [--search <keyword>]',
    '  npx github:KimYx0207/Kim_Service info <pack-or-component-id>',
    '  npx github:KimYx0207/Kim_Service install <pack-or-component...> [--target claude|codex|cursor|antigravity|gemini|openclaw] [--scope project|global] [--featured] [--dry-run]',
    '',
    'Examples:',
    '  npx github:KimYx0207/Kim_Service install engineering --target claude --featured',
    '  npx github:KimYx0207/Kim_Service install creator-growth --target antigravity --global',
    '  npx github:KimYx0207/Kim_Service install financial-modeler api-contract-review --target codex'
  ].join('\n'));
}

export function runCli(argv = process.argv.slice(2), options = {}) {
  const { positionals, flags } = parseCliArgs(argv);
  const command = positionals[0] || 'help';
  if (flags.help || command === 'help') {
    printHelp();
    return 0;
  }

  const { packs, components } = loadCatalogData();

  if (command === 'packs') {
    if (flags.json) {
      console.log(JSON.stringify(packs, null, 2));
      return 0;
    }
    console.log('Curated Domain Packs (6 packs · ' + components.length + ' components):\n');
    for (const pack of packs) {
      console.log(`  ${pack.id.padEnd(18)} ${pack.title['zh-CN']} (${pack.components.length} items, ${pack.featured.length} featured)`);
      console.log(`  ${''.padEnd(18)} ${pack.tagline['zh-CN']}`);
      console.log(`  ${''.padEnd(18)} Install: npx github:KimYx0207/Kim_Service install ${pack.id} --featured\n`);
    }
    return 0;
  }

  if (command === 'list') {
    const query = flags.search.trim().toLowerCase();
    const filtered = components.filter(item => {
      if (flags.pack && item.packId !== flags.pack) return false;
      if (flags.kind && item.kind !== flags.kind) return false;
      if (flags.featuredOnly && !item.featured) return false;
      if (query && !`${item.id} ${item.summary} ${item.packId}`.toLowerCase().includes(query)) return false;
      return true;
    });
    if (flags.json) {
      console.log(JSON.stringify(filtered, null, 2));
      return 0;
    }
    console.log(`Components (${filtered.length} / ${components.length}):\n`);
    for (const item of filtered) {
      const star = item.featured ? '★' : ' ';
      const extras = [item.hasScripts ? 'scripts' : '', item.hasExamples ? 'examples' : ''].filter(Boolean).join('+');
      const badge = extras ? ` [${extras}]` : '';
      console.log(` ${star} [${item.kind.padEnd(5)}] ${item.id.padEnd(36)} (${item.packId})${badge}`);
      if (item.summary) console.log(`           ${item.summary}`);
    }
    return 0;
  }

  if (command === 'info') {
    const id = positionals[1];
    if (!id) throw new Error('Usage: kim-service info <pack-or-component-id>');
    const pack = packs.find(item => item.id === id);
    if (pack) {
      console.log(JSON.stringify(pack, null, 2));
      return 0;
    }
    const comp = components.find(item => item.id === id);
    if (!comp) throw new Error(`Unknown pack or component: ${id}`);
    console.log(JSON.stringify(comp, null, 2));
    return 0;
  }

  if (command === 'install' || command === 'add') {
    const selectors = positionals.slice(1);
    if (selectors.length === 0) {
      throw new Error('Specify at least one pack or component ID to install (e.g. "kim-service install engineering --featured").');
    }
    const result = executeInstall({
      selectors,
      target: flags.target,
      scope: flags.scope,
      projectDir: flags.projectDir,
      featuredOnly: flags.featuredOnly,
      dryRun: flags.dryRun,
      env: options.env ?? process.env,
      userHome: options.userHome ?? os.homedir()
    });
    if (flags.json) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }
    console.log(`${result.applied ? 'Installed' : 'Dry-run preview:'} ${result.count} component(s) for ${result.target} (${result.scope} scope):`);
    for (const op of result.operations) {
      console.log(`  - [${op.kind}] ${op.componentId} -> ${op.destinationPath}`);
    }
    return 0;
  }

  throw new Error(`Unknown command "${command}". Run "kim-service --help" for usage.`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = 1;
  }
}
