import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { buildStartPageData } from './start-page.mjs';
import { createTaskBrowser } from '../src/application/task-browser/model.mjs';
import { createTaskDraftStore, parseTaskDraft, serializeTaskDraft } from '../src/data/task-drafts.mjs';
import { copyRequest } from '../src/presentation/task-browser/copy-request.mjs';

const root=path.resolve(import.meta.dirname,'..');
const data=buildStartPageData(root);
const capability=data.capabilities.find(item=>item.id==='product-architect-deliver');
const app=createTaskBrowser(data.ui);
const maxBytes=data.ui.contentPolicy.maxDraftBytes;
const byteLength=value=>Buffer.byteLength(value,'utf8');
function sourceOfSize(bytes){
  const start=' \nSOURCE_MATERIAL_START：模块甲\r\n';
  const end='\r\nSOURCE_MATERIAL_END：保留尾部空白 \n';
  const row='章节：甲乙🙂，引号"和反斜杠\\\r\n';
  const remaining=bytes-byteLength(start)-byteLength(end);
  return start+row.repeat(Math.floor(remaining/byteLength(row)))+'x'.repeat(remaining%byteLength(row))+end;
}
function automaticDraft(materials,goal='逐模块验收并保留原始材料'){
  const draft={goal,materials,host:'meta-kim',request:'',manual:false,componentVersion:capability.componentVersion};
  draft.request=app.buildRequest(capability,draft);
  return draft;
}

test('600,000-byte and 6 MiB sources round-trip intact through compact drafts and UTF-8 attachment downloads',async()=>{
  const promptSizes=[];
  for(const bytes of [600000,6*1024*1024]){
    const draft=automaticDraft(sourceOfSize(bytes));
    assert.equal(byteLength(draft.materials),bytes);
    const [attachment]=app.requestAttachments(capability,draft);
    assert.equal(attachment.content,draft.materials);
    assert.equal(attachment.bytes,bytes);
    assert.equal(await new Blob([attachment.content],{type:'text/plain;charset=utf-8'}).text(),draft.materials);
    assert.ok(draft.request.includes(attachment.filename));
    assert.ok(draft.request.includes(String(bytes)));
    assert.ok(!draft.request.includes('SOURCE_MATERIAL_START'));
    const text=serializeTaskDraft(capability.id,draft,{generatedRequest:draft.request,maxBytes});
    const wire=JSON.parse(text);
    assert.equal(wire.schemaVersion,2);
    assert.equal(wire.requestMode,'generated');
    assert.ok(!Object.hasOwn(wire.draft,'request'),'a derived request must not duplicate the materials');
    assert.equal(wire.draft.materials,draft.materials);
    assert.ok(byteLength(text)<maxBytes);
    const restored=parseTaskDraft(text,capability.id,{maxBytes});
    assert.equal(restored.materials,draft.materials);
    assert.equal(restored.goal,draft.goal);
    assert.deepEqual(app.requestForDraft(capability,restored),{request:draft.request,manual:false});
    const secondExport=serializeTaskDraft(capability.id,restored,{maxBytes});
    assert.equal(secondExport,text,'imported recipes must export without reintroducing a duplicate request');
    promptSizes.push(byteLength(draft.request));
  }
  assert.ok(Math.abs(promptSizes[1]-promptSizes[0])<=2,'only the file byte-count width may grow');
  assert.ok(Math.max(...promptSizes)<data.ui.contentPolicy.inlineMaterialBytes);
});

