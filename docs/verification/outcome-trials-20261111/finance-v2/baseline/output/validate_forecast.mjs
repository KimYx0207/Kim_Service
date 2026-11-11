import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const budget = JSON.parse(read('inputs/confirmed-budget.json'));
const f = JSON.parse(read('output/forecast.json'));
const facts = JSON.parse(read('output/facts.json'));
const integrity = JSON.parse(read('output/source-integrity.json'));
const decision = read('output/decision.md');
const d = budget.drivers;
const r = x => Math.round(x * 100) / 100;
const failures = [];
let checked = 0;
const assert = (ok, label) => { checked++; if (!ok) failures.push(label); };
const equal = (actual, expected, label) => assert(actual === expected, `${label}: ${actual} != ${expected}`);
const cents = x => Math.round(x * 100);

equal(f.schemaVersion, 1, 'forecast.schemaVersion');
equal(f.currency, budget.currency, 'forecast.currency');
equal(f.scenarios.length, budget.scenarios.length, 'scenario count');
equal(new Set(f.scenarios.map(s => s.id)).size, 3, 'unique scenarios');
equal(f.appliedBudget.variableCostPerUnit, 45, 'approved cost applied');
equal(f.appliedBudget.proposalAppliedToMainForecast, false, 'unapproved proposal excluded');

const required = ['revenue', 'netIncome', 'receipts', 'payments', 'financing', 'endingCash'];
const amountFields = ['revenue', 'variableCost', 'fixedCost', 'depreciation', 'pretaxIncome', 'tax', 'netIncome', 'openingCash', 'receipts', 'supplierPayments', 'capex', 'payments', 'financing', 'endingCash', 'openingReceivables', 'endingReceivables', 'openingPayables', 'endingPayables'];
for (const scenario of f.scenarios) {
  const s = budget.scenarios.find(s => s.id === scenario.id);
  assert(Boolean(s), `${scenario.id} exists in confirmed budget`);
  if (!s) continue;
  equal(scenario.months.length, 12, `${s.id} has 12 months`);
  const running = { receipts: 0, payments: 0, financing: 0, revenue: 0, variableCost: 0, supplierPayments: 0 };
  for (const [i, row] of scenario.months.entries()) {
    const key = `${s.id}/${row.month}`;
    equal(row.month, `2027-${String(i + 1).padStart(2, '0')}`, `${key} calendar month`);
    for (const field of required) assert(typeof row[field] === 'number' && Number.isFinite(row[field]), `${key} required numeric ${field}`);
    for (const field of amountFields) assert(Number.isFinite(row[field]) && Math.abs(row[field] * 100 - Math.round(row[field] * 100)) < 1e-6, `${key} monetary precision ${field}`);
    const expectedUnits = Math.round(d.initialUnits * s.unitsMultiplier * (1 + d.monthlyGrowth + s.growthDelta) ** i);
    equal(row.units, expectedUnits, `${key} independent volume calculation`);
    equal(row.revenue, r(expectedUnits * d.unitPrice * s.priceMultiplier), `${key} revenue`);
    equal(row.variableCost, r(expectedUnits * 45 * s.costMultiplier), `${key} approved cost with scenario multiplier`);
    equal(row.fixedCost, d.fixedCostPerMonth, `${key} fixed cost`);
    equal(row.depreciation, d.depreciationPerMonth, `${key} depreciation`);
    equal(cents(row.pretaxIncome), cents(row.revenue) - cents(row.variableCost) - cents(row.fixedCost) - cents(row.depreciation), `${key} profit bridge in integer cents`);
    equal(row.tax, r(Math.max(0, row.pretaxIncome) * d.taxRate), `${key} positive-profit tax with no loss carryforward`);
    equal(cents(row.netIncome), cents(row.pretaxIncome) - cents(row.tax), `${key} net income bridge`);
    const priorRevenue = i ? scenario.months[i - 1].revenue : 0;
    const priorCost = i ? scenario.months[i - 1].variableCost : 0;
    equal(row.receipts, r(row.revenue * d.collectionShare + priorRevenue * (1 - d.collectionShare) + (i ? 0 : budget.openingReceivables)), `${key} collection timing and opening receivables`);
    equal(row.supplierPayments, r(row.variableCost * d.paymentShare + priorCost * (1 - d.paymentShare) + (i ? 0 : budget.openingPayables)), `${key} supplier payment timing and opening payables`);
    equal(row.capex, d.capexByMonth[i], `${key} capex schedule`);
    equal(cents(row.payments), cents(row.supplierPayments) + cents(row.fixedCost) + cents(row.tax) + cents(row.capex), `${key} total payments exclude depreciation`);
    equal(row.financing, d.financingByMonth[i], `${key} explicit financing only`);
    equal(row.openingCash, i ? scenario.months[i - 1].endingCash : budget.openingCash, `${key} opening cash rolls`);
    equal(row.openingReceivables, i ? scenario.months[i - 1].endingReceivables : budget.openingReceivables, `${key} opening receivables roll`);
    equal(row.openingPayables, i ? scenario.months[i - 1].endingPayables : budget.openingPayables, `${key} opening payables roll`);
    for (const field of Object.keys(running)) running[field] += cents(row[field]);
    equal(cents(row.endingCash), cents(budget.openingCash) + running.receipts - running.payments + running.financing, `${key} cumulative cash bridge in integer cents`);
    equal(cents(row.endingReceivables), cents(budget.openingReceivables) + running.revenue - running.receipts, `${key} cumulative receivables bridge in integer cents`);
    equal(cents(row.endingPayables), cents(budget.openingPayables) + running.variableCost - running.supplierPayments, `${key} cumulative payables bridge in integer cents`);
  }
  const summary = scenario.summary;
  assert(Number.isFinite(summary.fundingRequired) && Number.isFinite(summary.endingCash), `${s.id} required numeric summaries`);
  const minimumCash = Math.min(...scenario.months.map(m => m.endingCash));
  equal(summary.fundingRequired, Math.max(0, -minimumCash), `${s.id} funding uses minimum cash, not sum of deficits`);
  equal(summary.endingCash, scenario.months.at(-1).endingCash, `${s.id} ending cash equals December`);
  equal(summary.minimumEndingCash, minimumCash, `${s.id} minimum cash`);
  equal(summary.minimumCashMonth, scenario.months.find(m => m.endingCash === minimumCash).month, `${s.id} minimum month`);
  equal(summary.firstNegativeCashMonth, scenario.months.find(m => m.endingCash < 0)?.month ?? null, `${s.id} first negative month`);
  equal(JSON.stringify(summary.negativeCashMonths), JSON.stringify(scenario.months.filter(m => m.endingCash < 0).map(m => m.month)), `${s.id} all negative months`);
  for (const field of ['revenue', 'variableCost', 'fixedCost', 'depreciation', 'pretaxIncome', 'tax', 'netIncome', 'receipts', 'supplierPayments', 'capex', 'payments', 'financing']) {
    equal(cents(summary[field]), scenario.months.reduce((sum, row) => sum + cents(row[field]), 0), `${s.id} annual ${field} sum in integer cents`);
  }
  equal(summary.units, scenario.months.reduce((sum, row) => sum + row.units, 0), `${s.id} annual units`);
  equal(summary.endingReceivables, scenario.months.at(-1).endingReceivables, `${s.id} ending receivables`);
  equal(summary.endingPayables, scenario.months.at(-1).endingPayables, `${s.id} ending payables`);
  const annualCashFromProfit = cents(budget.openingCash) + cents(summary.netIncome) + cents(summary.depreciation) - (cents(summary.endingReceivables) - cents(budget.openingReceivables)) + (cents(summary.endingPayables) - cents(budget.openingPayables)) - cents(summary.capex) + cents(summary.financing);
  equal(cents(summary.endingCash), annualCashFromProfit, `${s.id} annual profit-to-cash reconciliation`);
  for (const field of ['netIncome', 'fundingRequired', 'endingCash']) assert(decision.includes(summary[field].toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })), `${s.id} decision includes ${field}`);
}

