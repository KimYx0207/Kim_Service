/* Presentation copy; the forecast engine and its numeric results stay unchanged. */
(function(root) {
  const messages={
    'zh-CN':{
      title:'12个月经营预测 · Kim Service 示例',skip:'跳到预测结果',eyebrow:'KIM SERVICE / 可复算样板',heading:'生意有利润，现金够用吗？',intro:'改几个经营假设，看看未来 12 个月的收入、利润与现金缺口。',sample:'合成示例数据',userData:'用户输入 · 假设待核',inputs:'你的经营假设',reset:'恢复示例',inputHint:'修改后立即重算。数据留在当前页面，不会上传。',startMonth:'起始月份',openingCash:'期初现金（元）',initialUnits:'首月销量（单）',unitPrice:'单价（元）',variableCost:'每单变动成本（元）',fixedCost:'每月固定费用（元）',growth:'销量月增长（%）',collection:'当月回款（%）',fieldHelp:'未在当月收到的货款在次月收回。期初应收、应付、税率、设备采购与情景倍率可在完整假设里编辑。',advanced:'编辑完整假设 / 导入 JSON',jsonInput:'全部输入（JSON）',applyJson:'应用完整假设',importFile:'导入文件',results:'先看现金，再看增长',chart:'月末现金变化',zero:'虚线为零余额',chartLabel:'各情景月末现金折线图；完整数值见下方月度明细',table:'每笔结果都能复算',scenario:'情景',tableRegion:'可横向滚动的12个月明细',caption:'金额按输入币种，单位为元。净现金流已计入设备采购与融资。',month:'月份',revenue:'收入',netIncome:'净利润',receipts:'实际回款',payments:'现金支出',financing:'融资',endingCash:'月末现金',downloadHeading:'把模型带走',downloadHint:'JSON 保留所有假设和公式结果；CSV 可在表格软件打开。',downloadInput:'下载输入 JSON',downloadResult:'下载结果 JSON',downloadCsv:'下载月表 CSV',calculation:'看计算公式与假设',profitFormula:'净利润 = 收入 − 变动成本 − 固定费用 − 折旧 − 所得税。',cashFormula:'月末现金 = 月初现金 + 实际回款 − 供应商付款 − 固定费用 − 所得税 − 设备采购 + 明确融资。',footer:'可编辑、可复算的经营预测样板。换成你的业务假设，下载月表继续分析。',recalculated:'已按当前假设重算。未确认的业务事实仍需你补齐。',unit:'{currency} · 元',annualProfit:'12个月净利润',yearEndCash:'年末现金',funding:'需补资金',firstGap:'首次月末缺口',noGap:'未出现',invalid:'输入未通过检查，暂不显示旧结果。修正后自动重算。',invalidJson:'完整假设未应用，请修正 JSON 后重试。',fileSize:'文件超过128 KiB，请只导入模型输入。',base:'基准',upside:'乐观',downside:'保守'
    },
    en:{
      title:'12-month Operating Forecast · Kim Service',skip:'Skip to forecast results',eyebrow:'KIM SERVICE / WORKING EXAMPLE',heading:'Profitable on paper. Enough cash to keep going?',intro:'Change a few assumptions and see the next 12 months of revenue, profit and cash.',sample:'Synthetic sample data',userData:'Your inputs · Review the assumptions',inputs:'Your business assumptions',reset:'Reset example',inputHint:'Results update as you type. Data stays on this page.',startMonth:'Start month',openingCash:'Opening cash',initialUnits:'First-month orders',unitPrice:'Price per order',variableCost:'Variable cost per order',fixedCost:'Monthly fixed costs',growth:'Monthly volume growth (%)',collection:'Collected this month (%)',fieldHelp:'Uncollected sales are received the following month. Edit opening receivables, payables, tax, equipment purchases and scenario multipliers in the full input.',advanced:'Edit full input / Import JSON',jsonInput:'Full input (JSON)',applyJson:'Apply full input',importFile:'Import file',results:'Check cash first. Then look at growth.',chart:'Cash at the end of each month',zero:'Dashed line = zero cash',chartLabel:'Month-end cash by scenario; the full values appear in the monthly table below',table:'Follow every number back to a month',scenario:'Scenario',tableRegion:'Horizontally scrollable 12-month table',caption:'Amounts use the input currency. Net cash flow includes equipment purchases and financing.',month:'Month',revenue:'Revenue',netIncome:'Net profit',receipts:'Cash collected',payments:'Cash paid',financing:'Financing',endingCash:'Closing cash',downloadHeading:'Take the model with you',downloadHint:'JSON includes inputs and calculated results. Open the CSV in a spreadsheet.',downloadInput:'Download input JSON',downloadResult:'Download result JSON',downloadCsv:'Download monthly CSV',calculation:'See the formulas and assumptions',profitFormula:'Net profit = revenue − variable costs − fixed costs − depreciation − income tax.',cashFormula:'Closing cash = opening cash + collections − supplier payments − fixed costs − income tax − equipment purchases + explicit financing.',footer:'An editable operating forecast you can recalculate. Add your own assumptions and download the monthly table.',recalculated:'Recalculated from the current inputs. Review the assumptions for your own business.',unit:'{currency} · currency units',annualProfit:'12-month net profit',yearEndCash:'Year-end cash',funding:'Cash needed',firstGap:'First month-end shortfall',noGap:'None',invalid:'Correct the input to see updated results.',invalidJson:'The full input was not applied. Correct the JSON and try again.',fileSize:'The file exceeds 128 KiB. Import only the model input.',base:'Base',upside:'Upside',downside:'Downside'
    }
  };
  const originalText={
    '示例工作室 · 12 个月经营预测':'Sample studio · 12-month operating forecast',
    '基准':'Base','乐观':'Upside','保守':'Downside',
    '所有数值均为合成示例，金额单位为 CNY 元；没有客户、实际交易或实测效果。':'All figures are synthetic examples in CNY. They are not customer records or actual transactions.',
    '第二个月购买设备支出 12,000 元；示例不自动融资。':'Equipment costs CNY 12,000 in month two. The example does not add financing automatically.',
    '税率 20% 和月折旧 200 元只是演示假设，应用到实际业务前需替换。':'The 20% tax rate and CNY 200 monthly depreciation are sample assumptions to replace for your own business.',
    '期初应收 2,400 元与应付 1,200 元在首月结清；当月收款 65%，其余次月收回。':'Opening receivables of CNY 2,400 and payables of CNY 1,200 settle in month one. Collect 65% of current sales now and the rest next month.',
    '示例为简化经营预测，不是 DCF、完整三表、法定报表或真实经营结果。':'This is a simplified operating forecast. It does not model DCF, a full three-statement set or statutory accounts.',
    '销量四舍五入为整数；收入当月确认。期初应收、应付在首月结清；其余回款和付款只分当月及次月，无坏账。':'Orders round to whole units and revenue is recognized in the current month. Opening receivables and payables settle in month one. Remaining collections and payments settle this month or next, with no bad-debt model.',
    '采购与销售对应，无库存变化。折旧为显式固定假设；资本开支不自动推导折旧。':'Purchases follow sales with no inventory movement. Depreciation is a fixed input and is not inferred from capital spending.',
    '所得税按正的月度税前利润及输入税率当月支付，不含亏损结转、增值税、利息或未输入费用。税率为零必须有明确依据或标为假设。':'Income tax is paid on positive monthly pretax profit at the entered rate. Loss carryforwards, VAT, interest and unentered costs are excluded. Support a zero rate with a stated basis or mark it as an assumption.',
    '资金缺口按月末余额估算，不能证明月内没有缺口；融资只使用明确输入，不会自动补钱。':'Funding needs use month-end balances; an intra-month shortfall can still occur. Financing uses only the amounts explicitly entered.',
    'schemaVersion 必须是 1':'schemaVersion must be 1',
    'exampleData 必须明确为 true 或 false':'exampleData must be explicitly true or false',
    'title 需要 1–120 字的名称':'title must contain 1–120 characters',
    'currency 需要三字母币种代码；本工具不换汇':'currency must be a three-letter currency code. No currency conversion is performed.',
    'startMonth 需要 YYYY-MM':'startMonth must use YYYY-MM',
    'startMonth 年份超出支持范围':'startMonth is outside the supported year range',
    'initialUnits 必须是整数':'initialUnits must be a whole number',
    'assumptions 必须是文字列表':'assumptions must be a list of strings',
    '需要 1–5 个明确情景':'Provide 1–5 explicit scenarios',
    '情景 id 需要不重复的小写标识':'Each scenario id must be a unique lowercase identifier',
    '情景 label 需要 1–60 字':'Each scenario label must contain 1–60 characters',
    '模型结果超出可安全计算的范围，请检查单位与增长率':'The result is outside the safe numeric range. Check units and growth rates.'
  };
  function resolveLanguage(value){return value==='en'?'en':'zh-CN';}
  function createLocale(value){
    let language=resolveLanguage(value);
    const t=(key,params={})=>{if(!Object.hasOwn(messages[language],key))throw new Error('Unknown UI message: '+key);return messages[language][key].replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??'{'+name+'}'));};
    const original=value=>language==='en'&&Object.hasOwn(originalText,value)?originalText[value]:value;
    function error(message){
      if(language!=='en')return message;
      if(Object.hasOwn(originalText,message))return originalText[message];
      return String(message).replace(/^(.*?) 必须是 (.*?) 至 (.*?) 之间的有限数值$/, '$1 must be a finite number between $2 and $3')
        .replace(/^(.*?) 必须是对象$/, '$1 must be an object').replace(/^(.*?) 有未识别字段：(.*)$/, '$1 contains unknown fields: $2')
        .replace(/^(.*?) 必须恰好包含 12 个月$/, '$1 must contain exactly 12 months').replace('实际月增长','actual monthly growth').replace(/^输入 /,'Input ');
    }
    function apply(document){
      document.documentElement.lang=language;document.title=t('title');
      for(const node of document.querySelectorAll('[data-i18n]'))node.textContent=t(node.dataset.i18n);
      for(const node of document.querySelectorAll('[data-i18n-aria-label]'))node.setAttribute('aria-label',t(node.getAttribute('data-i18n-aria-label')));
      for(const link of document.querySelectorAll('[data-language]')){const url=new URL(root.location.href);url.searchParams.set('lang',link.dataset.language);link.href=url.href;if(link.dataset.language===language)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}
    }
    return {get language(){return language;},setLanguage:value=>{language=resolveLanguage(value);},t,apply,original,error};
  }
  if(typeof module==='object'&&module.exports)module.exports={messages,resolveLanguage,createLocale};
  else root.KimForecastLocale=createLocale(new URLSearchParams(root.location.search).get('lang'));
})(typeof globalThis==='object'?globalThis:this);
