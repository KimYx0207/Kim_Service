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
const METHOD_SCHEMA = JSON.parse(fs.readFileSync(new URL('../schemas/agent-method.schema.json', import.meta.url), 'utf8'));
const KNOWLEDGE_SCHEMA = METHOD_SCHEMA.properties.knowledgeAssets;
const ASSET_SCHEMA = KNOWLEDGE_SCHEMA.items;
const EXPERTISE_SCHEMA = JSON.parse(fs.readFileSync(new URL('../schemas/agent-expertise.schema.json', import.meta.url), 'utf8'));
const EXPERTISE_CASES_SCHEMA = JSON.parse(fs.readFileSync(new URL('../schemas/agent-expertise-cases.schema.json', import.meta.url), 'utf8'));
export const METHOD_CONTENT_LIMITS = Object.freeze(METHOD_SCHEMA['x-contentLimits']);

function readBoundedPackageText(componentRoot, relativePath, maxBytes) {
  if (typeof relativePath !== 'string' || relativePath.includes('\\') || /^[A-Za-z]:|^\/|\x00/.test(relativePath) ||
      relativePath.split('/').some(part => ['', '.', '..'].includes(part))) throw new Error('requires a package-relative path');
  let current = componentRoot;
  const parts = relativePath.split('/');
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) throw new Error('requires regular files without symlink ancestors');
    if (index === parts.length - 1 && stat.size > maxBytes) throw new Error('exceeds byte budget');
  }
  const bytes = fs.readFileSync(current);
  if (bytes.length > maxBytes) throw new Error('exceeds byte budget');
  return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), bytes: bytes.length };
}

// The package schemas use this small structural dialect. Capability examples
// share its type/required/enum checks; prose, deliveryFormat and other annotations
// are not assertions. This is not a general JSON Schema or semantic evaluator.
function checkShape(value, rule, errors, label, { schema = rule, patterns = true, depth = 0 } = {}) {
  if (depth > 32) { errors.push(label + ' exceeds schema nesting budget'); return; }
  if (rule.$ref) {
    const match = rule.$ref.match(/^#\/\$defs\/([A-Za-z0-9_-]+)$/);
    if (!match || !schema.$defs?.[match[1]]) { errors.push(label + ' has an unsupported schema reference'); return; }
    rule = schema.$defs[match[1]];
  }
  const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  const types = rule.type === undefined ? null : Array.isArray(rule.type) ? rule.type : [rule.type];
  if (types && !types.some(type => type === actualType || type === 'integer' && Number.isInteger(value))) {
    errors.push(label + ' must have declared type ' + types.join('|')); return;
  }
  if (Object.hasOwn(rule, 'const') && value !== rule.const) errors.push(label + ' must equal ' + String(rule.const));
  if (rule.enum && !rule.enum.includes(value)) errors.push(label + ' must match a declared enum value');
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength || rule.maxLength !== undefined && value.length > rule.maxLength) errors.push(label + ' exceeds declared text bounds');
    if (patterns && rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(label + ' does not match the declared text pattern');
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || rule.minimum !== undefined && value < rule.minimum || rule.maximum !== undefined && value > rule.maximum) errors.push(label + ' exceeds declared numeric bounds');
  }
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems || rule.maxItems !== undefined && value.length > rule.maxItems) errors.push(label + ' exceeds declared list bounds');
    if (rule.uniqueItems && new Set(value).size !== value.length) errors.push(label + ' must contain unique entries');
    if (rule.items) for (const [index, item] of value.entries()) checkShape(item, rule.items, errors, `${label}[${index}]`, { schema, patterns, depth: depth + 1 });
  } else if (value && typeof value === 'object') {
    if (rule.minProperties !== undefined && Object.keys(value).length < rule.minProperties) errors.push(label + ' needs a non-empty object');
    for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) errors.push(label + ' requires ' + key);
    for (const [key, item] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties ?? {}, key)) checkShape(item, rule.properties[key], errors, label + '.' + key, { schema, patterns, depth: depth + 1 });
      else if (rule.additionalProperties === false) errors.push(label + ' contains unsupported field ' + key);
    }
  }
}

function assertJsonBudget(value) {
  const pending = [[value, 0]]; let nodes = 0;
  while (pending.length) {
    const [item, depth] = pending.pop();
    if (++nodes > 10000 || depth > 32) throw new Error('JSON nesting/node budget exceeded');
    if (item && typeof item === 'object') for (const child of Object.values(item)) pending.push([child, depth + 1]);
  }
}

