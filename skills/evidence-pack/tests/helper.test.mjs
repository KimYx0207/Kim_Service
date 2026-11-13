import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {run} from '../scripts/run.mjs';
import {run as files} from '../scripts/files.mjs';
import {hash,bytes} from '../scripts/runtime.mjs';
const context={organizationId:'company',workId:'work',revision:'r1'};
const build=text=>({context,operation:'build',sources:[{id:'source',title:'材料',revision:'v1',text}]});
test('Unicode, repeated headings, CRLF and NUL round-trip with bounded paginated context',()=>{
 const text='# 同名\r\n'+('中文😀\0\r\n'.repeat(90000))+'\n# 同名\n尾部';const result=run(build(text)).result;
 assert.equal(result.pack.chunks.map(c=>c.text).join(''),text);assert.equal(result.pack.sources[0].sha256,hash(text));
 assert.equal(new Set(result.pack.sources[0].sections.map(s=>s.id)).size,2);
 assert.ok(result.context.bytes<=result.context.budgetBytes);assert.equal(result.context.bytes,bytes(result.context.text));
 assert.ok(result.index.items.length<=24);assert.ok(result.context.remainingChunkIds.length<=100);assert.ok(result.context.remainingCount>100);
 const next=run({context,operation:'read',pack:result.pack,indexOffset:24,selectionOffset:result.context.nextSelectionOffset}).result;
 assert.equal(next.index.offset,24);assert.ok(next.context.citations.length);assert.notEqual(next.context.citations[0].id,result.context.citations[0].id);
});
test('reject source drift, pack tampering, cross-Work reads and lone surrogates',()=>{
 const input=build('hello');input.sources[0].expectedSha256=hash('other');assert.throws(()=>run(input),/Stale source/);
 assert.throws(()=>run(build('\ud800')),/surrogate/);
 const pack=run(build('hello')).result.pack;const changed=structuredClone(pack);changed.chunks[0].text='other';assert.throws(()=>run({context,operation:'read',pack:changed}),/hash/);
 assert.throws(()=>run({context:{...context,workId:'other'},operation:'read',pack}),/context/);
});
test('tiny context returns explicit un-read chunks without silently cutting text',()=>{
 const result=run({...build('x'.repeat(6000)),contextBudgetBytes:256}).result;
 assert.equal(result.context.text,'');assert.equal(result.context.complete,false);assert.equal(result.context.remainingCount,2);
 assert.equal(result.context.selectionStatus,'budget_too_small');assert.equal(result.context.nextSelectionOffset,null);assert.ok(result.context.minimumRequiredBytes>256);
 assert.throws(()=>run({...build('ok'),contextBudgetBytes:1000000}),/contextBudgetBytes/);
});
test('selection is a monotonic prefix even when a later small chunk would fit',()=>{
 const pack=run({...build('x'.repeat(9000)),chunkBytes:4096}).result.pack;
 const small=run({context,operation:'read',pack,contextBudgetBytes:1200}).result.context;
 assert.equal(small.text,'');assert.equal(small.nextSelectionOffset,null);assert.equal(small.remainingCount,3);
 let cursor=0;const seen=[];
 while(cursor!==null){const result=run({context,operation:'read',pack,contextBudgetBytes:4500,selectionOffset:cursor}).result.context;seen.push(...result.citations.map(c=>c.id));assert.ok(result.nextSelectionOffset===null||result.nextSelectionOffset>cursor);cursor=result.nextSelectionOffset;}
 assert.deepEqual(seen,pack.chunks.map(c=>c.id));assert.equal(new Set(seen).size,seen.length);
 const ids=[pack.chunks[2].id,pack.chunks[0].id];const first=run({context,operation:'read',pack,chunkIds:ids,contextBudgetBytes:1200}).result.context;assert.equal(first.nextSelectionOffset,1);const next=run({context,operation:'read',pack,chunkIds:ids,selectionOffset:1,contextBudgetBytes:4500}).result.context;assert.deepEqual(next.citations.map(c=>c.id),[ids[1]]);
});
test('high JSON escaping cannot create a pack larger than this interface can re-read',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kim-evidence-escaping-'));try{
  const text='\0'.repeat(4*1024*1024-5000);fs.writeFileSync(path.join(dir,'brief.md'),text);
  const request={context,operation:'build',workspaceRoot:dir,packPath:'pack.json',sourceFiles:[{id:'brief',title:'资料',revision:'v1',path:'brief.md'}]};
  assert.throws(()=>files(request),/cannot be re-read/);assert.equal(fs.existsSync(path.join(dir,'pack.json')),false);assert.deepEqual(fs.readdirSync(dir),['brief.md']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('file CLI keeps 6 MiB Unicode on disk and returns bounded output; source and pack drift fail',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kim-evidence-'));try{
  const unit='中😀\r\n';const text=unit.repeat(Math.ceil(6*1024*1024/bytes(unit)));fs.writeFileSync(path.join(dir,'brief.md'),text);
  const request={context,operation:'build',workspaceRoot:dir,packPath:'pack.json',sourceFiles:[{id:'brief',title:'资料',revision:'v1',path:'brief.md'}]};
  const cli=spawnSync(process.execPath,[new URL('../scripts/files.mjs',import.meta.url).pathname,'--input-json','-'],{input:JSON.stringify(request),encoding:'utf8',maxBuffer:1024*1024});
  assert.equal(cli.status,0,cli.stderr);assert.ok(bytes(cli.stdout)<131072);const result=JSON.parse(cli.stdout).result;assert.equal(Object.hasOwn(result,'pack'),false);
  const pack=JSON.parse(fs.readFileSync(path.join(dir,'pack.json'),'utf8'));assert.equal(pack.chunks.map(c=>c.text).join(''),text);assert.equal(pack.sources[0].sha256,hash(text));
  const read={context,operation:'read',workspaceRoot:dir,packPath:'pack.json',expectedPackSha256:result.packRef.sha256,selectionOffset:result.context.nextSelectionOffset};
  assert.ok(files(read).result.context.citations.length);fs.appendFileSync(path.join(dir,'brief.md'),'changed');assert.throws(()=>files(read),/drift/);
  assert.equal(files({...read,verifySourceFiles:false}).result.packRef.sourceVerification,'snapshot_only');fs.appendFileSync(path.join(dir,'pack.json'),' ');assert.throws(()=>files(read),/hash changed/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('file boundaries reject traversal, symlinks, invalid UTF-8 and overwriting existing evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kim-evidence-paths-'));try{
  fs.writeFileSync(path.join(dir,'brief.md'),'abc');const request={context,operation:'build',workspaceRoot:dir,packPath:'pack.json',sourceFiles:[{id:'brief',title:'资料',revision:'v1',path:'brief.md'}]};files(request);
  assert.throws(()=>files(request),/already exists/);assert.throws(()=>files({...request,packPath:'../escape'}),/inside/);
  fs.symlinkSync(path.join(dir,'brief.md'),path.join(dir,'link.md'));assert.throws(()=>files({...request,packPath:'new.json',sourceFiles:[{...request.sourceFiles[0],path:'link.md'}]}),/symlink/);
  fs.writeFileSync(path.join(dir,'bad.md'),Buffer.from([0xff]));assert.throws(()=>files({...request,packPath:'new.json',sourceFiles:[{...request.sourceFiles[0],path:'bad.md'}]}),/encoded data/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('UTF-8 BOM bytes survive file input and chunk boundaries; excessive heading metadata is bounded',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kim-evidence-bom-'));try{
  const text='\ufeff'+'x'.repeat(4093)+'\ufeff尾部';fs.writeFileSync(path.join(dir,'brief.md'),text);
  const result=files({context,operation:'build',workspaceRoot:dir,packPath:'pack.json',sourceFiles:[{id:'brief',title:'BOM',revision:'v1',path:'brief.md'}]}).result;
  const pack=JSON.parse(fs.readFileSync(path.join(dir,result.packRef.path),'utf8'));assert.equal(pack.chunks.map(c=>c.text).join(''),text);assert.equal(pack.sources[0].sha256,hash(fs.readFileSync(path.join(dir,'brief.md'))));
  assert.throws(()=>run(build('# heading\n'.repeat(10001))),/Too many source sections/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
