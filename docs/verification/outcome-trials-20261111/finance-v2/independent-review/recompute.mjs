import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Authored independently in /root/finance_v2_review from the supplied task,
// confirmed budget, calculation policy and supplier proposal. No producer
// calculator, reference implementation or grader is loaded or executed.
const runDirectory = path.resolve(process.argv[2]);
const destination = path.resolve(process.argv[3]);
const budgetPath = path.join(runDirectory, 'inputs/confirmed-budget.json');
const budget = JSON.parse(fs.readFileSync(budgetPath, 'utf8'));
const round = value => Math.round(value * 100) / 100;
const total = (rows, field) => round(rows.reduce((sum, row) => sum + row[field], 0));

function calculate(baseUnitCost) {
  const d = budget.drivers;
  return budget.scenarios.map(scenario => {
    const rows = [];
    let cash = budget.openingCash;
    let receivables = budget.openingReceivables;
    let payables = budget.openingPayables;
    let previousRevenue = 0;
    let previousVariableCost = 0;
    const [year, month] = budget.startMonth.split('-').map(Number);
    for (let i = 0; i < 12; i++) {
      const absoluteMonth = year * 12 + month - 1 + i;
      const row = {
        month: `${Math.floor(absoluteMonth / 12)}-${String(absoluteMonth % 12 + 1).padStart(2, '0')}`,
        units: Math.round(d.initialUnits * scenario.unitsMultiplier * (1 + d.monthlyGrowth + scenario.growthDelta) ** i),
      };
      row.revenue = round(row.units * d.unitPrice * scenario.priceMultiplier);
      row.variableCost = round(row.units * baseUnitCost * scenario.costMultiplier);
      row.fixedCost = round(d.fixedCostPerMonth);
      row.depreciation = round(d.depreciationPerMonth);
      row.pretaxIncome = round(row.revenue - row.variableCost - row.fixedCost - row.depreciation);
      row.tax = round(Math.max(0, row.pretaxIncome) * d.taxRate);
      row.netIncome = round(row.pretaxIncome - row.tax);
      row.openingCash = cash;
      row.receipts = round(row.revenue * d.collectionShare + previousRevenue * (1 - d.collectionShare) + (i === 0 ? budget.openingReceivables : 0));
      row.supplierPayments = round(row.variableCost * d.paymentShare + previousVariableCost * (1 - d.paymentShare) + (i === 0 ? budget.openingPayables : 0));
      row.capex = round(d.capexByMonth[i]);
      row.payments = round(row.supplierPayments + row.fixedCost + row.tax + row.capex);
      row.financing = round(d.financingByMonth[i]);
      row.endingCash = round(cash + row.receipts - row.payments + row.financing);
      row.openingReceivables = receivables;
      row.endingReceivables = round(receivables + row.revenue - row.receipts);
      row.openingPayables = payables;
      row.endingPayables = round(payables + row.variableCost - row.supplierPayments);
      rows.push(row);
      cash = row.endingCash;
      receivables = row.endingReceivables;
      payables = row.endingPayables;
      previousRevenue = row.revenue;
      previousVariableCost = row.variableCost;
    }
    const summary = {};
    for (const field of ['units', 'revenue', 'variableCost', 'fixedCost', 'depreciation', 'pretaxIncome', 'tax', 'netIncome', 'receipts', 'supplierPayments', 'capex', 'payments', 'financing']) {
      summary[field] = total(rows, field);
    }
    const minimum = rows.reduce((current, row) => row.endingCash < current.endingCash ? row : current, rows[0]);
    summary.endingCash = cash;
    summary.fundingRequired = round(Math.max(0, -minimum.endingCash));
    summary.minimumEndingCash = minimum.endingCash;
    summary.minimumCashMonth = minimum.month;
    summary.negativeCashMonths = rows.filter(row => row.endingCash < 0).map(row => row.month);
    summary.firstNegativeCashMonth = summary.negativeCashMonths[0] ?? null;
    summary.endingReceivables = receivables;
    summary.endingPayables = payables;
    const yearBridge = {
      openingCash: budget.openingCash,
      receipts: summary.receipts,
      payments: summary.payments,
      financing: summary.financing,
      endingCash: round(budget.openingCash + summary.receipts - summary.payments + summary.financing),
      netIncome: summary.netIncome,
      depreciation: summary.depreciation,
      receivablesIncrease: round(receivables - budget.openingReceivables),
      payablesIncrease: round(payables - budget.openingPayables),
      capex: summary.capex,
      profitBridgeEndingCash: round(budget.openingCash + summary.netIncome + summary.depreciation - (receivables - budget.openingReceivables) + (payables - budget.openingPayables) - summary.capex + summary.financing),
    };
    return {id: scenario.id, months: rows, summary, yearBridge};
  });
}

