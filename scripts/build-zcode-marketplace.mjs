#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const AGENTS = Object.freeze(['meta-artisan', 'meta-chrysalis', 'meta-conductor', 'meta-genesis', 'meta-librarian', 'meta-prism', 'meta-scout', 'meta-sentinel', 'meta-warden']);
export const SKILLS = Object.freeze(['agent-teams-playbook', 'find-skill', 'goalpro', 'kim-decision', 'meta-skill-creator']);
export const ROLES = Object.freeze(['frontend-engineer', 'workplace-writer', 'product-architect', 'interaction-designer']);
export const BOUND_METHOD_ROLES = Object.freeze(['product-architect', 'interaction-designer']);
export const MARKETPLACE = 'kim-local-reviewed';
// Exact reviewed content selection. New files require a reviewed builder change.
export const META_FILES = Object.freeze([
  "LICENSE",
  "NOTICE",
  "canonical/agents/meta-artisan.md",
  "canonical/agents/meta-chrysalis.md",
  "canonical/agents/meta-conductor.md",
  "canonical/agents/meta-genesis.md",
  "canonical/agents/meta-librarian.md",
  "canonical/agents/meta-prism.md",
  "canonical/agents/meta-scout.md",
  "canonical/agents/meta-sentinel.md",
  "canonical/agents/meta-warden.md",
  "canonical/skills/meta-theory/SKILL.md",
  "canonical/skills/meta-theory/evals/eval-contract.md",
  "canonical/skills/meta-theory/references/create-agent.md",
  "canonical/skills/meta-theory/references/dev-governance.md",
  "canonical/skills/meta-theory/references/evolution-writeback.md",
  "canonical/skills/meta-theory/references/global-owner-discovery.md",
  "canonical/skills/meta-theory/references/intent-amplification.md",
  "canonical/skills/meta-theory/references/meta-theory.md",
  "canonical/skills/meta-theory/references/outcome-evaluation.md",
  "canonical/skills/meta-theory/references/owner-resolution.md",
  "canonical/skills/meta-theory/references/path-selection.md",
  "canonical/skills/meta-theory/references/planning-files.md",
  "canonical/skills/meta-theory/references/rhythm-orchestration.md",
  "canonical/skills/meta-theory/references/runtime-claude.md",
  "canonical/skills/meta-theory/references/runtime-codex.md",
  "canonical/skills/meta-theory/references/spine-state.md",
  "canonical/skills/meta-theory/references/ten-step-governance.md",
  "canonical/skills/meta-theory/references/verification-evidence.md"
]);
export const KIM_FILES = Object.freeze([
  "LICENSE",
  "NOTICE",
  "agents/frontend-engineer/AGENT.md",
  "agents/frontend-engineer/CHANGELOG.md",
  "agents/frontend-engineer/LICENSE",
  "agents/frontend-engineer/NOTICE",
  "agents/frontend-engineer/README.md",
  "agents/frontend-engineer/capability.json",
  "agents/frontend-engineer/example.json",
  "agents/frontend-engineer/method.json",
  "agents/frontend-engineer/tests/contract.test.mjs",
  "agents/workplace-writer/AGENT.md",
  "agents/workplace-writer/CHANGELOG.md",
  "agents/workplace-writer/LICENSE",
  "agents/workplace-writer/NOTICE",
  "agents/workplace-writer/README.md",
  "agents/workplace-writer/capability.json",
  "agents/workplace-writer/tests/contract.test.mjs",
  "agents/product-architect/AGENT.md",
  "agents/product-architect/CHANGELOG.md",
  "agents/product-architect/LICENSE",
  "agents/product-architect/NOTICE",
  "agents/product-architect/PROVENANCE.md",
  "agents/product-architect/README.md",
  "agents/product-architect/capability.json",
  "agents/product-architect/example.json",
  "agents/product-architect/method.json",
  "agents/product-architect/tests/contract.test.mjs",
  "agents/interaction-designer/AGENT.md",
  "agents/interaction-designer/CHANGELOG.md",
  "agents/interaction-designer/LICENSE",
  "agents/interaction-designer/NOTICE",
  "agents/interaction-designer/PROVENANCE.md",
  "agents/interaction-designer/README.md",
  "agents/interaction-designer/capability.json",
  "agents/interaction-designer/example.json",
  "agents/interaction-designer/method.json",
  "agents/interaction-designer/tests/contract.test.mjs",
  "skills/agent-teams-playbook/.gitattributes",
  "skills/agent-teams-playbook/.gitignore",
  "skills/agent-teams-playbook/CHANGELOG.md",
  "skills/agent-teams-playbook/LICENSE",
  "skills/agent-teams-playbook/NOTICE",
  "skills/agent-teams-playbook/README.md",
  "skills/agent-teams-playbook/README_EN.md",
  "skills/agent-teams-playbook/SKILL.md",
  "skills/agent-teams-playbook/capability.json",
  "skills/agent-teams-playbook/images/二维码基础款.png",
  "skills/agent-teams-playbook/images/微信.jpg",
  "skills/agent-teams-playbook/images/支付宝.jpg",
  "skills/agent-teams-playbook/scripts/install.sh",
  "skills/agent-teams-playbook/tests/fixtures/codex-host-profiles.json",
  "skills/agent-teams-playbook/tests/runtime-contracts.test.mjs",
  "skills/agent-teams-playbook/tests/test_installer.py",
  "skills/find-skill/CHANGELOG.md",
  "skills/find-skill/LICENSE",
  "skills/find-skill/NOTICE",
  "skills/find-skill/README.md",
  "skills/find-skill/README_CN.md",
  "skills/find-skill/SKILL.md",
  "skills/find-skill/capability.json",
  "skills/find-skill/tests/find-skill.behavior.test.mjs",
  "skills/goalpro/.gitignore",
  "skills/goalpro/CHANGELOG.md",
  "skills/goalpro/LICENSE",
  "skills/goalpro/NOTICE",
  "skills/goalpro/README.md",
  "skills/goalpro/SKILL.md",
  "skills/goalpro/capability.json",
  "skills/goalpro/docs/images/alipay.jpg",
  "skills/goalpro/docs/images/contact-qr.png",
  "skills/goalpro/docs/images/wechat-pay.jpg",
  "skills/goalpro/references/examples.md",
  "skills/goalpro/references/source-rules.md",
  "skills/goalpro/tests/behavior.test.mjs",
  "skills/goalpro/tests/boundary.test.mjs",
  "skills/goalpro/tests/governance.test.mjs",
  "skills/kim-decision/.gitattributes",
  "skills/kim-decision/.gitignore",
  "skills/kim-decision/CHANGELOG.md",
  "skills/kim-decision/LICENSE",
  "skills/kim-decision/LICENSE-APACHE",
  "skills/kim-decision/LICENSE-MIT",
  "skills/kim-decision/NOTICE",
  "skills/kim-decision/README.md",
  "skills/kim-decision/README.zh-CN.md",
  "skills/kim-decision/SKILL.md",
  "skills/kim-decision/capability.json",
  "skills/kim-decision/docs/images/alipay.jpg",
  "skills/kim-decision/docs/images/contact-qr.png",
  "skills/kim-decision/docs/images/wechat-pay.jpg",
  "skills/kim-decision/docs/zh-CN/SKILL.md",
  "skills/kim-decision/docs/zh-CN/examples/calibration.md",
  "skills/kim-decision/docs/zh-CN/examples/creation.md",
  "skills/kim-decision/docs/zh-CN/examples/debugging.md",
  "skills/kim-decision/docs/zh-CN/examples/decision.md",
  "skills/kim-decision/docs/zh-CN/references/business.md",
  "skills/kim-decision/docs/zh-CN/references/distillation.md",
  "skills/kim-decision/docs/zh-CN/references/execution.md",
  "skills/kim-decision/docs/zh-CN/references/gates.md",
  "skills/kim-decision/docs/zh-CN/references/master-lens.md",
  "skills/kim-decision/docs/zh-CN/references/method.md",
  "skills/kim-decision/docs/zh-CN/references/models.md",
  "skills/kim-decision/docs/zh-CN/references/output.md",
  "skills/kim-decision/docs/zh-CN/references/path.md",
  "skills/kim-decision/docs/zh-CN/references/verification.md",
  "skills/kim-decision/examples/calibration.md",
  "skills/kim-decision/examples/creation.md",
  "skills/kim-decision/examples/debugging.md",
  "skills/kim-decision/examples/decision.md",
  "skills/kim-decision/references/business.md",
  "skills/kim-decision/references/distillation.md",
  "skills/kim-decision/references/execution.md",
  "skills/kim-decision/references/gates.md",
  "skills/kim-decision/references/master-lens.md",
  "skills/kim-decision/references/method.md",
  "skills/kim-decision/references/models.md",
  "skills/kim-decision/references/output.md",
  "skills/kim-decision/references/path.md",
  "skills/kim-decision/references/verification.md",
  "skills/kim-decision/tests/behavior.test.mjs",
  "skills/kim-decision/tests/boundary.test.mjs",
  "skills/meta-skill-creator/CHANGELOG.md",
  "skills/meta-skill-creator/LICENSE",
  "skills/meta-skill-creator/NOTICE",
  "skills/meta-skill-creator/README.md",
  "skills/meta-skill-creator/SKILL.md",
  "skills/meta-skill-creator/assets/acceptance-run-template.md",
  "skills/meta-skill-creator/assets/domain-research-brief-template.md",
  "skills/meta-skill-creator/assets/host-attestation-template.json",
  "skills/meta-skill-creator/assets/host-event-anchor-template.json",
  "skills/meta-skill-creator/assets/loop-run-record-template.md",
  "skills/meta-skill-creator/assets/multimodal-prompt-brief-template.md",
  "skills/meta-skill-creator/assets/package-plan-template.md",
  "skills/meta-skill-creator/assets/product-design-board-template.md",
  "skills/meta-skill-creator/assets/reviewer-attestation-template.json",
  "skills/meta-skill-creator/assets/skill-contract-template.md",
  "skills/meta-skill-creator/assets/trigger-run-record-template.json",
  "skills/meta-skill-creator/capability.json",
  "skills/meta-skill-creator/docs/images/alipay.jpg",
  "skills/meta-skill-creator/docs/images/contact-qr.png",
  "skills/meta-skill-creator/docs/images/wechat-pay.jpg",
  "skills/meta-skill-creator/evals/trigger-eval.json",
  "skills/meta-skill-creator/examples/example-input.md",
  "skills/meta-skill-creator/examples/example-output.md",
  "skills/meta-skill-creator/references/closed-loop-governance.md",
  "skills/meta-skill-creator/references/evaluation-method.md",
  "skills/meta-skill-creator/references/evidence.md",
  "skills/meta-skill-creator/references/experience-surface-model.md",
  "skills/meta-skill-creator/references/intent-domain-research.md",
  "skills/meta-skill-creator/references/interactive-mvp-product-skill.md",
  "skills/meta-skill-creator/references/multimodal-tooling.md",
  "skills/meta-skill-creator/references/product-design.md",
  "skills/meta-skill-creator/references/release-gate.md",
  "skills/meta-skill-creator/references/skill-contract.md",
  "skills/meta-skill-creator/references/source-abstraction-boundary.md",
  "skills/meta-skill-creator/scripts/check_acceptance_runs.py",
  "skills/meta-skill-creator/scripts/check_closed_loop.py",
  "skills/meta-skill-creator/scripts/check_meta_skill_package.py",
  "skills/meta-skill-creator/scripts/prepare_acceptance_run.py",
  "skills/meta-skill-creator/scripts/run-acceptance.sh",
  "skills/meta-skill-creator/scripts/run-baseline.sh",
  "skills/meta-skill-creator/scripts/test_acceptance_runs.py"
]);
const REPOSITORIES = { meta: 'KimYx0207/Meta_Kim', kim: 'KimYx0207/Kim_Service' };
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const sorted = values => [...values].sort();

function gitEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (/^GIT_(?:DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG(?:_|$))/i.test(key)) delete env[key];
  return { ...env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null' };
}

/** Reject ambiguous paths before any filesystem write. */
export function safeRelative(value) {
  assert(typeof value === 'string' && value.length > 0 && value.length <= 240, 'invalid relative path');
  assert(value.split('/').every(part => /^[\p{L}\p{N}._-][\p{L}\p{N}._ -]*$/u.test(part) && part !== '.' && part !== '..' &&
    !/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)), 'unsafe relative path');
  return value;
}

function noLinks(absolute, file = false) {
  assert(path.isAbsolute(absolute), 'explicit absolute path required');
  const parts = path.resolve(absolute).slice(path.parse(absolute).root.length).split(path.sep).filter(Boolean);
  let current = path.parse(absolute).root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    assert(!stat.isSymbolicLink(), 'symbolic links are unsupported');
    if (current !== path.resolve(absolute) || !file) assert(stat.isDirectory(), 'directory required');
    else assert(stat.isFile() && stat.nlink === 1, 'ordinary unlinked file required');
  }
}

/** Resolve filesystem aliases only after rejecting linked input paths. */
function physicalDirectory(absolute) {
  noLinks(absolute);
  const physical = fs.realpathSync.native(path.resolve(absolute));
  noLinks(physical);
  return physical;
}

