import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareProjectExperience, checkExperienceApplication } from '../scripts/project-experience.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const cases = () => read('examples/project-experience/cases.json').cases;
const bind = profile => ({designBinding: {designId: 'design-current', revision: 3}, designContext: {projectExperience: profile}});
const clone = value => structuredClone(value);

test('legacy role inputs remain usable and do not invent a project profile', () => {
  assert.deepEqual(prepareProjectExperience({journey: 'existing bounded edit'}), {status: 'not_configured', issues: []});
});

test('a task slice consumes its domain rules plus shared rules without requiring another module', () => {
  const item = cases()[0];
  const profile = clone(item.profile);
  profile.tasks.push({id: 'purchase-part', actor: '采购员', goal: '确认备件适配并下采购草稿', successCondition: '找到适配型号并保留采购草稿'});
  profile.layers[1].rules.push({id: 'part-compatibility', kind: 'visible_information', target: 'parts/selection', taskIds: ['purchase-part'], requirement: '显示备件接口和设备适配条件', verification: '核对实际备件选择页', value: ['part-interface', 'equipment-match']});
  const input = bind(profile);
  input.designContext.applicableExperienceTaskIds = [profile.tasks[0].id];
  const prepared = prepareProjectExperience(input);
  assert.equal(prepared.status, 'prepared');
  assert.equal(prepared.taskBriefs.length, 1);
  assert.ok(prepared.rules.some(rule => rule.id === 'keyboard-recovery'));
  assert.ok(!prepared.rules.some(rule => rule.id === 'part-compatibility'));
  assert.equal(checkExperienceApplication(input, item.delivery).status, 'review_required');
  delete input.designContext.applicableExperienceTaskIds;
  assert.ok(checkExperienceApplication(input, item.delivery).issues.some(issue => issue.code === 'missing_surface'));
  input.designContext.applicableExperienceTaskIds = ['unknown-task'];
  assert.ok(prepareProjectExperience(input).issues.some(issue => issue.code === 'invalid_applicable_tasks'));
});

test('the four industries produce different task briefs and consume current project rules', () => {
  const briefs = new Set();
  for (const item of cases()) {
    const context = prepareProjectExperience(bind(item.profile));
    assert.equal(context.status, 'prepared', JSON.stringify(context.issues));
    assert.equal(context.projectId, item.profile.projectId);
    assert.equal(context.taskBriefs[0].goal, item.profile.tasks[0].goal);
    assert.ok(context.taskBriefs[0].rules.some(rule => rule.kind === 'visible_information'));
    briefs.add(JSON.stringify(context.taskBriefs));
    const report = checkExperienceApplication(bind(item.profile), item.delivery);
    assert.equal(report.status, 'review_required', JSON.stringify(report.issues));
    assert.equal(report.runtimeVerified, false);
  }
  assert.equal(briefs.size, 4);
});

test('a critical state hidden in an accordion fails even when every rule id is echoed', () => {
  const item = cases().find(item => item.id === 'enterprise-knowledge');
  const output = clone(item.delivery);
  output.experienceApplication.surfaceModels[0].information.find(info => info.id === 'answer-boundary').visibility = 'on_demand';
  const report = checkExperienceApplication(bind(item.profile), output);
  assert.equal(report.status, 'invalid');
  assert.ok(report.issues.some(issue => issue.code === 'critical_information_hidden'));
});

test('a claimed complete surface cannot omit a required failure state', () => {
  const item = cases().find(item => item.id === 'mechanical-maintenance');
  const output = clone(item.delivery);
  output.experienceApplication.surfaceModels.pop();
  const report = checkExperienceApplication(bind(item.profile), output);
  assert.equal(report.status, 'invalid');
  assert.ok(report.issues.some(issue => issue.code === 'missing_surface'));
});

test('appliance comparison needs exact values; a chart alone is insufficient', () => {
  const item = cases().find(item => item.id === 'appliance-commerce');
  const output = clone(item.delivery);
  output.experienceApplication.surfaceModels[0].representations[0] = {informationId: 'installation-specs', format: 'chart', summary: '比较候选尺寸与安装范围'};
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'exact_values_missing'));
  output.experienceApplication.surfaceModels[0].representations[0].alternative = {format: 'table', ref: 'artifact:installation-table'};
  assert.equal(checkExperienceApplication(bind(item.profile), output).status, 'review_required');
});

test('failure recovery preserves project inputs and actions', () => {
  const item = cases().find(item => item.id === 'heritage-fashion');
  const output = clone(item.delivery);
  output.experienceApplication.surfaceModels[1].recovery.preserve = [];
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'recovery_input_missing'));
});

