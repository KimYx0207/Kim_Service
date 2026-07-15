#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  findBlockingReleaseTag,
  inspectReleaseChangelog,
  parsePublicVersion
} from './release-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PATH = path.join(ROOT, 'catalog.json');
const SELF_PATH = 'scripts/check-repository.mjs';
const RELEASE_MODE = process.argv.includes('--release');
const errors = [];
const files = [];
const directories = [];

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function fail(message) {
  errors.push(message);
}

function isInsideRoot(absolutePath) {
  const relativePath = path.relative(ROOT, absolutePath);
  return relativePath !== '' &&
    !relativePath.startsWith('..' + path.sep) &&
    relativePath !== '..' &&
    !path.isAbsolute(relativePath);
}

function walk(absoluteDirectory, relativeDirectory = '') {
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = normalize(path.join(relativeDirectory, entry.name));
    const absolutePath = path.join(absoluteDirectory, entry.name);

    if (relativePath === '.git') {
      continue;
    }

    if (entry.name === '.git') {
      fail('Nested .git is forbidden: ' + relativePath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      fail('Symbolic links and junctions are forbidden: ' + relativePath);
      continue;
    }

    if (entry.isDirectory()) {
      directories.push(relativePath);
      walk(absolutePath, relativePath);
      continue;
    }

    if (entry.isFile()) {
      files.push(relativePath);
    }
  }
}

function readCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    fail('Missing catalog.json');
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  } catch (error) {
    fail('Invalid catalog.json: ' + error.message);
    return null;
  }
}

function git(args, options = {}) {
  return spawnSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
}