test('the configured UTF-8 boundaries preserve small inputs and externalize oversized goals and materials without truncation',()=>{
  const tiny=createTaskBrowser({...data.ui,contentPolicy:{...data.ui.contentPolicy,inlineGoalBytes:6,inlineMaterialBytes:6}});
  const small={goal:'甲乙',materials:'丙丁'};
  assert.deepEqual(tiny.requestAttachments(capability,small),[]);
  assert.ok(tiny.buildRequest(capability,small).includes('我的目标：甲乙'));
  assert.ok(tiny.buildRequest(capability,small).includes('丙丁'));
  const large={goal:'甲乙x',materials:'丙丁x'};
  const attachments=tiny.requestAttachments(capability,large);
  assert.deepEqual(attachments.map(file=>[file.kind,file.bytes,file.content]),[['goal',7,'甲乙x'],['materials',7,'丙丁x']]);
  assert.ok(!tiny.buildRequest(capability,large).includes('甲乙x'));
  assert.ok(!tiny.buildRequest(capability,large).includes('丙丁x'));
  for(const locale of ['zh-CN','en']){
    const localized=createTaskBrowser(data.ui,{locale});
    for(const item of data.capabilities){
      const draft={goal:'G'.repeat(300000),materials:'M'.repeat(600000)};
      const request=localized.buildRequest(item,draft);
      assert.ok(request.includes(item.id+'-goal.txt'));
      assert.ok(request.includes(item.id+'-materials.txt'));
      assert.ok(!request.includes('G'.repeat(100)));
      assert.ok(!request.includes('M'.repeat(100)));
      assert.ok(byteLength(request)<data.ui.contentPolicy.inlineMaterialBytes,item.id+' unexpectedly expanded large source text');
    }
  }
});

test('authored text, intentionally empty undo, legacy drafts and language changes remain lossless',()=>{
  const automatic=automaticDraft(sourceOfSize(600000));
  for(const manual of [false,true]){
    const authored={...automatic,manual,request:'保留我的指定措辞🙂\n',previousRequest:''};
    const text=serializeTaskDraft(capability.id,authored,{generatedRequest:automatic.request,maxBytes});
    assert.equal(JSON.parse(text).requestMode,'authored');
    assert.deepEqual(parseTaskDraft(text,capability.id,{maxBytes}),authored);
    const legacy=JSON.stringify({schemaVersion:1,capabilityId:capability.id,draft:authored});
    assert.deepEqual(parseTaskDraft(legacy,capability.id,{maxBytes}),authored);
  }
  const restored=parseTaskDraft(serializeTaskDraft(capability.id,automatic,{generatedRequest:automatic.request,maxBytes}),capability.id,{maxBytes});
  const english=createTaskBrowser(data.ui,{locale:'en'});
  assert.deepEqual(english.requestForDraft(capability,restored),{request:english.buildRequest(capability,restored),manual:false});
  assert.equal(restored.materials,automatic.materials);
  const invalid=JSON.parse(serializeTaskDraft(capability.id,automatic,{generatedRequest:automatic.request,maxBytes}));
  invalid.draft.request='A generated recipe must not hide authored text';
  assert.throws(()=>parseTaskDraft(JSON.stringify(invalid),capability.id,{maxBytes}),{code:'DRAFT_HISTORY'});
});

test('export and import share the same byte boundary; oversized saves preserve live text and the previous durable record',()=>{
  const small=automaticDraft('小材料');
  const options={generatedRequest:small.request};
  const exactBytes=byteLength(serializeTaskDraft(capability.id,small,options));
  const text=serializeTaskDraft(capability.id,small,{...options,maxBytes:exactBytes});
  assert.equal(parseTaskDraft(text,capability.id,{maxBytes:exactBytes}).materials,small.materials);
  assert.throws(()=>serializeTaskDraft(capability.id,small,{...options,maxBytes:exactBytes-1}),{code:'DRAFT_TOO_LARGE'});
  assert.throws(()=>parseTaskDraft(text,capability.id,{maxBytes:exactBytes-1}),{code:'DRAFT_TOO_LARGE'});
  const records=new Map();
  const storage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value),removeItem:key=>records.delete(key)};
  const store=createTaskDraftStore({getStorage:()=>storage,keyPrefix:'large-test',maxBytes});
  assert.equal(store.set(capability.id,small,{generatedRequest:small.request}),true);
  const before=[...records.values()][0];
  const huge=automaticDraft('X'.repeat(maxBytes+1));
  assert.equal(store.set(capability.id,huge,{generatedRequest:huge.request}),false);
  assert.equal(store.status(capability.id),'too_large');
  assert.equal(store.get(capability.id).materials,huge.materials);
  assert.equal(app.requestForDraft(capability,store.get(capability.id)).request,huge.request);
  assert.equal([...records.values()][0],before);
  assert.throws(()=>serializeTaskDraft(capability.id,store.get(capability.id),{maxBytes}),{code:'DRAFT_TOO_LARGE'});
});