test('a recolored generic dashboard fails the project decision requirements', () => {
  const item = cases().find(item => item.id === 'heritage-fashion');
  const output = clone(item.delivery);
  output.experienceApplication.surfaceModels[0].information = [
    {id: 'system-status', visibility: 'visible'},
    {id: 'visitors', visibility: 'primary'},
    {id: 'revenue', visibility: 'primary'}
  ];
  const report = checkExperienceApplication(bind(item.profile), output);
  assert.equal(report.status, 'invalid');
  assert.ok(report.issues.some(issue => issue.code === 'critical_information_missing' && issue.detail.includes('fit')));
});

test('necessary repetition uses different purposes; accidental duplicate disclosure is reported', () => {
  const item = cases()[0];
  const output = clone(item.delivery);
  const information = output.experienceApplication.surfaceModels[0].information;
  information.push({...information[1]});
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'unexplained_duplicate'));
  information[1].purpose = 'Identify the selected equipment';
  information.at(-1).purpose = 'Confirm the equipment before recording maintenance';
  assert.equal(checkExperienceApplication(bind(item.profile), output).status, 'review_required');
});

test('silent project overrides and weakened baseline rules are detected', () => {
  const item = cases()[0];
  const profile = clone(item.profile);
  const base = profile.layers[0].rules.find(rule => rule.kind === 'visible_information');
  profile.layers[2].rules.push({...base, id: 'brand-hide-status', value: []});
  assert.ok(prepareProjectExperience(bind(profile)).issues.some(issue => issue.code === 'rule_conflict'));
  profile.layers[2].rules.at(-1).overrides = base.id;
  assert.ok(prepareProjectExperience(bind(profile)).issues.some(issue => issue.code === 'baseline_weakened'));
});

test('an explicit theme override changes the effective output while preserving provenance', () => {
  const profile = clone(cases()[0].profile);
  profile.layers[0].rules.push({id: 'base-density', kind: 'theme', target: 'density', requirement: 'Readable density', verification: 'Check task at target viewport', value: 'comfortable'});
  profile.layers[2].rules.push({id: 'project-density', kind: 'theme', target: 'density', requirement: 'Compact operations table', verification: 'Observe equipment triage', value: 'compact', overrides: 'base-density'});
  const prepared = prepareProjectExperience(bind(profile));
  assert.equal(prepared.status, 'prepared');
  const effective = prepared.rules.find(rule => rule.target === 'density');
  assert.equal(effective.value, 'compact');
  assert.deepEqual(effective.lineage.map(source => source.ruleId), ['base-density', 'project-density']);
});

test('another project or stale profile cannot satisfy the current design', () => {
  const item = cases()[0];
  const output = clone(item.delivery);
  output.experienceApplication.revision++;
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'experience_binding_mismatch'));
  output.experienceApplication.revision--;
  output.experienceApplication.projectId = 'other-project';
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'experience_binding_mismatch'));
});

test('invalid inputs and missing source revisions return bounded diagnostics', () => {
  assert.equal(prepareProjectExperience(null).status, 'invalid');
  const item = cases()[0];
  assert.equal(checkExperienceApplication(bind(item.profile), null).status, 'invalid');
  const profile = clone(item.profile);
  delete profile.layers[1].source.version;
  assert.ok(prepareProjectExperience(bind(profile)).issues.some(issue => issue.code === 'source_missing'));
  profile.layers[1].rules[0].taskIds = 'invalid-scope';
  assert.ok(prepareProjectExperience(bind(profile)).issues.some(issue => issue.code === 'invalid_task_reference'));
});

test('research-only delivery exposes pending UI checks and never claims user observations', () => {
  const item = cases()[0];
  const output = clone(item.delivery);
  output.experienceApplication.scope = 'research';
  delete output.experienceApplication.surfaceModels;
  const report = checkExperienceApplication(bind(item.profile), output);
  assert.equal(report.status, 'review_required');
  assert.ok(report.unverified.some(item => item.reason === 'surface_not_supplied'));
  output.experienceApplication.ruleApplications[0].status = 'observed';
  assert.ok(checkExperienceApplication(bind(item.profile), output).issues.some(issue => issue.code === 'observation_reference_missing'));
});

test('package CLI reads supplied data only and returns the actual prepared context', () => {
  const input = bind(cases()[0].profile);
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/project-experience.mjs')], {input: JSON.stringify({input}), encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).projectId, input.designContext.projectExperience.projectId);
});

