/* No fetch, dependencies, analytics, model calls, installation or execution. */
(function () {
  'use strict';
  const TYPE_NAMES = { all: '全部', agent: '专业方法包', skill: '技能包', tool: '工具', hook: 'Hook', app: '应用包' };
  // Search vocabulary only. Package facts and availability always come from contracts.
  const SYNONYMS = [
    ['小红书', 'xiaohongshu', 'rednote'], ['表情包', '贴纸', 'sticker'],
    ['产品设计', '产品架构', 'product-architect'],
    ['动效', '动画', 'motion', 'animation'], ['视频', '音视频', 'media', 'video'],
    ['设计', 'design', 'designer'], ['前端', 'frontend'], ['开发', 'engineer', '代码', 'code'],
    ['简历', 'resume'], ['面试', 'interview'], ['店铺', 'store'], ['成本', 'cost', 'pricing'],
    ['供应商', 'supplier'], ['周报', 'workplace'], ['封面', 'cover'], ['选题', 'topic'],
    ['提示词', 'prompt'], ['记忆', 'memory'], ['搜索', 'search', 'discover'],
    ['安装', 'install'], ['回滚', 'rollback'], ['安全', 'security', 'semgrep'],
    ['技能', 'skill'], ['学习', 'tutor', 'lesson', '练习'], ['副业', 'side-business'],
    ['决策', 'decision'], ['团队', 'teams'], ['交付', 'delivery'], ['量化', 'quantitative']
  ];
  const FIELD_NAMES = {
    task:'任务', prompt:'请求内容', request:'具体需求', brief:'创作需求', topic:'主题', goal:'目标',
    scope:'范围', source:'来源', skill:'技能', agent:'使用环境', approvedCommand:'已获准命令', apply:'是否执行',
    rollback:'回滚范围', mode:'模式', target:'目标位置', targetHash:'目标文件哈希', ok:'操作结果', action:'操作说明',
    content:'交付内容', operations:'操作清单', hostResult:'宿主结果', command:'命令', arguments:'参数',
    artifacts:'交付文件', limitations:'局限与缺项', stage:'当前阶段', approvalState:'确认状态',
    evidence:'依据', nextAction:'下一步', passSignal:'检查标准', decisionQuestion:'待决定的问题', continuationNeed:'继续条件',
    status:'交付状态', artifactRefs:'产物与证据引用', criterionResults:'逐项检查结果', missingCapabilities:'缺少的工具或能力',
    failures:'失败记录', stopReason:'结束原因', handoff:'交接说明', nativeRuntimeVerified:'原生宿主验证状态',
    acceptanceCriteria:'验收条件', handoffContext:'任务上下文与授权范围', runtimeBindings:'宿主工具绑定',
    titleCandidates:'标题候选', recommended:'推荐组合', coverOptions:'封面方案', consistencyCheck:'一致性检查',
    diagnosis:'账号诊断', topics:'选题', schedule:'排期', reviewRule:'复盘规则', hooks:'开头方案', ending:'结尾', claimsCheck:'说法核对',
    permissions:'所需权限', summary:'摘要', warnings:'提醒', result:'结果', report:'报告', sourceFrames:'已有动作帧',
    characterReference:'角色参考', rightsRecord:'素材授权记录', outputSpec:'输出要求', workflow:'现有工作流',
    assets:'已有素材', constraints:'限制条件', currentSystem:'当前情况', journey:'用户路径', reference:'参考资料'
  };
  const COMMON_FIELDS = new Set(['status','artifactRefs','criterionResults','missingCapabilities','failures','stopReason','handoff','nativeRuntimeVerified','acceptanceCriteria','handoffContext','runtimeBindings']);

  function fields(schema) {
    const required = new Set(schema.required || []);
    const names = [...required, ...Object.keys(schema.properties || {}).filter((key) => !required.has(key))];
    return names.map((key) => ({ key, required: required.has(key), description: schema.properties?.[key]?.description || '', label: FIELD_NAMES[key] || key }));
  }

  function briefLabel(field) {
    if (field.description) {
      const lead = field.description.split(/[：:；;。]/)[0];
      return lead.length <= 36 ? lead : lead.slice(0, 34) + '…';
    }
    return field.label;
  }

  function titleOf(capability) {
    const summary = capability.summary.trim();
    const colon = summary.search(/[：（]/);
    if (colon > 3 && colon < 22) return summary.slice(0, colon);
    const sentence = summary.split(/[。\n]/)[0];
    return sentence.length > 56 ? sentence.slice(0, 54) + '…' : sentence;
  }

  function searchableText(capability) {
    return [capability.id, capability.componentId, capability.summary, ...(capability.useWhen || []),
      ...fields(capability.input).flatMap((field) => [field.key, field.label, field.description]),
      ...fields(capability.output).flatMap((field) => [field.key, field.label, field.description])]
      .join(' ').normalize('NFKC').toLowerCase();
  }

  function queryTerms(query) {
    return query.normalize('NFKC').toLowerCase().trim().split(/[\s，,、；;]+/u).filter(Boolean).map((token) => {
      const exact = SYNONYMS.find((group) => group.includes(token));
      if (exact) return exact;
      // Permit common short requests (e.g. “我想做表情包”), without claiming semantic search.
      const stripped = token.replace(/^(?:我想|我需要|我要|帮我|请帮我|请)?(?:做一个|做一套|做|写|改|找)?/u, '');
      const group = SYNONYMS.find((items) => items.includes(stripped));
      return group || [token];
    });
  }

  function filterCapabilities(capabilities, query = '', type = 'all') {
    const terms = queryTerms(query);
    return capabilities.filter((capability) => {
      if (type !== 'all' && capability.componentType !== type) return false;
      const text = searchableText(capability);
      return terms.every((alternatives) => alternatives.some((word) => {
        if (/^[a-z0-9][a-z0-9 -]*$/u.test(word)) {
          // English aliases are words, not substrings: media != immediate,
          // store != restore, cover != discover. Hyphenated IDs remain searchable.
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'u').test(text);
        }
        return text.includes(word);
      }));
    });
  }

  function buildRequest(capability) {
    const entry = `${capability.componentPath}/${capability.entrypoint}`;
    const inputs = fields(capability.input).filter((field) => field.required);
    const outputs = fields(capability.output);
    const lines = [
      '请在已克隆的 Kim_Service 仓库上下文中处理以下任务。下面的相对路径都以 Kim_Service 仓库根目录为基准；若当前目录不是仓库根目录，请先定位仓库，不要猜测已经安装。',
      '', `先阅读：${entry}`, ...(capability.readme && capability.readme !== entry ? [`使用说明：${capability.readme}`] : []),
      `目标能力：${capability.id}`, `包版本：${capability.componentVersion}`, '',
      `这项能力的声明：${capability.summary}`, '', '我的目标：【填写这次要完成的事】', '', '我提供的材料：',
      ...inputs.map((field) => `- ${field.description || field.label}（${field.key}）：【填写；不清楚的标为待确认】`),
      ...(inputs.length ? [] : ['- 【填写任务材料；按入口说明补充】']),
      '', '请按入口要求与本次材料交付：',
      ...(outputs.length ? outputs.map((field) => `- ${field.description || field.label}（${field.key}${field.required ? '，合同要求' : '，按需提供'}）`) : ['- 按入口说明交付，包合同没有逐项列出输出字段。']),
      '', '先核对本次已具备的工具、材料和授权；只补问阻塞任务的缺项。普通已授权工作继续执行。',
      '缺少工具或证据时明确标记未执行和剩余工作。不要把读取入口、示例或静态检查写成已安装、已原生加载、已实际执行或已通过最终验收。',
      '需要新增安装、外部发布、付费或扩大访问范围时，按包内规则和本次授权处理。'
    ];
    return lines.join('\n');
  }

  async function copyRequest(textarea, clipboard) {
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') throw new Error('Clipboard unavailable');
      await clipboard.writeText(textarea.value);
      return true;
    } catch {
      textarea.focus();
      textarea.select();
      return false;
    }
  }

  // The same pure functions run in browser and targeted Node regression tests.
  globalThis.KimStart = Object.freeze({ filterCapabilities, buildRequest, fields, copyRequest, titleOf });
  if (typeof document === 'undefined') return;

  const data = JSON.parse(document.getElementById('capability-data').textContent);
  const search = document.getElementById('search');
  const cards = document.getElementById('cards');
  const dialog = document.getElementById('detail');
  const detailContent = document.getElementById('detail-content');
  let selectedType = 'all';
  let lastTrigger = null;
  let activeId = null;
  const types = ['all', ...['agent','skill','tool','hook','app'].filter((type) => data.capabilities.some((capability) => capability.componentType === type))];
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
    link.href = '../' + relative.split('/').map(encodeURIComponent).join('/');
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
    if (trigger) lastTrigger = trigger;
    document.getElementById('detail-type').textContent = `${TYPE_NAMES[capability.componentType]} · v${capability.componentVersion}`;
    const heading = element('h2','detail-title',titleOf(capability));
    heading.id = 'detail-title';
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
    request.value = buildRequest(capability);
    const copyActions = element('div','copy-actions');
    const copy = element('button','primary','复制请求');
    copy.type = 'button';
    const select = element('button','secondary','全选文本');
    select.type = 'button';
    const copyStatus = element('p','copy-status');
    copyStatus.setAttribute('role','status');
    copyStatus.setAttribute('aria-live','polite');
    copy.addEventListener('click',async()=>{
      copy.disabled = true;
      const success = await copyRequest(request,navigator.clipboard);
      copy.disabled = false;
      copyStatus.textContent = success ? '已复制。补齐材料后，交给已克隆仓库的 Agent。' : '浏览器未允许复制，已选中文本。请按 Ctrl/Cmd+C 或长按复制。';
    });
    select.addEventListener('click',()=>{request.focus();request.select();copyStatus.textContent='已全选。请按 Ctrl/Cmd+C 或长按复制。';});
    copyActions.append(copy,select,copyStatus);
    requestBox.append(requestHeading,element('p','','相对路径以 Kim_Service 仓库根目录为准。把占位内容替换成你的材料；复制本身不会安装或执行能力。'),request,copyActions);
    const note = element('p','source-note','声明来源：');
    note.append(fileLink(`${capability.componentPath}/capability.json`,`${capability.componentPath}/capability.json`));
    note.append(document.createTextNode('。包内示例可能是合成或未运行示例，请以原文件标注为准。'));
    detailContent.replaceChildren(heading,element('p','component-name',capability.id),element('p','detail-summary',capability.summary),runtime,listBlock('适用情况',capability.useWhen),io,extra,links,validation,requestBox,note);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
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
  document.querySelectorAll('[data-query]').forEach((button)=>button.addEventListener('click',()=>{search.value=button.dataset.query;selectedType='all';renderResults();search.focus();}));
  document.getElementById('reset').addEventListener('click',()=>{search.value='';selectedType='all';renderResults();search.focus();});
  document.getElementById('close-detail').addEventListener('click',closeDetail);
  dialog.addEventListener('click',(event)=>{if(event.target===dialog){const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeDetail();}});
  dialog.addEventListener('close',()=>{
    activeId=null;
    if(location.hash.startsWith('#capability=')){try{history.replaceState(null,'','#catalog');}catch{/* local history may be restricted */}}
    if(lastTrigger?.isConnected)lastTrigger.focus();
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
  renderResults();
  openFromHash();
})();