function normalizeGitHubRemote(value) {
  return String(value || '')
    .trim()
    .replace(/^git@github\.com:/i, 'github.com/')
    .replace(/^ssh:\/\/git@github\.com\//i, 'github.com/')
    .replace(/^https?:\/\/github\.com\//i, 'github.com/')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

function checkReleaseReadiness(catalog) {
  const unknownArguments = process.argv.slice(2).filter((item) => item !== '--release');
  if (unknownArguments.length) {
    fail('Unknown release-check arguments: ' + unknownArguments.join(', '));
  }
  if (!RELEASE_MODE) return;

  const release = catalog?.release ?? {};
  const versionPath = path.join(ROOT, release.versionFile ?? 'VERSION');
  let version = '';
  let parsedVersion = null;
  if (!fs.existsSync(versionPath) || !fs.statSync(versionPath).isFile()) {
    fail('Release readiness requires root VERSION');
  } else {
    version = fs.readFileSync(versionPath, 'utf8').trim();
    parsedVersion = parsePublicVersion(version);
    if (!parsedVersion) {
      fail('VERSION must match V<major>.<minor> without leading zeroes: ' + version);
    }
  }

  const changelogPath = path.join(ROOT, release.changelogFile ?? 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath) || !fs.statSync(changelogPath).isFile()) {
    fail('Release readiness requires root CHANGELOG.md');
  } else if (version) {
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    for (const error of inspectReleaseChangelog(changelog, version).errors) {
      fail(error);
    }
  }

  const head = git(['rev-parse', '--verify', 'HEAD']);
  if (head.status !== 0) {
    fail('Release readiness requires a release commit (HEAD is missing)');
  }

  const branch = git(['branch', '--show-current']);
  const expectedBranch = release.branch ?? 'main';
  if (branch.status !== 0 || branch.stdout.trim() !== expectedBranch) {
    fail('Release readiness requires branch ' + expectedBranch);
  }

  const remoteName = release.remoteName ?? 'origin';
  const repository = release.repository ?? catalog?.repository ?? '';
  const expectedRemote = normalizeGitHubRemote(
    /^(?:https?:\/\/|ssh:\/\/|git@)/i.test(repository)
      ? repository
      : 'https://github.com/' + repository
  );
  for (const remoteKind of [
    { label: 'fetch', args: ['remote', 'get-url', '--all', remoteName] },
    { label: 'push', args: ['remote', 'get-url', '--push', '--all', remoteName] }
  ]) {
    const remote = git(remoteKind.args);
    const urls = remote.stdout.split(/\r?\n/).filter(Boolean);
    if (remote.status !== 0 || urls.length === 0) {
      fail('Release readiness requires ' + remoteName + ' ' + remoteKind.label + ' URL');
      continue;
    }
    for (const url of urls) {
      if (normalizeGitHubRemote(url) !== expectedRemote) {
        fail(remoteName + ' ' + remoteKind.label + ' URL does not match ' + (release.repository ?? catalog?.repository));
        break;
      }
    }
  }

  const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
  if (status.status !== 0) {
    fail('Unable to inspect release working tree');
  } else if (status.stdout.trim()) {
    fail('Release readiness requires a clean working tree after the release commit');
  }

  if (parsedVersion) {
    const proposedTag = version;
    const tags = git(['tag', '--list']);
    if (tags.status !== 0) {
      fail('Unable to inspect local release tags');
    } else {
      const releaseTags = tags.stdout.split(/\r?\n/).filter(Boolean);
      const blockingTag = findBlockingReleaseTag(releaseTags, proposedTag);
      if (blockingTag === proposedTag) {
        fail('Proposed release tag already exists locally: ' + proposedTag);
      } else if (blockingTag) {
        fail('VERSION must be greater than existing release tag ' + blockingTag);
      }
    }
  }
}

function checkGitRepository(catalog) {
  if (!fs.existsSync(path.join(ROOT, '.git'))) {
    fail('Root .git is missing; run git init -b main');
    return;
  }

  const staged = git(['ls-files', '--stage']);
  if (staged.status !== 0) {
    fail('Unable to inspect Git index');
  } else {
    const declared = new Set(catalog?.declaredGitlinks ?? []);
    for (const line of staged.stdout.split(/\r?\n/).filter(Boolean)) {
      const match = line.match(/^160000 [0-9a-f]+ [0-3]\t(.+)$/);
      if (match && !declared.has(normalize(match[1]))) {
        fail('Undeclared gitlink: ' + normalize(match[1]));
      }
    }
  }

  if (fs.existsSync(path.join(ROOT, '.gitmodules')) &&
      (catalog?.declaredGitlinks ?? []).length === 0) {
    fail('.gitmodules exists but catalog declares no gitlinks');
  }

  const trackedIgnored = git(['ls-files', '-ci', '--exclude-standard']);
  if (trackedIgnored.status !== 0) {
    fail('Unable to inspect tracked/ignored conflicts');
  } else if (trackedIgnored.stdout.trim()) {
    fail('Tracked files are also ignored: ' +
      trackedIgnored.stdout.trim().split(/\r?\n/).join(', '));
  }

  const checkIgnore = git(
    ['check-ignore', '--no-index', '-z', '--stdin'],
    { input: files.join('\0') + '\0' }
  );
  if (checkIgnore.status !== 0 && checkIgnore.status !== 1) {
    fail('Unable to check ignored repository files');
  } else {
    const ignored = checkIgnore.stdout.split('\0').filter(Boolean);
    if (ignored.length) {
      fail('Repository files would be ignored by Git: ' + ignored.join(', '));
    }
  }
}

function componentTreeSha256(absoluteComponentPath) {
  const componentFiles = [];
  function collect(absoluteDirectory, relativeDirectory = '') {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relativePath = normalize(path.join(relativeDirectory, entry.name));
      const absolutePath = path.join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) {
        collect(absolutePath, relativePath);
      } else if (entry.isFile()) {
        componentFiles.push(relativePath);
      }
    }
  }
  collect(absoluteComponentPath);
  componentFiles.sort((left, right) => left.localeCompare(right, 'en'));
  const hash = crypto.createHash('sha256');
  for (const relativePath of componentFiles) {
    hash.update(relativePath, 'utf8');
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(absoluteComponentPath, ...relativePath.split('/'))));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function checkCatalog(catalog) {
  if (!catalog) {
    return;
  }

  if (catalog.componentCount !== 9 || catalog.components?.length !== 9) {
    fail('Catalog must declare exactly 9 components');
  }

  if (catalog.repository !== 'KimYx0207/Kim_Service') {
    fail('Catalog repository must be KimYx0207/Kim_Service');
  }
  const expectedRelease = {
    repository: 'KimYx0207/Kim_Service',
    remoteName: 'origin',
    branch: 'main',
    versionFile: 'VERSION',
    changelogFile: 'CHANGELOG.md',
    versionPattern: '^V(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)$',
    tagEqualsVersion: true,
    releaseTitleEqualsVersion: true
  };
  for (const [key, expected] of Object.entries(expectedRelease)) {
    if (catalog.release?.[key] !== expected) {
      fail('Catalog release contract mismatch for ' + key);
    }
  }

  const ids = new Set();
  const paths = new Set();

  for (const component of catalog.components ?? []) {
    if (!component.id || ids.has(component.id)) {
      fail('Duplicate or missing component id: ' + String(component.id));
    }
    ids.add(component.id);

    const componentPath = normalize(component.path ?? '');
    if (!componentPath || paths.has(componentPath)) {
      fail('Duplicate or missing component path: ' + componentPath);
    }
    paths.add(componentPath);

    if (!Array.isArray(component.required)) {
      fail('Catalog component required must be an array: ' + componentPath);
    }
    if (!Array.isArray(component.validation) ||
        component.validation.some((command) => typeof command !== 'string' || !command.trim())) {
      fail('Catalog component validation must be an array of non-empty commands: ' + componentPath);
    }

    const absoluteComponentPath = path.resolve(ROOT, componentPath);
    if (!isInsideRoot(absoluteComponentPath) ||
        !fs.existsSync(absoluteComponentPath) ||
        !fs.statSync(absoluteComponentPath).isDirectory()) {
      fail('Missing component directory: ' + componentPath);
      continue;
    }

    for (const requiredPath of component.required ?? []) {
      const absoluteRequiredPath = path.resolve(
        absoluteComponentPath,
        requiredPath
      );
      if (!isInsideRoot(absoluteRequiredPath) ||
          !fs.existsSync(absoluteRequiredPath)) {
        fail('Missing required component file: ' +
          componentPath + '/' + requiredPath);
      }
    }

    if (!/^[0-9a-f]{64}$/.test(String(component.contentSha256 ?? ''))) {
      fail('Catalog component lacks a valid contentSha256: ' + componentPath);
    } else {
      const actualComponentHash = componentTreeSha256(absoluteComponentPath);
      if (actualComponentHash !== component.contentSha256) {
        fail('Catalog component content hash drift: ' + componentPath);
      }
    }

    const publicFiles = component.kind === 'skill'
      ? ['SKILL.md', 'README.md', 'LICENSE', 'CHANGELOG.md', 'NOTICE']
      : component.kind === 'hook'
        ? ['README.md', 'LICENSE', 'CHANGELOG.md', 'NOTICE']
        : null;
    if (!publicFiles) {
      fail('Unsupported catalog component kind: ' + String(component.kind));
    } else {
      for (const publicFile of publicFiles) {
        const absolutePublicFile = path.join(absoluteComponentPath, publicFile);
        if (!fs.existsSync(absolutePublicFile) || !fs.statSync(absolutePublicFile).isFile()) {
          fail('Self-contained component is missing ' + publicFile + ': ' + componentPath);
        }
        if (!(component.required ?? []).includes(publicFile)) {
          fail('Catalog required list must include ' + publicFile + ': ' + componentPath);
        }
      }
    }

    const changelogPath = path.join(absoluteComponentPath, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const changelog = fs.readFileSync(changelogPath, 'utf8');
      const source = String(component.source ?? '');
      const revision = String(component.revision ?? '');
      const provenanceNeedle = source.startsWith('canonical:')
        ? source.slice('canonical:'.length)
        : revision.split('+')[0];
      if (!provenanceNeedle || !changelog.includes(provenanceNeedle)) {
        fail('Component CHANGELOG must record catalog provenance: ' + componentPath);
      }
    }
  }

  const declaredHooks = new Set(
    [...paths].filter((item) => item.startsWith('hooks/'))
  );
  const declaredSkills = new Set(
    [...paths].filter((item) => item.startsWith('skills/'))
  );

  if (declaredHooks.size !== 1 || declaredSkills.size !== 8) {
    fail('Catalog must contain 1 hook and 8 skills');
  }

  for (const group of ['hooks', 'skills']) {
    const groupPath = path.join(ROOT, group);
    if (!fs.existsSync(groupPath)) {
      fail('Missing component group: ' + group);
      continue;
    }

    const actual = fs.readdirSync(groupPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => group + '/' + entry.name);
    const declared = group === 'hooks' ? declaredHooks : declaredSkills;

    for (const actualPath of actual) {
      if (!declared.has(actualPath)) {
        fail('Undeclared component directory: ' + actualPath);
      }
    }
    for (const declaredPath of declared) {
      if (!actual.includes(declaredPath)) {
        fail('Catalog component is absent: ' + declaredPath);
      }
    }
  }

  const runtimeNames = new Set(['.agents', '.claude', '.codex']);
  const allowed = new Set(catalog.allowedRuntimeDirectories ?? []);
  for (const directory of directories) {
    if (runtimeNames.has(path.posix.basename(directory)) &&
        !allowed.has(directory)) {
      fail('Runtime projection directory is not allowed: ' + directory);
    }
  }
}

