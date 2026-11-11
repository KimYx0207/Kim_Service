/* Editable synthetic configuration. Never a customer record or a prediction. */
(function (root) {
  const sample = {
    schemaVersion: 1,
    exampleData: true,
    title: '示例工作室 · 12 个月经营预测',
    currency: 'CNY', startMonth: '2027-01',
    openingCash: 12000, openingReceivables: 2400, openingPayables: 1200,
    drivers: {
      initialUnits: 160, monthlyGrowth: 0.03, unitPrice: 90, variableCostPerUnit: 45,
      fixedCostPerMonth: 6200, depreciationPerMonth: 200, taxRate: 0.2,
      collectionShare: 0.65, paymentShare: 1,
      capexByMonth: [0, 12000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      financingByMonth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    scenarios: [
      { id: 'base', label: '基准', unitsMultiplier: 1, priceMultiplier: 1, costMultiplier: 1, growthDelta: 0 },
      { id: 'upside', label: '乐观', unitsMultiplier: 1.12, priceMultiplier: 1.03, costMultiplier: 0.98, growthDelta: 0.01 },
      { id: 'downside', label: '保守', unitsMultiplier: 0.82, priceMultiplier: 0.98, costMultiplier: 1.08, growthDelta: -0.01 }
    ],
    assumptions: [
      '所有数值均为合成示例，金额单位为 CNY 元；没有客户、实际交易或实测效果。',
      '第二个月购买设备支出 12,000 元；示例不自动融资。',
      '税率 20% 和月折旧 200 元只是演示假设，应用到实际业务前需替换。',
      '期初应收 2,400 元与应付 1,200 元在首月结清；当月收款 65%，其余次月收回。'
    ]
  };
  if (typeof module === 'object' && module.exports) module.exports = sample;
  else root.KimForecastExample = sample;
})(typeof globalThis === 'object' ? globalThis : this);
