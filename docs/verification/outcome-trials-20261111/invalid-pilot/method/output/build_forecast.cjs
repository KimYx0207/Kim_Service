'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'method/scripts/operating-forecast.js'));
const budgetPath = path.join(root, 'inputs/confirmed-budget.json');
const proposalPath = path.join(root, 'inputs/supplier-proposal.md');
const budgetText = fs.readFileSync(budgetPath, 'utf8');
const proposalText = fs.readFileSync(proposalPath, 'utf8');
const budget = JSON.parse(budgetText);
const money = v => Math.round((v + Number.EPSILON) * 100) / 100;
const sum = (rows, key) => money(rows.reduce((n, row) => n + row[key], 0));
const fmt = n => n.toLocaleString('zh-CN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const writeJson = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');

const forecast = engine.forecast(budget);
forecast.inputBasis = {
  approvedBudget: '../inputs/confirmed-budget.json',
  unacceptedSupplierProposal: '../inputs/supplier-proposal.md',
  period: '2027-01 至 2027-12，沿用已确认预算的 startMonth',
  amountUnit: 'CNY 元',
  volumeUnit: '单',
  calculationEngine: '../method/scripts/operating-forecast.js',
  appliedInput: structuredClone(budget),
  supplierProposalTreatment: '主预测保留已确认基准成本45元/单；50元/单仅作为未批准、假设自首月生效的敏感性。',
  inputHashes: {confirmedBudgetSha256: sha(budgetText), supplierProposalSha256: sha(proposalText)}
};
for (const scenario of forecast.scenarios) {
  const definition = budget.scenarios.find(s => s.id === scenario.id);
  scenario.drivers = {
    ...definition,
    initialUnitsBeforeRounding: budget.drivers.initialUnits * definition.unitsMultiplier,
    actualMonthlyGrowth: money(budget.drivers.monthlyGrowth + definition.growthDelta),
    unitPrice: money(budget.drivers.unitPrice * definition.priceMultiplier),
    variableCostPerUnit: money(budget.drivers.variableCostPerUnit * definition.costMultiplier)
  };
  Object.assign(scenario.summary, {
    totalUnits: sum(scenario.months, 'units'),
    totalVariableCost: sum(scenario.months, 'variableCost'),
    totalFixedCost: sum(scenario.months, 'fixedCost'),
    totalDepreciation: sum(scenario.months, 'depreciation'),
    totalTax: sum(scenario.months, 'tax'),
    totalReceipts: sum(scenario.months, 'receipts'),
    totalSupplierPayments: sum(scenario.months, 'supplierPayments'),
    totalPayments: sum(scenario.months, 'payments'),
    totalCapex: sum(scenario.months, 'capex'),
    totalFinancing: sum(scenario.months, 'financing'),
    totalNetCashFlow: sum(scenario.months, 'netCashFlow'),
    fundingRequiredMeaning: '不含月内波动及安全垫的月末累计缺口，不是已获融资；financing按已确认预算保持0。'
  });
}

const alternativeInput = structuredClone(budget);
alternativeInput.drivers.variableCostPerUnit = 50;
const alternative = engine.forecast(alternativeInput);
forecast.supplierCostSensitivity = {
  status: 'hypothetical_not_approved',
  issue: '相对各自主情景，仅将基础每单变动成本45改为50；其余参数不变。',
  assumption: '仅为测算影响，假设50元报价自2027-01生效并延续12个月；实际生效时间尚未确定。',
  appliedValueInMainForecast: 45,
  alternateValue: 50,
  unit: 'CNY/单',
  cases: alternative.scenarios.map(s => {
    const main = forecast.scenarios.find(x => x.id === s.id);
    return {scenarioId: s.id, label: s.label, summary: s.summary,
      netIncomeChange: money(s.summary.totalNetIncome - main.summary.totalNetIncome),
      endingCashChange: money(s.summary.endingCash - main.summary.endingCash),
      fundingRequiredChange: money(s.summary.fundingRequired - main.summary.fundingRequired)};
  })
};
forecast.valuation = {status: 'not_applicable', reason: '本任务为12个月经营与现金预测，未要求估值。'};
forecast.assumptions.push('三种情景均以确认预算45元/单为基础；乐观44.10、保守48.60来自已给定成本倍率，不能解释为已签报价。');
forecast.assumptions.push('销量按首月基数乘复合月增长独立计算后四舍五入为整数，不逐月对已取整销量再递增。');
forecast.limitations.push('未提供历史损益、现金流或完整资产负债表；没有进行历史拟合或完整三表核平。');

