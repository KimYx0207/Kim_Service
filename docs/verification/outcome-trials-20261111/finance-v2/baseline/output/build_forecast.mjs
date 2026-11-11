import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPaths = ['task.md', 'inputs/confirmed-budget.json', 'inputs/calculation-policy.md', 'inputs/supplier-proposal.md'];
const digest = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const inputHashes = Object.fromEntries(inputPaths.map(p => [p, digest(p)]));
const budget = JSON.parse(fs.readFileSync(path.join(root, 'inputs/confirmed-budget.json'), 'utf8'));
const d = budget.drivers;
const money = x => Math.round(x * 100) / 100;
const total = (rows, key) => money(rows.reduce((sum, row) => sum + row[key], 0));
const months = Array.from({ length: 12 }, (_, i) => {
  const [year, month] = budget.startMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + i, 1)).toISOString().slice(0, 7);
});

const forecast = {
  schemaVersion: 1,
  currency: budget.currency,
  exampleData: budget.exampleData,
  title: budget.title,
  startMonth: months[0],
  endMonth: months.at(-1),
  units: { monetaryAmounts: 'CNY', salesVolume: 'order', priceAndUnitCost: 'CNY/order', rates: 'fraction' },
  sources: inputPaths.filter(p => p.startsWith('inputs/')),
  openingBalances: { cash: budget.openingCash, receivables: budget.openingReceivables, payables: budget.openingPayables },
  roundingPolicy: 'Math.round(x * 100) / 100 for monetary lines; subsequent calculations use rounded monetary values. Sales volume uses Math.round on each month independently.',
  appliedBudget: {
    ...d,
    supplierProposalStatus: 'pending',
    proposedVariableCostPerUnit: 50,
    proposalAppliedToMainForecast: false
  },
  scenarios: budget.scenarios.map(s => {
    const rows = [];
    let cash = budget.openingCash;
    let receivables = budget.openingReceivables;
    let payables = budget.openingPayables;
    let previousRevenue = 0;
    let previousVariableCost = 0;
    for (let i = 0; i < 12; i++) {
      const units = Math.round(d.initialUnits * s.unitsMultiplier * (1 + d.monthlyGrowth + s.growthDelta) ** i);
      const revenue = money(units * d.unitPrice * s.priceMultiplier);
      const variableCost = money(units * d.variableCostPerUnit * s.costMultiplier);
      const fixedCost = money(d.fixedCostPerMonth);
      const depreciation = money(d.depreciationPerMonth);
      const pretaxIncome = money(revenue - variableCost - fixedCost - depreciation);
      const tax = money(Math.max(0, pretaxIncome) * d.taxRate);
      const netIncome = money(pretaxIncome - tax);
      const receipts = money(revenue * d.collectionShare + previousRevenue * (1 - d.collectionShare) + (i === 0 ? budget.openingReceivables : 0));
      const supplierPayments = money(variableCost * d.paymentShare + previousVariableCost * (1 - d.paymentShare) + (i === 0 ? budget.openingPayables : 0));
      const capex = money(d.capexByMonth[i]);
      const payments = money(supplierPayments + fixedCost + tax + capex);
      const financing = money(d.financingByMonth[i]);
      const endingCash = money(cash + receipts - payments + financing);
      const endingReceivables = money(receivables + revenue - receipts);
      const endingPayables = money(payables + variableCost - supplierPayments);
      rows.push({
        month: months[i], units, revenue, variableCost, fixedCost, depreciation,
        pretaxIncome, tax, netIncome, openingCash: cash, receipts,
        supplierPayments, capex, payments, financing, endingCash,
        openingReceivables: receivables, endingReceivables,
        openingPayables: payables, endingPayables
      });
      cash = endingCash;
      receivables = endingReceivables;
      payables = endingPayables;
      previousRevenue = revenue;
      previousVariableCost = variableCost;
    }
    const minCash = rows.reduce((minimum, row) => row.endingCash < minimum.endingCash ? row : minimum, rows[0]);
    return {
      id: s.id,
      label: s.label,
      assumptions: {
        unitsMultiplier: s.unitsMultiplier,
        priceMultiplier: s.priceMultiplier,
        costMultiplier: s.costMultiplier,
        growthDelta: s.growthDelta,
        monthlyGrowth: d.monthlyGrowth + s.growthDelta,
        unitPrice: money(d.unitPrice * s.priceMultiplier),
        variableCostPerUnit: money(d.variableCostPerUnit * s.costMultiplier)
      },
      months: rows,
      summary: {
        units: rows.reduce((sum, row) => sum + row.units, 0),
        revenue: total(rows, 'revenue'),
        variableCost: total(rows, 'variableCost'),
        fixedCost: total(rows, 'fixedCost'),
        depreciation: total(rows, 'depreciation'),
        pretaxIncome: total(rows, 'pretaxIncome'),
        tax: total(rows, 'tax'),
        netIncome: total(rows, 'netIncome'),
        receipts: total(rows, 'receipts'),
        supplierPayments: total(rows, 'supplierPayments'),
        capex: total(rows, 'capex'),
        payments: total(rows, 'payments'),
        financing: total(rows, 'financing'),
        endingCash: cash,
        fundingRequired: money(Math.max(0, -minCash.endingCash)),
        minimumEndingCash: minCash.endingCash,
        minimumCashMonth: minCash.month,
        firstNegativeCashMonth: rows.find(row => row.endingCash < 0)?.month ?? null,
        negativeCashMonths: rows.filter(row => row.endingCash < 0).map(row => row.month),
        endingReceivables: receivables,
        endingPayables: payables
      }
    };
  })
};

