import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import operating from '../method/scripts/operating-forecast.js';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(`output/${file}`, JSON.stringify(value, null, 2) + '\n');
const r2 = n => Math.round(n * 100) / 100;
const inventory = {};
function hashTree(file) {
  const st = fs.statSync(file);
  if (st.isDirectory()) for (const child of fs.readdirSync(file).sort()) hashTree(path.join(file, child));
  else inventory[file] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
for (const name of ['task.md', 'inputs', 'method']) hashTree(name);
if (!fs.existsSync('output/source-checksums.json')) write('source-checksums.json', inventory);

const budget = read('inputs/confirmed-budget.json');
const result = read('output/forecast.json');
const proposed = structuredClone(budget);
proposed.title = '未接受供应商报价的单因素敏感性';
proposed.drivers.variableCostPerUnit = 50;
proposed.scenarios = [structuredClone(budget.scenarios.find(s => s.id === 'base'))];
proposed.assumptions = [...budget.assumptions,
  '仅作假设：每单变动成本从45元调至50元；此报价尚未被经营者接受，主预测不采用。',
  '其余输入与已确认预算的基准情景完全相同。'];
write('sensitivity-input.json', proposed);
const cli = spawnSync(process.execPath, ['method/scripts/forecast-cli.mjs', '--input-json', 'output/sensitivity-input.json'], {encoding: 'utf8'});
if (cli.status !== 0) throw new Error(cli.stderr);
fs.writeFileSync('output/sensitivity.json', cli.stdout);
const sensitivity = JSON.parse(cli.stdout);
const mainBase = result.scenarios.find(s => s.id === 'base');
const altBase = sensitivity.scenarios[0];
write('sensitivity-comparison.json', {
  schemaVersion: 1, currency: 'CNY', status: 'pending', appliedToMainForecast: false,
  source: 'inputs/supplier-proposal.md', changedDriver: 'drivers.variableCostPerUnit',
  appliedValue: 45, alternateValue: 50, unit: 'CNY/order',
  baselineScenario: 'base', baselineSummary: mainBase.summary, proposedSummary: altBase.summary,
  impact: {
    totalNetIncomeChange: r2(altBase.summary.totalNetIncome - mainBase.summary.totalNetIncome),
    endingCashChange: r2(altBase.summary.endingCash - mainBase.summary.endingCash),
    fundingRequiredChange: r2(altBase.summary.fundingRequired - mainBase.summary.fundingRequired)
  }
});
fs.writeFileSync('output/forecast-months.csv', '\uFEFF' + operating.toCsv(result));
write('facts.json', {
  schemaVersion: 1,
  currency: 'CNY',
  sourceFiles: ['inputs/confirmed-budget.json', 'inputs/supplier-proposal.md', 'inputs/calculation-policy.md'],
  dataNature: '合成预算及合成供应商补充，不是真实客户经营结果。',
  forecastBasis: {
    source: 'inputs/confirmed-budget.json', startMonth: '2027-01', periodMonths: 12,
    variableCostPerUnit: 45, unit: 'CNY/order', financingApproved: false,
    financingAppliedByMonth: Array(12).fill(0)
  },
  conflicts: [{
    issue: '同规格、同币种的每单变动成本：已确认预算为45元，供应商新提议为50元；新报价尚未签约、尚未被经营者接受。',
    sources: ['inputs/confirmed-budget.json', 'inputs/supplier-proposal.md'],
    status: 'pending', appliedValue: 45, alternateValue: 50, unit: 'CNY/order',
    resolution: '主预测使用已确认预算45元，再按各情景已给定的成本倍率计算。50元只进入单独的基准单因素敏感性，待经营者明确接受后再更新主预测。'
  }],
  assumptions: {
    taxRate: {value: 0.2, source: 'inputs/confirmed-budget.json', note: '模型假设；每月正税前利润计税并当月支付，不作税损结转。'},
    depreciationPerMonth: {value: 200, unit: 'CNY/month', source: 'inputs/confirmed-budget.json'},
    collectionShare: {value: 0.65, source: 'inputs/confirmed-budget.json', note: '本月收65%，其余次月收；期初应收首月结清。'},
    paymentShare: {value: 1, source: 'inputs/confirmed-budget.json', note: '本月变动成本全部本月付；期初应付首月结清。'},
    capex: {month: '2027-02', value: 12000, unit: 'CNY', source: 'inputs/confirmed-budget.json'},
    rounding: {source: 'inputs/calculation-policy.md', rule: 'Math.round(x * 100) / 100；每行金额保留两位，后续计算使用已舍入金额。'}
  },
  notEstablished: ['尚未接受的50元报价何时生效。', '任何新增融资的金额、到账日或条款。', '销量、单价、增长和回款假设的真实业务实现程度。'],
  valuation: {status: 'not_applicable', reason: '任务为12个月经营与现金预测，未要求估值。'}
});
console.log(JSON.stringify({main: result.scenarios.map(s => ({id: s.id, ...s.summary})), sensitivity: altBase.summary}, null, 2));