const facts = {
  schemaVersion: 1,
  exampleData: true,
  currency: 'CNY',
  conflicts: [{
    issue: '同规格、同币种的每单变动成本：已确认预算45元与供应商未接受提议50元存在差异。',
    sources: [
      {path: '../inputs/confirmed-budget.json', field: 'drivers.variableCostPerUnit', value: 45, status: 'confirmed_budget', description: '经营者确认的预算版本，基础每单变动成本45元。'},
      {path: '../inputs/supplier-proposal.md', date: '2026-11-10', value: 50, status: 'proposed_unsigned_unaccepted', description: '供应商建议50元/单，尚未签约且经营者尚未接受。'}
    ],
    status: 'pending_owner_decision_confirmed_budget_retained',
    appliedValue: 45,
    alternateValue: 50,
    unit: 'CNY/单',
    resolution: '批准状态优先于材料日期；50元新提议不覆盖45元已确认预算。',
    appliedScope: '三情景基础成本45元；情景有效成本分别45、44.10、48.60元。',
    alternateScope: '仅在forecast.json的supplierCostSensitivity测算；不计入主预测。',
    decisionNeeded: '经营者决定是否接受50元、开始月份和合同付款条款。'
  }],
  confirmedBudgetFacts: {
    period: {start: '2027-01', end: '2027-12'},
    openingCash: 12000,
    openingReceivables: 2400,
    openingPayables: 1200,
    collectionShare: 0.65,
    paymentShare: 1,
    capex: {month: '2027-02', amount: 12000},
    financingByMonth: budget.drivers.financingByMonth,
    source: '../inputs/confirmed-budget.json',
    status: 'confirmed_budget_assumptions_not_actual_results'
  },
  unresolved: [
    {issue: '供应商50元报价是否接受及生效日期', status: 'not_approved', treatment: '主模型维持45元，单独测算全期50元的假设影响。'},
    {issue: '如何填补逐月现金缺口', status: 'no_confirmed_financing', treatment: '融资仍为0；资金需求只报告，不自动补入。'},
    {issue: '实际税务口径、折旧及设备使用寿命', status: 'model_assumptions_only', treatment: '沿用20%税率和每月200元折旧；资本开支不自动增加折旧。'},
    {issue: '实际销量、回款表现和完整历史报表', status: 'not_provided', treatment: '使用已确认预算的情景驱动，不声称真实业务预测准确性已验证。'},
    {issue: '月内收付款时点及安全现金储备', status: 'not_modeled', treatment: '月末缺口为资金需求下界，无法证明月内不会断现金。'}
  ]
};