function overlaps(a, b) {
  const rel = path.relative(a, b);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

function repositoryIdentity(value) {
  return value.trim().replace(/^git@github\.com:/i, '').replace(/^https:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '').replace(/\/$/, '').toLowerCase();
}

/** Git is used only for local metadata/blobs; filters and fsmonitor cannot execute source commands. */
function gitReader(root) {
  const options = { cwd: root, encoding: null, timeout: 15000, maxBuffer: MAX_BYTES,
    env: gitEnvironment() };
  const nullFile = process.platform === 'win32' ? 'NUL' : '/dev/null';
  const base = ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false',
    '-c', 'core.excludesFile=' + nullFile, '-c', 'core.attributesFile=' + nullFile, '-c', 'submodule.recurse=false'];
  const config = execFileSync('git', [...base, 'config', '--no-includes', '--name-only', '--list'], options).toString('utf8');
  assert(!config.split(/\r?\n/).some(key => /^include(?:if\..+)?\.path$/i.test(key)), 'Git config includes are unsupported');
  const filters = [...new Set(config.split(/\r?\n/).filter(key => /^filter\..+\.(clean|smudge|process|required)$/i.test(key)))];
  assert(filters.length <= 128, 'too many Git filter settings');
  for (const key of filters) {
    assert(!/[\x00-\x20]/.test(key) && key.length <= 512, 'unsupported Git filter key');
    base.push('-c', key + (/\.required$/i.test(key) ? '=false' : '='));
    base.push('-c', key.replace(/\.(clean|smudge|process|required)$/i, '.required') + '=false');
  }
  return args => execFileSync('git', [...base, ...args], options);
}

