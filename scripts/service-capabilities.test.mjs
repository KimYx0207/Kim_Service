import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {exportServiceCapabilities} from '../src/data/service-helper-catalog.mjs';
import {buildCapabilityIndex} from '../src/data/capability-catalog.mjs';
import {checkComponentMethod} from './check-agent-pack.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const added=['evidence-pack','agent-evaluation','feedback-to-requirements','customer-case-operations','visual-explainer'];
test('machine helper view is derived from the canonical catalog and keeps old capabilities',()=>{
 const canonical=buildCapabilityIndex(root);const exported=exportServiceCapabilities(root);
 assert.equal(exported.protocol,'kim-service-capabilities-v1');assert.equal(exported.capabilityCount,canonical.capabilityCount);
 assert.deepEqual(exported.capabilities.map(c=>c.id),canonical.capabilities.map(c=>c.id));
 for(const id of added){const capability=exported.capabilities.find(c=>c.componentId===id);assert.equal(capability.helper.protocol,'kim-service-helper-v1');assert.equal(capability.helper.invocation.shell,false);assert.equal(capability.helper.authority.modelCalls,false);assert.equal(capability.helper.componentContentSha256,capability.componentContentSha256);assert.deepEqual(checkComponentMethod(path.join(root,capability.componentPath)),[]);}
 assert.ok(exported.capabilities.some(c=>c.componentId==='delivery-verifier'));assert.ok(exported.capabilities.some(c=>c.componentId==='product-architect'));
});
test('all generated runtimes and executable schemas match their one editable source',()=>{
 const result=spawnSync(process.execPath,['scripts/build-service-helpers.mjs','check'],{cwd:root,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
});
test('public CLI emits one complete machine catalog and rejects unexpected arguments',()=>{
 const good=spawnSync(process.execPath,['scripts/service-capabilities.mjs','export'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).capabilityCount,buildCapabilityIndex(root).capabilityCount);
 const bad=spawnSync(process.execPath,['scripts/service-capabilities.mjs','export','--run-shell'],{cwd:root,encoding:'utf8'});assert.notEqual(bad.status,0);
});
test('each package CLI works after an independent copy outside the repository',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kim-service-helpers-'));try{
  for(const id of added){
   const directory=path.join(temp,id);fs.cpSync(path.join(root,'skills',id),directory,{recursive:true});
   if(id==='evidence-pack'){
    const result=spawnSync(process.execPath,[path.join(directory,'scripts/example.mjs'),path.join(temp,'evidence-work')],{encoding:'utf8',maxBuffer:1024*1024});assert.equal(result.status,0,result.stderr);assert.ok(JSON.parse(result.stdout).result.packRef.sha256);
   }else{
    const result=spawnSync(process.execPath,[path.join(directory,'scripts/run.mjs'),'--input-json','-'],{input:fs.readFileSync(path.join(directory,'examples/input.json')),encoding:'utf8',maxBuffer:4*1024*1024});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).capabilityId,id+'-deliver');
   }
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('CLI UTF-8, JSON shape, oversize and nesting failures produce no successful receipt',()=>{
 const cli=path.join(root,'skills/visual-explainer/scripts/run.mjs');
 for(const input of [Buffer.from([0xff]),'{}','{"x":"'+ 'x'.repeat(600000)+'"}',JSON.stringify({x:Array.from({length:1},()=>({deep:'ignored'}))})]){
  const result=spawnSync(process.execPath,[cli,'--input-json','-'],{input,encoding:'utf8',maxBuffer:1024*1024});assert.notEqual(result.status,0);assert.equal(result.stdout,'');assert.equal(JSON.parse(result.stderr).status,'invalid_input');
 }
});
