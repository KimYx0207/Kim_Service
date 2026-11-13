import { createHelper, hash, equal, unique, requireValue as assert } from './runtime.mjs';

function pointer(value, path) {
  if (path === '') return { found: true, value };
  assert(path.startsWith('/') && !/~(?:[^01]|$)/u.test(path), 'Invalid JSON pointer');
  for (const segment of path.slice(1).split('/').map(item => item.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return { found: false };
    value = value[segment];
  }
  return { found: true, value };
}
function assertion(output, item) {
  if (item.type === 'equals') return equal(output, item.value);
  if (item.type === 'contains') return typeof output === 'string' && typeof item.value === 'string' && output.includes(item.value);
  if (item.type === 'json_pointer_equals') {
    let value = output;
    if (typeof output === 'string') { try { value = JSON.parse(output); } catch { return false; } }
    const actual = pointer(value, item.path); return actual.found && equal(actual.value, item.value);
  }
  throw new Error(`Unsupported assertion ${item.type}`);
}
export const run = createHelper(import.meta.url, 'agent-evaluation', (input, policy) => {
  const { dataset } = input;
  assert(equal(dataset.context, input.context), 'Dataset organization/Work/revision mismatch');
  assert(dataset.cases.length <= policy.maxCases && input.runs.length <= policy.maxRuns, 'Case/run budget exceeded');
  const cases = unique(dataset.cases, 'cases'); unique(input.runs, 'runs');
  for (const item of dataset.cases) {
    unique(item.assertions, 'assertions');
    assert(item.assertions.length <= policy.maxAssertionsPerCase, 'Assertion budget exceeded');
    for (const check of item.assertions) {
      assert(policy.assertionTypes.includes(check.type), 'Executable or unknown assertions are unsupported');
      if (check.type === 'contains') assert(typeof check.value === 'string', 'contains requires a text value');
      if (check.type === 'json_pointer_equals') pointer({}, check.path);
    }
  }
  const datasetSha256 = hash(dataset); const rows = []; const summaries = [];
  for (const candidate of input.runs) {
    assert(candidate.datasetSha256 === datasetSha256, 'Run binds a different dataset version/hash');
    assert(equal(candidate.context, input.context), 'Run organization/Work/revision mismatch');
    const outputs = unique(candidate.outputs, 'outputs', 'caseId');
    for (const output of candidate.outputs) {
      const item = cases.get(output.caseId); assert(item, 'Output names an unknown case');
      assert(output.caseInputSha256 === hash(item.input), 'Output is not bound to this case input');
      if (output.outputSha256) assert(output.outputSha256 === hash(output.value), 'Supplied output hash mismatch');
      if (output.measurement?.cost !== undefined) assert(output.measurement.currency, 'A cost measurement requires its currency');
    }
    const caseRows = dataset.cases.map(item => {
      const output = outputs.get(item.id);
      const checks = item.assertions.map(check => ({ id: check.id, type: check.type, critical: check.critical,
        pass: output ? assertion(output.value, check) : false }));
      return { runId: candidate.id, caseId: item.id, tags: item.tags, status: !output ? 'missing' : checks.every(check => check.pass) ? 'passed' : 'failed',
        inputSha256: hash(item.input), outputSha256: output ? hash(output.value) : null, checks,
        cost: output?.measurement?.cost ?? null, latencyMs: output?.measurement?.latencyMs ?? null,
        currency: output?.measurement?.currency ?? null };
    });
    const criticalFailures = caseRows.flatMap(row => row.checks.filter(item => item.critical && !item.pass).map(item => `${row.caseId}/${item.id}`));
    const currency = input.budget?.currency;
    if (input.budget?.maxTotalCost !== undefined) assert(currency, 'A cost budget requires its currency');
    const observedCurrencies = new Set(caseRows.filter(row => row.cost !== null).map(row => row.currency));
    const costs = caseRows.map(row => row.cost !== null && (!currency || row.currency === currency) ? row.cost : null);
    const latency = caseRows.map(row => row.latencyMs);
    const knownCosts = costs.filter(item => item !== null);
    const knownLatencies = latency.filter(item => item !== null);
    const budget = { cost: input.budget?.maxTotalCost === undefined ? 'not_requested' : costs.some(item => item === null) ? 'unknown' : knownCosts.reduce((a,b)=>a+b,0) <= input.budget.maxTotalCost ? 'pass' : 'fail',
      latency: input.budget?.maxCaseLatencyMs === undefined ? 'not_requested' : latency.some(item => item === null) ? 'unknown' : Math.max(...knownLatencies) <= input.budget.maxCaseLatencyMs ? 'pass' : 'fail' };
    const total = caseRows.length; const passed = caseRows.filter(item => item.status === 'passed').length;
    const slices = [...new Set(caseRows.flatMap(item => item.tags))].sort().map(tag => { const selected = caseRows.filter(item => item.tags.includes(tag)); return { tag, passed: selected.filter(item => item.status === 'passed').length, total: selected.length }; });
    summaries.push({ runId: candidate.id, client: candidate.client, provider: candidate.provider, model: candidate.model,
      passed, failed: caseRows.filter(item => item.status === 'failed').length, missing: caseRows.filter(item => item.status === 'missing').length, total, passRate: passed / total,
      criticalFailures, slices, measuredTotalCost: knownCosts.length === total && observedCurrencies.size === 1 ? knownCosts.reduce((a,b)=>a+b,0) : null,
      measuredMaxLatencyMs: knownLatencies.length === total ? Math.max(...knownLatencies) : null,
      currency: currency ?? (observedCurrencies.size === 1 ? [...observedCurrencies][0] : null), measurementProvenance: 'supplied_not_independently_observed', budget,
      gate: criticalFailures.length || passed !== total || Object.values(budget).includes('fail') ? 'blocked' : Object.values(budget).includes('unknown') ? 'incomplete' : 'eligible_for_review' });
    rows.push(...caseRows);
  }
  const baseline = input.baselineRunId ?? input.runs[0].id;
  const base = summaries.find(item => item.runId === baseline); assert(base, 'Unknown baseline run');
  const comparisons = summaries.filter(item => item !== base).map(item => ({ baselineRunId: baseline, candidateRunId: item.runId, passRateDelta: item.passRate - base.passRate,
    regressions: dataset.cases.filter(testCase => rows.find(row => row.runId === baseline && row.caseId === testCase.id).status === 'passed' && rows.find(row => row.runId === item.runId && row.caseId === testCase.id).status !== 'passed').map(testCase => testCase.id),
    candidateGate: item.gate }));
  return { result: { datasetSha256, rows, summaries, comparisons,
    semanticQuality: 'not_evaluated', generalization: 'not_evaluated', providerExecutionObserved: false } };
});