const facts = {
  schemaVersion: 1,
  conflicts: [{
    issue: '同规格每单变动成本：已确认预算为 45 元，供应商新提议为 50 元；新提议尚未签约、尚未被经营者接受。',
    sources: ['inputs/confirmed-budget.json', 'inputs/supplier-proposal.md'],
    status: 'pending',
    appliedValue: 45,
    alternateValue: 50,
    unit: 'CNY/order',
    treatment: '全部主预测沿用已确认的基础成本 45 元/单，再分别乘以既定情景成本系数；50 元/单未进入主预测。',
    decisionNeeded: '经营者是否接受供应商新报价及何时生效。'
  }]
};

const cn = x => x.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const summaries = forecast.scenarios.map(s => ({ id: s.id, label: s.label, ...s.summary }));
const base = summaries.find(s => s.id === 'base');
const upside = summaries.find(s => s.id === 'upside');
const downside = summaries.find(s => s.id === 'downside');
const table = summaries.map(s => `| ${s.label} | ${s.units} | ${cn(s.revenue)} | ${cn(s.netIncome)} | ${cn(s.endingCash)} | ${cn(s.fundingRequired)} | ${s.minimumCashMonth} / ${cn(s.minimumEndingCash)} |`).join('\n');
const negatives = summaries.map(s => `- **${s.label}**：${s.negativeCashMonths.length ? `现金为负的月份为 ${s.negativeCashMonths.join('、')}；首次出现于 ${s.firstNegativeCashMonth}` : '12 个月的月末现金均非负'}。`).join('\n');
const decision = `# 2027 年经营预测与需要决定的事项

## 结论

这份预测使用给定的合成预算，覆盖 2027 年 1—12 月，金额均为人民币元，数量为单，不代表实际客户业绩。按已确认预算计算，基准情景全年净利润 **${cn(base.netIncome)} 元**，但仍存在 **${cn(base.fundingRequired)} 元**的最大月末资金缺口；缺口最深发生在 **${base.minimumCashMonth}**。全年是否赚钱与某个月能否付得出钱，需要分别看。

主预测采用已确认的 **45 元/单**基础变动成本。供应商提出的 **50 元/单**尚未签约、尚未被经营者接受，作为待决事项保留，没有替换预算。三个情景的融资均保持明确输入的 **0 元**；负现金代表资金缺口，没有自动用借款或注资把缺口填平。

## 三个情景的全年对照

| 情景 | 全年销量（单） | 全年收入（元） | 全年净利润（元） | 12 月末现金（元） | 最大所需补充资金（元） | 最低现金月份 / 月末现金（元） |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${table}

“最大所需补充资金”取全年最低月末现金的负数，最低为 0。它表示在这些月度假设下，让所有月末现金达到至少 0 元需要补足的金额；不是把每个负现金月相加，也不是已经获批的融资。资金实际到位时间必须覆盖最早出现的缺口；这套月度模型没有日内收付时间，不能判断月中最高资金压力。

${negatives}

## 为什么利润与现金不同

基准情景全年收入为 ${cn(base.revenue)} 元、净利润为 ${cn(base.netIncome)} 元；实际回款为 ${cn(base.receipts)} 元，实际付款为 ${cn(base.payments)} 元。现金勾稽为：期初现金 12,000.00 元 + 回款 ${cn(base.receipts)} 元 − 付款 ${cn(base.payments)} 元 + 融资 0.00 元 = 年末现金 ${cn(base.endingCash)} 元。

收入当月只收回 65%，其余 35% 于次月收回。首月另收到全部期初应收 2,400.00 元；基准年末仍有应收账款 ${cn(base.endingReceivables)} 元，不能把这部分未到账收入当作现金。变动成本当月全部付款，首月另结清期初应付 1,200.00 元；三个情景年末应付余额均为 0.00 元。

2 月设备投入 12,000.00 元计入现金付款，不一次性扣减当月利润；利润按给定假设每月扣除折旧 200.00 元，折旧不再次作为现金支出。固定费用每月 6,200.00 元。只有税前利润为正时，按模型假设计提 20% 税额并当月支付；亏损月份不确认税收收益，也不做亏损结转。这里的税率和折旧都是题目假设，不是法定税务结论。

乐观情景全年净利润 ${cn(upside.netIncome)} 元，最大月末资金缺口 ${cn(upside.fundingRequired)} 元；保守情景全年净利润 ${cn(downside.netIncome)} 元，最大月末资金缺口 ${cn(downside.fundingRequired)} 元。年度盈利数字不能替代逐月现金检查。

## 情景和计算口径

| 情景 | 首月销量系数 | 售价系数 | 成本系数 | 月销量增长率 | 实际单价（元/单） | 实际单位变动成本（元/单） |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
${forecast.scenarios.map(s => `| ${s.label} | ${s.assumptions.unitsMultiplier} | ${s.assumptions.priceMultiplier} | ${s.assumptions.costMultiplier} | ${(s.assumptions.monthlyGrowth * 100).toFixed(0)}% | ${cn(s.assumptions.unitPrice)} | ${cn(s.assumptions.variableCostPerUnit)} |`).join('\n')}

每个月的销量都从初始 160 单、对应情景系数及增长率直接推导，再四舍五入取整，不把上月已取整销量继续复利。每行金额按 Math.round(x × 100) / 100 保留两位小数，后续计算使用已经保留两位小数的金额。主表列出全部 36 个情景月份，并滚动展示应收、应付和现金余额。

## 尚待决定的事项

1. **供应商新报价。** 已确认预算是 45 元/单，2026-11-10 的供应商补充提出 50 元/单，资料明确说尚未接受。应由经营者决定是否接受，以及生效月份。当前没有这些已确认信息，所以主预测继续采用 45 元/单及既定情景系数；该冲突在 facts.json 中标记为 pending。未另外进行 50 元/单的敏感性测算。
2. **如何覆盖现金缺口。** 可以依据主预测决定是否安排资金以及金额、到账月份；当前材料没有已确认的新融资，因此本次仅量化资金需要，未虚构融资来源、利率、还款条件或批准状态。以基准情景为例，安排需覆盖 ${base.firstNegativeCashMonth} 的首次缺口，并满足 ${cn(base.fundingRequired)} 元的最大累计月末缺口。
3. **如拟调整 2 月设备投入或其他预算。** 当前仍完整执行原定 12,000.00 元设备投入。是否延期或调整金额需要经营者另行决定，本次未替经营者改预算。

## 数据出处与验证范围

- 已确认预算、情景系数、期初余额与融资安排：inputs/confirmed-budget.json。
- 逐月计算、舍入、缺口定义：inputs/calculation-policy.md。
- 尚未接受的供应商新报价：inputs/supplier-proposal.md。

本交付为给定材料的模型测算，不使用外部金融事实。实际执行的机器检查及结果记录在 validation.json；未执行的项目会明确列出，不能视为通过。
`;

const write = (filename, content) => fs.writeFileSync(path.join(root, 'output', filename), typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
write('forecast.json', forecast);
write('facts.json', facts);
write('decision.md', decision);
write('source-integrity.json', { algorithm: 'sha256', beforeGeneration: inputHashes });
console.log(JSON.stringify({ generated: ['forecast.json', 'facts.json', 'decision.md', 'source-integrity.json'], summaries }, null, 2));
