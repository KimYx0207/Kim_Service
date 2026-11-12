'use strict';
(() => {
  const api=globalThis.KimServiceConsoleTokens;
  const data=globalThis.KimServiceConsoleConfig;
  const locale=globalThis.KimServiceConsoleLocale;
  const t=locale.t;
  const config=JSON.parse(JSON.stringify(data.tokens));
  const $=id=>document.getElementById(id);
  let records=[]; let busy=false; let generation=0; let currentStatus;
  const sampleRecords=new WeakSet();
  const initial=()=>JSON.parse(JSON.stringify(data.appointments)).map(record=>{sampleRecords.add(record);return record;});
  const displayName=record=>sampleRecords.has(record)?locale.business(record.name):record.name;
  const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
  function applyDesign(){
    const theme=$('theme').value;
    config.palette.action=$('accent').value;
    config.palette.actionText=api.actionText(config.palette.action);
    config.typography.bodySize=Number($('font-size').value);
    for(const name of Object.keys(config.themes[theme])) document.documentElement.style.setProperty(`--${name}`,api.resolve(config,`themes.${theme}.${name}`));
    document.documentElement.style.setProperty('--space',`${config.spacing[$('density').value]}px`);
    document.documentElement.style.setProperty('--body-size',`${config.typography.bodySize}px`);
    document.documentElement.style.setProperty('--radius',`${config.radius}px`);
    document.documentElement.style.colorScheme=theme;
    $('design-status').textContent=t('designStatus',{theme:t(theme),ratio:api.contrast(config.palette.action,config.palette.actionText).toFixed(2)});
  }
  function renderRows(){
    $('booking-count').textContent=String(records.length);
    $('booking-rows').replaceChildren(...records.map((record,index)=>{
      const tr=el('tr'); const person=el('td'); person.append(el('strong',displayName(record)),el('small',locale.business(record.service)),el('small',record.email));
      const state=el('td'); state.append(el('span',t(record.state==='待到店'?'waiting':'arrived'),'booking-state'));
      const action=el('td');const button=el('button',t(record.state==='待到店'?'arriveAction':'waitAction'));button.type='button';button.setAttribute('aria-label',displayName(record)+': '+button.textContent);
      button.addEventListener('click',()=>{records[index].state=records[index].state==='待到店'?'已到店':'待到店';renderRows();status('changed','success',()=>({name:displayName(record),state:t(record.state==='待到店'?'waiting':'arrived')}));const buttons=$('booking-rows').querySelectorAll('button');buttons[index]?.focus();});
      action.append(button);tr.append(person,el('td',record.slot),state,action);return tr;
    }));
  }
  function clearErrors(){for(const id of ['name','email']){$(`${id}-error`).hidden=true;$(`guest-${id}`).removeAttribute('aria-invalid');}}
  function renderStatus(){if(currentStatus){const params=typeof currentStatus.params==='function'?currentStatus.params():currentStatus.params;$('form-status').textContent=t(currentStatus.key,params);$('form-status').dataset.state=currentStatus.state;}}
  function status(key,state,params={}){currentStatus={key,state,params};renderStatus();}
  $('booking-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;clearErrors();
    const name=$('guest-name').value.trim(),email=$('guest-email').value.trim();let first;
    if(!name){$('name-error').textContent=t('nameError');$('name-error').hidden=false;$('guest-name').setAttribute('aria-invalid','true');first=$('guest-name');}
    if(!email||!$('guest-email').validity.valid){$('email-error').textContent=t('emailError');$('email-error').hidden=false;$('guest-email').setAttribute('aria-invalid','true');first??=$('guest-email');}
    if(first){status('missing','error');first.focus();return;}
    busy=true;const attempt=++generation;const shouldFail=$('simulate-error').checked;
    $('submit-booking').disabled=true;$('submit-label').textContent=t('loading');$('booking-form').setAttribute('aria-busy','true');status('loadingStatus','loading');
    const record={name,email,slot:$('time-slot').value,service:$('service').value,state:'待到店'};
    await new Promise(resolve=>setTimeout(resolve,data.simulationDelayMs));
    if(attempt!==generation)return;
    busy=false;$('submit-booking').disabled=false;$('submit-label').textContent=t('submit');$('booking-form').removeAttribute('aria-busy');
    if(shouldFail){$('simulate-error').checked=false;status('failed','error');return;}
    records.unshift(record);renderRows();status('added','success',{name});
  });
  for(const id of ['theme','density','accent','font-size'])$(id).addEventListener('input',applyDesign);
  $('reset-demo').addEventListener('click',()=>{generation++;busy=false;records=initial();$('booking-form').reset();$('booking-form').removeAttribute('aria-busy');$('submit-booking').disabled=false;$('submit-label').textContent=t('submit');clearErrors();renderRows();status('restored','idle',{count:records.length});});
  $('download-tokens').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));const anchor=el('a');anchor.href=url;anchor.download='service-console-tokens.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function options(id, values) { const selected=$(id).value;$(id).replaceChildren(...values.map(item=>{ const value=typeof item==='object'?item.value:item; const label=typeof item==='object'?(['theme','density'].includes(id)?t(item.value):id==='font-size'?t(Number(item.value)===15?'standard':'large'):locale.business(item.label)):locale.business(item); const option=el('option',label); option.value=String(value); return option; }));if([...$(id).options].some(option=>option.value===selected))$(id).value=selected; }
  function localizeControls(){
    locale.apply(document);
    $('brand-mark').textContent=locale.business(data.brand.mark);$('brand-name').textContent=locale.business(data.brand.name);$('brand-tagline').textContent=locale.business(data.brand.tagline);
    options('theme',data.options.themes);options('density',data.options.densities);options('font-size',data.options.fontSizes);options('time-slot',data.timeSlots);options('service',data.services);
    $('submit-label').textContent=t(busy?'loading':'submit');
    for(const id of ['name','email'])if(!$(`${id}-error`).hidden)$(`${id}-error`).textContent=t(id+'Error');
    renderStatus();
  }
  for(const link of document.querySelectorAll('[data-language]'))link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();locale.setLanguage(link.dataset.language);localizeControls();applyDesign();renderRows();
    const url=new URL(globalThis.location.href);url.searchParams.set('lang',locale.language);
    try{globalThis.history.replaceState(globalThis.history.state,'',url);}catch{/* Local file previews can restrict URL updates; the in-page switch still works. */}
  });
  localizeControls();
  $('theme').value=data.defaults.theme;$('density').value=data.defaults.density;$('font-size').value=String(config.typography.bodySize);$('accent').value=config.palette.action;
  records=initial();applyDesign();renderRows();
})();
