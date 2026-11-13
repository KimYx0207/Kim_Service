import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { capture } from '../scripts/hook.mjs';
const event={hook_event_name:'PostToolUse',tool_name:'Write'};
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'kim-receipt-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'report.md'),'synthetic\n');const config={workspaceRoot:root,artifactPaths:['report.md'],receiptsDir:'receipts',workId:'test',revision:'1'};const configPath=path.join(root,'config.json');const save=()=>fs.writeFileSync(configPath,JSON.stringify(config));save();return{root,config,configPath,save};}
test('snapshot hashes real bytes, reuses identical content and never embeds prompt or body',(t)=>{
 const f=fixture(t);capture({...event,tool_input:{command:'upload all files',file_path:'/outside'},prompt:'SECRET PROMPT'},f.configPath);capture(event,f.configPath);
 const names=fs.readdirSync(path.join(f.root,'receipts'));assert.equal(names.length,1);const text=fs.readFileSync(path.join(f.root,'receipts',names[0]),'utf8');const receipt=JSON.parse(text);assert.equal(receipt.artifacts[0].sha256,crypto.createHash('sha256').update('synthetic\n').digest('hex'));assert.equal(receipt.qualityVerification,'not_performed');assert.ok(!text.includes('SECRET')&&!text.includes('upload all'));fs.writeFileSync(path.join(f.root,'report.md'),'changed\n');capture(event,f.configPath);assert.equal(fs.readdirSync(path.join(f.root,'receipts')).length,2);
});
test('nonmatching events perform no filesystem work',()=>{assert.deepEqual(capture({hook_event_name:'Stop',tool_name:'Write'},'/not/a/config'),{});assert.deepEqual(capture({hook_event_name:'PostToolUse',tool_name:'Bash'},'/not/a/config'),{});});
test('traversal and receipt-artifact overlap reject without writing',(t)=>{
 const f=fixture(t);f.config.artifactPaths=['../outside'];f.save();assert.throws(()=>capture(event,f.configPath),/relative_path/);assert.equal(fs.existsSync(path.join(f.root,'receipts')),false);
 f.config.artifactPaths=['receipts/inside.md'];f.save();assert.throws(()=>capture(event,f.configPath),/overlap/);
});
test('symlink artifacts cannot redirect reads outside the configured root',(t)=>{
 const f=fixture(t);try{fs.symlinkSync(path.join(f.root,'report.md'),path.join(f.root,'alias.md'));}catch(e){if(['EPERM','EACCES'].includes(e.code)){t.skip('Symlink creation is unavailable on this host');return;}throw e;}
 f.config.artifactPaths=['alias.md'];f.save();assert.throws(()=>capture(event,f.configPath),/symlink/);assert.equal(fs.existsSync(path.join(f.root,'receipts')),false);
});
test('existing conflicting receipts are preserved',(t)=>{
 const f=fixture(t);capture(event,f.configPath);const file=path.join(f.root,'receipts',fs.readdirSync(path.join(f.root,'receipts'))[0]);fs.writeFileSync(file,'other');assert.throws(()=>capture(event,f.configPath),/conflict/);assert.equal(fs.readFileSync(file,'utf8'),'other');
});
test('CLI failure stays bounded, exits zero and emits no sensitive error paths',(t)=>{
 const f=fixture(t);const executable=fileURLToPath(new URL('../scripts/hook.mjs',import.meta.url));const result=spawnSync(process.execPath,[executable,'--config',f.configPath],{input:'not json SECRET',encoding:'utf8',timeout:5000});assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),{});assert.equal(JSON.parse(result.stderr).status,'not_recorded');assert.ok(!result.stderr.includes('SECRET')&&!result.stderr.includes(f.root));
 const tooLarge=spawnSync(process.execPath,[executable,'--config',f.configPath],{input:'x'.repeat(70000),encoding:'utf8',timeout:5000});assert.equal(tooLarge.status,0);assert.equal(JSON.parse(tooLarge.stderr).code,'event_size_limit');
});