function isTextFile(relativePath, buffer) {
  if (buffer.includes(0)) {
    return false;
  }

  const basename = path.posix.basename(relativePath);
  if (['LICENSE', 'LICENSE-MIT', 'LICENSE-APACHE', 'NOTICE'].includes(basename)) {
    return true;
  }

  return new Set([
    '.cjs', '.css', '.gitattributes', '.gitignore', '.html', '.js', '.json',
    '.md', '.mjs', '.ps1', '.py', '.sh', '.toml', '.ts', '.txt', '.xml',
    '.yaml', '.yml'
  ]).has(path.posix.extname(relativePath).toLowerCase()) || path.posix.extname(relativePath) === '';
}

const credentialAssignmentPattern = /(?:^|[\s,{])["']?([A-Za-z][A-Za-z0-9_-]*)["']?\s*[:=]\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|(\$\{[^}\r\n]+\}|[^\s,;#}\]\r\n]+))/gim;

function normalizeCredentialKey(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toUpperCase();
}

function isCredentialKey(key) {
  return /(?:^|_)(?:API_KEY|ACCESS_TOKEN|TOKEN|CLIENT_SECRET|SECRET|PASSWORD)$/.test(
    normalizeCredentialKey(key)
  );
}

function isPlaceholderCredentialValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  return /^<[^>]+>$/.test(value) ||
    /^\$\{[^}]+}$/.test(value) ||
    /^(?:your|example|sample|dummy|placeholder|replace[_-]?me|change[_-]?me|test|fake)(?:[_-].*)?$/.test(lower) ||
    /^(?:x{4,}|\*{4,})$/i.test(value) ||
    /^(?:sk-|gh[pousr]_|github_pat_|xox[baprs]-|npm_|hf_|aiza)(?:your|example|sample|dummy|placeholder|test|fake)[-_a-z0-9]*$/i.test(value);
}

