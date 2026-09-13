#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const AGENT_ENTRYPOINT = 'AGENT.md';
export const CONTRACT_TEST_PATH = 'tests/contract.test.mjs';
export const ALLOWED_FRONTMATTER_KEYS = Object.freeze(['name', 'description', 'tools', 'model']);
export const TOOL_PERMISSIONS = Object.freeze({
  Read: 'filesystem:read-user-materials',
  Grep: 'filesystem:read-user-materials',
  Glob: 'filesystem:read-user-materials',
  WebSearch: 'network:read-web-search',
  WebFetch: 'network:read-web-fetch'
});
export const REQUIRED_SECTIONS = Object.freeze([
  '角色定位',
  '什么情况找我，什么情况别找我',
  '需要你提供什么',
  '我会给你什么',
  '工作步骤',
  '边界与不确定时怎么办',
  '示例',
  '交付前自查清单'
]);
export const STOP_RULE_TERMS = Object.freeze(['医疗', '法律', '金融', '停']);
export const FORBIDDEN_PHRASES = Object.freeze([
  '赋能', '一站式', '至关重要', '端到端', '抓手', '沉淀', '旨在', '致力于', '彰显', '凸显'
]);
export const LIMITS = Object.freeze({
  agentMinLines: 60,
  agentMaxLines: 130,
  readmeMaxLines: 40,
  minUseWhen: 3,
  minDoNotUseWhen: 3
});

const FORBIDDEN_PHRASE_EXEMPT_LINE = /禁用词[：:]/;
const HEADING_LINE = /^## (.+?)\s*$/;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasCjk(text) {
  return [...text].some((ch) => {
    const code = ch.codePointAt(0);
    return code >= 0x4e00 && code <= 0x9fff;
  });
}

function hasLatin(text) {
  return /[A-Za-z]/.test(text);
}

function readText(componentRoot, relativePath) {
  const absolutePath = path.join(componentRoot, ...relativePath.split('/'));
  if (!fs.existsSync(absolutePath) || !fs.lstatSync(absolutePath).isFile()) return null;
  return fs.readFileSync(absolutePath, 'utf8');
}

function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0] !== '---') return { error: 'AGENT.md must start with a --- frontmatter block' };
  const end = lines.indexOf('---', 1);
  if (end === -1) return { error: 'AGENT.md frontmatter block is not closed' };
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const separator = line.indexOf(':');
    if (separator === -1) return { error: 'AGENT.md frontmatter line is not key: value: ' + line };
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { fields, body: lines.slice(end + 1).join('\n') };
}

