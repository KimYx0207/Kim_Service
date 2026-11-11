import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildCapabilityIndex } from './capability-catalog.mjs';
import { buildStartPageData, renderStartPage, serializePageData } from './start-page.mjs';

import { createTaskBrowser } from '../src/application/task-browser/model.mjs';
import { copyRequest } from '../src/presentation/task-browser/copy-request.mjs';
const root = path.resolve(import.meta.dirname,'..');
const client = fs.readFileSync(path.join(root,'src/presentation/task-browser/page.js'),'utf8');
const data = buildStartPageData(root);
const { filterCapabilities,buildRequest,fields } = createTaskBrowser(data.ui);

test('the offline page retains every capability, schema and real source link from the canonical builder',()=>{
  const canonical=buildCapabilityIndex(root);
  assert.equal(data.componentCount,canonical.componentCount);
  assert.equal(data.capabilityCount,canonical.capabilityCount);
  assert.deepEqual(data.capabilities.map(({id})=>id),canonical.capabilities.map(({id})=>id));
  for(const source of canonical.capabilities){
    const presented=data.capabilities.find(({id})=>id===source.id);
    for(const key of Object.keys(source))assert.deepEqual(presented[key],source[key],`${source.id}.${key}`);
    for(const relative of [presented.readme,...presented.examples,`${presented.componentPath}/${presented.entrypoint}`].filter(Boolean)){
      assert.ok(fs.lstatSync(path.join(root,relative)).isFile(),relative);
      assert.ok(!relative.includes('..'),relative);
    }
  }
  const html=renderStartPage(root);
  assert.deepEqual(JSON.parse(html.match(/<script id="capability-data" type="application\/json">([\s\S]*?)<\/script>/)[1]),data);
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|@import|\bfetch\s*\(/i);
});

test('every capability is discoverable by its exact id; Chinese result terms reach English contracts',()=>{
  for(const capability of data.capabilities){
    assert.ok(filterCapabilities(data.capabilities,capability.id).some(({id})=>id===capability.id),capability.id);
  }
  for(const [query,id] of [
    ['表情包','kim-sticker-pack-produce'],['我想做表情包','kim-sticker-pack-produce'],
    ['产品设计','product-architect-deliver'],['视频','media-production-engineer-deliver'],
    ['简历','resume-editor-assist'],['小红书','xiaohongshu-create-visual-package'],
    ['店铺','store-performance-analyst-assist'],['决策','kim-decision-analysis']
  ])assert.ok(filterCapabilities(data.capabilities,query).some((item)=>item.id===id),query);
  assert.equal(filterCapabilities(data.capabilities,'不存在的任务-zzzz').length,0);
  const skills=filterCapabilities(data.capabilities,'','skill');
  assert.ok(skills.length>0);
  assert.ok(skills.every((item)=>item.componentType==='skill'));
  assert.equal(filterCapabilities(data.capabilities,'简历','tool').length,0);
});

test('English search aliases match words and hyphenated ids, not unrelated word fragments',()=>{
  for(const [query,excluded] of [
    ['视频',['assistant-display-contract','prompt-enhancement']],
    ['店铺',['apply-skill-rollback','assistant-display-contract']],
    ['封面',['local-security-scan','skill-search']]
  ]){
    const ids=filterCapabilities(data.capabilities,query).map(({id})=>id);
    for(const id of excluded)assert.ok(!ids.includes(id),`${query} unexpectedly matched ${id}`);
  }
  assert.ok(filterCapabilities(data.capabilities,'product-architect').some(({id})=>id==='product-architect-deliver'));
  assert.ok(filterCapabilities(data.capabilities,'sticker').some(({id})=>id==='kim-sticker-pack-produce'));
  assert.ok(filterCapabilities(data.capabilities,'cover').some(({id})=>id==='headline-cover-optimizer-optimize'));
});

test('copied requests include the exact selected contract, required materials and honest execution boundary',()=>{
  for(const capability of data.capabilities){
    const request=buildRequest(capability);
    assert.ok(request.includes(`${capability.componentPath}/${capability.entrypoint}`));
    assert.ok(request.includes(capability.id));
    assert.ok(request.includes('以 Kim_Service 仓库根目录为基准'));
    assert.ok(request.includes('不要猜测已经安装'));
    assert.ok(request.includes('缺少工具或证据时明确标记未执行'));
    for(const key of capability.input.required)assert.ok(request.includes(key),`${capability.id}: ${key}`);
    for(const key of capability.output.required)assert.ok(request.includes(key),`${capability.id}: ${key}`);
  }
  const source=data.capabilities.find(({id})=>id==='media-production-engineer-deliver');
  assert.ok(fields(source.output).some(({key})=>key==='mediaArtifacts'));
  assert.ok(!buildRequest(source).includes('立即运行'));
});

