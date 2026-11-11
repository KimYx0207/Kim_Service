import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
process.chdir(path.resolve(import.meta.dirname, '..'));
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const money = value => Math.round(value * 100) / 100;
const cents = value => Math.round(value * 100);
const add = (rows, key) => rows.reduce((sum, row) => sum + cents(row[key]), 0) / 100;
const source = read('inputs/confirmed-budget.json');
const result = read('output/forecast.json');
const facts = read('output/facts.json');
let fieldsChecked = 0;
let bridgesChecked = 0;
const compare = (actual, expected, label) => { assert.equal(actual, expected, label); fieldsChecked++; };

// This verifier is separate from the supplied calculation module and uses the
// exact Math.round rule in inputs/calculation-policy.md, without EPSILON.
function recompute(scenario, input) {
  const d = input.drivers;
  let openingCash = money(input.openingCash), ar = money(input.openingReceivables), ap = money(input.openingPayables);
  let prevRevenue = 0, prevCost = 0;
  const rows = [];
  for (let i = 0; i < 12; i++) {
    const units = Math.round(d.initialUnits * scenario.unitsMultiplier * Math.pow(1 + d.monthlyGrowth + scenario.growthDelta, i));
    const revenue = money(units * d.unitPrice * scenario.priceMultiplier);
    const variableCost = money(units * d.variableCostPerUnit * scenario.costMultiplier);
    const fixedCost = money(d.fixedCostPerMonth);
    const depreciation = money(d.depreciationPerMonth);
    const pretaxProfit = money(revenue - variableCost - fixedCost - depreciation);
    const tax = money(Math.max(0, pretaxProfit) * d.taxRate);
    const netIncome = money(pretaxProfit - tax);
    const receipts = money(revenue * d.collectionShare + prevRevenue * (1 - d.collectionShare) + (i === 0 ? input.openingReceivables : 0));
    const supplierPayments = money(variableCost * d.paymentShare + prevCost * (1 - d.paymentShare) + (i === 0 ? input.openingPayables : 0));
    const capex = money(d.capexByMonth[i]);
    const financing = money(d.financingByMonth[i]);
    const payments = money(supplierPayments + fixedCost + tax + capex);
    const netCashFlow = money(receipts - payments + financing);
    const endingCash = money(openingCash + receipts - payments + financing);
    const receivables = money(ar + revenue - receipts);
    const payables = money(ap + variableCost - supplierPayments);
    const monthSerial = Number(input.startMonth.slice(0, 4)) * 12 + Number(input.startMonth.slice(5)) - 1 + i;
    const month = `${Math.floor(monthSerial / 12)}-${String(monthSerial % 12 + 1).padStart(2, '0')}`;
    rows.push({month, units, revenue, variableCost, fixedCost, depreciation, pretaxProfit, tax, netIncome, receipts, supplierPayments, capex, financing, payments, netCashFlow, openingCash, endingCash, receivables, payables});
    prevRevenue = revenue; prevCost = variableCost; openingCash = endingCash; ar = receivables; ap = payables;
  }
  const low = rows.reduce((a,b) => b.endingCash < a.endingCash ? b : a);
  return {rows, summary: {
    totalRevenue: money(rows.reduce((n,x) => n + x.revenue, 0)),
    totalNetIncome: money(rows.reduce((n,x) => n + x.netIncome, 0)),
    endingCash: rows[11].endingCash,
    minimumCash: low.endingCash, minimumCashMonth: low.month,
    firstGapMonth: rows.find(x => x.endingCash < 0)?.month ?? null,
    fundingRequired: money(Math.max(0, -low.endingCash)),
    closingReceivables: rows[11].receivables, closingPayables: rows[11].payables
  }};
}
function verify(input, forecast) {
  compare(forecast.schemaVersion, 1, 'schemaVersion');
  compare(forecast.currency, input.currency, 'currency');
  assert.deepEqual(forecast.scenarios.map(x => x.id), input.scenarios.map(x => x.id));
  const annual = [];
  for (const assumption of input.scenarios) {
    const delivered = forecast.scenarios.find(s => s.id === assumption.id);
    compare(delivered.months.length, 12, `${assumption.id} months`);
    const expected = recompute(assumption, input);
    for (let i = 0; i < 12; i++) {
      const row = delivered.months[i];
      for (const [key, value] of Object.entries(expected.rows[i])) compare(row[key], value, `${assumption.id}/${i}/${key}`);
      for (const value of Object.values(row).filter(x => typeof x === 'number')) {
        assert(Number.isFinite(value));
        assert(Math.abs(value * 100 - Math.round(value * 100)) < 1e-7);
      }
      const prevAR = i === 0 ? input.openingReceivables : delivered.months[i-1].receivables;
      const prevAP = i === 0 ? input.openingPayables : delivered.months[i-1].payables;
      const incomeBridge = cents(row.netIncome) + cents(row.depreciation) - cents(row.capex)
        - (cents(row.receivables) - cents(prevAR)) + (cents(row.payables) - cents(prevAP)) + cents(row.financing);
      compare(cents(row.netCashFlow), incomeBridge, `${assumption.id}/${i}/profit cash bridge`); bridgesChecked++;
      compare(cents(row.endingCash), cents(row.openingCash) + cents(row.receipts) - cents(row.payments) + cents(row.financing), `${assumption.id}/${i}/cash rollforward`); bridgesChecked++;
    }
    for (const [key,value] of Object.entries(expected.summary)) compare(delivered.summary[key], value, `${assumption.id}/summary/${key}`);
    const s = delivered.summary;
    compare(cents(s.endingCash), cents(input.openingCash) + cents(add(delivered.months, 'receipts')) - cents(add(delivered.months, 'payments')) + cents(add(delivered.months, 'financing')), `${assumption.id}/annual direct bridge`); bridgesChecked++;
    const profitCash = cents(s.totalNetIncome) + cents(add(delivered.months, 'depreciation')) - cents(add(delivered.months, 'capex'))
      - (cents(s.closingReceivables) - cents(input.openingReceivables)) + (cents(s.closingPayables) - cents(input.openingPayables)) + cents(add(delivered.months, 'financing'));
    compare(cents(s.endingCash) - cents(input.openingCash), profitCash, `${assumption.id}/annual indirect bridge`); bridgesChecked++;
    annual.push({id: assumption.id, revenue: s.totalRevenue, netIncome: s.totalNetIncome, receipts: add(delivered.months, 'receipts'), payments: add(delivered.months, 'payments'), financing: add(delivered.months, 'financing'), depreciation: add(delivered.months, 'depreciation'), capex: add(delivered.months, 'capex'), changeInReceivables: money(s.closingReceivables-input.openingReceivables), changeInPayables: money(s.closingPayables-input.openingPayables), changeInCash: money(s.endingCash-input.openingCash), endingCash: s.endingCash});
  }
  return annual;
}
const annual = verify(source, result);
const sensitivityInput = read('output/sensitivity-input.json');
const sensitivity = read('output/sensitivity.json');
const altered = structuredClone(sensitivityInput);
altered.title = source.title;
altered.drivers.variableCostPerUnit = source.drivers.variableCostPerUnit;
altered.scenarios = source.scenarios;
altered.assumptions = source.assumptions;
assert.deepEqual(altered, source, 'single driver only in economic sensitivity assumptions');
verify(sensitivityInput, sensitivity);
compare(source.drivers.variableCostPerUnit, 45, 'approved cost retained');
compare(facts.conflicts.length, 1, 'one supplied conflict');
const conflict = facts.conflicts[0];
compare(conflict.status, 'pending', 'proposal not approved');
compare(conflict.appliedValue, 45, 'applied cost');
compare(conflict.alternateValue, 50, 'alternate cost');
compare(conflict.unit, 'CNY/order', 'conflict unit');
assert.deepEqual(conflict.sources, ['inputs/confirmed-budget.json', 'inputs/supplier-proposal.md']);
for (const s of result.scenarios) assert(s.months.every(m => m.financing === 0), 'no automatic funding');
const expectedFiles = read('output/source-checksums.json');
for (const [file, hash] of Object.entries(expectedFiles)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, `source unchanged: ${file}`);
}
const report = {
  schemaVersion: 1, status: 'passed',
  coverage: {primaryScenarios: 3, primaryMonthlyRows: 36, sensitivityScenarios: 1, sensitivityMonthlyRows: 12, fieldComparisons: fieldsChecked, cashBridgeComparisons: bridgesChecked, sourceFilesUnchanged: Object.keys(expectedFiles).length},
  checks: ['统一计算口径独立复算（Math.round，无EPSILON）', '12个月完整性及金额精度', '每月利润到现金桥接', '每月现金滚动与年度直接/间接现金勾稽', '应收应付滚动', '资金需求、最低现金和首次缺口复算', '主表融资全为0', '报价冲突状态、来源、金额与单位', '50元敏感性仅改变单一经济驱动', '源文件SHA-256前后未变'],
  annualBridges: annual,
  notPerformed: ['外部真实业务资料核验', '月内现金峰值及最低现金测算', '完整资产负债表/三表核平', 'DCF估值', '本方法相对其他方法的真实专业增益评估'],
  professionalEffect: 'not_evaluated'
};
fs.writeFileSync('output/verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