test('corrupt or unreadable policy does not make the opt-in hook block the host',(t)=>{
 const f=fixture(t);const copy=path.join(f.root,'standalone-hook');fs.cpSync(fileURLToPath(new URL('..',import.meta.url)),copy,{recursive:true});
 fs.writeFileSync(path.join(copy,'policy.json'),'broken JSON');
 const broken=spawnSync(process.execPath,[path.join(copy,'scripts/hook.mjs'),'--config',f.configPath],{input:JSON.stringify(event),encoding:'utf8',timeout:5000});assert.equal(broken.status,0);assert.deepEqual(JSON.parse(broken.stdout),{});assert.equal(JSON.parse(broken.stderr).status,'not_recorded');
 fs.unlinkSync(path.join(copy,'policy.json'));
 const missing=spawnSync(process.execPath,[path.join(copy,'scripts/hook.mjs'),'--config',f.configPath],{input:JSON.stringify(event),encoding:'utf8',timeout:5000});assert.equal(missing.status,0);assert.deepEqual(JSON.parse(missing.stdout),{});assert.equal(fs.existsSync(path.join(f.root,'receipts')),false);
});

test('CLI through a symlinked package directory records bytes and keeps policy failures nonblocking',(t)=>{
 const f=fixture(t);
 const copy=path.join(f.root,'standalone hook 中文');
 const alias=path.join(f.root,'linked hook 中文');
 fs.cpSync(fileURLToPath(new URL('..',import.meta.url)),copy,{recursive:true});
 try { fs.symlinkSync(copy,alias,process.platform==='win32'?'junction':'dir'); }
 catch(error) { if(['EPERM','EACCES'].includes(error.code)){t.skip('Directory links are unavailable on this host');return;} throw error; }
 const executable=path.join(alias,'scripts','hook.mjs');
 assert.notEqual(path.resolve(executable),fs.realpathSync(executable));
 const run=()=>spawnSync(process.execPath,[executable,'--config',f.configPath],{input:JSON.stringify(event),encoding:'utf8',timeout:5000});
 const success=run();
 assert.equal(success.status,0);
 assert.equal(success.stderr,'');
 assert.equal(JSON.parse(success.stdout).hookSpecificOutput.hookEventName,'PostToolUse');
 const receipts=fs.readdirSync(path.join(f.root,'receipts'));
 assert.equal(receipts.length,1);
 fs.writeFileSync(path.join(copy,'policy.json'),'broken JSON');
 for(const removePolicy of [false,true]){
  if(removePolicy)fs.unlinkSync(path.join(copy,'policy.json'));
  const failure=run();
  assert.equal(failure.status,0);
  assert.deepEqual(JSON.parse(failure.stdout),{});
  assert.equal(JSON.parse(failure.stderr).status,'not_recorded');
  assert.ok(!failure.stderr.includes(f.root));
  assert.deepEqual(fs.readdirSync(path.join(f.root,'receipts')),receipts);
 }
});

test('module import stays inert with another, missing or absent CLI entry',(t)=>{
 const f=fixture(t);
 const copy=path.join(f.root,'import-only-hook');
 fs.cpSync(fileURLToPath(new URL('..',import.meta.url)),copy,{recursive:true});
 fs.writeFileSync(path.join(copy,'policy.json'),'broken JSON');
 const moduleUrl=pathToFileURL(path.join(copy,'scripts','hook.mjs')).href;
 for(const entry of [f.configPath,path.join(f.root,'nonexistent-entry.mjs'),null]){
  const argv=entry?[process.execPath,entry,'--config',f.configPath]:[process.execPath];
  const source=`process.argv=${JSON.stringify(argv)}; await import(${JSON.stringify(moduleUrl)}); process.stdout.write(JSON.stringify({imported:true,stdinDataListeners:process.stdin.listenerCount('data')}));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',source],{input:JSON.stringify(event),encoding:'utf8',timeout:5000});
  assert.equal(result.status,0);
  assert.equal(result.stderr,'');
  assert.deepEqual(JSON.parse(result.stdout),{imported:true,stdinDataListeners:0});
  assert.equal(fs.existsSync(path.join(f.root,'receipts')),false);
 }
});
