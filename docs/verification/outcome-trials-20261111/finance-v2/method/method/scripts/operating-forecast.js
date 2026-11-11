/* Pure 12-month operating forecast. Works in Node and an offline browser.
 * No files, network, clocks, account actions or persisted user data.
 * Monetary values use the input currency and are rounded to cents per line.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KimOperatingForecast = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function invalid(message) {
    const error = new TypeError(message);
    error.code = 'invalid_input';
    throw error;
  }
  function number(value, name, min = 0, max = 1e12) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      invalid(`${name} 必须是 ${min} 至 ${max} 之间的有限数值`);
    }
  }
  function exactKeys(value, allowed, name) {
    if (!isObject(value)) invalid(`${name} 必须是对象`);
    const unknown = Object.keys(value).filter(key => !allowed.includes(key));
    if (unknown.length) invalid(`${name} 有未识别字段：${unknown.join(', ')}`);
  }
  function validateInput(input) {
    exactKeys(input, ['schemaVersion', 'exampleData', 'title', 'currency', 'startMonth', 'openingCash',
      'openingReceivables', 'openingPayables', 'drivers', 'scenarios', 'assumptions'], '输入');
    if (input.schemaVersion !== 1) invalid('schemaVersion 必须是 1');
    if (typeof input.exampleData !== 'boolean') invalid('exampleData 必须明确为 true 或 false');
    if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120) invalid('title 需要 1–120 字的名称');
    if (!/^[A-Z]{3}$/.test(input.currency ?? '')) invalid('currency 需要三字母币种代码；本工具不换汇');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.startMonth ?? '')) invalid('startMonth 需要 YYYY-MM');
    if (Number(input.startMonth.slice(0, 4)) < 1900 || Number(input.startMonth.slice(0, 4)) > 9998) invalid('startMonth 年份超出支持范围');
    for (const key of ['openingCash', 'openingReceivables', 'openingPayables']) number(input[key], key);
    const d = input.drivers;
    exactKeys(d, ['initialUnits', 'monthlyGrowth', 'unitPrice', 'variableCostPerUnit', 'fixedCostPerMonth',
      'depreciationPerMonth', 'taxRate', 'collectionShare', 'paymentShare', 'capexByMonth', 'financingByMonth'], 'drivers');
    for (const key of ['initialUnits', 'unitPrice', 'variableCostPerUnit', 'fixedCostPerMonth', 'depreciationPerMonth']) number(d[key], `drivers.${key}`);
    if (!Number.isInteger(d.initialUnits)) invalid('initialUnits 必须是整数');
    number(d.monthlyGrowth, 'monthlyGrowth', -0.99, 1);
    for (const key of ['taxRate', 'collectionShare', 'paymentShare']) number(d[key], key, 0, 1);
    for (const key of ['capexByMonth', 'financingByMonth']) {
      if (!Array.isArray(d[key]) || d[key].length !== 12) invalid(`${key} 必须恰好包含 12 个月`);
      d[key].forEach((value, index) => number(value, `${key}[${index}]`, key === 'financingByMonth' ? -1e12 : 0));
    }
    if (!Array.isArray(input.assumptions) || input.assumptions.some(x => typeof x !== 'string' || x.length > 1000)) invalid('assumptions 必须是文字列表');
    if (!Array.isArray(input.scenarios) || input.scenarios.length < 1 || input.scenarios.length > 5) invalid('需要 1–5 个明确情景');
    const ids = new Set();
    for (const scenario of input.scenarios) {
      exactKeys(scenario, ['id', 'label', 'unitsMultiplier', 'priceMultiplier', 'costMultiplier', 'growthDelta'], 'scenario');
      if (!/^[a-z][a-z0-9-]{0,30}$/.test(scenario.id ?? '') || ids.has(scenario.id)) invalid('情景 id 需要不重复的小写标识');
      ids.add(scenario.id);
      if (typeof scenario.label !== 'string' || !scenario.label.trim() || scenario.label.length > 60) invalid('情景 label 需要 1–60 字');
      for (const key of ['unitsMultiplier', 'priceMultiplier', 'costMultiplier']) number(scenario[key], `${scenario.id}.${key}`, 0, 100);
      number(scenario.growthDelta, `${scenario.id}.growthDelta`, -1, 1);
      number(d.monthlyGrowth + scenario.growthDelta, `${scenario.id}.实际月增长`, -0.99, 1);
    }
    return input;
  }
  function monthLabel(start, offset) {
    const [year, month] = start.split('-').map(Number);
    const absolute = year * 12 + month - 1 + offset;
    return `${Math.floor(absolute / 12)}-${String(absolute % 12 + 1).padStart(2, '0')}`;
  }
  function forecast(input) {
    validateInput(input);
    const d = input.drivers;
    const scenarios = input.scenarios.map(scenario => {
      let cash = money(input.openingCash);
      let receivables = money(input.openingReceivables);
      let payables = money(input.openingPayables);
      let lastRevenue = 0;
      let lastVariableCost = 0;
      const rows = [];
      for (let index = 0; index < 12; index++) {
        const units = Math.round(d.initialUnits * scenario.unitsMultiplier * (1 + d.monthlyGrowth + scenario.growthDelta) ** index);
        const revenue = money(units * d.unitPrice * scenario.priceMultiplier);
        const variableCost = money(units * d.variableCostPerUnit * scenario.costMultiplier);
        const fixedCost = money(d.fixedCostPerMonth);
        const depreciation = money(d.depreciationPerMonth);
        const pretaxProfit = money(revenue - variableCost - fixedCost - depreciation);
        const tax = money(Math.max(0, pretaxProfit) * d.taxRate);
        const netIncome = money(pretaxProfit - tax);
        // Opening AR/AP are settled in month one. Remaining current-period
        // amounts settle in the following month; there is no bad-debt model.
        const receipts = money(revenue * d.collectionShare + lastRevenue * (1 - d.collectionShare) + (index === 0 ? input.openingReceivables : 0));
        const supplierPayments = money(variableCost * d.paymentShare + lastVariableCost * (1 - d.paymentShare) + (index === 0 ? input.openingPayables : 0));
        const capex = money(d.capexByMonth[index]);
        const financing = money(d.financingByMonth[index]);
        const payments = money(supplierPayments + fixedCost + tax + capex);
        const netCashFlow = money(receipts - payments + financing);
        const openingCash = cash;
        cash = money(cash + netCashFlow);
        receivables = money(receivables + revenue - receipts);
        payables = money(payables + variableCost - supplierPayments);
        const row = { month: monthLabel(input.startMonth, index), units, revenue, variableCost, fixedCost,
          depreciation, pretaxProfit, tax, netIncome, receipts, supplierPayments, capex, financing,
          payments, netCashFlow, openingCash, endingCash: cash, receivables, payables };
        if (Object.values(row).some(value => typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > 1e15))) invalid('模型结果超出可安全计算的范围，请检查单位与增长率');
        rows.push(row);
        lastRevenue = revenue;
        lastVariableCost = variableCost;
      }
      const low = rows.reduce((lowest, row) => row.endingCash < lowest.endingCash ? row : lowest);
      const firstGap = rows.find(row => row.endingCash < 0);
      return {
        id: scenario.id, label: scenario.label, months: rows,
        summary: {
          totalRevenue: money(rows.reduce((sum, row) => sum + row.revenue, 0)),
          totalNetIncome: money(rows.reduce((sum, row) => sum + row.netIncome, 0)),
          endingCash: rows.at(-1).endingCash, minimumCash: low.endingCash, minimumCashMonth: low.month,
          firstGapMonth: firstGap?.month ?? null, fundingRequired: money(Math.max(0, -low.endingCash)),
          closingReceivables: rows.at(-1).receivables, closingPayables: rows.at(-1).payables
        }
      };
    });
    return {
      schemaVersion: 1, exampleData: input.exampleData, title: input.title, currency: input.currency,
      startMonth: input.startMonth, periodMonths: 12, scenarios,
      assumptions: [...input.assumptions],
      limitations: [
        '示例为简化经营预测，不是 DCF、完整三表、法定报表或真实经营结果。',
        '销量四舍五入为整数；收入当月确认。期初应收、应付在首月结清；其余回款和付款只分当月及次月，无坏账。',
        '采购与销售对应，无库存变化。折旧为显式固定假设；资本开支不自动推导折旧。',
        '所得税按正的月度税前利润及输入税率当月支付，不含亏损结转、增值税、利息或未输入费用。税率为零必须有明确依据或标为假设。',
        '资金缺口按月末余额估算，不能证明月内没有缺口；融资只使用明确输入，不会自动补钱。'
      ]
    };
  }
  function toCsv(result) {
    const keys = ['month', 'units', 'revenue', 'variableCost', 'fixedCost', 'depreciation', 'tax', 'netIncome',
      'receipts', 'supplierPayments', 'capex', 'financing', 'netCashFlow', 'endingCash', 'receivables', 'payables'];
    const cell = value => {
      let text = String(value ?? '');
      if (typeof value === 'string' && (/^\s*[=+\-@]/.test(text) || /^[\t\r]/.test(text))) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return [['scenario', 'currency', ...keys].map(cell).join(','), ...result.scenarios.flatMap(scenario =>
      scenario.months.map(row => [scenario.label, result.currency, ...keys.map(key => row[key])].map(cell).join(',')))].join('\r\n') + '\r\n';
  }
  return Object.freeze({ validateInput, forecast, toCsv });
});