function uniqueIds(items, label, errors) {
  const ids = items.map(item => item.id);
  if (new Set(ids).size !== ids.length) errors.push(label + ' ids must be unique');
  return new Set(ids);
}

function checkExpertise(componentRoot, method, contract, errors) {
  if (method.expertise === undefined) return;
  const before = errors.length;
  checkShape(method.expertise, EXPERTISE_SCHEMA, errors, 'method.json expertise');
  if (errors.length !== before) return;
  const expertise = method.expertise;
  const assetIds = new Set(method.knowledgeAssets.map(asset => asset?.id));
  if (expertise.knowledgeAssetIds.some(id => !assetIds.has(id))) errors.push('expertise knowledgeAssetIds must name this method\'s knowledge assets');
  const diagnosticIds = uniqueIds(expertise.diagnosticSequence, 'expertise diagnosticSequence', errors);
  const ruleIds = uniqueIds(expertise.decisionRules, 'expertise decisionRules', errors);
  const capabilities = new Map((contract?.capabilities ?? []).map(capability => [capability.id, capability]));
  const guidance = new Map();
  for (const entry of expertise.contractGuidance) {
    if (guidance.has(entry.capabilityId)) errors.push('expertise contractGuidance capabilityId must be unique');
    guidance.set(entry.capabilityId, entry);
    const capability = capabilities.get(entry.capabilityId);
    if (!capability) { errors.push('expertise contractGuidance must name an existing capability'); continue; }
    for (const [direction, entries] of [['input', entry.inputGuidance], ['output', entry.outputChecks]]) {
      const fields = entries.map(item => item.field);
      if (new Set(fields).size !== fields.length) errors.push('expertise ' + direction + ' fields must be unique');
      if (fields.some(field => !Object.hasOwn(capability[direction]?.properties ?? {}, field))) errors.push('expertise ' + direction + ' guidance must name declared capability fields');
      if ((capability[direction]?.required ?? []).some(field => !fields.includes(field))) errors.push('expertise ' + direction + ' guidance must cover required capability fields');
    }
  }
  let examples;
  try {
    examples = JSON.parse(readBoundedPackageText(componentRoot, expertise.evaluation.casesPath, METHOD_CONTENT_LIMITS.expertiseCasesBytes).text);
    assertJsonBudget(examples);
  } catch { errors.push('expertise cases must be bounded UTF-8 JSON in a regular package file without symlinks'); return; }
  const casesBefore = errors.length;
  checkShape(examples, EXPERTISE_CASES_SCHEMA, errors, 'expertise cases');
  if (errors.length !== casesBefore) return;
  if (examples.roleId !== method.roleId) errors.push('expertise cases roleId must equal the current role');
  uniqueIds(examples.cases, 'expertise cases', errors);
  for (const expected of ['acceptable_example', 'reject_example']) if (!examples.cases.some(item => item.expectedAssessment === expected)) errors.push('expertise cases need both acceptable and rejected examples');
  for (const category of ['worked_example', 'failure_boundary']) if (!examples.cases.some(item => item.category === category)) errors.push('expertise cases need worked and failure-boundary scenarios');
  for (const example of examples.cases) {
    const label = 'expertise case ' + example.id;
    if (example.diagnosticRefs.some(id => !diagnosticIds.has(id)) || example.decisionRuleRefs.some(id => !ruleIds.has(id))) errors.push(label + ' must reference declared diagnostics and decisions');
    const capability = capabilities.get(example.capabilityId);
    if (!capability || !guidance.has(example.capabilityId)) { errors.push(label + ' must name a capability with contract guidance'); continue; }
    checkShape(example.input, capability.input, errors, label + ' input', { patterns: false });
    if (Object.keys(example.input).some(field => !Object.hasOwn(capability.input?.properties ?? {}, field))) errors.push(label + ' input must use declared capability fields');
    // Excerpts deliberately omit unrelated delivery fields; present fields retain
    // the actual declared type, nested requirements and enum constraints.
    const partialOutput = { ...capability.output, required: [], additionalProperties: false };
    checkShape(example.candidateOutputExcerpt, partialOutput, errors, label + ' output excerpt', { patterns: false });
  }
}