equal(facts.conflicts.length, 1, 'one supplier quote conflict');
for (const conflict of facts.conflicts) {
  assert(typeof conflict.issue === 'string' && conflict.issue.length > 0, 'conflict issue');
  assert(Array.isArray(conflict.sources) && conflict.sources.every(s => typeof s === 'string'), 'conflict source path array');
  equal(JSON.stringify(conflict.sources), JSON.stringify(['inputs/confirmed-budget.json', 'inputs/supplier-proposal.md']), 'conflict cites both sources');
  equal(conflict.status, 'pending', 'unaccepted quote pending');
  equal(conflict.appliedValue, 45, 'conflict appliedValue numeric 45');
  equal(conflict.alternateValue, 50, 'conflict alternateValue numeric 50');
  equal(conflict.unit, 'CNY/order', 'conflict unit exact contract');
}
const afterHashes = {};
for (const [p, beforeHash] of Object.entries(integrity.beforeGeneration)) {
  const afterHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
  afterHashes[p] = afterHash;
  equal(afterHash, beforeHash, `${p} unchanged since before generation`);
}
const validation = {
  status: failures.length ? 'failed' : 'passed',
  executedCommand: 'node output/validate_forecast.mjs',
  assertionsExecuted: checked,
  failures,
  scenariosChecked: f.scenarios.length,
  monthlyRowsChecked: f.scenarios.reduce((sum, s) => sum + s.months.length, 0),
  checks: [
    'JSON parsing, required fields, numeric types, units, 3 scenarios and 12 monthly rows per scenario',
    'All monthly sales volumes, revenue, approved cost, taxes, collection timing, payment timing and capex',
    'Month-by-month cumulative cash, receivables and payables reconciliation using integer cents',
    'Annual totals, annual profit-to-cash reconciliation, ending balances and deepest cash deficit',
    'No automatic financing; unapproved 50 CNY/order quote stays pending and outside the main forecast',
    'Decision document contains generated profit, funding requirement and ending cash for each scenario',
    'SHA-256 comparison of task.md and all three provided inputs before generation and after validation'
  ],
  inputHashesAfterValidation: afterHashes,
  notPerformed: [
    'External financial, legal or tax fact verification: all calculations use only the supplied synthetic assumptions.',
    'A separate sensitivity run at the proposed 50 CNY/order cost.',
    'Daily or intramonth cash scheduling, financing execution, or supplier negotiation/acceptance.',
    'A repository grader, external acceptance test, paid model call, or model CLI call.'
  ]
};
fs.writeFileSync(path.join(root, 'output/validation.json'), JSON.stringify(validation, null, 2) + '\n');
if (failures.length) {
  console.log(JSON.stringify(validation, null, 2));
  process.exitCode = 1;
} else {
  const submission = {
    artifacts: {
      forecast: 'forecast.json',
      decision: 'decision.md',
      facts: 'facts.json'
    }
  };
  fs.writeFileSync(path.join(root, 'output/submission.json'), JSON.stringify(submission, null, 2) + '\n');
  console.log(JSON.stringify({ status: validation.status, assertionsExecuted: checked, monthlyRowsChecked: validation.monthlyRowsChecked, submissionWrittenLast: true }, null, 2));
}
