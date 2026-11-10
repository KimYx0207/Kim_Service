#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_INPUT_BYTES = 262144;
const MAX_ROWS = 256;
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const authorityKeys = ['trusted', 'executionAllowed', 'authorization', 'permissions', 'publicReady', 'nativeInvocationVerified'];
const boundary = 'Structure and supplied-reference consistency only; no source, digest, decision-authority, professional-quality or user-acceptance verification.';

/** Pure candidate check. The caller owns the actual design, decisions and authority.
 * No files, commands, network, task state or scheduler are accessed here. */
export function checkDesignHandoff(input) {
  const issues = [];
  const issue = (code, location) => issues.push({ code, location });
  const result = status => ({ schemaVersion: 1, status, issues, claimBoundary: boundary,
    nativeRuntimeVerified: false, productAccepted: false });
  if (!object(input) || !object(input.productDesign)) {
    issue('product_design_required', 'productDesign');
    return result('invalid');
  }
  const design = input.productDesign;
  if (!Object.hasOwn(design, 'softwareDesign')) return result('not_applicable');
  const noAuthority = (value, location) => {
    if (object(value)) for (const key of authorityKeys) if (Object.hasOwn(value, key)) issue('content_cannot_grant_authority', `${location}.${key}`);
  };
  const requireText = (value, location) => { if (!text(value)) issue('nonempty_text_required', location); };
  const list = (value, location, { nonempty = false } = {}) => {
    if (!Array.isArray(value) || value.length > MAX_ROWS || nonempty && value.length === 0) {
      issue('bounded_list_required', location); return [];
    }
    return value;
  };
  const strings = (value, location, options) => {
    const rows = list(value, location, options);
    if (!rows.every(text) || new Set(rows).size !== rows.length) issue('unique_text_references_required', location);
    return rows.filter(text);
  };
  const rows = (value, location, key = 'id') => {
    const values = list(value, location);
    const ids = new Set();
    const valid = [];
    for (const [i, row] of values.entries()) {
      if (!object(row) || !text(row[key]) || ids.has(row[key])) { issue('unique_row_identity_required', `${location}[${i}]`); continue; }
      ids.add(row[key]); valid.push(row);
    }
    return { values: valid, ids };
  };
  const references = (value, known, location, options) => {
    const ids = strings(value, location, options);
    if (ids.some(id => !known.has(id))) issue('unknown_reference', location);
    return ids;
  };
  noAuthority(design, 'productDesign');
  if (design.schemaVersion !== 1) issue('schema_version_mismatch', 'productDesign.schemaVersion');
  requireText(design.designId, 'productDesign.designId');
  if (!Number.isInteger(design.revision) || design.revision < 1) issue('positive_revision_required', 'productDesign.revision');
  if (!['exploration', 'delivery'].includes(design.mode)) issue('unknown_design_mode', 'productDesign.mode');
  strings(design.sourceRefs, 'productDesign.sourceRefs', { nonempty: true });
  const expected = input.expectedDesignBinding;
  if (expected !== undefined && (!object(expected) || !text(expected.designId) || !Number.isInteger(expected.revision) || expected.revision < 1 ||
      design.designId !== expected.designId || design.revision !== expected.revision)) issue('design_binding_mismatch', 'expectedDesignBinding');

  const decisionContext = list(input.settledDecisionRefs, 'settledDecisionRefs');
  const decisionIds = decisionContext.map(value => typeof value === 'string' ? value : value?.decisionId);
  if (!decisionIds.every(text) || new Set(decisionIds).size !== decisionIds.length) issue('unique_text_references_required', 'settledDecisionRefs');
  const settled = new Set(decisionIds.filter(text));
  const declaredDecisions = new Set(references(design.settledDecisionRefs ?? [], settled, 'productDesign.settledDecisionRefs'));
  const criteria = rows(input.acceptanceCriteria, 'acceptanceCriteria');
  const journeys = rows(design.userJourneys ?? [], 'productDesign.userJourneys');
  const tasks = rows(design.taskSlices ?? [], 'productDesign.taskSlices');
  const interfaces = rows(design.interfaces ?? [], 'productDesign.interfaces');
  const shared = rows(design.sharedState ?? [], 'productDesign.sharedState');
  const software = design.softwareDesign;
  if (!object(software) || !object(software.architecture)) {
    issue('software_architecture_required', 'productDesign.softwareDesign'); return result('invalid');
  }
  noAuthority(software, 'productDesign.softwareDesign');
  if (software.schemaVersion !== 1) issue('schema_version_mismatch', 'productDesign.softwareDesign.schemaVersion');
  const architecture = software.architecture;
  const ap = 'productDesign.softwareDesign.architecture';
  noAuthority(architecture, ap);
  requireText(architecture.id, `${ap}.id`);
  requireText(architecture.summary, `${ap}.summary`);
  if (!Number.isInteger(architecture.revision) || architecture.revision < 1) issue('positive_revision_required', `${ap}.revision`);
  references(architecture.decisionRefs, declaredDecisions, `${ap}.decisionRefs`);
  for (const [i, choice] of rows(architecture.technologyChoices, `${ap}.technologyChoices`).values.entries()) {
    for (const key of ['name', 'version', 'rationale']) requireText(choice[key], `${ap}.technologyChoices[${i}].${key}`);
    strings(choice.evidenceRefs, `${ap}.technologyChoices[${i}].evidenceRefs`, { nonempty: true });
  }
  for (const [i, constraint] of rows(architecture.constraints, `${ap}.constraints`).values.entries()) {
    for (const key of ['requirement', 'verification']) requireText(constraint[key], `${ap}.constraints[${i}].${key}`);
  }
  const modules = rows(software.modules, 'productDesign.softwareDesign.modules');
  const moduleIds = references(architecture.moduleIds, modules.ids, `${ap}.moduleIds`);
  if (moduleIds.length !== modules.ids.size || [...modules.ids].some(id => !moduleIds.includes(id))) issue('architecture_modules_mismatch', `${ap}.moduleIds`);
  if (design.mode === 'delivery' && modules.values.length === 0) issue('delivery_modules_required', 'productDesign.softwareDesign.modules');
  const tasksById = new Map(tasks.values.map(task => [task.id, task]));
  for (const [i, module] of modules.values.entries()) {
    const mp = `productDesign.softwareDesign.modules[${i}]`;
    noAuthority(module, mp);
    requireText(module.purpose, `${mp}.purpose`);
    const detail = key => module[key] ?? (design.mode === "exploration" ? [] : undefined);
    const refSets = {};
    for (const [key, known] of [['journeyRefs', journeys.ids], ['decisionRefs', declaredDecisions], ['interfaceRefs', interfaces.ids], ['stateRefs', shared.ids]]) {
      refSets[key] = new Set(references(detail(key), known, `${mp}.${key}`));
    }
    const moduleTasks = references(detail("taskIds"), tasks.ids, `${mp}.taskIds`, { nonempty: design.mode === 'delivery' });
    const moduleCriteria = references(detail("acceptanceCriterionIds"), criteria.ids, `${mp}.acceptanceCriterionIds`, { nonempty: design.mode === 'delivery' });
    for (const [j, state] of rows(detail("states"), `${mp}.states`, 'name').values.entries()) requireText(state.behavior, `${mp}.states[${j}].behavior`);
    strings(detail("businessRules"), `${mp}.businessRules`);
    strings(detail("implementationNotes"), `${mp}.implementationNotes`);
    for (const [j, removal] of list(detail("removalCandidates"), `${mp}.removalCandidates`).entries()) {
      const rp = `${mp}.removalCandidates[${j}]`;
      if (!object(removal)) { issue('removal_candidate_object_required', rp); continue; }
      for (const key of ['path', 'replacement', 'reason']) requireText(removal[key], `${rp}.${key}`);
      if (text(removal.path) && (/^[A-Za-z]:|^[\\/]|\\|\x00/.test(removal.path) || removal.path.split('/').some(part => ['', '.', '..'].includes(part)))) issue('package_relative_candidate_required', `${rp}.path`);
      strings(removal.evidenceRefs, `${rp}.evidenceRefs`, { nonempty: true });
    }
    const covered = new Set();
    for (const taskId of moduleTasks) {
      const task = tasksById.get(taskId);
      if (!task) continue;
      const taskCriteria = references(task.criterionIds, criteria.ids, `taskSlices.${taskId}.criterionIds`, { nonempty: true });
      for (const id of taskCriteria) covered.add(id);
      if (taskCriteria.some(id => !moduleCriteria.includes(id))) issue('task_criterion_outside_module', `${mp}.acceptanceCriterionIds`);
      for (const key of Object.keys(refSets)) {
        const taskRefs = strings(task[key] ?? [], `taskSlices.${taskId}.${key}`);
        if (taskRefs.some(id => !refSets[key].has(id))) issue('task_reference_outside_module', `${mp}.${key}`);
      }
    }
    if (design.mode === 'delivery' && moduleCriteria.some(id => !covered.has(id))) issue('module_criterion_has_no_task', `${mp}.acceptanceCriterionIds`);
  }
  return result(issues.length ? 'invalid' : 'structure_valid');
}

async function main() {
  let result;
  if (process.argv.slice(2).join('\0') !== '--input-json\0-') {
    result = { schemaVersion: 1, status: 'invalid', issues: [{ code: 'usage_node_check_design_handoff_input_json_stdin', location: 'argv' }], claimBoundary: boundary, nativeRuntimeVerified: false, productAccepted: false };
  } else {
    try {
      const chunks = []; let size = 0;
      for await (const chunk of process.stdin) {
        size += chunk.length;
        if (size > MAX_INPUT_BYTES) throw new Error('input_too_large');
        chunks.push(chunk);
      }
      result = checkDesignHandoff(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    } catch (error) {
      result = { schemaVersion: 1, status: 'invalid', issues: [{ code: error.message === 'input_too_large' ? 'input_too_large' : 'invalid_json_input', location: 'stdin' }], claimBoundary: boundary, nativeRuntimeVerified: false, productAccepted: false };
    }
  }
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.status === 'invalid' ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();