// A small DOM adapter executes the actual page event handlers without a browser
// engine. These checks cover data flow and downloads, not rendering or layout.
function pageFixture({storageRecords=new Map()}={}){
  const ids=new Map(),downloads=[],copied=[],urls=new Map();
  let document;
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.events=new Map();this.value='';this.className='';this.ownText='';}
    set id(value){this._id=value;ids.set(value,this);} get id(){return this._id;}
    set textContent(value){this.ownText=String(value);this.children=[];} get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
    append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
    replaceChildren(...children){this.children=[];this.ownText='';this.append(...children);}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(name,callback){const list=this.events.get(name)||[];list.push(callback);this.events.set(name,list);}
    async dispatch(name){for(const callback of this.events.get(name)||[])await callback({target:this});}
    async click(){if(this.tagName==='A'&&this.download)downloads.push({filename:this.download,blob:urls.get(this.href)});await this.dispatch('click');}
    matches(selector){return selector.startsWith('.')?this.className.split(' ').includes(selector.slice(1)):selector==='[data-capability]'?this.dataset.capability!==undefined:this.tagName===selector.toUpperCase();}
    querySelectorAll(selector){return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
    closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector);}
    focus(){document.activeElement=this;} select(){} showModal(){this.open=true;} close(){this.open=false;}
  }
  const staticIds=['agent-group','agent-role','capability-data','inventory','search','cards','detail','detail-content','detail-type','types','empty','clear-search','result-count','suggestions','reset','close-detail','showcase-cards','showcases'];
  for(const id of staticIds){const node=new Element('div');node.id=id;}
  ids.get('capability-data').textContent=JSON.stringify(data);
  ids.get('detail').append(ids.get('detail-content'));
  const picker=new Element('select');picker.className='language-select';
  const meta=new Element('meta');
  document={documentElement:new Element('html'),getElementById:id=>ids.get(id),createElement:tag=>new Element(tag),
    createTextNode:text=>{const node=new Element('text');node.textContent=text;return node;},addEventListener(){},
    querySelector:()=>meta,querySelectorAll:selector=>selector==='.language-select'?[picker]:selector==='#types button'?ids.get('types').querySelectorAll('button'):[]};
  const storage={getItem:key=>storageRecords.get(key)??null,setItem:(key,value)=>storageRecords.set(key,value),removeItem:key=>storageRecords.delete(key)};
  class PageUrl extends URL{
    static createObjectURL(blob){const url='blob:test-'+urls.size;urls.set(url,blob);return url;}
    static revokeObjectURL(url){urls.delete(url);}
  }
  const location=new URL('file:///Kim_Service/docs/start.html#capability='+capability.id);
  const context=vm.createContext({createTaskBrowser,createTaskDraftStore,parseTaskDraft,serializeTaskDraft,copyRequest,
    document,location,URL:PageUrl,Blob,TextEncoder,navigator:{clipboard:{async writeText(text){copied.push(text);}}},
    window:{localStorage:storage,addEventListener(){}},history:{replaceState(){}},setTimeout:callback=>{callback();return 0;}});
  vm.runInContext(fs.readFileSync(path.join(root,'src/presentation/task-browser/page.js'),'utf8'),context);
  const content=()=>ids.get('detail-content');
  const button=label=>content().querySelectorAll('button').find(node=>node.textContent===label);
  const request=()=>content().querySelectorAll('textarea').find(node=>node.attributes['aria-label']);
  return {ids,downloads,copied,picker,storageRecords,button,request,content};
}