test('copy uses the currently edited request and selects text when browser clipboard is denied or absent',async()=>{
  let copied,focused=0,selected=0;
  const editor={open:false};
  const textarea={value:'用户已经补好的真实材料',closest(){return editor},focus(){focused++},select(){selected++}};
  assert.equal(await copyRequest(textarea,{async writeText(text){copied=text}}),true);
  assert.equal(copied,textarea.value);
  assert.equal(selected,0);
  assert.equal(await copyRequest(textarea,{async writeText(){throw new Error('denied')}}),false);
  assert.equal(await copyRequest(textarea,undefined),false);
  assert.equal(focused,2);
  assert.equal(selected,2);
  assert.equal(editor.open,true);
});

test('goals, supplied materials and host selection reach the actual copied request',()=>{
  const capability=data.capabilities.find(item=>item.id==='financial-modeler-deliver');
  const request=buildRequest(capability,{goal:'比较三种回款情景',materials:'输入文件：经营假设.json；只计算12个月',host:'meta-kim'});
  assert.ok(request.startsWith('/meta-theory '));
  assert.ok(request.includes('我的目标：比较三种回款情景'));
  assert.ok(request.includes('输入文件：经营假设.json；只计算12个月'));
  assert.ok(!request.includes('我的目标：【填写'));
  assert.ok(buildRequest(capability,{host:'codex'}).startsWith('请在'));
});

test('published source links resolve to the configured repository while local samples remain portable',()=>{
  const app=createTaskBrowser({...data.ui,repository:{...data.ui.repository,ref:'tested-commit'}});
  assert.equal(app.sourceUrl('agents/design-system-designer/AGENT.md'),'https://github.com/KimYx0207/Kim_Service/blob/tested-commit/agents/design-system-designer/AGENT.md');
  assert.equal(app.sourceUrl('agents/x/AGENT.md','file:'),'../agents/x/AGENT.md');
  assert.equal(app.sampleUrl('agents/x/examples/index.html'),'./agents/x/examples/index.html');
  assert.equal(app.sampleUrl('agents/x/examples/index.html','file:'),'../agents/x/examples/index.html');
});

test('showcases bind an existing capability to a real editable entrypoint without changing evaluation claims',()=>{
  assert.equal(data.showcases.length,2);
  for(const sample of data.showcases){
    assert.ok(data.capabilities.some(item=>item.id===sample.capabilityId));
    assert.equal(sample.exampleData,true);
    assert.ok(fs.lstatSync(path.join(root,sample.entrypoint)).isFile());
  }
  assert.doesNotMatch(fs.readFileSync(path.join(root,'src/application/task-browser/model.mjs'),'utf8'),/node:fs|document\.|localStorage|readFile/);
});

test('contract strings cannot escape the embedded JSON or become HTML',()=>{
  const malicious={summary:'</script><img src=x onerror=alert(1)>&\u2028\u2029'};
  const json=serializePageData(malicious);
  assert.ok(!json.includes('<'));
  assert.ok(!json.includes('&'));
  assert.deepEqual(JSON.parse(json),malicious);
  // User-controlled contract fields are placed via textContent, never innerHTML.
  assert.doesNotMatch(client,/\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(|new Function/);
});

test('check detects changed source contracts and changed generated HTML without overwriting either',()=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'kim-start-page-'));
  try{
    const directory=path.join(temporary,'skills','fixture-skill');
    fs.mkdirSync(directory,{recursive:true});
    fs.writeFileSync(path.join(directory,'SKILL.md'),'# Fixture\n');
    fs.writeFileSync(path.join(directory,'test.mjs'),'// fixture\n');
    const contract={schemaVersion:1,id:'fixture-skill',componentType:'skill',componentVersion:'0.1.0',entrypoint:'SKILL.md',capabilities:[{
      id:'fixture-task',summary:'原始任务',useWhen:['给定材料'],doNotUseWhen:['无材料'],
      input:{type:'object',required:['request']},output:{type:'object',required:['content']},permissions:[],sideEffects:[],humanGate:{required:false,when:[]},validation:['test.mjs']
    }]};
    const contractPath=path.join(directory,'capability.json');
    fs.writeFileSync(contractPath,JSON.stringify(contract));
    const run=(command)=>spawnSync(process.execPath,[path.join(root,'scripts/start-page.mjs'),command,'--root',temporary],{encoding:'utf8',timeout:15000});
    assert.equal(run('build').status,0);
    assert.equal(run('check').status,0);
    const output=path.join(temporary,'docs','start.html');
    const original=fs.readFileSync(output,'utf8');
    contract.capabilities[0].summary='修改后的任务';
    fs.writeFileSync(contractPath,JSON.stringify(contract));
    const changedContract=run('check');
    assert.equal(changedContract.status,1);
    assert.match(changedContract.stderr,/stale/);
    assert.equal(fs.readFileSync(output,'utf8'),original);
    assert.equal(run('build').status,0);
    fs.appendFileSync(output,'<!-- edited -->');
    const edited=fs.readFileSync(output,'utf8');
    assert.equal(run('check').status,1);
    assert.equal(fs.readFileSync(output,'utf8'),edited);
  }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