function parseTools(rawValue) {
  return rawValue
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim().replace(/^["']/, '').replace(/["']$/, ''))
    .filter(Boolean);
}

function splitSections(body) {
  const sections = new Map();
  let current = null;
  for (const line of body.split('\n')) {
    const heading = line.match(HEADING_LINE);
    if (heading) {
      current = heading[1];
      sections.set(current, []);
      continue;
    }
    if (current !== null) sections.get(current).push(line);
  }
  return sections;
}

function checkContract(componentRoot, errors) {
  const raw = readText(componentRoot, 'capability.json');
  if (raw === null) {
    errors.push('capability.json is missing');
    return null;
  }
  let contract;
  try {
    contract = JSON.parse(raw);
  } catch (error) {
    errors.push('capability.json is not valid JSON: ' + error.message);
    return null;
  }
  const id = path.basename(componentRoot);
  if (contract.schemaVersion !== 1) errors.push('capability.json schemaVersion must be 1');
  if (contract.id !== id) errors.push('capability.json id must equal the directory name ' + id);
  if (contract.componentType !== 'agent') errors.push('capability.json componentType must be agent');
  if (contract.entrypoint !== AGENT_ENTRYPOINT) errors.push('capability.json entrypoint must be ' + AGENT_ENTRYPOINT);
  if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) {
    errors.push('capability.json must declare at least one capability');
    return contract;
  }
  for (const capability of contract.capabilities) {
    const label = 'capability ' + String(capability.id);
    if (!Array.isArray(capability.useWhen) || capability.useWhen.length < LIMITS.minUseWhen) {
      errors.push(label + ' useWhen needs at least ' + LIMITS.minUseWhen + ' user phrases');
    }
    if (!Array.isArray(capability.doNotUseWhen) || capability.doNotUseWhen.length < LIMITS.minDoNotUseWhen) {
      errors.push(label + ' doNotUseWhen needs at least ' + LIMITS.minDoNotUseWhen + ' routed refusals');
    }
    for (const permission of capability.permissions ?? []) {
      if (!Object.values(TOOL_PERMISSIONS).includes(permission)) {
        errors.push(label + ' permission is outside the read-only vocabulary: ' + permission);
      }
    }
    if (!Array.isArray(capability.sideEffects) || capability.sideEffects.length !== 0) {
      errors.push(label + ' sideEffects must be an empty array');
    }
    const gate = capability.humanGate ?? {};
    const gateText = Array.isArray(gate.when) ? gate.when.join('\n') : '';
    if (gate.required !== true || !Array.isArray(gate.when) || gate.when.length === 0) {
      errors.push(label + ' humanGate must be required with at least one trigger');
    } else if (!['医疗', '法律', '金融'].every((term) => gateText.includes(term))) {
      errors.push(label + ' humanGate.when must name the medical, legal, and financial stop rule');
    }
    if (!Array.isArray(capability.input?.required) || capability.input.required.length === 0) {
      errors.push(label + ' input.required must not be empty');
    }
    if (!Array.isArray(capability.output?.required) || capability.output.required.length === 0) {
      errors.push(label + ' output.required must not be empty');
    }
    if (!Array.isArray(capability.validation) || !capability.validation.includes(CONTRACT_TEST_PATH)) {
      errors.push(label + ' validation must include ' + CONTRACT_TEST_PATH);
    }
  }
  return contract;
}

function checkAgentDocument(componentRoot, contract, errors) {
  const text = readText(componentRoot, AGENT_ENTRYPOINT);
  if (text === null) {
    errors.push(AGENT_ENTRYPOINT + ' is missing');
    return;
  }
  if (text.includes('\r')) errors.push(AGENT_ENTRYPOINT + ' must use LF line endings');
  const lineCount = text.replace(/\n$/, '').split('\n').length;
  if (lineCount < LIMITS.agentMinLines || lineCount > LIMITS.agentMaxLines) {
    errors.push(AGENT_ENTRYPOINT + ' must have ' + LIMITS.agentMinLines + '-' + LIMITS.agentMaxLines + ' lines, found ' + lineCount);
  }

  const parsed = parseFrontmatter(text);
  if (parsed.error) {
    errors.push(parsed.error);
    return;
  }
  const { fields, body } = parsed;
  for (const key of Object.keys(fields)) {
    if (!ALLOWED_FRONTMATTER_KEYS.includes(key)) errors.push('frontmatter key is not allowed: ' + key);
  }
  const id = path.basename(componentRoot);
  if (fields.name !== id) errors.push('frontmatter name must equal the directory name ' + id);
  if (!isNonEmptyString(fields.description)) {
    errors.push('frontmatter description must be a non-empty single line');
  } else if (!hasCjk(fields.description) || !hasLatin(fields.description)) {
    errors.push('frontmatter description must carry both Chinese scene words and English keywords');
  }
  const tools = isNonEmptyString(fields.tools) ? parseTools(fields.tools) : [];
  if (tools.length === 0) errors.push('frontmatter tools must list at least one read-only tool');
  for (const tool of tools) {
    if (!Object.hasOwn(TOOL_PERMISSIONS, tool)) errors.push('frontmatter tools contains a tool outside the read-only allowlist: ' + tool);
  }
  if (contract && Array.isArray(contract.capabilities)) {
    const expected = new Set(tools.filter((tool) => Object.hasOwn(TOOL_PERMISSIONS, tool)).map((tool) => TOOL_PERMISSIONS[tool]));
    const declared = new Set(contract.capabilities.flatMap((capability) => capability.permissions ?? []));
    for (const permission of expected) {
      if (!declared.has(permission)) errors.push('capability.json permissions must declare ' + permission + ' because frontmatter tools grant it');
    }
    for (const permission of declared) {
      if (!expected.has(permission)) errors.push('capability.json declares ' + permission + ' but no frontmatter tool grants it');
    }
  }

  const sections = splitSections(body);
  let previousIndex = -1;
  const headingOrder = [...sections.keys()];
  for (const section of REQUIRED_SECTIONS) {
    const index = headingOrder.indexOf(section);
    if (index === -1) {
      errors.push('AGENT.md is missing the section: ## ' + section);
      continue;
    }
    if (index < previousIndex) errors.push('AGENT.md section is out of order: ## ' + section);
    previousIndex = index;
  }

  const routing = (sections.get(REQUIRED_SECTIONS[1]) ?? []).join('\n');
  if (!/^\*\*找我\*\*[：:]/m.test(routing)) errors.push('routing section must contain a **找我**： label');
  if (!/^\*\*别找我\*\*[：:]/m.test(routing)) errors.push('routing section must contain a **别找我**： label');

  const boundary = (sections.get(REQUIRED_SECTIONS[5]) ?? []).join('\n');
  for (const term of STOP_RULE_TERMS) {
    if (!boundary.includes(term)) errors.push('boundary section must state the stop rule term: ' + term);
  }

  const example = (sections.get(REQUIRED_SECTIONS[6]) ?? []).join('\n');
  if (!example.includes('**用户输入**')) errors.push('example section must contain **用户输入**');
  if (!example.includes('**我的输出**')) errors.push('example section must contain **我的输出**');

  const checklist = (sections.get(REQUIRED_SECTIONS[7]) ?? []).join('\n');
  if (!FORBIDDEN_PHRASE_EXEMPT_LINE.test(checklist)) errors.push('checklist section must end with a 禁用词： line');

  text.split('\n').forEach((line, index) => {
    if (FORBIDDEN_PHRASE_EXEMPT_LINE.test(line)) return;
    for (const phrase of FORBIDDEN_PHRASES) {
      if (line.includes(phrase)) errors.push('forbidden phrase "' + phrase + '" at AGENT.md line ' + (index + 1));
    }
  });
}

function checkCompanionFiles(componentRoot, errors) {
  const readme = readText(componentRoot, 'README.md');
  if (readme === null) errors.push('README.md is missing');
  else if (readme.replace(/\n$/, '').split('\n').length > LIMITS.readmeMaxLines) {
    errors.push('README.md must stay within ' + LIMITS.readmeMaxLines + ' lines');
  }
  const license = readText(componentRoot, 'LICENSE');
  if (license === null || !license.includes('MIT License') || !license.includes('KimYx0207')) {
    errors.push('LICENSE must be the MIT License attributed to KimYx0207');
  }
  const notice = readText(componentRoot, 'NOTICE');
  if (notice === null || !notice.includes(path.basename(componentRoot)) || !notice.includes('MIT')) {
    errors.push('NOTICE must name the component and its MIT terms');
  }
  const changelog = readText(componentRoot, 'CHANGELOG.md');
  if (changelog === null || !/^## /m.test(changelog)) errors.push('CHANGELOG.md must contain at least one ## version heading');
  if (readText(componentRoot, CONTRACT_TEST_PATH) === null) errors.push(CONTRACT_TEST_PATH + ' is missing');
}

export function checkAgentPack(componentRoot) {
  const root = path.resolve(componentRoot);
  const errors = [];
  if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) return ['component directory does not exist: ' + root];
  const contract = checkContract(root, errors);
  checkAgentDocument(root, contract, errors);
  checkCompanionFiles(root, errors);
  return errors;
}

export function assertAgentPack(componentRoot) {
  const errors = checkAgentPack(componentRoot);
  if (errors.length) throw new Error(path.basename(path.resolve(componentRoot)) + ' failed the agent pack contract:\n- ' + errors.join('\n- '));
}

function resolveTargets(argv) {
  if (argv.length) return argv.map((item) => path.resolve(item));
  const agentsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'agents');
  if (!fs.existsSync(agentsRoot)) return [];
  return fs.readdirSync(agentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(agentsRoot, entry.name))
    .sort();
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const targets = resolveTargets(process.argv.slice(2));
  let failed = 0;
  for (const target of targets) {
    const errors = checkAgentPack(target);
    if (errors.length) {
      failed += 1;
      console.error(path.basename(target) + ' failed the agent pack contract:');
      for (const error of errors) console.error('- ' + error);
    }
  }
  if (failed) {
    process.exitCode = 1;
  } else {
    console.log('Agent pack check passed: ' + targets.length + ' packs.');
  }
}
