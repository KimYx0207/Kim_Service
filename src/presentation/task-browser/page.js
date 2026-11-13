/* Presentation only: DOM, focus, editable requests and user feedback. */
(function () {
  'use strict';
  const data = JSON.parse(document.getElementById('capability-data').textContent);
  const pageUrl = new URL(location.href);
  let app = createTaskBrowser(data.ui, { locale: pageUrl.searchParams.get('lang') });
  let {filterCapabilities,buildRequest,requestAttachments,requestForDraft,fields,titleOf,briefLabel,sourceUrl,sampleUrl,
    commonFields:COMMON_FIELDS,typeNames:TYPE_NAMES,locale,text:t,hosts,suggestions,
    detailOf,summaryOf,showcaseOf}=app;
  function applyStaticLanguage() {
    // Explicit template keys select authored messages; source text is never searched or replaced.
    document.documentElement.lang = locale;
    document.title = t('page.title');
    document.querySelector('meta[name="description"]').content = t('page.description');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of document.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label',t(node.dataset.i18nAria));
    for (const node of document.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
    for (const link of document.querySelectorAll('[data-root-readme]')) link.href = sourceUrl(locale==='en'?'README_EN.md':'README.md',location.protocol);
    for (const picker of document.querySelectorAll('.language-select')) picker.value = locale;
    document.getElementById('inventory').textContent = t('ui.inventory',{components:data.componentCount,capabilities:data.capabilityCount});
  }
  for (const picker of document.querySelectorAll('.language-select')) picker.addEventListener('change',()=>switchLanguage(picker.value));
  const draftOptions={maxBytes:data.ui.contentPolicy.maxDraftBytes};
  const drafts=createTaskDraftStore({getStorage:()=>window.localStorage,keyPrefix:data.ui.drafts.storageKeyPrefix,...draftOptions});
  const search = document.getElementById('search');
  search.value = pageUrl.searchParams.get('q') || '';
  const cards = document.getElementById('cards');
  const dialog = document.getElementById('detail');
  const detailContent = document.getElementById('detail-content');
  let selectedType = 'all';
  let lastTrigger = null;
  let activeId = null;
  const types = ['all', ...data.ui.typeOrder.filter((type) => data.capabilities.some((capability) => capability.componentType === type))];
  // Match the visible type order; within each type use a name sort, not a recommendation score.
  const browsingOrder = [...data.capabilities].sort((left,right) =>
    types.indexOf(left.componentType)-types.indexOf(right.componentType) || titleOf(left).localeCompare(titleOf(right),locale));

  function switchLanguage(value) {
    app = createTaskBrowser(data.ui,{locale:value});
    ({filterCapabilities,buildRequest,requestAttachments,requestForDraft,fields,titleOf,briefLabel,sourceUrl,sampleUrl,
      commonFields:COMMON_FIELDS,typeNames:TYPE_NAMES,locale,text:t,hosts,suggestions,
      detailOf,summaryOf,showcaseOf}=app);
    applyStaticLanguage();
    browsingOrder.sort((left,right)=>types.indexOf(left.componentType)-types.indexOf(right.componentType)||titleOf(left).localeCompare(titleOf(right),locale));
    renderTypeFilters();renderSuggestions();renderShowcases();renderResults();
    if(activeId){
      const capability=data.capabilities.find(item=>item.id===activeId);
      lastTrigger=[...cards.querySelectorAll('.details-button')].find(button=>button.closest('[data-capability]').dataset.capability===activeId)||null;
      if(capability)openDetail(capability,null,false);
    }
    const next = new URL(location.href);
    next.searchParams.set('lang',locale);
    if(search.value)next.searchParams.set('q',search.value);else next.searchParams.delete('q');
    // No reload: even a storage-denied draft stays in the existing in-memory store.
    try{history.replaceState(null,'',next.href);}catch{/* A restricted file URL still retains the chosen in-page language. */}
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function downloadText(filename, content, type) {
    const url=URL.createObjectURL(new Blob([content],{type}));
    const link=element('a');link.href=url;link.download=filename;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
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
    const kind = ['agent','skill','tool'].includes(capability.componentType) ? capability.componentType : 'other';
    return [t('runtime.'+kind+'Title'),t('runtime.'+kind+'Description')];
  }

  function ioPreview(schema, capability) {
    const primary = fields(schema,{capability}).filter(field => !COMMON_FIELDS.has(field.key)).slice(0, 2);
    return primary.length ? primary.map(briefLabel).join(' · ')
      : (locale==='en' ? t('ui.unspecified') : schema.description || t('ui.unspecified'));
  }

  function renderCard(capability) {
    const article = element('article','card');
    article.dataset.capability = capability.id;
    const meta = element('div','card-meta');
    const label = element('span','type-label',TYPE_NAMES[capability.componentType]);
    label.dataset.type = capability.componentType;
    meta.append(label,element('span','version','v'+capability.componentVersion));
    const title = element('h3','',titleOf(capability));
    const description = element('p','card-description',locale==='en'?summaryOf(capability):capability.useWhen[0]);
    const io = element('dl','card-io');
    for (const [name,schema] of [[t('ui.youProvide'),capability.input],[t('ui.deliver'),capability.output]]) {
      const row = element('div');
      row.append(element('dt','',name),element('dd','',ioPreview(schema,capability)));
      io.append(row);
    }
    const actions = element('div','card-actions');
    const button = element('button','details-button',t('ui.details'));
    button.type = 'button';
    button.setAttribute('aria-label',t('ui.detailsAria',{title:titleOf(capability)}));
    button.append(element('span','','→'));
    button.addEventListener('click',()=>openDetail(capability,button,true));
    actions.append(button,fileLink(`${capability.componentPath}/${capability.entrypoint}`,t('ui.openEntry'),'entry-link'));
    article.append(meta,title,element('p','component-name',capability.componentId),description,io,element('p','card-status',runtimeCopy(capability)[0]),actions);
    return article;
  }

  function renderResults() {
    const filtered = filterCapabilities(browsingOrder,search.value,selectedType);
    cards.replaceChildren(...filtered.map(renderCard));
    document.getElementById('empty').hidden = filtered.length !== 0;
    document.getElementById('clear-search').hidden = !search.value;
    document.getElementById('result-count').textContent = t('ui.resultCount',{count:filtered.length,total:data.capabilityCount});
    document.querySelectorAll('#types button').forEach((button)=>button.setAttribute('aria-pressed',String(button.dataset.type===selectedType)));
  }

  function renderFields(list, direction = 'input') {
    const ul = element('ul','schema-list');
    for (const field of list) {
      const li = element('li');
      const label = element('strong','',field.description ? briefLabel(field) : field.label);
      label.append(element('span','field-badge',field.required ? (direction==='output' ? t('ui.outputRequired') : t('ui.inputRequired')) : t('ui.optional')));
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
    const draft = drafts.get(capability.id) || {goal:'',materials:'',host:hosts[0].id,request:'',manual:false,componentVersion:capability.componentVersion};
    const notices=[];
    if(draft.componentVersion!==capability.componentVersion){
      const generated=draft.requestMode==='generated' && !draft.manual;
      notices.push(t(generated?'ui.generatedVersionChanged':'ui.versionChanged',{from:draft.componentVersion,to:capability.componentVersion}));
      if(generated)draft.componentVersion=capability.componentVersion;else draft.manual=true;
    }
    if(!hosts.some(item=>item.id===draft.host)){
      draft.host=hosts[0].id;
      if(draft.requestMode!=='generated')draft.manual=true;
      notices.push(t('ui.hostRemoved'));
    }
    if (trigger) lastTrigger = trigger;
    document.getElementById('detail-type').textContent = `${TYPE_NAMES[capability.componentType]} · v${capability.componentVersion}`;
    const heading = element('h2','detail-title',titleOf(capability));
    heading.id = 'detail-title';
    heading.tabIndex = -1;
    const runtime = element('div','runtime-note');
    const [runtimeTitle,runtimeDescription] = runtimeCopy(capability);
    runtime.append(element('strong','',runtimeTitle),element('p','',runtimeDescription));
    const io = element('div','detail-io');
    for (const [title,schema] of [[t('ui.needInputs'),capability.input],[t('ui.declaredOutputs'),capability.output]]) {
      const section = element('section');
      section.append(element('h3','',title));
      const mainFields = fields(schema,{capability}).filter((field)=>!COMMON_FIELDS.has(field.key));
      section.append(mainFields.length ? renderFields(mainFields,schema===capability.output?'output':'input') : element('p','detail-summary',t('ui.noFields')));
      io.append(section);
    }
    const translatedDetail = detailOf(capability);
    const originalSpecification = locale==='en' && !translatedDetail;
    const extra = element('details');
    extra.append(element('summary','',t(originalSpecification?'ui.originalContract':'ui.fullContract')));
    if(originalSpecification){
      extra.append(element('p','detail-summary',t('ui.originalNote')),
        element('p','detail-summary',capability.summary),listBlock(t('ui.useWhen'),capability.useWhen));
      for(const [name,schema] of [[t('ui.sourceInputs'),capability.input],[t('ui.sourceOutputs'),capability.output]]){
        extra.append(element('h4','',name),renderFields(fields(schema,{original:true}),schema===capability.output?'output':'input'));
      }
    }else{
      for (const [name,schema] of [[t('ui.taskContext'),capability.input],[t('ui.statusEvidence'),capability.output]]) {
        const common = fields(schema,{capability}).filter(field=>COMMON_FIELDS.has(field.key));
        if (common.length) extra.append(element('h4','',name),renderFields(common,schema===capability.output?'output':'input'));
      }
    }
    extra.append(listBlock(t('ui.doNotUseWhen'),translatedDetail?.doNotUseWhen||capability.doNotUseWhen));
    if (capability.permissions.length) extra.append(listBlock(t('ui.permissions'),capability.permissions));
    if (capability.sideEffects.length) extra.append(listBlock(t('ui.sideEffects'),capability.sideEffects));
    if (capability.humanGate.required) extra.append(listBlock(t('ui.humanGate'),translatedDetail?.humanGate||capability.humanGate.when));
    if (capability.output.description) extra.append(element('p','detail-summary',capability.output.description));

    const links = element('div','source-links');
    const entry = `${capability.componentPath}/${capability.entrypoint}`;
    links.append(fileLink(entry,t('ui.openEntry')));
    if (capability.readme && capability.readme !== entry) links.append(fileLink(capability.readme,t('ui.readmeLink')));
    capability.examples.forEach((file,index)=>links.append(fileLink(file,t('ui.exampleLink',{index:capability.examples.length>1?' '+(index+1):''}))));
    if (capability.deliveryContract) links.append(fileLink(`${capability.componentPath}/${capability.deliveryContract}`,t('ui.deliveryContractLink')));
    const validation = element('details');
    validation.append(element('summary','',t('ui.validationSummary')));
    validation.append(element('p','detail-summary',t('ui.validationNote')));
    const validations = element('div','source-links');
    capability.validation.forEach((file)=>validations.append(fileLink(`${capability.componentPath}/${file}`,file)));
    validation.append(validations);

    const requestBox = element('section','request-box');
    const requestHeading = element('div','request-heading');
    requestHeading.append(element('h3','',t('ui.requestHeading')));
    const request = element('textarea');
    request.setAttribute('aria-label',t('ui.requestAria'));
    request.spellcheck = false;
    const preparedRequest = requestForDraft(capability,draft);
    request.value = preparedRequest.request;
    draft.manual = preparedRequest.manual;
    delete draft.requestMode;
    const hostLabel=element('label','request-field',t('ui.requestHost'));
    const host=element('select'); host.id='request-host'; hostLabel.htmlFor=host.id;
    hosts.forEach(item=>{const option=element('option','',item.label);option.value=item.id;host.append(option);});
    host.value=draft.host;
    const goalLabel=element('label','request-field',t('ui.requestGoal'));
    const goal=element('input'); goal.id='request-goal'; goalLabel.htmlFor=goal.id;
    goal.type='text';goal.placeholder=t('ui.goalPlaceholder');goal.value=draft.goal;
    const materialLabel=element('label','request-field',t('ui.requestMaterials'));
    const materials=element('textarea');materials.id='request-materials';materialLabel.htmlFor=materials.id;
    materials.className='materials-input';materials.placeholder=t('ui.materialsPlaceholder');materials.value=draft.materials;
    const attachments=element('div','material-attachments');
    function renderAttachments(){
      const files=requestAttachments(capability,{goal:goal.value,materials:materials.value});
      attachments.replaceChildren();attachments.hidden=!files.length;
      if(!files.length)return;
      attachments.append(element('p','detail-summary',t(draft.manual?'ui.manualAttachmentNote':'ui.attachmentNote')));
      const actions=element('div','draft-actions');
      for(const file of files){
        const button=element('button','secondary',t('ui.downloadAttachment',{filename:file.filename,bytes:file.bytes}));
        button.type='button';
        button.addEventListener('click',()=>downloadText(file.filename,file.content,'text/plain;charset=utf-8'));
        actions.append(button);
      }
      attachments.append(actions);
    }
    const update=element('button','secondary',t('ui.regenerate')); update.type='button';
    const undo=element('button','secondary',t('ui.undo'));undo.type='button';undo.disabled=typeof draft.previousRequest!=='string';
    const editor=element('details','request-editor');editor.append(element('summary','',t('ui.editorSummary')),request,update,undo);
    const draftStatus=element('p','draft-status');draftStatus.setAttribute('role','status');
    const downloadRequest=element('button','secondary',t('ui.downloadRequest'));downloadRequest.type='button';
    downloadRequest.addEventListener('click',()=>downloadText(capability.id+'-request.txt',request.value,'text/plain;charset=utf-8'));
    function renderDraftStatus(){
      const state=drafts.status(capability.id);
      const text=state==='unavailable'?t('ui.draftUnavailable'):
        state==='unreadable'?t('ui.draftUnreadable'):
        state==='too_large'?t('ui.draftTooLarge',{bytes:draftOptions.maxBytes}):
        state==='delete_failed'?t('ui.draftDeleteFailed'):
        state==='saved'||state==='restored'?t('ui.draftSaved'):
        t('ui.draftEmpty');
      draftStatus.textContent=[text,...notices].join(' ');
      downloadRequest.hidden=!draft.manual;
    }
    function saveDraft(){draft.goal=goal.value;draft.materials=materials.value;draft.host=host.value;draft.request=request.value;drafts.set(capability.id,{...draft},{generatedRequest:buildRequest(capability,draft)});renderDraftStatus();renderAttachments();}
    function refreshRequest(){draft.goal=goal.value;draft.materials=materials.value;draft.host=host.value;if(!draft.manual){request.value=buildRequest(capability,draft);}else{copyStatus.textContent=t('ui.manualPreserved');}saveDraft();}
    goal.addEventListener('input',refreshRequest);materials.addEventListener('input',refreshRequest);host.addEventListener('change',refreshRequest);
    request.addEventListener('input',()=>{draft.manual=true;saveDraft();});
    update.addEventListener('click',()=>{const generated=buildRequest(capability,draft);if(draft.manual||request.value!==generated){draft.previousRequest=request.value;undo.disabled=false;}request.value=generated;draft.manual=false;draft.componentVersion=capability.componentVersion;notices.length=0;saveDraft();copyStatus.textContent=t('ui.regenerated');});
    undo.addEventListener('click',()=>{if(typeof draft.previousRequest!=='string')return;const current=request.value;request.value=draft.previousRequest;draft.previousRequest=current;draft.manual=true;saveDraft();copyStatus.textContent=t('ui.undone');});
    const draftActions=element('div','draft-actions');
    const download=element('button','secondary',t('ui.downloadDraft'));download.type='button';
    const restore=element('button','secondary',t('ui.importDraft'));restore.type='button';
    const clear=element('button','secondary',t('ui.clearDraft'));clear.type='button';
    const file=element('input');file.type='file';file.accept='.json,application/json';file.hidden=true;file.id='import-draft';
    download.addEventListener('click',()=>{
      saveDraft();
      try{
        const content=serializeTaskDraft(capability.id,draft,{...draftOptions,generatedRequest:buildRequest(capability,draft)});
        downloadText(capability.id+'-draft.json',content,'application/json');
      }catch(error){
        copyStatus.textContent=t(error.code==='DRAFT_TOO_LARGE'?'ui.draftTooLarge':'ui.exportFailed',{bytes:draftOptions.maxBytes});
      }
    });
    restore.addEventListener('click',()=>file.click());
    file.addEventListener('change',async()=>{
      const selected=file.files[0];if(!selected)return;
      try{
        if(selected.size>draftOptions.maxBytes)throw Object.assign(new Error('Draft too large'),{code:'DRAFT_TOO_LARGE'});
        const restored=parseTaskDraft(await selected.text(),capability.id,draftOptions);
        drafts.set(capability.id,restored);
        if(activeId===capability.id)openDetail(capability,null,false);
      }catch(error){
        const key=error instanceof SyntaxError?'ui.importSyntax':
          {DRAFT_FORMAT:'ui.importFormat',DRAFT_FIELDS:'ui.importMissing',DRAFT_HISTORY:'ui.importHistory',DRAFT_TOO_LARGE:'ui.draftTooLarge'}[error.code]||'ui.importUnknown';
        copyStatus.textContent=t('ui.importFailed',{reason:t(key,{bytes:draftOptions.maxBytes})});
      }
      finally{file.value='';}
    });
    clear.addEventListener('click',()=>{if(drafts.remove(capability.id))openDetail(capability,null,false);else renderDraftStatus();});
    draftActions.append(download,downloadRequest,restore,clear,file);
    renderDraftStatus();
    renderAttachments();
    const copyActions = element('div','copy-actions');
    const copy = element('button','primary',t('ui.copy'));
    copy.type = 'button';
    const select = element('button','secondary',t('ui.selectAll'));
    select.type = 'button';
    const copyStatus = element('p','copy-status');
    copyStatus.setAttribute('role','status');
    copyStatus.setAttribute('aria-live','polite');
    copy.addEventListener('click',async()=>{
      saveDraft();
      copy.disabled = true;copy.textContent=t('ui.copying');
      const success = await copyRequest(request,navigator.clipboard);
      copy.disabled = false;copy.textContent=t('ui.copy');
      copyStatus.textContent = (success ? t('ui.copySuccess',{host:hosts.find(item=>item.id===host.value).label}) : t('ui.copyFailure'))+
        (requestAttachments(capability,draft).length?' '+t('ui.attachBeforeSend'):'');
    });
    select.addEventListener('click',()=>{editor.open=true;request.focus();request.select();copyStatus.textContent=t('ui.selected');});
    copyActions.append(copy,select,copyStatus);
    requestBox.append(requestHeading,element('p','',t('ui.requestIntro')),hostLabel,host,goalLabel,goal,materialLabel,materials,attachments,editor,copyActions,draftActions,draftStatus);
    const note = element('p','source-note',t('ui.sourcePrefix'));
    note.append(fileLink(`${capability.componentPath}/capability.json`,`${capability.componentPath}/capability.json`));
    note.append(document.createTextNode(t('ui.sourceSuffix')));
    const useWhen=locale==='en'?translatedDetail?.useWhen||[]:capability.useWhen;
    detailContent.replaceChildren(heading,element('p','component-name',capability.id),element('p','detail-summary',summaryOf(capability)),runtime,
      ...(useWhen.length?[listBlock(t('ui.useWhen'),useWhen)]:[]),io,extra,links,validation,requestBox,note);
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

  function renderTypeFilters(){
    const filters = document.getElementById('types');
    filters.replaceChildren();
    types.forEach((type)=>{
      const button = element('button','',TYPE_NAMES[type]);
      button.type = 'button';
      button.dataset.type = type;
      button.setAttribute('aria-pressed',String(type===selectedType));
      button.append(element('span','',String(type==='all' ? data.capabilityCount : data.capabilities.filter((capability)=>capability.componentType===type).length)));
      button.addEventListener('click',()=>{selectedType=type;renderResults();});
      filters.append(button);
    });
  }
  search.addEventListener('input',renderResults);
  document.getElementById('clear-search').addEventListener('click',()=>{search.value='';renderResults();search.focus();});
  function renderSuggestions(){
    const container=document.getElementById('suggestions');
    container.replaceChildren(element('span','',t('page.suggestionsLabel')));
    for(const query of suggestions){
      const button=element('button','',query);button.type='button';button.dataset.query=query;
      button.addEventListener('click',()=>{search.value=query;selectedType='all';renderResults();search.focus();});
      container.append(button);
    }
  }
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
  function renderShowcases(){
    document.getElementById('showcase-cards').replaceChildren();
    for(const originalSample of data.showcases){
      const sample=showcaseOf(originalSample);
      const article=element('article','showcase-card');
      article.append(element('p','eyebrow',sample.exampleData?t('ui.sampleSynthetic'):t('ui.sampleInteractive')),element('h3','',sample.title),element('p','',sample.description));
      const io=element('dl','showcase-io');
      for(const [label,values] of [[t('ui.youProvide'),sample.inputs],[t('ui.takeAway'),sample.outputs]]){const row=element('div');row.append(element('dt','',label),element('dd','',values.join(t('ui.listSeparator'))));io.append(row);}
      const actions=element('div','showcase-actions');
      const preview=element('a','primary',t('ui.samplePreview'));preview.href=sampleUrl(sample.entrypoint,location.protocol);preview.target='_blank';preview.rel='noopener noreferrer';
      const use=element('button','secondary',t('ui.sampleUseOwn'));use.type='button';use.addEventListener('click',()=>openDetail(data.capabilities.find(item=>item.id===sample.capabilityId),use,true));
      actions.append(preview,use);article.append(io,actions);document.getElementById('showcase-cards').append(article);
    }
    document.getElementById('showcases').hidden=data.showcases.length===0;
  }
  applyStaticLanguage();
  renderTypeFilters();
  renderSuggestions();
  renderShowcases();
  renderResults();
  openFromHash();
})();