function findCredentialAssignment(text) {
  credentialAssignmentPattern.lastIndex = 0;
  for (const match of text.matchAll(credentialAssignmentPattern)) {
    const [, key, doubleQuoted, singleQuoted, unquoted] = match;
    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
    if (isCredentialKey(key) && !isPlaceholderCredentialValue(value)) {
      return key;
    }
  }
  return null;
}

function assertSensitiveScannerRegressions() {
  const positive = [
    'SILICONFLOW_API_KEY=REALVALUE123456',
    'MCPR_TOKEN=REALVALUE123456',
    'clientSecret: abcdefghijklmnop'
  ];
  const negative = [
    'API_KEY=your_api_key',
    'MCPR_TOKEN=<your-token>',
    'PASSWORD=${PASSWORD}',
    'clientSecret: "example_secret"'
  ];
  for (const fixture of positive) {
    if (!findCredentialAssignment(fixture)) {
      fail('Credential scanner missed its positive regression fixture');
    }
  }
  for (const fixture of negative) {
    if (findCredentialAssignment(fixture)) {
      fail('Credential scanner rejected its placeholder regression fixture');
    }
  }
}

function checkSensitiveFiles() {
  assertSensitiveScannerRegressions();
  const forbiddenKeyNames = /^(id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i;
  const forbiddenKeyExtensions = new Set(['.key', '.p12', '.pfx', '.pem']);
  const allowedGenericUsers = new Set([
    'default', 'example', 'public', 'user', 'username', 'your-name', 'yourname'
  ]);
  const tokenPatterns = [
    ['AWS access key', /AKIA[0-9A-Z]{16}/g],
    ['GitHub token', /(?:gh[oprsu]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g],
    ['OpenAI or Anthropic token', /sk-(?:ant-)?[A-Za-z0-9_-]{24,}/g],
    ['Google API key', /AIza[0-9A-Za-z_-]{35}/g],
    ['Slack token', /xox[baprs]-[0-9A-Za-z-]{20,}/g]
  ];

  for (const relativePath of files) {
    const basename = path.posix.basename(relativePath);
    const extension = path.posix.extname(relativePath).toLowerCase();

    if (basename === '.env' || basename.startsWith('.env.')) {
      fail('Environment file is forbidden: ' + relativePath);
    }

    if (forbiddenKeyNames.test(basename) ||
        forbiddenKeyExtensions.has(extension)) {
      fail('Private-key-like file is forbidden: ' + relativePath);
    }

    if (relativePath === SELF_PATH) {
      continue;
    }

    const absolutePath = path.join(ROOT, relativePath);
    const buffer = fs.readFileSync(absolutePath);
    if (!isTextFile(relativePath, buffer)) {
      continue;
    }

    const text = buffer.toString('utf8');

    if (/-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/.test(text)) {
      fail('Private key content is forbidden: ' + relativePath);
    }

    for (const [label, pattern] of tokenPatterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        if (!isPlaceholderCredentialValue(match[0])) {
          fail(label + ' pattern found in ' + relativePath);
          break;
        }
      }
    }

    const credentialKey = findCredentialAssignment(text);
    if (credentialKey) {
      fail('Credential assignment (' + credentialKey + ') found in ' + relativePath);
    }

    if (/[A-Za-z]:[\\/]+KimProject(?:[\\/]|$)/i.test(text)) {
      fail('Machine-specific KimProject path found in ' + relativePath);
    }

    const windowsUsers = /[A-Za-z]:[\\/]+Users[\\/]+([^\\/\s"'<>|]+)/gi;
    for (const match of text.matchAll(windowsUsers)) {
      if (!allowedGenericUsers.has(match[1].toLowerCase())) {
        fail('Machine-specific Windows user path found in ' + relativePath);
      }
    }

    const unixUsers = /\/(?:Users|home)\/([^/\s"'<>|]+)\//g;
    for (const match of text.matchAll(unixUsers)) {
      if (!allowedGenericUsers.has(match[1].toLowerCase())) {
        fail('Machine-specific Unix user path found in ' + relativePath);
      }
    }
  }
}

function sha256(absolutePath) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(absolutePath))
    .digest('hex');
}

function stripFencedCodeBlocks(text) {
  return text.replace(
    /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2(?=\s*(?:\n|$))/g,
    (block) => block.replace(/[^\r\n]/g, ' ')
  );
}

function htmlAttribute(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '\\s*=\\s*(["\\\'])(.*?)\\1', 'i'));
  return match ? match[2] : null;
}

function htmlImages(text) {
  return [...text.matchAll(/<img\b[^>]*\/?\s*>/gi)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    tag: match[0],
    src: htmlAttribute(match[0], 'src'),
    alt: htmlAttribute(match[0], 'alt'),
    width: htmlAttribute(match[0], 'width')
  }));
}

