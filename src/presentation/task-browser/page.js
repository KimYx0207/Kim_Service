/* Presentation only: DOM, focus, editable requests and user feedback. */
(function () {
  'use strict';
  const data = JSON.parse(document.getElementById('capability-data').textContent);
  const app = createTaskBrowser(data.ui);
  const {filterCapabilities,buildRequest,fields,titleOf,briefLabel,sourceUrl,sampleUrl,commonFields:COMMON_FIELDS,typeNames:TYPE_NAMES}=app;
  const drafts=new Map();
  const search = document.getElementById('search');
  const cards = document.getElementById('cards');
  const dialog = document.getElementById('detail');
  const detailContent = document.getElementById('detail-content');
  let selectedType = 'all';
  let lastTrigger = null;
  let activeId = null;
  const types = ['all', ...data.ui.typeOrder.filter((type) => data.capabilities.some((capability) => capability.componentType === type))];
  // Match the visible type order; within each type use a name sort, not a recommendation score.
  const browsingOrder = [...data.capabilities].sort((left,right) =>
    types.indexOf(left.componentType)-types.indexOf(right.componentType) || titleOf(left).localeCompare(titleOf(right),'zh-CN'));

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function fileLink(relative, text, className) {
    const link = element('a', className, text);
    // Contracts are already path-validated by the catalog builder.
    link.href = sourceUrl(relative,location.protocol);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function runtimeCopy(capability) {
    if (capability.componentType === 'agent') return ['专业方法包 · 需宿主工具', '提供角色方法与交付约定。实际读写、浏览器检查或媒体渲染，需要使用它的 Agent 环境提供工具与权限。页面未验证你的宿主是否已加载或运行此角色。'];
    if (capability.componentType === 'skill') return ['技能包 · 按入口接入', '提供任务流程及包内工具。需在支持的 Agent 环境按说明使用；模型、素材和外部服务是否可用，须在本次任务中核对。'];
    if (capability.componentType === 'tool') return ['工具 · 按说明配置', '需要按包内说明配置依赖与使用范围。本页仅展示声明和入口，没有安装或执行工具。'];
    return ['按包内说明接入', '需要按包内说明核对支持的环境与接入方式。本页没有安装、启用或执行此能力。'];
  }

  function ioPreview(schema) {
    const primary = fields(schema).filter((field) => !COMMON_FIELDS.has(field.key)).slice(0, 2);
    return primary.length ? primary.map(briefLabel).join(' · ') : (schema.description || '具体内容见入口说明');
  }

  function renderCard(capability) {
    const article = element('article','card');
    article.dataset.capability = capability.id;
    const meta = element('div','card-meta');
    const label = element('span','type-label',TYPE_NAMES[capability.componentType]);
    label.dataset.type = capability.componentType;
    meta.append(label,element('span','version','v'+capability.componentVersion));
    const title = element('h3','',titleOf(capability));
    const description = element('p','card-description',capability.useWhen[0]);
    const io = element('dl','card-io');
    for (const [name,schema] of [['你给',capability.input],['交付',capability.output]]) {
      const row = element('div');
      row.append(element('dt','',name),element('dd','',ioPreview(schema)));
      io.append(row);
    }
    const actions = element('div','card-actions');
    const button = element('button','details-button','查看输入与交付');
    button.type = 'button';
    button.setAttribute('aria-label','查看输入与交付：'+titleOf(capability));
    button.append(element('span','','→'));
    button.addEventListener('click',()=>openDetail(capability,button,true));
    actions.append(button,fileLink(`${capability.componentPath}/${capability.entrypoint}`,'打开入口 ↗','entry-link'));
    article.append(meta,title,element('p','component-name',capability.componentId),description,io,element('p','card-status',runtimeCopy(capability)[0]),actions);
    return article;
  }

  function renderResults() {
    const filtered = filterCapabilities(browsingOrder,search.value,selectedType);
    cards.replaceChildren(...filtered.map(renderCard));
    document.getElementById('empty').hidden = filtered.length !== 0;
    document.getElementById('clear-search').hidden = !search.value;
    document.getElementById('result-count').textContent = `${filtered.length} / ${data.capabilityCount} 项能力`;
    document.querySelectorAll('#types button').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.type===selectedType)));
  }

  function renderFields(list, direction = 'input') {
    const ul = element('ul','schema-list');
    for (const field of list) {
      const li = element('li');
      const label = element('strong','',field.description ? briefLabel(field) : field.label);
      label.append(element('span','field-badge',field.required ? (direction==='output' ? '合同要求' : '必填') : '按需'));
      li.append(label);
      if (field.description && briefLabel(field) !== field.description) li.append(element('p','',field.description));
      li.append(element('code','',field.key));
      ul.append(li);
    }
    return ul;
  }

  function listBlock(title, items) {
    const section = element('section','detail-section');
    section.append(element('h3','',title));
    const ul = element('ul');
    items.forEach((text)=>ul.append(element('li','',text)));
    section.append(ul);
    return section;
  }

  function openDetail(capability, trigger, updateHash) {
    activeId = capability.id;
    const draft = drafts.get(capability.id) || {goal:'',materials:'',host:data.ui.hosts[0].id,request:'',manual:false};
    if (trigger) lastTrigger = trigger;
    document.getElementById('detail-type').textContent = `${TYPE_NAMES[capability.componentType]} · v${capability.componentVersion}`;
    const heading = element('h2','detail-title',titleOf(capability));
    heading.id = 'detail-title';
    heading.tabIndex = -1;
    const runtime = element('div','runtime-note');
    const [runtimeTitle,runtimeDescription] = runtimeCopy(capability);
    runtime.append(element('strong','',runtimeTitle),element('p','',runtimeDescription));
    const io = element('div','detail-io');
    for (const [title,schema] of [['需要你提供',capability.input],['包内声明的交付',capability.output]]) {
      const section = element('section');
      section.append(element('h3','',title));
      const mainFields = fields(schema).filter((field)=>!COMMON_FIELDS.has(field.key));
      section.append(mainFields.length ? renderFields(mainFields,schema===capability.output?'output':'input') : element('p','detail-summary','合同未逐项列出字段，请查看入口说明。'));
      io.append(section);
    }
    const extra = element('details');
    extra.append(element('summary','','完整交付约定与使用边界'));
    for (const [name,schema] of [['任务上下文',capability.input],['状态与证据字段',capability.output]]) {
      const common = fields(schema).filter((field)=>COMMON_FIELDS.has(field.key));
      if (common.length) { extra.append(element('h4','',name),renderFields(common,schema===capability.output?'output':'input')); }
    }
    extra.append(listBlock('不适用的情况',capability.doNotUseWhen));
    if (capability.permissions.length) extra.append(listBlock('包声明的权限需求',capability.permissions));
    if (capability.sideEffects.length) extra.append(listBlock('可能的改动',capability.sideEffects));
    if (capability.humanGate.required) extra.append(listBlock('包声明的确认条件',capability.humanGate.when));
    if (capability.output.description) extra.append(element('p','detail-summary',capability.output.description));

    const links = element('div','source-links');
    const entry = `${capability.componentPath}/${capability.entrypoint}`;
    links.append(fileLink(entry,'打开入口 ↗'));
    if (capability.readme && capability.readme !== entry) links.append(fileLink(capability.readme,'使用 / 安装说明 ↗'));
    capability.examples.forEach((file,index)=>links.append(fileLink(file,`包内示例${capability.examples.length>1 ? ' '+(index+1) : ''} ↗`)));
    if (capability.deliveryContract) links.append(fileLink(`${capability.componentPath}/${capability.deliveryContract}`,'交付工具约定 ↗'));
    const validation = element('details');
    validation.append(element('summary','','查看已有验证入口'));
    validation.append(element('p','detail-summary','以下链接是包内声明的验证文件，不表示本页执行过测试，也不等于模型或业务结果已经验收。'));
    const validations = element('div','source-links');
    capability.validation.forEach((file)=>validations.append(fileLink(`${capability.componentPath}/${file}`,file)));
    validation.append(validations);

    const requestBox = element('section','request-box');
    const requestHeading = element('div','request-heading');
    requestHeading.append(element('h3','','带着这段请求继续'));
    const request = element('textarea');
    request.setAttribute('aria-label','可编辑的使用请求');
    request.spellcheck = false;
    request.value = draft.request || buildRequest(capability,draft);
    const hostLabel=element('label','request-field','交给哪个环境');
    const host=element('select'); host.id='request-host'; hostLabel.htmlFor=host.id;
    data.ui.hosts.forEach(item=>{const option=element('option','',item.label);option.value=item.id;host.append(option);});
    host.value=draft.host;
    const goalLabel=element('label','request-field','这次想得到什么');
    const goal=element('input'); goal.id='request-goal'; goalLabel.htmlFor=goal.id;
    goal.type='text';goal.placeholder='例如：把这页的报名流程改清楚，保留现有品牌风格';goal.value=draft.goal;
    const materialLabel=element('label','request-field','已有材料和限制');
    const materials=element('textarea');materials.id='request-materials';materialLabel.htmlFor=materials.id;
    materials.className='materials-input';materials.placeholder='文件名、链接、已有内容、交付格式或截止时间';materials.value=draft.materials;
    const update=element('button','secondary','更新请求'); update.type='button';
    const editor=element('details','request-editor');editor.append(element('summary','','查看或编辑完整请求'),request,update);
    function saveDraft(){draft.goal=goal.value;draft.materials=materials.value;draft.host=host.value;draft.request=request.value;drafts.set(capability.id,{...draft});}
    function refreshRequest(){saveDraft();if(!draft.manual){request.value=buildRequest(capability,draft);saveDraft();}else{copyStatus.textContent='材料已更新。点击「更新请求」将它们写入你手动编辑的文本。';}}
    goal.addEventListener('input',refreshRequest);materials.addEventListener('input',refreshRequest);host.addEventListener('change',refreshRequest);
    request.addEventListener('input',()=>{draft.manual=true;saveDraft();});
    update.addEventListener('click',()=>{saveDraft();request.value=buildRequest(capability,draft);draft.manual=false;saveDraft();copyStatus.textContent='请求已按当前目标、材料和环境更新。';});
    const copyActions = element('div','copy-actions');
    const copy = element('button','primary','复制请求');
    copy.type = 'button';
    const select = element('button','secondary','全选文本');
    select.type = 'button';
    const copyStatus = element('p','copy-status');
    copyStatus.setAttribute('role','status');
    copyStatus.setAttribute('aria-live','polite');
    copy.addEventListener('click',async()=>{
      saveDraft();
      copy.disabled = true;copy.textContent='复制中…';
      const success = await copyRequest(request,navigator.clipboard);
      copy.disabled = false;copy.textContent='复制请求';
      copyStatus.textContent = success ? '已复制。粘贴到'+data.ui.hosts.find(item=>item.id===host.value).label+'中，完成后可在原对话继续修改。' : '浏览器未允许复制，已选中文本。请按 Ctrl/Cmd+C 或长按复制。';
    });
    select.addEventListener('click',()=>{editor.open=true;request.focus();request.select();copyStatus.textContent='已全选。请按 Ctrl/Cmd+C 或长按复制。';});
    copyActions.append(copy,select,copyStatus);
    requestBox.append(requestHeading,element('p','','填好目标和材料，复制到你正在使用的 Agent。任务在该环境中执行。'),hostLabel,host,goalLabel,goal,materialLabel,materials,editor,copyActions);
    const note = element('p','source-note','声明来源：');
    note.append(fileLink(`${capability.componentPath}/capability.json`,`${capability.componentPath}/capability.json`));
    note.append(document.createTextNode('。包内示例可能是合成或未运行示例，请以原文件标注为准。'));
    detailContent.replaceChildren(heading,element('p','component-name',capability.id),element('p','detail-summary',capability.summary),runtime,listBlock('适用情况',capability.useWhen),io,extra,links,validation,requestBox,note);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    heading.focus({preventScroll:true});
    if (updateHash) {
      try { history.replaceState(null,'','#capability='+encodeURIComponent(capability.id)); } catch { /* file URL history may be restricted */ }
    }
  }

  function closeDetail() {
    dialog.close();
  }

  document.getElementById('inventory').textContent = `${data.componentCount} 个独立能力包　/　${data.capabilityCount} 项能力　/　全部来自仓库内声明`;
  const filters = document.getElementById('types');
  types.forEach((type)=>{
    const button = element('button','',TYPE_NAMES[type]);
    button.type = 'button';
    button.dataset.type = type;
    button.setAttribute('aria-pressed',String(type==='all'));
    button.append(element('span','',String(type==='all' ? data.capabilityCount : data.capabilities.filter((capability)=>capability.componentType===type).length)));
    button.addEventListener('click',()=>{selectedType=type;renderResults();});
    filters.append(button);
  });
  search.addEventListener('input',renderResults);
  document.getElementById('clear-search').addEventListener('click',()=>{search.value='';renderResults();search.focus();});
  for(const query of data.ui.suggestions){const button=element('button','',query);button.type='button';button.dataset.query=query;document.getElementById('suggestions').append(button);}
  document.querySelectorAll('[data-query]').forEach((button)=>button.addEventListener('click',()=>{search.value=button.dataset.query;selectedType='all';renderResults();search.focus();}));
  document.getElementById('reset').addEventListener('click',()=>{search.value='';selectedType='all';renderResults();search.focus();});
  document.getElementById('close-detail').addEventListener('click',closeDetail);
  dialog.addEventListener('click',(event)=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDetail();}});
  dialog.addEventListener('close',()=>{
    activeId=null;
    if(location.hash.startsWith('#capability=')){try{history.replaceState(null,'','#catalog');}catch{/* local history may be restricted */}}
    if(lastTrigger?.isConnected)lastTrigger.focus();else search.focus();
  });
  document.addEventListener('keydown',(event)=>{
    if(event.key==='/'&&!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){event.preventDefault();search.focus();}
  });
  function openFromHash(){
    if(!location.hash.startsWith('#capability='))return;
    let id;
    try{id=decodeURIComponent(location.hash.slice('#capability='.length));}catch{return;}
    const capability=data.capabilities.find((item)=>item.id===id);
    if(capability&&capability.id!==activeId)openDetail(capability,null,false);
  }
  window.addEventListener('hashchange',openFromHash);
  for(const sample of data.showcases){
    const article=element('article','showcase-card');
    article.append(element('p','eyebrow',sample.exampleData?'合成示例 · 可交互体验':'可交互体验'),element('h3','',sample.title),element('p','',sample.description));
    const io=element('dl','showcase-io');
    for(const [label,values] of [['你给',sample.inputs],['拿到',sample.outputs]]){const row=element('div');row.append(element('dt','',label),element('dd','',values.join('、')));io.append(row);}
    const actions=element('div','showcase-actions');
    const preview=element('a','primary','打开成品示例 ↗');preview.href=sampleUrl(sample.entrypoint,location.protocol);preview.target='_blank';preview.rel='noopener noreferrer';
    const use=element('button','secondary','用我的材料做');use.type='button';use.addEventListener('click',()=>openDetail(data.capabilities.find(item=>item.id===sample.capabilityId),use,true));
    actions.append(preview,use);article.append(io,actions);document.getElementById('showcase-cards').append(article);
  }
  document.getElementById('showcases').hidden=data.showcases.length===0;
  renderResults();
  openFromHash();
})();