function sourceSnapshot(root, commit, kind) {
  assert(typeof root === 'string' && path.isAbsolute(root), 'explicit absolute source root required');
  assert(/^[a-f0-9]{40}$/.test(commit ?? ''), 'exact 40-hex source commit required');
  root = physicalDirectory(root);
  const git = gitReader(root);
  const gitRoot = physicalDirectory(git(['rev-parse', '--show-toplevel']).toString().trim());
  assert(path.relative(root, gitRoot) === '', 'source must be repository root');
  assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), commit, 'source HEAD mismatch');
  assert(repositoryIdentity(git(['config', '--get', 'remote.origin.url']).toString()) === REPOSITORIES[kind].toLowerCase(), 'source origin mismatch');
  assert.equal(git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']).length, 0, 'source checkout must be clean');
  const expected = kind === 'meta' ? META_FILES : KIM_FILES;
  const prefixes = kind === 'meta'
    ? ['LICENSE', 'NOTICE', ...AGENTS.map(id => `canonical/agents/${id}.md`), 'canonical/skills/meta-theory']
    : ['LICENSE', 'NOTICE', ...SKILLS.map(id => `skills/${id}`), ...ROLES.map(id => `agents/${id}`)];
  const entries = git(['ls-tree', '-rz', commit, '--', ...prefixes]).toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
    assert(match, 'selected source must contain regular committed files');
    safeRelative(match[3]);
    noLinks(path.join(root, match[3]), true);
    return { mode: match[1], blob: match[2], path: match[3] };
  });
  assert.deepEqual(sorted(entries.map(row => row.path)), sorted(expected), 'selected source closure changed; review the allowlist');
  const versionFile = kind === 'meta' ? 'package.json' : 'VERSION';
  const version = kind === 'meta' ? JSON.parse(git(['show', `${commit}:${versionFile}`])).version : git(['show', `${commit}:${versionFile}`]).toString().trim();
  if (kind === 'meta') assert(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-zA-Z0-9.-]+)?$/.test(version), 'invalid Meta package version');
  else assert(/^V(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), 'invalid Kim VERSION');
  const oids = [...new Set(entries.map(row => row.blob))];
  const payload = execFileSync('git', ['--no-optional-locks', 'cat-file', '--batch'], {
    cwd: root, input: oids.join('\n') + '\n', timeout: 15000, maxBuffer: MAX_BYTES,
    env: gitEnvironment()
  });
  const blobs = new Map();
  let cursor = 0;
  for (const oid of oids) {
    const end = payload.indexOf(10, cursor);
    const header = /^([a-f0-9]{40}) blob (\d+)$/.exec(payload.subarray(cursor, end).toString('ascii'));
    assert(header && header[1] === oid, 'invalid local Git blob response');
    const size = Number(header[2]);
    assert(size <= MAX_FILE_BYTES && end + 1 + size < payload.length, 'source size bound exceeded');
    blobs.set(oid, Buffer.from(payload.subarray(end + 1, end + 1 + size)));
    cursor = end + 1 + size + 1;
  }
  assert.equal(cursor, payload.length, 'unexpected Git blob bytes');
  const files = new Map(entries.map(row => [row.path, blobs.get(row.blob)]));
  return { root, commit, version, git, files, entries,
    metadata: { repository: `https://github.com/${REPOSITORIES[kind]}`, commit,
      tree: git(['rev-parse', `${commit}^{tree}`]).toString().trim(), version } };
}