function htmlBlocks(text, tagName) {
  const pattern = new RegExp('<' + tagName + '\\b[^>]*>[\\s\\S]*?<\\/' + tagName + '>', 'gi');
  return [...text.matchAll(pattern)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
    openTag: match[0].slice(0, match[0].indexOf('>') + 1),
    text: match[0]
  }));
}

function blockContains(block, positions) {
  return positions.every((position) => position >= block.start && position < block.end);
}

function validateReadmeLayoutMetadata(catalog) {
  const layout = catalog?.readmeLayout;
  if (
    !layout ||
    layout.schemaVersion !== 1 ||
    typeof layout.rootDocumentPattern !== 'string' ||
    typeof layout.componentDocumentPattern !== 'string' ||
    !Array.isArray(layout.groups) ||
    layout.groups.length === 0
  ) {
    fail('Catalog readmeLayout must define schemaVersion 1, document patterns, and groups');
    return null;
  }

  for (const patternSource of [layout.rootDocumentPattern, layout.componentDocumentPattern]) {
    if (!patternSource.startsWith('^') || !patternSource.endsWith('$')) {
      fail('README document patterns must be anchored filename-only expressions');
      return null;
    }
    try {
      const pattern = new RegExp(patternSource);
      if (!pattern.test('README.md') || pattern.test('nested/README.md') || pattern.test('../README.md')) {
        fail('README document patterns must match README filenames only');
        return null;
      }
    } catch (error) {
      fail('Invalid README document pattern: ' + error.message);
      return null;
    }
  }

  const groups = new Map();
  for (const group of layout.groups) {
    if (!group.id || groups.has(group.id)) {
      fail('README layout groups must have unique ids');
      return null;
    }
    if (!['centered-single', 'centered-row'].includes(group.kind) || group.align !== 'center') {
      fail('README layout groups must use a supported centered kind: ' + String(group.id));
      return null;
    }
    if (group.kind === 'centered-single' && group.container !== 'p') {
      fail('centered-single README groups must use a p container');
      return null;
    }
    if (group.kind === 'centered-row' && (group.container !== 'table' || group.cellAlign !== 'center')) {
      fail('centered-row README groups must use a centered table and cells');
      return null;
    }
    groups.set(group.id, group);
  }

  const assetsByGroup = new Map();
  for (const asset of catalog.assets ?? []) {
    const readme = asset.readme;
    if (
      !readme ||
      !groups.has(readme.group) ||
      !Number.isInteger(readme.order) ||
      readme.order < 0 ||
      !Number.isInteger(readme.width) ||
      readme.width < 150 ||
      readme.width > 1000
    ) {
      fail('Every public asset must declare safe README group, order, and width metadata: ' + asset.path);
      return null;
    }
    const entries = assetsByGroup.get(readme.group) || [];
    if (entries.some((entry) => entry.readme.order === readme.order)) {
      fail('README asset orders must be unique within group: ' + readme.group);
      return null;
    }
    entries.push(asset);
    assetsByGroup.set(readme.group, entries);
  }

  for (const [groupId, group] of groups) {
    const assets = assetsByGroup.get(groupId) || [];
    if (group.kind === 'centered-single' && assets.length !== 1) {
      fail('centered-single README groups must contain exactly one asset: ' + groupId);
      return null;
    }
    if (group.kind === 'centered-row' && assets.length < 2) {
      fail('centered-row README groups must contain at least two assets: ' + groupId);
      return null;
    }
  }

  return { layout, groups };
}