test('actual page input, download, copy, language change and import events carry complete large materials',async()=>{
  const page=pageFixture();
  const source=sourceOfSize(600000);
  page.ids.get('request-materials').value=source;
  await page.ids.get('request-materials').dispatch('input');
  assert.ok(byteLength(page.request().value)<data.ui.contentPolicy.inlineMaterialBytes);
  const attachmentButton=page.content().querySelectorAll('button').find(node=>node.textContent.includes(capability.id+'-materials.txt'));
  await attachmentButton.click();
  assert.equal(await page.downloads[0].blob.text(),source);
  await page.button(app.text('ui.copy')).click();
  assert.equal(page.copied[0],page.request().value);
  assert.ok(page.content().querySelectorAll('p').some(node=>node.textContent.includes(app.text('ui.attachBeforeSend'))));
  await page.button(app.text('ui.downloadDraft')).click();
  const exported=page.downloads[1].blob;
  assert.ok(exported.size<maxBytes);
  assert.equal(JSON.parse(await exported.text()).requestMode,'generated');
  page.picker.value='en';await page.picker.dispatch('change');
  assert.equal(page.ids.get('request-materials').value,source);
  assert.ok(page.request().value.includes('File: '+capability.id+'-materials.txt'));
  const english=createTaskBrowser(data.ui,{locale:'en'});
  await page.button(english.text('ui.clearDraft')).click();
  assert.equal(page.ids.get('request-materials').value,'');
  page.ids.get('import-draft').files=[exported];
  await page.ids.get('import-draft').dispatch('change');
  assert.equal(page.ids.get('request-materials').value,source);
  assert.ok(page.request().value.includes('File: '+capability.id+'-materials.txt'));
  const refreshed=pageFixture({storageRecords:page.storageRecords});
  assert.equal(refreshed.ids.get('request-materials').value,source);
  assert.ok(refreshed.request().value.includes('文件：'+capability.id+'-materials.txt'));
});

test('an authored request above the draft limit still has a complete text download in the actual page',async()=>{
  const page=pageFixture();
  const authored='AUTHORED_START\n'+'X'.repeat(maxBytes)+'\nAUTHORED_END';
  page.request().value=authored;
  await page.request().dispatch('input');
  const download=page.button(app.text('ui.downloadRequest'));
  assert.equal(download.hidden,false);
  await page.button(app.text('ui.downloadDraft')).click();
  assert.equal(page.downloads.length,0,'do not offer a JSON export that cannot be imported');
  assert.equal(page.request().value,authored);
  assert.ok(page.content().querySelectorAll('p').some(node=>node.textContent.includes(String(maxBytes))));
  await download.click();
  assert.equal(page.downloads[0].filename,capability.id+'-request.txt');
  assert.equal(await page.downloads[0].blob.text(),authored);
  page.picker.value='en';await page.picker.dispatch('change');
  assert.equal(page.request().value,authored,'a storage failure must not lose authored text on language change');
});

test('actual classification events preserve selected role across language changes and clear it across package types',async()=>{
  const page=pageFixture();
  const group=page.ids.get('agent-group'),role=page.ids.get('agent-role');
  assert.equal(role.disabled,true);
  group.value='financial-services';await group.dispatch('change');
  role.value='insurance-claims-analyst';await role.dispatch('change');
  assert.deepEqual(page.ids.get('cards').children.map(card=>card.dataset.capability),['insurance-claims-analyst-deliver']);
  page.picker.value='en';await page.picker.dispatch('change');
  assert.equal(group.value,'financial-services');assert.equal(role.value,'insurance-claims-analyst');
  assert.match(page.ids.get('cards').textContent,/Insurance claims analyst/);
  group.value='software';await group.dispatch('change');
  assert.equal(role.value,'');assert.equal(role.disabled,false);
  assert.ok(page.ids.get('cards').children.every(card=>!card.dataset.capability.startsWith('insurance-')));
  await page.ids.get('types').children.find(button=>button.dataset.type==='skill').click();
  assert.equal(group.value,'');assert.equal(role.disabled,true);
  assert.ok(page.ids.get('cards').children.length>0);
  await page.ids.get('reset').click();
  assert.equal(page.ids.get('cards').children.length,data.capabilityCount);
});
