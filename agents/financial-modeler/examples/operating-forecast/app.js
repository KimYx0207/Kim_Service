/* Presentation adapter. The only calculations live in scripts/operating-forecast.js. */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const clone = value => JSON.parse(JSON.stringify(value));
  const locale=globalThis.KimForecastLocale, t=locale.t;
  function initialInput(){const value=clone(globalThis.KimForecastExample);value.title=locale.original(value.title);value.assumptions=value.assumptions.map(locale.original);value.scenarios=value.scenarios.map(item=>({...item,label:locale.original(item.label)}));return value;}
  let input = initialInput();
  let result; let usingExampleText=true; let currentStatus='recalculated'; let currentError;
  const sampleLabels=new Map(globalThis.KimForecastExample.scenarios.map(item=>[item.id,item.label]));
  const displayLabel=scenario=>usingExampleText?locale.original(sampleLabels.get(scenario.id)??scenario.label):scenario.label;
  const fields = ['startMonth','openingCash','initialUnits','unitPrice','variableCostPerUnit','fixedCostPerMonth','monthlyGrowth','collectionShare'];
  const percentages = new Set(['monthlyGrowth','collectionShare']);
  const colors = ['#176b50','#36699e','#b25a30','#7e55a4','#745e2e'];
  const formatted = value => new Intl.NumberFormat(locale.language,{maximumFractionDigits:2,minimumFractionDigits:2}).format(value);
  const element = (tag, text, className) => {
    const node = document.createElement(tag); if (text !== undefined) node.textContent = text;
    if (className) node.className = className; return node;
  };
  function fillControls() {
    fields.forEach(key => { const value = key in input ? input[key] : input.drivers[key]; $(key).value = percentages.has(key) ? Math.round(value * 10000) / 100 : value; });
    $('json-input').value = JSON.stringify(input,null,2);
  }
  function list(id, values) { $(id).replaceChildren(...values.map(value => element('li',value))); }
  function drawChart() {
    const svg = $('cash-chart'); svg.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    const add = (tag, attrs, text) => { const node = document.createElementNS(ns,tag); for(const [key,value] of Object.entries(attrs)) node.setAttribute(key,String(value)); if(text !== undefined) node.textContent = text; svg.append(node); return node; };
    const all = result.scenarios.flatMap(s => s.months.map(m => m.endingCash));
    const min = Math.min(0,...all), max = Math.max(1,...all), span = max-min || 1;
    const x = i => 88 + i * 68, y = value => 212 - (value-min)/span*180;
    for (let i=0;i<4;i++) { const value=min+span*i/3; add('line',{x1:88,y1:y(value),x2:836,y2:y(value),stroke:'#e1e8df'}); add('text',{x:76,y:y(value)+4,'text-anchor':'end'},Math.round(value).toLocaleString(locale.language)); }
    add('line',{x1:88,y1:y(0),x2:836,y2:y(0),stroke:'#8c9c90','stroke-dasharray':'5 5'});
    result.scenarios.forEach((scenario,index) => add('path',{d:scenario.months.map((m,i)=>`${i?'L':'M'}${x(i)},${y(m.endingCash)}`).join(' '),fill:'none',stroke:colors[index], 'stroke-width':3, 'stroke-linejoin':'round'}));
    result.scenarios[0].months.forEach((month,i) => add('text',{x:x(i),y:242,'text-anchor':'middle'},locale.language==='en'?new Intl.DateTimeFormat('en',{month:'short',timeZone:'UTC'}).format(new Date(month.month+'-01T00:00:00Z')):month.month.slice(5)+'月'));
    $('chart-legend').replaceChildren(...result.scenarios.map((scenario,i) => { const item = element('span',displayLabel(scenario)); item.style.setProperty('--series',colors[i]); return item; }));
  }
  function drawTable() {
    const scenario = result.scenarios.find(s => s.id === $('scenario-select').value) ?? result.scenarios[0];
    $('monthly-rows').replaceChildren(...scenario.months.map(month => {
      const tr = element('tr'); tr.append(element('th',month.month)); tr.firstChild.scope = 'row';
      ['revenue','netIncome','receipts','payments','financing','endingCash'].forEach(key => tr.append(element('td',formatted(month[key]),month[key]<0?'negative':'')));
      return tr;
    }));
  }
  function renderFeedback(){
    $('input-status').textContent=t(currentStatus);
    if(currentError)$('input-error').textContent=currentError.key?t(currentError.key):locale.error(currentError.message);
  }
  function renderResult() {
      $('currency').textContent = t('unit',{currency:result.currency});
      $('period').textContent = `${result.startMonth} — ${result.scenarios[0].months.at(-1).month}`;
      document.querySelector('.sample-badge').textContent = result.exampleData ? t('sample') : t('userData');
      $('scenario-cards').replaceChildren(...result.scenarios.map((scenario,index) => {
        const card = element('article',undefined,'scenario-card'); card.style.setProperty('--series',colors[index]);
        card.append(element('h3',displayLabel(scenario)),element('small',t('annualProfit')),element('div',formatted(scenario.summary.totalNetIncome),'major'));
        for (const [label,value,gap] of [[t('yearEndCash'),formatted(scenario.summary.endingCash),false],[t('funding'),formatted(scenario.summary.fundingRequired),scenario.summary.fundingRequired>0],[t('firstGap'),scenario.summary.firstGapMonth??t('noGap'),scenario.summary.fundingRequired>0]]) {
          const row = element('div',undefined,'row'); row.append(element('span',label),element('strong',value,gap?'gap':'')); card.append(row);
        }
        return card;
      }));
      const selected = $('scenario-select').value;
      $('scenario-select').replaceChildren(...result.scenarios.map(s => { const option = element('option',displayLabel(s)); option.value=s.id; return option; }));
      if(result.scenarios.some(s=>s.id===selected)) $('scenario-select').value=selected;
      drawChart(); drawTable();
      list('assumption-notes',usingExampleText?globalThis.KimForecastExample.assumptions.map(locale.original):result.assumptions);
      list('model-limitations',result.limitations.map(locale.original));
  }
  function render() {
    try {
      result = globalThis.KimOperatingForecast.forecast(input);
      currentStatus='recalculated';currentError=undefined;
      $('input-error').hidden = true; $('results').hidden = false;
      renderResult();
      $('json-input').value=JSON.stringify(input,null,2);
    } catch(error) {
      result=undefined; $('results').hidden=true; $('input-error').hidden=false;
      currentError={message:error.message};currentStatus='invalid';
    }
    renderFeedback();
  }
  $('assumptions-form').addEventListener('submit',event=>event.preventDefault());
  fields.forEach(key => $(key).addEventListener('input',() => {
    let value = key==='startMonth' ? $(key).value : ($(key).value.trim()==='' ? NaN : Number($(key).value));
    if(percentages.has(key)) value/=100;
    if(key in input) input[key]=value; else input.drivers[key]=value;
    render();
  }));
  function applyJson(text) {
    try { const next=JSON.parse(text); globalThis.KimOperatingForecast.validateInput(next); input=next;usingExampleText=false; fillControls(); render(); }
    catch(error) { result=undefined; $('results').hidden=true; $('input-error').hidden=false;currentError={message:error.message};currentStatus='invalidJson';renderFeedback(); }
  }
  $('apply-json').addEventListener('click',()=>applyJson($('json-input').value));
  $('import-json').addEventListener('change',async event => { const file=event.target.files[0]; if(!file) return; if(file.size>128*1024){ $('input-error').hidden=false;currentError={key:'fileSize'};renderFeedback(); return; } applyJson(await file.text()); event.target.value=''; });
  $('reset').addEventListener('click',()=>{ input=initialInput();usingExampleText=true; fillControls(); render(); });
  $('scenario-select').addEventListener('change',drawTable);
  function download(name,text,type) { const url=URL.createObjectURL(new Blob([text],{type})); const link=element('a'); link.href=url; link.download=name; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $('download-input').addEventListener('click',()=>{ if(result) download('forecast-input.json',JSON.stringify(input,null,2)+'\n','application/json'); });
  $('download-result').addEventListener('click',()=>{ if(result) download('forecast-result.json',JSON.stringify({...result,limitations:result.limitations.map(locale.original)},null,2)+'\n','application/json'); });
  $('download-csv').addEventListener('click',()=>{ if(result) download('forecast-months.csv','\uFEFF'+globalThis.KimOperatingForecast.toCsv(result),'text/csv;charset=utf-8'); });
  for(const link of document.querySelectorAll('[data-language]'))link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();locale.setLanguage(link.dataset.language);locale.apply(document);
    document.querySelector('.sample-badge').textContent=t(input.exampleData?'sample':'userData');
    if(result)renderResult();renderFeedback();
    const url=new URL(globalThis.location.href);url.searchParams.set('lang',locale.language);
    try{globalThis.history.replaceState(globalThis.history.state,'',url);}catch{/* Local file previews can restrict URL updates; the in-page switch still works. */}
  });
  locale.apply(document);fillControls();render();
})();