function validateReadmeLayoutText(rawReadme, assets, groups, label, report = fail) {
  const readme = stripFencedCodeBlocks(rawReadme);
  const images = htmlImages(readme);
  const assetImages = new Map();
  let valid = true;
  const reject = (message) => {
    valid = false;
    report(message);
  };

  const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/gi;
  for (const match of readme.matchAll(markdownImagePattern)) {
    const source = match[1];
    if (!/^(?:https?:|data:|#)/i.test(source)) {
      reject(label + ' uses a local Markdown image without an explicit centered HTML container: ' + source);
    }
  }

  for (const image of images) {
    if (!image.src || /^(?:https?:|data:|#)/i.test(image.src)) continue;
    if (!image.alt || !image.alt.trim()) reject(label + ' local image must have non-empty alt text: ' + image.src);
    const centered = ['p', 'div', 'td'].some((tagName) =>
      htmlBlocks(readme, tagName).some((block) =>
        blockContains(block, [image.start]) &&
        String(htmlAttribute(block.openTag, 'align')).toLowerCase() === 'center'
      )
    );
    if (!centered) reject(label + ' local image is not inside an explicit centered container: ' + image.src);
  }

  for (const asset of assets) {
    const matches = images.filter((image) => image.src === asset.path);
    if (matches.length !== 1) {
      reject(label + ' must contain exactly one rendered image for ' + asset.path + '; found ' + matches.length);
      continue;
    }
    const image = matches[0];
    if (image.width !== String(asset.readme.width)) {
      reject(label + ' image width must be ' + asset.readme.width + ' for ' + asset.path);
    }
    assetImages.set(asset.path, image);
  }

  for (const [groupId, group] of groups) {
    const groupAssets = assets
      .filter((asset) => asset.readme.group === groupId)
      .sort((left, right) => left.readme.order - right.readme.order);
    const groupImages = groupAssets.map((asset) => assetImages.get(asset.path));
    if (groupImages.some((image) => !image)) continue;
    const positions = groupImages.map((image) => image.start);

    if (group.kind === 'centered-single') {
      const containers = htmlBlocks(readme, group.container).filter((block) => blockContains(block, positions));
      if (containers.length !== 1 || String(htmlAttribute(containers[0].openTag, 'align')).toLowerCase() !== group.align) {
        reject(label + ' group ' + groupId + ' must use one explicitly centered ' + group.container + ' container');
      }
      continue;
    }

    const tables = htmlBlocks(readme, group.container).filter((block) => blockContains(block, positions));
    if (tables.length !== 1 || String(htmlAttribute(tables[0].openTag, 'align')).toLowerCase() !== group.align) {
      reject(label + ' group ' + groupId + ' must use one explicitly centered table');
      continue;
    }
    const table = tables[0];
    const rows = htmlBlocks(table.text, 'tr')
      .map((block) => ({ ...block, start: block.start + table.start, end: block.end + table.start }))
      .filter((block) => blockContains(block, positions));
    if (rows.length !== 1) {
      reject(label + ' group ' + groupId + ' images must share one table row');
      continue;
    }
    const row = rows[0];
    const cells = htmlBlocks(row.text, 'td')
      .map((block) => ({ ...block, start: block.start + row.start, end: block.end + row.start }));
    for (const image of groupImages) {
      const matchingCells = cells.filter((cell) => blockContains(cell, [image.start]));
      if (matchingCells.length !== 1 || String(htmlAttribute(matchingCells[0].openTag, 'align')).toLowerCase() !== group.cellAlign) {
        reject(label + ' group ' + groupId + ' images must each use one centered table cell');
      }
    }
    const actualOrder = [...groupImages].sort((left, right) => left.start - right.start);
    if (!actualOrder.every((image, index) => image === groupImages[index])) {
      reject(label + ' group ' + groupId + ' image order does not match the catalog');
    }
  }

  return valid;
}

function matchingReadmeFiles(directory, patternSource, label) {
  const pattern = new RegExp(patternSource);
  const matches = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'));
  if (matches.length === 0) fail(label + ' has no README document matching the catalog pattern');
  return matches;
}

function checkReadmeLayoutRegressions(assets, groups) {
  const contact = assets.find((asset) => groups.get(asset.readme.group)?.kind === 'centered-single');
  const payments = assets
    .filter((asset) => groups.get(asset.readme.group)?.kind === 'centered-row')
    .sort((left, right) => left.readme.order - right.readme.order);
  const good = [
    '<p align="center">',
    '  <img src="' + contact.path + '" alt="contact" width="' + contact.readme.width + '">',
    '</p>',
    '<table align="center">',
    '  <tr>',
    ...payments.map((asset) => '    <td align="center"><img src="' + asset.path + '" alt="payment" width="' + asset.readme.width + '"></td>'),
    '  </tr>',
    '</table>'
  ].join('\n');
  const goodErrors = [];
  validateReadmeLayoutText(good, assets, groups, 'README layout positive fixture', (message) => goodErrors.push(message));
  if (goodErrors.length) fail('README layout scanner rejected its positive fixture: ' + goodErrors.join('; '));

  const badFixtures = [
    good.replace(
      'width="' + contact.readme.width + '"',
      'width="' + String(contact.readme.width + 1) + '"'
    ),
    good.replace('<p align="center">', '<p align="right">'),
    good.replace('<table align="center">', '<table>'),
    good.replace('<td align="center">', '<td align="right">'),
    good.replace('</td>\n    <td', '</td>\n  </tr>\n  <tr>\n    <td')
  ];
  for (const [index, fixture] of badFixtures.entries()) {
    const fixtureErrors = [];
    validateReadmeLayoutText(fixture, assets, groups, 'README layout negative fixture', (message) => fixtureErrors.push(message));
    if (fixtureErrors.length === 0) fail('README layout scanner missed negative fixture ' + String(index + 1));
  }
}

function checkReadmeLayouts(catalog) {
  const metadata = validateReadmeLayoutMetadata(catalog);
  if (!metadata) return;
  const { layout, groups } = metadata;
  checkReadmeLayoutRegressions(catalog.assets, groups);

  for (const filename of matchingReadmeFiles(ROOT, layout.rootDocumentPattern, 'Repository root')) {
    validateReadmeLayoutText(
      fs.readFileSync(path.join(ROOT, filename), 'utf8'),
      catalog.assets,
      groups,
      'Repository root ' + filename
    );
  }

  for (const component of catalog.components ?? []) {
    if (!String(component.source || '').startsWith('canonical:')) continue;
    const componentRoot = path.resolve(ROOT, component.path);
    for (const filename of matchingReadmeFiles(componentRoot, layout.componentDocumentPattern, component.id)) {
      validateReadmeLayoutText(
        fs.readFileSync(path.join(componentRoot, filename), 'utf8'),
        catalog.assets,
        groups,
        component.id + ' ' + filename
      );
    }
  }
}

function checkAssets(catalog) {
  for (const asset of catalog?.assets ?? []) {
    const absolutePath = path.resolve(ROOT, asset.path);
    if (!isInsideRoot(absolutePath) || !fs.existsSync(absolutePath)) {
      fail('Missing required public asset: ' + asset.path);
      continue;
    }

    const actualHash = sha256(absolutePath);
    if (actualHash !== String(asset.sha256).toLowerCase()) {
      fail('Public asset hash drift: ' + asset.path);
    }
  }
}

if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error('Repository root does not exist: ' + ROOT);
  process.exit(1);
}

if (fs.existsSync(path.join(ROOT, '_migration-transaction'))) {
  fail('Temporary migration transaction must be removed');
}

walk(ROOT);
const catalog = readCatalog();
checkCatalog(catalog);
checkGitRepository(catalog);
checkSensitiveFiles();
checkAssets(catalog);
checkReadmeLayouts(catalog);
checkReleaseReadiness(catalog);

if (errors.length) {
  console.error('Kim_Service repository check failed:');
  for (const error of errors) {
    console.error('- ' + error);
  }
  process.exit(1);
}

console.log(
  'Kim_Service repository check passed: ' +
  String(catalog.components.length) + ' components, ' +
  String(files.length) + ' files, ' +
  String(catalog.assets.length) + ' protected QR assets.'
);

if (RELEASE_MODE) {
  console.log('Kim_Service release readiness passed for ' + fs.readFileSync(path.join(ROOT, 'VERSION'), 'utf8').trim() + '.');
}