/** Parse only the name/description forms used by the selected, committed Markdown entries. */
function frontmatter(bytes, expectedName) {
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(bytes.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'));
  assert(match, 'entrypoint frontmatter missing');
  const name = /^name:\s*([^\n]+)$/m.exec(match[1])?.[1].trim().replace(/^['"]|['"]$/g, '');
  assert.equal(name, expectedName, 'entrypoint name mismatch');
  assert(/^description:\s*\S/m.test(match[1]), 'entrypoint description missing');
}

const LIMITS_TEXT = 'Beta compatibility content only; not a formal Meta_Kim Zcode runtime. Packaging is not installation, native Agent invocation, automatic method-file reading, model compliance, tool permission or final acceptance. HookPrompt is deferred: no native Zcode Hook adapter. No Hooks, MCP, Commands, automatic script execution, downloads or dependency installation are registered. Reference scripts and tests are retained as inert source. Preserve existing user and project capabilities.';

/** Build only a fresh caller-named directory from exact, clean, explicitly downloaded Git sources. */
export function buildMarketplace({ metaRoot, metaCommit, kimRoot, kimCommit, outputRoot }) {
  assert(typeof outputRoot === 'string' && path.isAbsolute(outputRoot), 'explicit absolute output required');
  const requestedOutput = path.resolve(outputRoot);
  const parent = physicalDirectory(path.dirname(requestedOutput));
  const output = path.join(parent, path.basename(requestedOutput));
  assert(!fs.existsSync(output), 'output already exists; existing directories are never merged or replaced');
  try { fs.lstatSync(output); assert.fail('output already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const sourceRoots = [metaRoot, kimRoot].map(root => {
    assert(typeof root === 'string' && path.isAbsolute(root), 'explicit absolute source required');
    return physicalDirectory(root);
  });
  for (const root of sourceRoots) {
    assert(!overlaps(root, output) && !overlaps(output, root), 'output must be separate from source roots');
  }
  const meta = sourceSnapshot(sourceRoots[0], metaCommit, 'meta'), kim = sourceSnapshot(sourceRoots[1], kimCommit, 'kim');
  const files = new Map(), copies = [], entrypoints = [], derivedEntrypoints = [];
  const add = (relative, bytes) => { safeRelative(relative); assert(!files.has(relative), 'duplicate output path'); files.set(relative, Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes)); };
  const copy = (source, sourcePath, destination) => {
    const bytes = source.files.get(sourcePath);
    assert(bytes, 'selected file missing');
    add(destination, bytes);
    copies.push({ source: source === meta ? 'meta' : 'kim', sourcePath, destination, bytes: bytes.length, sha256: sha256(bytes), gitBlob: source.entries.find(row => row.path === sourcePath).blob });
  };
  for (const id of AGENTS) {
    const sourcePath = `canonical/agents/${id}.md`;
    frontmatter(meta.files.get(sourcePath), id);
    copy(meta, sourcePath, `plugins/meta-kim-local/agents/${id}.md`);
    entrypoints.push({ plugin: 'meta-kim-local', name: id, qualifiedName: `meta-kim-local:${id}`, path: `agents/${id}.md` });
  }
  for (const [relative] of meta.files) {
    if (relative.startsWith('canonical/skills/meta-theory/')) copy(meta, relative, `plugins/meta-kim-local/skills/meta-theory/${relative.slice('canonical/skills/meta-theory/'.length)}`);
    else if (relative === 'LICENSE' || relative === 'NOTICE') copy(meta, relative, `plugins/meta-kim-local/${relative}`);
  }
  frontmatter(meta.files.get('canonical/skills/meta-theory/SKILL.md'), 'meta-theory');
  for (const [relative] of kim.files) copy(kim, relative, relative.startsWith('agents/') ? `plugins/kim-service-local/components/${relative}` : `plugins/kim-service-local/${relative}`);
  for (const id of SKILLS) frontmatter(kim.files.get(`skills/${id}/SKILL.md`), id);
  for (const id of ROLES) {
    const sourcePath = `agents/${id}/AGENT.md`;
    frontmatter(kim.files.get(sourcePath), id);
    const destination = `plugins/kim-service-local/agents/${id}.md`;
    if (BOUND_METHOD_ROLES.includes(id)) {
      const methodPath = `agents/${id}/method.json`;
      assert.equal(JSON.parse(kim.files.get(methodPath)).roleId, id, 'design method role mismatch');
      const binding = `\n\n## Zcode package resource binding\n\nThis generated entry retains the original role instructions above. For this role, method.json means ../components/agents/${id}/method.json relative to this entry file; never use agents/method.json, which belongs to frontend-engineer. The complete original component, contracts, examples and licenses are in ../components/agents/${id}/. Load only relevant resources through the existing authorized Read tool. This binding adds no tools or permissions.\n`;
      const bytes = Buffer.concat([kim.files.get(sourcePath), Buffer.from(binding)]);
      add(destination, bytes);
      derivedEntrypoints.push({ source: 'kim', sourcePath, sourceGitBlob: kim.entries.find(row => row.path === sourcePath).blob, destination, transform: 'append_explicit_component_method_binding_v1', methodPath: `plugins/kim-service-local/components/${methodPath}`, bytes: bytes.length, sha256: sha256(bytes) });
    } else copy(kim, sourcePath, destination);
    entrypoints.push({ plugin: 'kim-service-local', name: id, qualifiedName: `kim-service-local:${id}`, path: `agents/${id}.md` });
  }
  assert.equal(JSON.parse(kim.files.get('agents/frontend-engineer/method.json')).roleId, 'frontend-engineer', 'frontend method role mismatch');
  copy(kim, 'agents/frontend-engineer/method.json', 'plugins/kim-service-local/agents/method.json');
  assert.equal(copies.length, 195, 'reviewed source copy count changed');
  const manifests = [
    { name: 'meta-kim-local', version: meta.version, description: 'Nine canonical governance agents and complete meta-theory; Beta content.', license: 'Apache-2.0', agents: './agents', skills: './skills' },
    { name: 'kim-service-local', version: kim.version.slice(1) + '.0', description: 'Five complete skills and four professional role components; Beta content.', license: 'MIT', agents: './agents', skills: './skills' }
  ];
  for (const manifest of manifests) {
    add(`plugins/${manifest.name}/.zcode-plugin/plugin.json`, jsonBytes(manifest));
    add(`plugins/${manifest.name}/README.md`, `# ${manifest.name}\n\n${LIMITS_TEXT}\n\nThe source manifest pins repository/commit and every copied file. Each original license and notice is retained. Root licenses do not replace component licenses.\n\nUse qualified agent names. Complete Kim role components live in components/agents/. The unchanged frontend entry mentions method.json; agents/method.json is a byte-identical sidecar of components/agents/frontend-engineer/method.json. No automatic file reading or host tool binding is asserted.\n`);
  }
  add('marketplace.json', jsonBytes({ name: MARKETPLACE, description: 'Pinned Meta_Kim and Kim_Service Beta compatibility content.', plugins: manifests.map(m => ({ name: m.name, source: `./plugins/${m.name}`, version: m.version, description: m.description, strict: true })) }));
  copies.sort((a, b) => a.destination < b.destination ? -1 : a.destination > b.destination ? 1 : 0);
  add('source-manifest.json', jsonBytes({ schemaVersion: 1, kind: 'beta_compatibility_content_not_runtime_certification',
    meta: meta.metadata, kim: kim.metadata, officialPluginDocs: 'https://zcode.z.ai/en/docs/plugin',
    policy: { sourceBytes: 'committed_git_blobs', symlinks: 'rejected', hooks: 'not_registered', mcp: 'not_registered', commands: 'not_registered', hookPrompt: 'deferred_no_native_zcode_adapter', formalMetaZcodeProjection: false, installation: 'not_performed', nativeInvocation: 'not_performed' },
    entrypoints, files: copies, derivedEntrypoints }));
  add('README.md', `# Zcode Beta compatibility content\n\n${LIMITS_TEXT}\n\nMarketplace: ${MARKETPLACE}. Source copies: 195; Generated design-role entrypoints: 2; Agent entrypoints: 13; Skill roots: 6. No third-party loader code, vendor path, credentials or personal installation receipt is included. See source-manifest.json, bundle-manifest.json and each component LICENSE/NOTICE. Official format documentation: https://zcode.z.ai/en/docs/plugin\n\nAfter checking hashes, keep this complete directory at a persistent location you own. Review with the official Zcode plugins validate command before registering it. Normal commands:\n\n    zcode plugins validate <persistent-marketplace-directory>\n    zcode plugins marketplace add <persistent-marketplace-directory> --scope user\n    zcode plugins install meta-kim-local@${MARKETPLACE} -s user\n    zcode plugins install kim-service-local@${MARKETPLACE} -s user\n    zcode plugins list --json\n\nThese are user actions, not actions performed by the builder. Preserve unrelated plugins/capabilities. For existing entries use the normal marketplace refresh and plugins update route. Confirm actual enabled content and qualified names separately; successful install is not native model/Agent acceptance.\n`);
  const closure = [...files].map(([relative, bytes]) => ({ path: relative, bytes: bytes.length, sha256: sha256(bytes) })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  assert(closure.reduce((n, row) => n + row.bytes, 0) <= MAX_BYTES, 'bundle size bound exceeded');
  const closureSha256 = sha256(jsonBytes(closure));
  const bundleManifest = jsonBytes({ schemaVersion: 1, scope: 'all_files_except_bundle_manifest_itself', closureSha256, files: closure });
  // Recheck both sources immediately before the first write; no input program is run.
  for (const source of [meta, kim]) {
    assert.equal(source.git(['rev-parse', 'HEAD']).toString().trim(), source.commit, 'source changed during build');
    assert.equal(source.git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=all']).length, 0, 'source changed during build');
  }
  noLinks(parent);
  fs.mkdirSync(output);
  for (const [relative, bytes] of files) {
    const target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes, { flag: 'wx' });
  }
  fs.writeFileSync(path.join(output, 'bundle-manifest.json'), bundleManifest, { flag: 'wx' });
  return { closureSha256, manifestSha256: sha256(bundleManifest), files: files.size + 1, sourceCopies: copies.length, derivedEntrypoints: derivedEntrypoints.length, agentEntrypoints: entrypoints.length, skillRoots: 6, installed: false, nativeInvocation: false };
}

function parseArguments(args) {
  const names = { '--meta-root': 'metaRoot', '--meta-commit': 'metaCommit', '--kim-root': 'kimRoot', '--kim-commit': 'kimCommit', '--output': 'outputRoot' };
  const result = {};
  assert.equal(args.length, 10, 'provide --meta-root --meta-commit --kim-root --kim-commit --output');
  for (let i = 0; i < args.length; i += 2) {
    const key = names[args[i]];
    assert(key && !Object.hasOwn(result, key) && args[i + 1] && !args[i + 1].startsWith('--'), 'invalid or duplicate argument');
    result[key] = args[i + 1];
  }
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(buildMarketplace(parseArguments(process.argv.slice(2))), null, 2)); }
  catch (error) { console.error(`Marketplace build failed: ${error.message}`); process.exitCode = 1; }
}
