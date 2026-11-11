'use strict';
(() => {
  const api=globalThis.KimServiceConsoleTokens;
  const data=globalThis.KimServiceConsoleConfig;
  const config=JSON.parse(JSON.stringify(data.tokens));
  const $=id=>document.getElementById(id);
  let records=[]; let busy=false; let generation=0;
  const initial=()=>JSON.parse(JSON.stringify(data.appointments));
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
    $('design-status').textContent=`已应用${theme==='light'?'浅色':'深色'}主题；主按钮文字对比度 ${api.contrast(config.palette.action,config.palette.actionText).toFixed(2)}:1。下载的是当前完整配置。`;
  }
  function renderRows(){
    $('booking-count').textContent=String(records.length);
    $('booking-rows').replaceChildren(...records.map((record,index)=>{
      const tr=el('tr'); const person=el('td'); person.append(el('strong',record.name),el('small',record.service),el('small',record.email));
      const state=el('td'); state.append(el('span',record.state,'booking-state'));
      const action=el('td');const button=el('button',record.state==='待到店'?'标记到店':'恢复待到店');button.type='button';button.setAttribute('aria-label',`${record.name}：${button.textContent}`);
      button.addEventListener('click',()=>{records[index].state=records[index].state==='待到店'?'已到店':'待到店';renderRows();$('form-status').dataset.state='success';$('form-status').textContent=`${record.name} 已更新为${record.state}，仅影响本页演示。`;const buttons=$('booking-rows').querySelectorAll('button');buttons[index]?.focus();});
      action.append(button);tr.append(person,el('td',record.slot),state,action);return tr;
    }));
  }
  function clearErrors(){for(const id of ['name','email']){$(`${id}-error`).hidden=true;$(`guest-${id}`).removeAttribute('aria-invalid');}}
  function status(text,state){$('form-status').textContent=text;$('form-status').dataset.state=state;}
  $('booking-form').addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;clearErrors();
    const name=$('guest-name').value.trim(),email=$('guest-email').value.trim();let first;
    if(!name){$('name-error').textContent='请填写示例姓名。';$('name-error').hidden=false;$('guest-name').setAttribute('aria-invalid','true');first=$('guest-name');}
    if(!email||!$('guest-email').validity.valid){$('email-error').textContent='请填写格式完整的示例邮箱，例如 demo@example.test。';$('email-error').hidden=false;$('guest-email').setAttribute('aria-invalid','true');first??=$('guest-email');}
    if(first){status('还有必填信息需要补齐，已保留你的输入。','error');first.focus();return;}
    busy=true;const attempt=++generation;const shouldFail=$('simulate-error').checked;
    $('submit-booking').disabled=true;$('submit-label').textContent='正在确认…';$('booking-form').setAttribute('aria-busy','true');status('正在进行本地状态演示，不会发送实际预约。','loading');
    const record={name,email,slot:$('time-slot').value,service:$('service').value,state:'待到店'};
    await new Promise(resolve=>setTimeout(resolve,data.simulationDelayMs));
    if(attempt!==generation)return;
    busy=false;$('submit-booking').disabled=false;$('submit-label').textContent='确认预约 · Confirm this appointment';$('booking-form').removeAttribute('aria-busy');
    if(shouldFail){$('simulate-error').checked=false;status('演示服务暂时不可用。输入已保留，再次点击即可重试。','error');return;}
    records.unshift(record);renderRows();status(`已在本地示例中添加 ${name}。没有发送邮件或连接真实系统。`,'success');
  });
  for(const id of ['theme','density','accent','font-size'])$(id).addEventListener('input',applyDesign);
  $('reset-demo').addEventListener('click',()=>{generation++;busy=false;records=initial();$('booking-form').reset();$('booking-form').removeAttribute('aria-busy');$('submit-booking').disabled=false;$('submit-label').textContent='确认预约 · Confirm this appointment';clearErrors();renderRows();status(`已恢复 ${records.length} 条合成预约数据。`,'idle');});
  $('download-tokens').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(config,null,2)+'\n'],{type:'application/json'}));const anchor=el('a');anchor.href=url;anchor.download='service-console-tokens.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  function options(id, values) { $(id).replaceChildren(...values.map(item=>{ const value=typeof item==='object'?item.value:item; const option=el('option',typeof item==='object'?item.label:item); option.value=String(value); return option; })); }
  $('brand-mark').textContent=data.brand.mark; $('brand-name').textContent=data.brand.name; $('brand-tagline').textContent=data.brand.tagline;
  document.title=`${data.brand.name} · 可编辑设计系统样板`;
  options('theme',data.options.themes);options('density',data.options.densities);options('font-size',data.options.fontSizes);options('time-slot',data.timeSlots);options('service',data.services);
  $('theme').value=data.defaults.theme;$('density').value=data.defaults.density;$('font-size').value=String(config.typography.bodySize);$('accent').value=config.palette.action;
  records=initial();applyDesign();renderRows();
})();