const expected = calculate(budget.drivers.variableCostPerUnit);
const proposalHypothetical = calculate(50);
const actual = JSON.parse(fs.readFileSync(path.join(runDirectory, 'output/forecast.json'), 'utf8'));
const mismatches = [];
const absentOptionalFields = [];
let compared = 0;
const requiredMonth = new Set(['month', 'revenue', 'netIncome', 'receipts', 'payments', 'financing', 'endingCash']);
const requiredSummary = new Set(['fundingRequired', 'endingCash']);
for (const scenario of expected) {
  const actualScenario = actual.scenarios.find(s => s.id === scenario.id);
  if (!actualScenario) { mismatches.push({scenario: scenario.id, issue: 'missing scenario'}); continue; }
  if (actualScenario.months.length !== 12) mismatches.push({scenario: scenario.id, issue: 'incorrect monthly row count', actual: actualScenario.months.length});
  for (const row of scenario.months) {
    const found = actualScenario.months.find(m => m.month === row.month);
    if (!found) { mismatches.push({scenario: scenario.id, month: row.month, issue: 'missing month'}); continue; }
    for (const [key, value] of Object.entries(row)) {
      if (!(key in found) && !requiredMonth.has(key)) { absentOptionalFields.push(`${scenario.id}/${row.month}/${key}`); continue; }
      compared++;
      if (found[key] !== value) mismatches.push({scenario: scenario.id, month: row.month, field: key, expected: value, actual: found[key] ?? null});
    }
  }
  for (const [key, value] of Object.entries(scenario.summary)) {
    if (!(key in actualScenario.summary) && !requiredSummary.has(key)) { absentOptionalFields.push(`${scenario.id}/summary/${key}`); continue; }
    compared++;
    if (JSON.stringify(actualScenario.summary[key]) !== JSON.stringify(value)) mismatches.push({scenario: scenario.id, field: `summary.${key}`, expected: value, actual: actualScenario.summary[key] ?? null});
  }
}

const inputHashes = Object.fromEntries(['task.md', 'inputs/confirmed-budget.json', 'inputs/calculation-policy.md', 'inputs/supplier-proposal.md'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(runDirectory, name))).digest('hex')]));
const output = {
  reviewer: '/root/finance_v2_review',
  provenance: 'Independently authored from supplied inputs; no producer scripts, repository grader or reference implementation executed.',
  runDirectory,
  inputHashes,
  currency: budget.currency,
  comparedValues: compared,
  mismatches,
  absentOptionalFields,
  expectedMainForecast: expected,
  proposalHypothetical: {
    warning: 'Independent reviewer illustration only: 50 CNY/order replaces the base cost for all 12 months, with original scenario cost multipliers unchanged. Not an approved business fact or assumed effective date.',
    scenarios: proposalHypothetical,
    comparison: expected.map((current, i) => ({
      id: current.id,
      variableCostIncrease: round(proposalHypothetical[i].summary.variableCost - current.summary.variableCost),
      netIncomeChange: round(proposalHypothetical[i].summary.netIncome - current.summary.netIncome),
      endingCashChange: round(proposalHypothetical[i].summary.endingCash - current.summary.endingCash),
      fundingRequiredChange: round(proposalHypothetical[i].summary.fundingRequired - current.summary.fundingRequired),
    })),
  },
};
fs.mkdirSync(path.dirname(destination), {recursive: true});
fs.writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({runDirectory, comparedValues: compared, mismatches, absentOptionalFieldCount: absentOptionalFields.length, summaries: expected.map(s => ({id: s.id, ...s.summary, yearBridge: s.yearBridge})), proposalHypotheticalComparison: output.proposalHypothetical.comparison}, null, 2));
