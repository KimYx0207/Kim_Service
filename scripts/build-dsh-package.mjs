#!/usr/bin/env node
/** Deterministic native DSH Skills from the canonical capability catalogue. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { componentFilesSha256, discoverComponents } from './capability-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const portable = (value) => value.split(path.sep).join('/');
const PART_LIMIT = 6000;
const READABLE_RESOURCE = /\.(?:md|mdx|jsonc?|ya?ml|toml|txt|csv|[cm]?js|jsx|tsx?|py|sh|bash|ps1|sql|html?|css|xml|svg)$/iu;
export const DSH_SOURCE_REVISION = 'fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159';

function assertPlainChain(file, missing = false) {
  const absolute = path.resolve(file);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let stat;
    try { stat = fs.lstatSync(current); }
    catch (error) { if (missing && error.code === 'ENOENT') return absolute; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`DSH package paths must not contain links or junctions: ${current}`);
  }
  return absolute;
}

function tree(root) {
  assertPlainChain(root);
  const result = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const item = path.join(dir, entry.name);
      const stat = fs.lstatSync(item);
      if (stat.isSymbolicLink()) throw new Error(`DSH source has a link or junction: ${item}`);
      if (stat.isDirectory()) walk(item);
      else if (stat.isFile()) result.push(item);
      else throw new Error(`DSH source is not a regular file: ${item}`);
    }
  };
  walk(root);
  return result;
}

function addResource(files, file, bytes) {
  if (files.has(file)) throw new Error(`Duplicate DSH resource: ${file}`);
  files.set(file, bytes);
  if (!READABLE_RESOURCE.test(file)) return;
  const text = bytes.toString('utf8');
  if (!Buffer.from(text).equals(bytes)) throw new Error(`DSH readable method resource is not valid UTF-8: ${file}`);
  const parts = [];
  let rest = text;
  do {
    let end = Math.min(PART_LIMIT, rest.length);
    let lineLength = 0; let lines = 1;
    for (let index = 0; index < end; index += 1) {
      if (rest[index] === '\n') { lineLength = 0; if (lines++ >= 120) { end = index + 1; break; } }
      else if (++lineLength >= 1500) { end = index + 1; break; }
    }
    if (end < rest.length && /^[\uDC00-\uDFFF]$/u.test(rest[end])) end -= 1;
    if (rest[end - 1] === '\r' && rest[end] === '\n') end -= 1;
    const content = rest.slice(0, end);
    const name = `${String(parts.length + 1).padStart(4, '0')}.${file.endsWith('.md') ? 'md' : 'txt'}`;
    files.set(`${file}.dsh-parts/${name}`, Buffer.from(content));
    parts.push({ path: name, characters: content.length, sha256: hash(Buffer.from(content)) });
    rest = rest.slice(end);
  } while (rest.length);
  const index = { schemaVersion: 1, original: `../${path.posix.basename(file)}`, sha256: hash(bytes) };
  if (parts.length <= 20) index.parts = parts;
  else {
    index.pages = [];
    for (let offset = 0; offset < parts.length; offset += 20) {
      const name = `index-${String(index.pages.length + 1).padStart(4, '0')}.json`;
      const content = Buffer.from(json({ schemaVersion: 1, parts: parts.slice(offset, offset + 20) }));
      files.set(`${file}.dsh-parts/${name}`, content);
      index.pages.push({ path: name, sha256: hash(content) });
    }
  }
  const indexBytes = Buffer.from(json(index));
  if (indexBytes.toString('utf8').length > 5000) throw new Error(`DSH readable index needs a smaller resource: ${file}`);
  files.set(`${file}.dsh-parts/index.json`, indexBytes);
}

function skillName(id) {
  const candidate = `kim-${id}`;
  return candidate.length <= 64 ? candidate : `${candidate.slice(0, 51)}-${hash(Buffer.from(id)).slice(0, 12)}`;
}

function skill(files, name, description, body) {
  if (!/^[a-z][a-z0-9-]{0,63}$/u.test(name)) throw new Error(`Invalid native DSH skill name: ${name}`);
  if (body.length > PART_LIMIT) throw new Error(`DSH entry exceeds ${PART_LIMIT} characters: ${name}`);
  const target = `skills/${name}/SKILL.md`;
  if (files.has(target)) throw new Error(`Duplicate native DSH skill name: ${name}`);
  files.set(target, Buffer.from(`---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n${body.trim()}\n`));
}

export function buildDshFiles(root = ROOT) {
  const sourceRoot = assertPlainChain(root);
  const components = discoverComponents(sourceRoot).filter(({ contract }) => ['agent', 'skill'].includes(contract.componentType));
  if (!components.length) throw new Error('No canonical agent or skill components were found');
  const files = new Map();
  const names = new Set(['kim-service']);
  const catalog = [];
  for (const component of components) {
    const { contract, path: componentPath, entrypoint, contentSha256 } = component;
    const name = skillName(contract.id);
    if (names.has(name)) throw new Error(`DSH skill name collision: ${name}`);
    names.add(name);
    const copied = [];
    for (const file of tree(path.join(sourceRoot, componentPath))) {
      const rel = portable(path.relative(sourceRoot, file));
      const bytes = fs.readFileSync(file);
      copied.push({ relativePath: portable(path.relative(path.join(sourceRoot, componentPath), file)), contents: bytes });
      addResource(files, `skills/kim-service/source/${rel}`, bytes);
    }
    if (componentFilesSha256(copied) !== contentSha256) throw new Error(`Canonical component changed during DSH build: ${contract.id}`);
    const primary = `skills/kim-service/source/${componentPath}/${entrypoint}`;
    const parts = files.get(`${primary}.dsh-parts/index.json`);
    if (!parts) throw new Error(`DSH component entrypoint must be Markdown: ${entrypoint}`);
    const index = JSON.parse(parts);
    const original = path.posix.relative(`skills/${name}`, primary);
    const contractRef = path.posix.relative(`skills/${name}`, `skills/kim-service/source/${componentPath}/capability.json`);
    const method = {
      schemaVersion: 1, componentId: contract.id, componentType: contract.componentType,
      componentVersion: contract.componentVersion, componentContentSha256: contentSha256,
      original, capabilityContract: contractRef, sourceSha256: index.sha256,
      partsIndex: `${original}.dsh-parts/index.json`, capabilityContractIndex: `${contractRef}.dsh-parts/index.json`,
      ...(files.has(`skills/kim-service/source/${componentPath}/method.json`) ? { componentMethodIndex: `${path.posix.relative(`skills/${name}`, `skills/kim-service/source/${componentPath}/method.json`)}.dsh-parts/index.json` } : {}),
    };
    files.set(`skills/${name}/method.json`, Buffer.from(json(method)));
    const body = `# ${contract.id}\n\n` +
      `Resolve resources relative to this skill's base directory. Read \`method.json\`, then its \`partsIndex\`, \`capabilityContractIndex\` and \`componentMethodIndex\` when present. Read every listed index page and every part in order before acting. Together they contain the complete primary method, capability contract and professional method contract, including required inputs, outputChecks and acceptance rules. This short loader is not that expertise. Resolve links in each part against its original source file's directory; index page/part paths are relative to their index directory.\n\n` +
      `The original capability contract is \`${contractRef}\`; do not read a large contract as one tool result. Match the actual request to useWhen/doNotUseWhen. Gather applicable knowledge, executable validation and declared output contracts before work. The full component tree is under \`../kim-service/source/${componentPath}/\`, including methods, rubrics, fixtures, scripts, assets and licenses/notices. Markdown, JSON, YAML, TOML, text, CSV and supported text-source files (including JavaScript/TypeScript, Python, shell, PowerShell, SQL, HTML/CSS and SVG) have sibling \`<filename>.dsh-parts/index.json\` views. Read all pages/parts for any required rule, contract or selected executable source review; never infer omitted fields or validation code. Run the unchanged original script, never a split view. Parts also bound line length and line count to avoid the native read tool's own truncation.\n\n` +
      `Bind the current task's real tools, credentials and permissions to the required slots. Missing, denied or unverified capabilities remain explicit. A dependency's name or a successful package build does not prove it is installed or authorized. Do not claim an external browser, computer-control, MCP or production action occurred without an actual receipt.\n\n` +
      `If delegation is available, use the host's actual subagent tool with the current preset inherited. Supply this skill, complete method paths, task inputs, scope, output contract, evidence requirements, acceptance criteria and reviewer. Do not pass this role name as agentPreset: this package registers native Skills, not custom native agent presets. The native start receipt is not completion; wait for and review the terminal result. Independent work can continue while another branch awaits its own required human decision.\n\n` +
      `Apply each capability's humanGate and validation rules. Return concrete artifacts and evidence for each criterion, plus unresolved items and next actions. Do not self-certify high-stakes factual advice, user approval, deployment or business outcomes. Installed instructions are not Hook enforcement or native model acceptance.\n`;
    skill(files, name, contract.capabilities.map((capability) => capability.summary).join(' ').slice(0, 450), body);
    catalog.push({ id: contract.id, componentType: contract.componentType, componentVersion: contract.componentVersion, skill: name, method: `../${name}/method.json`, contract: `source/${componentPath}/capability.json`, capabilities: contract.capabilities.map(({ id, summary, useWhen, doNotUseWhen }) => ({ id, summary, useWhen, doNotUseWhen })) });
  }
  for (const name of ['LICENSE', 'NOTICE']) {
    const source = path.join(sourceRoot, name);
    if (fs.existsSync(source)) { assertPlainChain(source); files.set(`skills/kim-service/source/${name}`, fs.readFileSync(source)); }
  }
  // Component READMEs may reference the canonical contact/payment images via
  // ../../docs/images rather than keeping another binary copy in every skill.
  // Preserve those declared shared assets at the same source-relative paths.
  const catalogPath = path.join(sourceRoot, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    assertPlainChain(catalogPath);
    for (const asset of JSON.parse(fs.readFileSync(catalogPath, 'utf8')).assets ?? []) {
      if (typeof asset.path !== 'string' || !/^docs\/images\/[^/\\]+\.(?:png|jpe?g|webp|gif|svg)$/iu.test(asset.path)) throw new Error('Invalid shared public asset path');
      const source = assertPlainChain(path.join(sourceRoot, asset.path));
      if (!fs.statSync(source).isFile()) throw new Error('Shared public asset must be a regular file');
      const bytes = fs.readFileSync(source);
      if (hash(bytes) !== asset.sha256) throw new Error(`Shared public asset hash differs: ${asset.path}`);
      addResource(files, `skills/kim-service/source/${asset.path}`, bytes);
    }
  }
  addResource(files, 'skills/kim-service/catalog.json', Buffer.from(json({ schemaVersion: 1, components: catalog })));
  skill(files, 'kim-service', 'Find Kim_Service professional methods for software, product/design, research, commerce, workplace, education and content work; inspect contracts and load the selected complete method before delivery.', `# Kim_Service professional methods\n\nRead \`catalog.json.dsh-parts/index.json\`, its index pages and relevant bounded catalogue parts; match the actual request to the declared capability contracts. The catalogue contains ${components.length} dynamically discovered canonical agent/skill components. Search or read bounded portions of the catalogue; do not load every method for one task. Each entry names a native DSH skill, its method manifest and the complete capability contract.\n\nLoad the selected native skill with DSH's actual skill tool, then read every primary-method part and relevant references before acting. Use the original source directory as the base for links. All selected components retain their full resource trees under \`source/agents\` and \`source/skills\`; root and component licenses/notices remain present. Catalogue presence is not permission or proof of expertise.\n\nDo not create a durable governance owner from a business method. Meta_Kim's nine governance roles stay separate. A DSH subagent inherits the current preset unless the host explicitly configures another; this package does not define custom presets, hard Hooks, model credentials or executable MCP services. Bind those actual capabilities through the host and preserve missing/denied states. Review real outputs against the method's criterion-level evidence, not the number of installed files.\n`);
  const inventoryPath = 'skills/kim-service/projection.json';
  files.set(inventoryPath, Buffer.from(json({ schemaVersion: 1, kind: 'kim-service-dsh-content-index', expectedPaths: [...files.keys(), inventoryPath].sort() })));
  const manifest = {
    schemaVersion: 1, kind: 'kim-service-dsh-skills',
    upstream: { repository: 'https://github.com/deepseek-ai/deepseek-harness', revision: DSH_SOURCE_REVISION, reviewedVersion: '0.2.2-rc.1', minimumNodeVersion: '24.9.0' },
    nativeSkills: true, nativeCustomAgentPresets: false, nativeHookEnforcement: false,
    componentCount: components.length, skillCount: names.size,
    components: catalog.map(({ id, componentType, componentVersion, skill: nativeSkill }) => ({ id, componentType, componentVersion, skill: nativeSkill })),
    files: [...files].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([file, bytes]) => ({ path: file, size: bytes.length, sha256: hash(bytes) })),
  };
  return { files, manifest };
}

export function writeDshPackage({ root = ROOT, output, check = false } = {}) {
  if (!output) throw new Error('An explicit --output directory is required');
  const destination = assertPlainChain(output, true);
  const { files, manifest } = buildDshFiles(root);
  const expected = new Map([...files, ['dsh-package.json', Buffer.from(json(manifest))]]);
  if (check) {
    const actual = tree(destination).map((file) => portable(path.relative(destination, file))).sort();
    if (json(actual) !== json([...expected.keys()].sort())) throw new Error('DSH package file closure differs from current source');
    for (const [file, bytes] of expected) if (!fs.readFileSync(path.join(destination, file)).equals(bytes)) throw new Error(`DSH package is stale or changed: ${file}`);
    return { status: 'verified_package', output: destination, componentCount: manifest.componentCount, skillCount: manifest.skillCount, fileCount: expected.size, nativeExecutionVerified: false };
  }
  if (fs.existsSync(destination)) throw new Error('Output already exists; use --check or choose a fresh directory. Existing files are never removed by this builder.');
  const parent = path.dirname(destination);
  assertPlainChain(parent);
  if (!fs.statSync(parent).isDirectory()) throw new Error('DSH output parent must be an existing directory');
  const stage = path.join(parent, `.kim-service-dsh-${randomUUID()}`);
  fs.mkdirSync(stage);
  try {
    for (const [file, bytes] of expected) { const target = path.join(stage, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes, { flag: 'wx' }); }
    assertPlainChain(parent);
    if (fs.existsSync(destination)) throw new Error('Output appeared concurrently; refusing to replace it');
    fs.renameSync(stage, destination);
  } finally { if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true }); }
  return { status: 'built_package', output: destination, componentCount: manifest.componentCount, skillCount: manifest.skillCount, fileCount: expected.size, nativeExecutionVerified: false };
}

export function runCli(argv = process.argv.slice(2)) {
  if (!argv.length || argv.includes('--help')) { console.log('node scripts/build-dsh-package.mjs --output /absolute/fresh/directory [--root PATH] [--check]\nBuild native DSH Skills from all declared canonical agents and skills; preserve complete methods/resources and licenses. No installation or model call.'); return; }
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--check') options.check = true;
    else if (['--root', '--output'].includes(argv[index])) { const key = argv[index].slice(2); const value = argv[++index]; if (!value || value.startsWith('--')) throw new Error(`--${key} requires a value`); options[key] = value; }
    else throw new Error(`Unknown option: ${argv[index]}`);
  }
  console.log(json(writeDshPackage(options)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { runCli(); } catch (error) { console.error(`build-dsh-package: ${error.message}`); process.exitCode = 1; }
}
