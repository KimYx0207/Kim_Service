import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

// Package-local support for declared design constraints, not a UI renderer or quality judge.
const levels = ['base', 'domain', 'brand', 'task'];
const kinds = new Set(['visible_information', 'representation', 'recovery', 'theme', 'professional_judgment']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(text);
const issue = (code, location, detail) => ({code, location, detail});
const equal = isDeepStrictEqual;
const contains = (a, b) => strings(a) && strings(b) && b.every(value => a.includes(value));

function ruleKey(rule) {
  return JSON.stringify([rule.kind, rule.target, rule.kind === 'representation' ? rule.value?.informationId : null]);
}

function refines(previous, next) {
  if (previous.kind === 'visible_information') return contains(next.value, previous.value);
  if (previous.kind === 'recovery') return contains(next.value?.preserve, previous.value?.preserve) && contains(next.value?.actions, previous.value?.actions);
  return equal(previous.value, next.value) && previous.requirement === next.requirement;
}

function validValue(rule) {
  if (rule.kind === 'visible_information') return strings(rule.value) && rule.value.length > 0;
  if (rule.kind === 'representation') return object(rule.value) && text(rule.value.informationId) && ['exact', 'trend', 'relationship', 'instruction'].includes(rule.value.purpose);
  if (rule.kind === 'recovery') return object(rule.value) && strings(rule.value.preserve) && strings(rule.value.actions) && rule.value.actions.length > 0;
  if (rule.kind === 'theme') return (typeof rule.value === 'number' && Number.isFinite(rule.value)) || typeof rule.value === 'boolean' || text(rule.value);
  return true;
}

export function prepareProjectExperience(input = {}) {
  if (!object(input)) return {status: 'invalid', issues: [issue('invalid_input', 'input', 'Expected the current role input object')]};
  const profile = input.designContext?.projectExperience;
  if (profile === undefined) return {status: 'not_configured', issues: []};
  const issues = [];
  if (!object(profile)) return {status: 'invalid', issues: [issue('invalid_profile', 'projectExperience', 'Expected an object')]};
  if (profile.schemaVersion !== 1 || !text(profile.projectId) || !Number.isInteger(profile.revision) || profile.revision < 1) issues.push(issue('invalid_identity', 'projectExperience', 'Expected schemaVersion 1, projectId and positive revision'));
  if (!text(input.designBinding?.designId) || !Number.isInteger(input.designBinding?.revision) || input.designBinding.revision < 1) issues.push(issue('design_binding_missing', 'designBinding', 'Project rules must reference the caller current design'));
  if (!Array.isArray(profile.layers) || !equal(profile.layers.map(layer => layer?.level), levels)) issues.push(issue('invalid_layers', 'layers', 'Supply base, domain, brand and task once, in that order'));
  const tasks = Array.isArray(profile.tasks) ? profile.tasks : [];
  const taskIds = new Set();
  if (!tasks.length) issues.push(issue('missing_tasks', 'tasks', 'Supply the current project tasks'));
  for (const task of tasks) {
    if (!object(task) || !['id', 'actor', 'goal', 'successCondition'].every(key => text(task[key])) || taskIds.has(task.id)) issues.push(issue('invalid_task', 'tasks', 'Each task needs a unique id, actor, goal and observable success condition'));
    else taskIds.add(task.id);
  }
  const applicable = input.designContext?.applicableExperienceTaskIds;
  if (applicable !== undefined && (!strings(applicable) || !applicable.length || new Set(applicable).size !== applicable.length || applicable.some(id => !taskIds.has(id)))) issues.push(issue('invalid_applicable_tasks', 'designContext.applicableExperienceTaskIds', 'Use a nonempty unique subset of current project task IDs; omitted means the full profile'));
  const activeTaskIds = new Set(strings(applicable) ? applicable : taskIds);
  const resolved = new Map();
  const ruleIds = new Set();
  for (const layer of Array.isArray(profile.layers) ? profile.layers : []) {
    if (!object(layer)) continue;
    if (!object(layer.source) || !text(layer.source.ref) || !text(layer.source.version) || (layer.source.digest !== undefined && !text(layer.source.digest))) issues.push(issue('source_missing', String(layer.level), 'Each layer needs the material reference and applicable revision; digest is optional'));
    if (!Array.isArray(layer.rules)) { issues.push(issue('invalid_rules', String(layer.level), 'Rules must be an array; an empty layer still retains its source')); continue; }
    for (const rule of layer.rules) {
      if (!object(rule) || !['id', 'target', 'requirement', 'verification'].every(key => text(rule[key])) || !kinds.has(rule.kind) || ruleIds.has(rule.id)) { issues.push(issue('invalid_rule', String(layer.level), 'Rules need unique ids, a supported kind, target, requirement and verification')); continue; }
      ruleIds.add(rule.id);
      if (!validValue(rule)) issues.push(issue('invalid_rule_value', rule.id, 'Rule value does not match its kind'));
      if (rule.taskIds !== undefined && (!strings(rule.taskIds) || !rule.taskIds.length || rule.taskIds.some(id => !taskIds.has(id)))) {
        issues.push(issue('invalid_task_reference', rule.id, 'Rule requires a nonempty current task subset'));
        continue;
      }
      // Resolve each task independently: a local override must not erase the
      // shared baseline for another task using the same page/state target.
      for (const taskId of rule.taskIds ?? taskIds) {
        const key = JSON.stringify([taskId, ruleKey(rule)]);
        const previous = resolved.get(key);
        if (previous && rule.overrides !== previous.id) issues.push(issue('rule_conflict', `${rule.id}:${taskId}`, `Explicitly reference ${previous.id} before changing the same concern and target`));
        if (!previous && rule.overrides !== undefined) issues.push(issue('override_target_missing', `${rule.id}:${taskId}`, 'Override must address the current rule at the same target and task'));
        if (previous?.invariant && !refines(previous, rule)) issues.push(issue('baseline_weakened', `${rule.id}:${taskId}`, `The required baseline ${previous.id} cannot be silently removed or weakened`));
        const source = {level: layer.level, ...layer.source, ruleId: rule.id};
        resolved.set(key, {...structuredClone(rule), taskIds: [taskId], invariant: Boolean(previous?.invariant || rule.invariant), lineage: [...(previous?.lineage ?? []), source]});
      }
    }
  }
  const effective = new Map();
  for (const rule of resolved.values()) {
    const taskId = rule.taskIds[0];
    if (!activeTaskIds.has(taskId)) continue;
    const existing = effective.get(rule.id);
    if (existing) existing.taskIds.push(taskId);
    else effective.set(rule.id, structuredClone(rule));
  }
  const rules = [...effective.values()];
  const taskBriefs = tasks.filter(task => object(task) && activeTaskIds.has(task.id)).map(task => ({...structuredClone(task), rules: rules.filter(rule => !rule.taskIds || rule.taskIds.includes(task.id)).map(rule => ({id: rule.id, kind: rule.kind, target: rule.target, requirement: rule.requirement, verification: rule.verification, value: rule.value, lineage: rule.lineage}))}));
  return {status: issues.length ? 'invalid' : 'prepared', projectId: profile.projectId, revision: profile.revision, designBinding: structuredClone(input.designBinding ?? {}), rules, taskBriefs, issues};
}

export function checkExperienceApplication(input, output = {}) {
  const prepared = prepareProjectExperience(input);
  if (prepared.status === 'not_configured') return {status: 'not_applicable', issues: [], unverified: [], runtimeVerified: false};
  const issues = [...prepared.issues];
  const unverified = [];
  if (!object(output)) return {status: 'invalid', issues: [...issues, issue('invalid_output', 'output', 'Expected the current role output object')], unverified, runtimeVerified: false};
  const application = output.experienceApplication;
  if (!object(application)) return {status: 'invalid', issues: [...issues, issue('application_missing', 'experienceApplication', 'Describe how this project context changes the current professional deliverable')], unverified, runtimeVerified: false};
  if (application.projectId !== prepared.projectId || application.revision !== prepared.revision) issues.push(issue('experience_binding_mismatch', 'experienceApplication', 'Output refers to another project or revision'));
  for (const key of ['designId', 'revision', 'designDigest']) {
    if (input?.designBinding?.[key] !== undefined && input.designBinding[key] !== output.designBinding?.[key]) issues.push(issue('design_binding_mismatch', 'designBinding', `Output must retain current ${key}`));
  }
  if (!['research', 'design', 'implementation'].includes(application.scope)) issues.push(issue('invalid_scope', 'experienceApplication.scope', 'Use research, design or implementation; scope does not grant acceptance'));
  const applications = Array.isArray(application.ruleApplications) ? application.ruleApplications : [];
  const effectiveIds = new Set((prepared.rules ?? []).map(rule => rule.id));
  const seenApplications = new Set();
  for (const row of applications) {
    if (!object(row) || !effectiveIds.has(row.ruleId) || seenApplications.has(row.ruleId)) { issues.push(issue('invalid_application_reference', 'ruleApplications', 'Each application must reference one effective rule once')); continue; }
    seenApplications.add(row.ruleId);
    if (!['specified', 'observed', 'not_run'].includes(row.status) || !text(row.application)) issues.push(issue('application_explanation_missing', row.ruleId, 'Record the actual design choice, observed action or remaining work'));
    if (row.status !== 'not_run' && (!strings(row.artifactRefs) || row.artifactRefs.length === 0)) issues.push(issue('application_artifact_missing', row.ruleId, 'Applied rules need a current professional artifact reference'));
    if (row.status === 'observed' && (!strings(row.observationRefs) || row.observationRefs.length === 0)) issues.push(issue('observation_reference_missing', row.ruleId, 'Observed claims require current observation references; the helper does not authenticate them'));
    if (row.status === 'not_run') unverified.push({ruleId: row.ruleId, reason: 'not_run'});
    if (row.status === 'observed') unverified.push({ruleId: row.ruleId, reason: 'observation_authenticity_requires_review'});
  }
  const surfaces = Array.isArray(application.surfaceModels) ? application.surfaceModels : [];
  const surfaceMap = new Map();
  const taskIds = new Set((prepared.taskBriefs ?? []).map(task => task.id));
  for (const surface of surfaces) {
    const surfaceKey = JSON.stringify([surface?.taskId, surface?.target]);
    if (!object(surface) || !text(surface.target) || !taskIds.has(surface.taskId) || surfaceMap.has(surfaceKey)) { issues.push(issue('invalid_surface', 'surfaceModels', 'Use unique task and page/state pairs')); continue; }
    surfaceMap.set(surfaceKey, surface);
    const information = Array.isArray(surface.information) ? surface.information : [];
    const byId = new Map();
    for (const item of information) {
      if (!object(item) || !text(item.id) || !['primary', 'visible', 'on_demand'].includes(item.visibility)) { issues.push(issue('invalid_information', surface.target, 'Information requires an id and declared visibility')); continue; }
      const duplicates = byId.get(item.id) ?? [];
      duplicates.push(item); byId.set(item.id, duplicates);
    }
    for (const [id, entries] of byId) {
      if (entries.length > 1 && (entries.some(entry => !text(entry.purpose)) || new Set(entries.map(entry => entry.purpose)).size !== entries.length)) issues.push(issue('unexplained_duplicate', `${surface.target}:${id}`, 'Repeated information must support distinct task purposes'));
    }
  }
  for (const rule of prepared.rules ?? []) {
    if (!seenApplications.has(rule.id)) issues.push(issue('rule_application_missing', rule.id, 'Include actual application or explicit not_run impact'));
    if (rule.kind === 'professional_judgment') { unverified.push({ruleId: rule.id, reason: 'professional_review_required'}); continue; }
    if (application.scope === 'research' && !surfaces.length) { unverified.push({ruleId: rule.id, reason: 'surface_not_supplied'}); continue; }
    if (rule.kind === 'theme') {
      if (!equal(application.themeTokens?.[rule.target], rule.value)) issues.push(issue('theme_not_applied', rule.id, 'Output token does not reflect the effective project theme'));
      continue;
    }
    for (const taskId of rule.taskIds) {
      const surface = surfaceMap.get(JSON.stringify([taskId, rule.target]));
      if (!surface) { issues.push(issue('missing_surface', rule.id, `Missing required page/state ${rule.target} for ${taskId}`)); continue; }
      if (rule.kind === 'visible_information' && strings(rule.value)) {
        for (const id of rule.value) {
          const visible = (Array.isArray(surface.information) ? surface.information : []).filter(info => info?.id === id);
          if (!visible.length) issues.push(issue('critical_information_missing', rule.id, `Missing ${id} on ${rule.target}`));
          else if (!visible.some(info => ['primary', 'visible'].includes(info.visibility))) issues.push(issue('critical_information_hidden', rule.id, `${id} is required for the current decision and cannot start collapsed`));
        }
      }
      if (rule.kind === 'representation' && object(rule.value)) {
        const model = (Array.isArray(surface.representations) ? surface.representations : []).find(model => model?.informationId === rule.value.informationId);
        if (!model) issues.push(issue('representation_missing', rule.id, 'No representation for the decision information'));
        else {
          const exact = ['text', 'table', 'list'];
          if (rule.value.purpose === 'exact' && !((exact.includes(model.format) && text(model.dataRef)) || (exact.includes(model.alternative?.format) && text(model.alternative.ref)))) issues.push(issue('exact_values_missing', rule.id, 'Exact comparison requires readable values or a linked exact-data alternative'));
          if (['chart', 'diagram', 'image'].includes(model.format) && !text(model.summary)) issues.push(issue('visual_meaning_missing', rule.id, 'Provide the message or equivalent explanation instead of requiring visual inference'));
        }
      }
      if (rule.kind === 'recovery' && object(rule.value)) {
        if (!contains(surface.recovery?.preserve, rule.value.preserve)) issues.push(issue('recovery_input_missing', rule.id, 'Failure/return must retain the declared project inputs'));
        if (!contains(surface.recovery?.actions, rule.value.actions)) issues.push(issue('recovery_action_missing', rule.id, 'Failure state is missing a required continuation or recovery action'));
      }
    }
  }
  return {status: issues.length ? 'invalid' : 'review_required', projectId: prepared.projectId, revision: prepared.revision, issues, unverified, runtimeVerified: false, evidenceBoundary: 'Checks the supplied design model and references only. Inspect current artifacts and exercise the real user path before accepting usability, accessibility or user-research claims.'};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let body = '';
    for await (const chunk of process.stdin) { body += chunk; if (Buffer.byteLength(body) > 262144) throw new Error('Input exceeds 262144 bytes'); }
    let packet;
    try { packet = JSON.parse(body); }
    catch { throw new SyntaxError('Input must be valid JSON'); }
    const result = Object.hasOwn(packet, 'output') ? checkExperienceApplication(packet.input, packet.output) : prepareProjectExperience(packet.input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status === 'invalid') process.exitCode = 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify({status: 'invalid', issues: [{code: 'invalid_input', detail: error.message}], runtimeVerified: false})}\n`);
    process.exitCode = 1;
  }
}
