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
  const hasSoftware = Object.hasOwn(design, 'softwareDesign');
  if (!hasSoftware && !Object.hasOwn(design, 'projectCapabilityRequirements')) return result('not_applicable');
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
  if (Object.hasOwn(design, 'projectCapabilityRequirements')) {
    const targets = new Set();
    for (const [i, requirement] of list(design.projectCapabilityRequirements, 'productDesign.projectCapabilityRequirements').entries()) {
      const rp = `productDesign.projectCapabilityRequirements[${i}]`;
      if (!object(requirement)) { issue('project_requirement_object_required', rp); continue; }
      noAuthority(requirement, rp);
      for (const key of ['projectId', 'baseComponentId', 'baseComponentVersion', 'role', 'targetPath']) requireText(requirement[key], `${rp}.${key}`);
      for (const key of ['domainEvidenceRefs', 'responsibilities', 'boundaries', 'reuseConditions', 'requiredInputs', 'toolRequirements', 'acceptance']) strings(requirement[key], `${rp}.${key}`, { nonempty: true });
      // New project deltas use an array; preserve legacy text byte-for-byte so
      // the creator and governance record can bind the same requirement digest.
      if (typeof requirement.projectDelta === 'string') requireText(requirement.projectDelta, `${rp}.projectDelta`);
      else strings(requirement.projectDelta, `${rp}.projectDelta`, { nonempty: true });
      const target = requirement.targetPath;
      if (text(target)) {
        const segments = target.replace(/\/$/, '').split('/');
        if (/^[A-Za-z]:|^[\\/~]|\\|\x00/.test(target) || segments.some(part => ['', '.', '..'].includes(part))) issue('project_relative_target_required', `${rp}.targetPath`);
        if (targets.has(target.replace(/\/$/, ''))) issue('duplicate_project_target', `${rp}.targetPath`);
        targets.add(target.replace(/\/$/, ''));
      }
      if (text(design.projectId) && requirement.projectId !== design.projectId) issue('project_identity_mismatch', `${rp}.projectId`);
    }
  }
  noAuthority(design, 'productDesign');
  if (!hasSoftware) return result(issues.length ? 'invalid' : 'structure_valid');
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
  const referenceKinds = [['journeyRefs', journeys.ids], ['decisionRefs', declaredDecisions], ['interfaceRefs', interfaces.ids], ['stateRefs', shared.ids]];
  const journeyCriteria = new Set();
  for (const journey of journeys.values) {
    for (const id of references(journey.criterionIds ?? [], criteria.ids, `userJourneys.${journey.id}.criterionIds`)) journeyCriteria.add(id);
  }
  // Validate every task, including support work outside the software modules.
  const taskDetails = new Map();
  const supportCriteria = new Set();
  for (const task of tasks.values) {
    const criterionIds = references(task.criterionIds, criteria.ids, `taskSlices.${task.id}.criterionIds`, { nonempty: true });
    const refs = Object.fromEntries(referenceKinds.map(([key, known]) =>
      [key, references(task[key] ?? [], known, `taskSlices.${task.id}.${key}`)]));
    const support = task.workKind === 'support';
    if (support) for (const id of criterionIds) supportCriteria.add(id);
    taskDetails.set(task.id, { criterionIds, refs, support });
  }
  const assignedTasks = new Set();
  const assignedJourneys = new Set();
  const assignedCriteria = new Set();
  for (const [i, module] of modules.values.entries()) {
    const mp = `productDesign.softwareDesign.modules[${i}]`;
    noAuthority(module, mp);
    requireText(module.purpose, `${mp}.purpose`);
    const detail = key => module[key] ?? (design.mode === "exploration" ? [] : undefined);
    const refSets = {};
    for (const [key, known] of referenceKinds) {
      refSets[key] = new Set(references(detail(key), known, `${mp}.${key}`));
    }
    const moduleTasks = references(detail("taskIds"), tasks.ids, `${mp}.taskIds`, { nonempty: design.mode === 'delivery' });
    const moduleCriteria = references(detail("acceptanceCriterionIds"), criteria.ids, `${mp}.acceptanceCriterionIds`, { nonempty: design.mode === 'delivery' });
    for (const id of moduleTasks) assignedTasks.add(id);
    for (const id of moduleCriteria) assignedCriteria.add(id);
    for (const id of refSets.journeyRefs) assignedJourneys.add(id);
    for (const [j, state] of rows(detail("states"), `${mp}.states`, 'name').values.entries()) requireText(state.behavior, `${mp}.states[${j}].behavior`);
    strings(detail("businessRules"), `${mp}.businessRules`);
    const implementationNotes = detail("implementationNotes");
    if (typeof implementationNotes === 'string') requireText(implementationNotes, `${mp}.implementationNotes`);
    else strings(implementationNotes, `${mp}.implementationNotes`);
    for (const [j, removal] of list(detail("removalCandidates"), `${mp}.removalCandidates`).entries()) {
      const rp = `${mp}.removalCandidates[${j}]`;
      if (!object(removal)) { issue('removal_candidate_object_required', rp); continue; }
      for (const key of ['path', 'replacement', 'reason']) requireText(removal[key], `${rp}.${key}`);
      if (text(removal.path) && (/^[A-Za-z]:|^[\\/]|\\|\x00/.test(removal.path) || removal.path.split('/').some(part => ['', '.', '..'].includes(part)))) issue('package_relative_candidate_required', `${rp}.path`);
      strings(removal.evidenceRefs, `${rp}.evidenceRefs`, { nonempty: true });
    }
    const covered = new Set();
    const coveredJourneys = new Set();
    for (const taskId of moduleTasks) {
      const task = taskDetails.get(taskId);
      if (!task) continue;
      if (!task.support) {
        for (const id of task.criterionIds) covered.add(id);
        for (const id of task.refs.journeyRefs) coveredJourneys.add(id);
      }
      if (task.criterionIds.some(id => !moduleCriteria.includes(id))) issue('task_criterion_outside_module', `${mp}.acceptanceCriterionIds`);
      for (const key of Object.keys(refSets)) {
        if (task.refs[key].some(id => !refSets[key].has(id))) issue('task_reference_outside_module', `${mp}.${key}`);
      }
    }
    if (design.mode === 'delivery' && moduleCriteria.some(id => !covered.has(id))) issue('module_criterion_has_no_task', `${mp}.acceptanceCriterionIds`);
    if (design.mode === 'delivery' && [...refSets.journeyRefs].some(id => !coveredJourneys.has(id))) issue('module_journey_has_no_task', `${mp}.journeyRefs`);
  }
  if (design.mode === 'delivery') {
    for (const task of tasks.values) if (task.workKind !== 'support' && !assignedTasks.has(task.id)) {
      issue('delivery_task_has_no_module', `taskSlices.${task.id}`);
    }
    for (const journey of journeys.values) if (!assignedJourneys.has(journey.id)) {
      issue('delivery_journey_has_no_module', `userJourneys.${journey.id}`);
    }
    for (const criterion of criteria.values) {
      if (criterion.required !== false && !assignedCriteria.has(criterion.id) && !supportCriteria.has(criterion.id)) {
        issue('delivery_criterion_uncovered', `acceptanceCriteria.${criterion.id}`);
      }
      if (journeyCriteria.has(criterion.id) && !assignedCriteria.has(criterion.id)) {
        issue('delivery_criterion_has_no_module', `acceptanceCriteria.${criterion.id}`);
      }
    }
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