test('public role contract accepts the same optional binding and requires professional application review when supplied', () => {
  const capability = read('capability.json').capabilities[0];
  const method = read('method.json');
  for (const key of ['designBinding', 'designContext', 'projectFacts']) assert.ok(capability.input.properties[key], key);
  assert.ok(capability.output.properties.experienceApplication);
  assert.ok(capability.output.properties.criterionResults);
  assert.ok(!capability.input.required.includes('designContext'));
  assert.ok(method.expertise.contractGuidance[0].outputChecks.some(check => check.field === 'experienceApplication'));
  for (const asset of method.knowledgeAssets.filter(asset => asset.path.startsWith('references/project-experience'))) {
    assert.ok(asset.appliesTo.includes(capability.id) || asset.appliesTo.includes('always'), 'the real Meta loader does not interpret prose selectors');
  }
});

test('a task-specific override preserves the required baseline for other tasks', () => {
  const base = {id: 'base-owner', kind: 'visible_information', target: 'equipment/detail', requirement: 'Show the escalation owner', verification: 'Inspect the detail view', value: ['escalation-owner'], invariant: true};
  const profile = {schemaVersion: 1, projectId: 'maintenance', revision: 1, tasks: ['inspect', 'repair'].map(id => ({id, actor: 'Technician', goal: id, successCondition: 'Find the escalation owner'})), layers: ['base', 'domain', 'brand', 'task'].map(level => ({level, source: {ref: `${level}.md`, version: '1'}, rules: level === 'base' ? [base] : level === 'task' ? [{...base, id: 'repair-owner', overrides: base.id, taskIds: ['repair']}] : []}))};
  const input = bind(profile);
  input.designContext.applicableExperienceTaskIds = ['inspect'];
  const prepared = prepareProjectExperience(input);
  assert.equal(prepared.status, 'prepared', JSON.stringify(prepared.issues));
  assert.deepEqual(prepared.taskBriefs[0].rules.map(rule => rule.id), ['base-owner']);
  const output = {designBinding: input.designBinding, experienceApplication: {projectId: profile.projectId, revision: 1, scope: 'implementation', ruleApplications: [], surfaceModels: []}};
  assert.equal(checkExperienceApplication(input, output).status, 'invalid');
  delete input.designContext.applicableExperienceTaskIds;
  const all = prepareProjectExperience(input);
  assert.deepEqual(all.taskBriefs.map(task => task.rules.map(rule => rule.id)), [['base-owner'], ['repair-owner']]);
  output.experienceApplication.ruleApplications = all.rules.map(rule => ({ruleId: rule.id, status: 'specified', application: 'The task detail displays its owner', artifactRefs: ['current-design.md']}));
  output.experienceApplication.surfaceModels = profile.tasks.map(task => ({taskId: task.id, target: base.target, information: [{id: 'escalation-owner', visibility: 'primary'}]}));
  assert.equal(checkExperienceApplication(input, output).status, 'review_required');
  output.experienceApplication.surfaceModels.pop();
  assert.ok(checkExperienceApplication(input, output).issues.some(row => row.code === 'missing_surface'));
});

test('disjoint tasks can define the same concern without overwriting each other', () => {
  const profile = {schemaVersion: 1, projectId: 'service', revision: 1, tasks: ['inspect', 'repair'].map(id => ({id, actor: 'Technician', goal: id, successCondition: 'Find required information'})), layers: ['base', 'domain', 'brand', 'task'].map(level => ({level, source: {ref: `${level}.md`, version: '1'}, rules: level === 'domain' ? ['inspect', 'repair'].map(id => ({id: `${id}-detail`, taskIds: [id], kind: 'visible_information', target: 'equipment/detail', requirement: `Show ${id} information`, verification: 'Inspect the detail view', value: [id]})) : []}))};
  const prepared = prepareProjectExperience(bind(profile));
  assert.equal(prepared.status, 'prepared', JSON.stringify(prepared.issues));
  assert.deepEqual(prepared.taskBriefs.map(task => task.rules.map(rule => rule.id)), [['inspect-detail'], ['repair-detail']]);
});

test('CLI invalid JSON errors do not echo private input fragments', () => {
  const marker = 'customer-private-unpublished-input';
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/project-experience.mjs')], {input: `{"private":"${marker}" BROKEN`, encoding: 'utf8'});
  assert.equal(result.status, 1);
  assert.ok(!result.stdout.includes(marker));
});