const summaries = forecast.scenarios.map(s => `| ${s.label} | ${fmt(s.summary.totalRevenue)} | ${fmt(s.summary.totalNetIncome)} | ${fmt(s.summary.endingCash)} | ${fmt(s.summary.minimumCash)}（${s.summary.minimumCashMonth}） | ${s.summary.firstGapMonth ?? '无'} | ${fmt(s.summary.fundingRequired)} |`).join('\n');
const cashTable = forecast.scenarios[0].months.map((m, i) => `| ${m.month} | ${fmt(m.endingCash)} | ${fmt(forecast.scenarios[1].months[i].endingCash)} | ${fmt(forecast.scenarios[2].months[i].endingCash)} |`).join('\n');
const sensitivity = forecast.supplierCostSensitivity.cases.map(s => `| ${s.label} | ${fmt(s.summary.totalNetIncome)} | ${fmt(s.netIncomeChange)} | ${fmt(s.summary.endingCash)} | ${fmt(s.summary.fundingRequired)} | ${fmt(s.fundingRequiredChange)} |`).join('\n');
const decision = `# 2027年经营预测与现金安排\n\n## 先看结论\n\n按经营者确认的预算，基准全年收入 **204,390.00元**、净利润 **20,316.00元**，但**2027年2月会出现2,137.50元月末现金缺口**。全年盈利不能保证每个月现金够用。乐观情景同样在2月出现483.56元缺口；保守情景全年亏损7,075.36元，10月最低现金为−8,701.79元。所有主情景融资均为0，没有把尚未决定的融资补进模型。\n\n本次按预算起始月预测2027年1月至12月；金额均为CNY元，数量为单。材料是合成资料，预算中的确认代表假设版本已确认，不代表未来经营结果已发生。[来源：已确认预算](../inputs/confirmed-budget.json)。\n\n## 三情景对照\n\n| 情景 | 全年收入 | 全年净利润 | 年末现金 | 最低月末现金 | 首次缺口 | 最少补充资金 |\n| --- | ---: | ---: | ---: | ---: | --- | ---: |\n${summaries}\n\n“最少补充资金”是把最低月末余额补到0所需的累计额度，假设资金在缺口发生前到位且没有融资费用。它未包含月内波动、安全储备、利息，也不是融资承诺。负现金是没有安排融资的缺口信号，不能理解为企业可以无条件持续付款。\n\n三种情景使用预算内已给定的联动变化：\n\n| 驱动 | 基准 | 乐观 | 保守 |\n| --- | ---: | ---: | ---: |\n| 首月销量倍率 | 1.00 | 1.12 | 0.82 |\n| 首月取整销量（单） | 160 | 179 | 131 |\n| 销量月增长率 | 3% | 4% | 2% |\n| 销售单价（元/单） | 90.00 | 92.70 | 88.20 |\n| 每单变动成本（元/单） | 45.00 | 44.10 | 48.60 |\n\n各情景固定费用均为6,200元/月、折旧200元/月、税率20%。当月回款65%，余款次月收回；采购当月全付，期初应收2,400元和应付1,200元在首月结清。2月设备采购12,000元；其他月份资本开支和全部融资均为0。[来源：已确认预算](../inputs/confirmed-budget.json)。乐观与保守同时改变销量、增长、价格和成本，属于多因素情景；下文才是保持其他条件不变的单因素报价敏感性。\n\n## 为什么有利润，现金仍会不够\n\n基准1月净利润640元，却净流出现金3,000元：14,400元收入只收回本月部分款项，加上期初应收结清后总回款11,760元；含期初应付款的供应商支出为8,400元，再支付固定费用6,200元及税160元，共支出14,760元。月末现金从12,000元降至9,000元。\n\n2月净利润820元，但设备采购一次支付12,000元，使现金支出达到25,830元，超过14,692.50元回款，当月净流出11,137.50元，月末余额变为−2,137.50元。设备采购进入现金支出；损益只扣每月已设定的200元折旧，不能把12,000元又当作当月费用重复扣除。\n\n全年基准利润到现金的桥接如下，逐项能与月表核对：\n\n| 项目 | 对现金的影响（元） |\n| --- | ---: |\n| 期初现金 | 12,000.00 |\n| 加：全年净利润 | 20,316.00 |\n| 加：非现金折旧 | 2,400.00 |\n| 减：资本开支 | −12,000.00 |\n| 减：应收增加（6,961.50 − 2,400.00） | −4,561.50 |\n| 加：应付变动（0 − 1,200.00） | −1,200.00 |\n| 加：已输入融资 | 0.00 |\n| 年末现金 | **16,954.50** |\n\n因此全年现金只增加4,954.50元，而非净利润20,316元。这是现金与经营损益的简化勾稽，不是完整三张财务报表核平。\n\n### 月末现金轨迹\n\n| 月份 | 基准 | 乐观 | 保守 |\n| --- | ---: | ---: | ---: |\n${cashTable}\n\n基准现金在2月至3月为负，4月恢复为正；乐观2月出现短缺后3月恢复；保守从2月至年末都为负。保守情景不能只补2月的4,842.58元，因为缺口随后继续扩大，10月累计需要8,701.79元。\n\n## 45元与50元报价：本次采用谁\n\n**主模型采用已确认预算的45元/单。** 2026年11月10日供应商提出50元/单，规格和币种可比，但文件明确“尚未签约，经营者尚未接受”。日期较新不等于预算已获批准变更，因此50元不会覆盖45元。乐观44.10元和保守48.60元来自预算已给定的成本倍率，不能把这些值写成已签供应商价格。[来源：供应商补充](../inputs/supplier-proposal.md)；[来源：已确认预算](../inputs/confirmed-budget.json)。\n\n为了让报价决策有依据，另算“如果基础成本50元从2027年1月起生效”的影响。它是假设敏感性，实际是否接受、何时生效仍待经营者决定；除基础成本外，每种情景的其他参数保持不变：\n\n| 情景 | 假设50元时净利润 | 较主预测净利润变动 | 假设50元时年末现金 | 最少补充资金 | 较主预测多需资金 |\n| --- | ---: | ---: | ---: | ---: | ---: |\n${sensitivity}\n\n基准全年卖出2,271单。每单成本上涨5元，全年税前成本增加11,355元；在当前月度计税规则下，净利润减少9,084元至11,232元，最低现金从−2,137.50元变为−3,437.50元。因此，这个报价会同时压低盈利并扩大前期资金需求，但上述影响测算不代表已接受提议。\n\n## 需要决定的事和模型边界\n\n1. **先安排2月付款前的现金来源。** 基准月末至少需2,137.50元；若按保守情景准备覆盖全年的额度，至少需8,701.79元，并另留月内波动及融资费用余量。资金来源、条件和承诺尚未给出，主预测仍保持融资0。\n2. **决定供应商报价是否接受及生效月份。** 接受后再更新实际生效月份的成本，核对付款条款。当前50元敏感性假定整年生效，是为比较影响而设，不能代替合同。\n3. **复核2月12,000元设备付款的具体日期。** 目前完全按已确认预算执行；可与设备供应商商谈分期或调整日期，但只有获准后才能改主模型。\n4. **用实际经营资料校准销量与回款。** 没有提供历史报表、合同订单或账龄表。销量增长、回款65%、无坏账、无库存变动等沿用预算，尚不能声明符合真实经营。\n5. **补齐实际税务与折旧口径。** 20%税率和200元/月折旧是明确模型假设；所得税按正的月度税前利润当月计付，不处理税损结转。未包含增值税、利息或未输入费用，也没有自动用设备采购推算新增折旧。[来源：预算假设与包内计算规则](../method/references/operating-forecast.md)。\n\n本任务不含DCF或企业估值。没有完整资产负债表，不声称资产负债已核平；没有进行真实业务验收或方法专业效果评测。\n\n## 本次实际核验\n\n已实际运行包内纯计算模块，生成全部36行月度预测；另用Python Decimal从原始预算独立重算，36行结果与交付数值完全一致。结构、逐月现金、应收应付、利润组成、年度汇总及利润到现金桥接等1,282项程序断言通过，十进制复算最大差异0.00元。50元报价敏感性的利润与资金缺口也完成复核。详细记录见verification.json。\n\n页面检查实际尝试了两次启动：Playwright默认浏览器文件缺失；改用已安装Chromium后，操作系统拒绝socket调用，浏览器未能打开。因此，页面导入、改值、导出及截图检查未执行；page-verification.json保留失败原因。这不影响本次本地数值交付，但不能写成页面验收通过。没有调用付费模型、外部研究、真实交易或真实业务验收。\n\n## 文件与复算\n\n- \`forecast.json\`：schemaVersion为1，三个情景各12个月，包含收入、净利润、回款、付款、融资、期末现金，以及月度成本、税、应收应付和汇总；另附明确标记的报价敏感性。\n- \`facts.json\`：记录45元/50元冲突的原始来源、确认状态、已采用值、备选值、单位与未确定项。\n- \`build_forecast.cjs\`：读取原始材料及包内纯计算模块，生成主要交付；运行命令为 \`node output/build_forecast.cjs\`（在本trial目录执行）。\n- \`verify_forecast.py\` 与 \`verification.json\`：对实际生成文件进行独立数值与结构复核；只以记录中的实际结果为准。\n- \`page-verification.json\`：记录本地页面启动尝试。浏览器因环境限制未能打开，因此页面导入、改值、下载和视觉检查均未完成，不记为通过。\n\n输入文件和方法文件未被编辑。\n`;

writeJson('forecast.json', forecast);
writeJson('facts.json', facts);
fs.writeFileSync(path.join(__dirname, 'decision.md'), decision);
writeJson('submission.json', {schemaVersion: 1, artifacts: {forecast: 'forecast.json', decision: 'decision.md', facts: 'facts.json'}});
console.log(JSON.stringify({written: ['forecast.json','facts.json','decision.md','submission.json'], scenarios: forecast.scenarios.map(s => ({id:s.id,months:s.months.length,summary:s.summary}))}, null, 2));