function checkOptionalMethod(componentRoot, contract, errors) {
  const methodPath = path.join(componentRoot, 'method.json');
  // lstat distinguishes an absent legacy file from a broken symlink.
  try { fs.lstatSync(methodPath); } catch (error) {
    if (error.code === 'ENOENT') return;
    errors.push('method.json cannot be inspected'); return;
  }
  let method;
  try { method = JSON.parse(readBoundedPackageText(componentRoot, 'method.json', METHOD_CONTENT_LIMITS.methodBytes).text); }
  catch { errors.push('method.json must be bounded UTF-8 JSON in a regular package file'); return; }
  if (!method || typeof method !== 'object' || Array.isArray(method)) { errors.push('method.json must be an object'); return; }
  for (const key of METHOD_SCHEMA.required) if (!Object.hasOwn(method, key)) errors.push('method.json requires ' + key);
  for (const [key, rule] of Object.entries(METHOD_SCHEMA.properties)) {
    if (Object.hasOwn(rule, 'const') && method[key] !== rule.const) errors.push('method.json ' + key + ' must remain ' + String(rule.const));
  }
  if (method.roleId !== path.basename(componentRoot)) errors.push('method.json roleId must equal the component id');
  for (const key of ['steps', 'acceptance']) if (!Array.isArray(method[key]) || method[key].length === 0 || !method[key].every(isNonEmptyString)) errors.push('method.json ' + key + ' needs non-empty method text');
  if (method.knowledgeAssets === undefined) {
    if (method.expertise !== undefined) errors.push('expertise requires source-bound knowledgeAssets');
    return;
  }
  if (!Array.isArray(method.knowledgeAssets) || method.knowledgeAssets.length < KNOWLEDGE_SCHEMA.minItems || method.knowledgeAssets.length > KNOWLEDGE_SCHEMA.maxItems) {
    errors.push('method.json knowledgeAssets must be a non-empty bounded list'); return;
  }
  let provenance = '';
  try { provenance = readBoundedPackageText(componentRoot, 'PROVENANCE.md', METHOD_CONTENT_LIMITS.provenanceBytes).text; }
  catch { errors.push('knowledgeAssets requires a bounded regular PROVENANCE.md'); }
  const declaredSources = new Set([...provenance.matchAll(/^\|\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*\|/gm)].map(match => match[1]));
  const ids = new Set(); const paths = new Set(); let totalBytes = 0;
  for (const [index, asset] of method.knowledgeAssets.entries()) {
    const label = 'method.json knowledgeAssets[' + index + ']';
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) { errors.push(label + ' must be an object'); continue; }
    if (Object.keys(asset).some(key => !ASSET_SCHEMA.required.includes(key)) || ASSET_SCHEMA.required.some(key => !Object.hasOwn(asset, key))) errors.push(label + ' requires only id/path/appliesTo/sourceRefs');
    if (typeof asset.id !== 'string' || asset.id.length > ASSET_SCHEMA.properties.id.maxLength || !new RegExp(ASSET_SCHEMA.properties.id.pattern).test(asset.id) || ids.has(asset.id)) errors.push(label + ' id must be unique and valid');
    ids.add(asset.id);
    for (const key of ['appliesTo', 'sourceRefs']) {
      const rule = ASSET_SCHEMA.properties[key]; const value = asset[key];
      if (!Array.isArray(value) || value.length < rule.minItems || value.length > rule.maxItems || !value.every(item => isNonEmptyString(item) && item.length <= 128) || new Set(value).size !== value.length) {
        errors.push(label + ' ' + key + ' must be a bounded unique text list');
      } else if (key === 'sourceRefs' && value.some(id => !declaredSources.has(id))) errors.push(label + ' sourceRefs must name rows in PROVENANCE.md');
    }
    const rule = ASSET_SCHEMA.properties.path;
    if (typeof asset.path !== 'string' || asset.path.length > rule.maxLength || !new RegExp(rule.pattern).test(asset.path) || paths.has(asset.path)) { errors.push(label + ' path must be unique package-relative Markdown'); continue; }
    paths.add(asset.path);
    try {
      const content = readBoundedPackageText(componentRoot, asset.path, METHOD_CONTENT_LIMITS.assetBytes);
      totalBytes += content.bytes;
      if (!isNonEmptyString(content.text)) errors.push(label + ' knowledge file must not be empty');
    } catch { errors.push(label + ' knowledge file must be bounded UTF-8, regular and inside the package without symlinks'); }
  }
  if (totalBytes > METHOD_CONTENT_LIMITS.totalAssetBytes) errors.push('knowledgeAssets total content exceeds byte budget');
  checkExpertise(componentRoot, method, contract, errors);
}

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
  checkOptionalMethod(root, contract, errors);
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
