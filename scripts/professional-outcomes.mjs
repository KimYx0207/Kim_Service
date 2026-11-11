#!/usr/bin/env node
// Offline preparation and evidence-based grading. Never starts a model.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import operating from '../agents/financial-modeler/scripts/operating-forecast.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = path.join(ROOT, 'evals/professional-outcomes');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
function taskById(id) {
  const task = readJson(path.join(SUITE, 'tasks.json')).tasks.find(item => item.id === id);
  if (!task) throw new Error(`Unknown task: ${id}`);
  return task;
}
function safeFile(root, relative, limit = 1024 * 1024) {
  if (typeof relative !== 'string' || !relative || relative.length > 300 || path.isAbsolute(relative) || /[\\\0]/.test(relative) || relative.split('/').some(part => ['.', '..', ''].includes(part))) throw new Error('Artifact path must be a relative file inside its output directory');
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not artifact evidence');
  }
  const stat = fs.statSync(current);
  if (!stat.isFile() || stat.size === 0 || stat.size > limit) throw new Error(`Missing, empty or oversized file: ${relative}`);
  return current;
}
function fileHashes(root) {
  const entries = {};
  function walk(relative = '') {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name = [relative, entry.name].filter(Boolean).join('/');
      if (entry.isSymbolicLink()) throw new Error('Inputs and methods must not contain symlinks');
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) entries[name] = sha(fs.readFileSync(path.join(root, name)));
    }
  }
  walk(); return entries;
}
export function prepareTrial({ taskId, destination, condition = 'with_method', model = 'unexposed', attempt = 1 }) {
  if (!['baseline', 'with_method'].includes(condition) || !Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid condition or attempt');
  const task = taskById(taskId);
  const directory = path.resolve(destination);
  if (fs.existsSync(directory)) throw new Error('Use a new trial directory; previous runs must not be overwritten');
  fs.mkdirSync(directory, { recursive: true });
  fs.cpSync(path.join(SUITE, task.inputDir), path.join(directory, 'inputs'), { recursive: true, dereference: false });
  fs.mkdirSync(path.join(directory, 'output'));
  let method = null;
  if (condition === 'with_method') {
    const component = path.join(ROOT, 'agents', task.componentId);
    fileHashes(component); // Reject links before copying a method snapshot.
    fs.cpSync(component, path.join(directory, 'method'), { recursive: true, dereference: false });
    method = { componentId: task.componentId, version: readJson(path.join(component, 'capability.json')).componentVersion,
      files: fileHashes(path.join(directory, 'method')) };
  }
  const record = { schemaVersion: 1, taskId, condition, attempt, model, createdAt: new Date().toISOString(),
    taskSha256: sha(JSON.stringify(task)), inputFiles: fileHashes(path.join(directory, 'inputs')), method,
    durationMs: null, totalTokens: null, measurement: 'not_supplied_by_host', inputProvenance: 'original_synthetic_file_tasks' };
  fs.writeFileSync(path.join(directory, 'run.json'), JSON.stringify(record, null, 2) + '\n');
  const instruction = condition === 'with_method' ? '先读取 method/AGENT.md，按当前任务使用包内方法与实际可用工具。\n\n' : '';
  fs.writeFileSync(path.join(directory, 'task.md'), instruction + task.prompt + '\n\n原始材料位于 inputs/。只能在 output/ 交付成果，保留输入与运行记录不变。\n');
  return { directory, task: path.join(directory, 'task.md'), inputs: path.join(directory, 'inputs'), output: path.join(directory, 'output') };
}
export function gradeTrial(directory, { reviewFile } = {}) {
  directory = path.resolve(directory);
  const run = readJson(path.join(directory, 'run.json'));
  const task = taskById(run.taskId);
  const output = path.join(directory, 'output');
  const checks = [];
  const files = {};
  const check = (id, fn) => {
    try { const evidence = fn(); checks.push({ id, status: 'pass', evidence: evidence ?? 'observed' }); }
    catch (error) { checks.push({ id, status: 'fail', evidence: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  check('frozen-task-and-inputs', () => {
    assert(run.taskSha256 === sha(JSON.stringify(task)), 'Task/rubric changed after trial preparation');
    assert(JSON.stringify(fileHashes(path.join(directory, 'inputs'))) === JSON.stringify(run.inputFiles), 'Input files changed during the run');
    if (run.method) assert(JSON.stringify(fileHashes(path.join(directory, 'method'))) === JSON.stringify(run.method.files), 'Method snapshot changed during the run');
    return Object.keys(run.inputFiles).map(file => `inputs/${file}`);
  });
  let submission;
  check('submission-manifest', () => {
    submission = readJson(safeFile(output, 'submission.json'));
    assert(submission.artifacts && typeof submission.artifacts === 'object', 'submission.json needs artifacts');
    return 'output/submission.json';
  });
  for (const [name, format] of Object.entries(task.artifacts)) check(`artifact-${name}`, () => {
    const relative = submission?.artifacts?.[name];
    const file = safeFile(output, relative);
    const bytes = fs.readFileSync(file);
    if (format === 'json') JSON.parse(bytes.toString('utf8'));
    if (format === 'html') assert(/<!doctype html|<html[\s>]/i.test(bytes.toString('utf8')), 'Expected an actual HTML document');
    files[name] = file;
    return { path: relative, bytes: bytes.length, sha256: sha(bytes) };
  });
  if (task.id === 'finance-conflict') {
    const expectedInput = readJson(path.join(directory, 'inputs/confirmed-budget.json'));
    const expected = operating.forecast(expectedInput);
    check('finance-12-month-arithmetic', () => {
      assert(files.forecast, 'No forecast artifact');
      const actual = readJson(files.forecast);
      assert(actual.currency === expected.currency, 'Currency changed or is missing');
      assert(Array.isArray(actual.scenarios) && actual.scenarios.length === expected.scenarios.length, 'Missing or extra scenarios');
      let comparisons = 0;
      for (const scenario of expected.scenarios) {
        const observed = actual.scenarios.find(item => item.id === scenario.id);
        assert(observed && Array.isArray(observed.months) && observed.months.length === 12, `Missing twelve months: ${scenario.id}`);
        for (let i = 0; i < 12; i++) {
          assert(observed.months[i].month === scenario.months[i].month, `Month order mismatch: ${scenario.id}/${i}`);
          for (const key of ['revenue','netIncome','receipts','payments','financing','endingCash']) {
            const value = observed.months[i][key];
            assert(typeof value === 'number' && Number.isFinite(value) && Math.abs(value - scenario.months[i][key]) <= .011, `${scenario.id}/${scenario.months[i].month}/${key}: wrong or missing amount`);
            comparisons++;
          }
        }
        for (const key of ['fundingRequired','endingCash']) assert(typeof observed.summary?.[key] === 'number' && Math.abs(observed.summary[key] - scenario.summary[key]) <= .011, `${scenario.id}/summary/${key}: wrong or missing`);
      }
      return { numericComparisons: comparisons, reference: 'pure operating forecast, fixed confirmed input; not an independent financial audit' };
    });
    check('finance-conflicting-source-kept-explicit', () => {
      assert(files.facts, 'No facts artifact');
      const facts = readJson(files.facts);
      const conflict = facts.conflicts?.find(item => item.appliedValue === expectedInput.drivers.variableCostPerUnit && item.alternateValue === 50);
      assert(conflict && ['pending','unresolved','not_approved','待确认','未批准'].includes(conflict.status), 'Unapproved supplier proposal must remain unresolved, not silently replace the confirmed budget');
      assert(typeof conflict.issue === 'string' && conflict.issue.trim(), 'Describe which input is in conflict');
      assert(Array.isArray(conflict.sources) && conflict.sources.some(x=>String(x).includes('confirmed-budget')) && conflict.sources.some(x=>String(x).includes('supplier-proposal')), 'Both source files are required');
      assert(conflict.unit === 'CNY/order' || conflict.unit === 'CNY/单' || conflict.unit === 'CNY元/单', 'Specify a comparable per-order currency unit');
      return conflict;
    });
  }
  if (task.id === 'design-states') check('design-local-resource-closure', () => {
    assert(files.page, 'No page artifact');
    const html = fs.readFileSync(files.page, 'utf8');
    const resources = [...html.matchAll(/<(?:script|link|img)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
    for (const resource of resources) {
      assert(!/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(resource), `External or absolute resource: ${resource}`);
      const relative = path.posix.normalize(path.posix.join(path.relative(output,path.dirname(files.page)).split(path.sep).join('/'), resource.split(/[?#]/)[0]));
      safeFile(output, relative);
    }
    return { localResources: resources, limitation: 'Resource presence only; layout, interaction and keyboard checks require actual browser review.' };
  });
  if (task.id === 'frontend-resume') check('resume-preserves-user-content-and-behavior', () => {
    assert(files.page, 'No page artifact');
    const source = fs.readFileSync(path.join(directory, 'inputs/index.html'), 'utf8');
    const actual = fs.readFileSync(files.page, 'utf8');
    const expected = source.replace('<h1>编辑文章</h1>', '<h1>继续编辑草稿</h1>');
    assert(actual === expected, 'The authorized one-heading edit must preserve the other source bytes, including the user draft and cancel behavior');
    return 'Observed exact bounded edit on the supplied file; no claim of browser execution';
  });
  let suppliedReview = null;
  if (reviewFile) {
    suppliedReview = readJson(path.resolve(reviewFile));
    if (suppliedReview.taskId !== task.id || !suppliedReview.reviewer?.id || !Array.isArray(suppliedReview.checks)) throw new Error('Review needs matching taskId, reviewer.id and checks');
  }
  const humanChecks = task.humanCriteria.map(criterion => {
    const observed = suppliedReview?.checks.find(item => item.id === criterion.id);
    const status = observed && ['pass','fail'].includes(observed.status) && typeof observed.evidence === 'string' && observed.evidence.trim() ? observed.status : 'not_run';
    return { ...criterion, status, evidence: status === 'not_run' ? 'Needs an actual artifact/browser review by the host or a separate reviewer' : observed.evidence };
  });
  const failed = [...checks,...humanChecks].some(item => item.status === 'fail');
  const pending = humanChecks.some(item => item.status === 'not_run');
  const report = {
    schemaVersion: 1, taskId: task.id, condition: run.condition, attempt: run.attempt, model: run.model,
    status: failed ? 'fail' : pending ? 'needs_review' : 'task_pass',
    professionalEffect: 'not_evaluated', comparativeEffect: 'not_measured',
    inputProvenance: run.inputProvenance, taskSha256: run.taskSha256,
    methodVersion: run.method?.version ?? null, methodSnapshotSha256: run.method ? sha(JSON.stringify(run.method.files)) : null,
    durationMs: Number.isFinite(run.durationMs) && run.durationMs >= 0 ? run.durationMs : null,
    totalTokens: Number.isFinite(run.totalTokens) && run.totalTokens >= 0 ? run.totalTokens : null,
    measurement: run.measurement, automaticChecks: checks, humanChecks,
    reviewer: suppliedReview?.reviewer ?? null,
    limitations: ['This is one synthetic file task, not package-wide professional certification.',
      'No model is called by this script. Missing host timing or token data stays null.',
      'A submitted review is a recorded reviewer declaration; this script cannot independently prove reviewer identity or blinding.',
      'Artifact files and deterministic calculations do not prove native-host execution or user acceptance.']
  };
  fs.writeFileSync(path.join(directory, 'grade.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
export function summarizeTrials(directories) {
  const runs = directories.map(directory => readJson(path.join(path.resolve(directory), 'grade.json')));
  return { schemaVersion: 1, professionalEffect: 'not_evaluated',
    runs: runs.map(run => ({ taskId: run.taskId, condition: run.condition, attempt: run.attempt, model: run.model, status: run.status,
      automaticPasses: run.automaticChecks.filter(item=>item.status==='pass').length, automaticTotal: run.automaticChecks.length,
      humanPasses: run.humanChecks.filter(item=>item.status==='pass').length, humanTotal: run.humanChecks.length,
      durationMs: run.durationMs, totalTokens: run.totalTokens })),
    comparison: runs.some(run=>run.condition==='baseline') && runs.some(run=>run.condition==='with_method') ? 'observed_runs_only_check_same_task_model_attempts_before_comparing' : 'insufficient_conditions',
    conclusion: 'Do not infer a causal or general skill improvement from these rows; inspect actual files, task coverage, repeated attempts and costs.' };
}
function cli() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'summarize') return summarizeTrials(args);
  const options = {};
  for (let i=0;i<args.length;i+=2) {
    if (!args[i]?.startsWith('--') || !args[i+1] || options[args[i]]) throw new Error('Use named options with one value each');
    options[args[i]]=args[i+1];
  }
  if (command === 'prepare' && options['--task'] && options['--out']) return prepareTrial({ taskId:options['--task'], destination:options['--out'], condition:options['--condition']??'with_method', model:options['--model']??'unexposed', attempt:Number(options['--attempt']??1) });
  if (command === 'grade' && options['--run']) return gradeTrial(options['--run'],{reviewFile:options['--review']});
  throw new Error('Usage: professional-outcomes.mjs prepare --task <id> --out <new-dir> [--condition baseline|with_method] [--model <observed-id>] | grade --run <dir> [--review <file>] | summarize <run-dir>...');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result=cli();process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(process.argv[2]==='grade') process.exitCode=result.status==='task_pass'?0:result.status==='needs_review'?3:1;
  }
  catch(error) { process.stderr.write(error.message+'\n'); process.exitCode=2; }
}
