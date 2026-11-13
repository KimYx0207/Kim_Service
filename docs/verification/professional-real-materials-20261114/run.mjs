// Reproduce only local repository-material checks. No network or CLI model calls.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createCodexAdapter } from '../../../tools/claudecode-codex-gemini/mcp/adapters.mjs';
import { run as audit } from '../../../tools/mcp-contract-auditor/scripts/run.mjs';
import { run as lineage } from '../../../skills/data-lineage-impact/scripts/run.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const destination=process.argv[2];
assert(destination && path.isAbsolute(destination),'Pass an absolute, new output directory');
fs.mkdirSync(destination,{recursive:false});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(destination,name),JSON.stringify(data,null,2)+'\n');
const sourcePaths=['tools/claudecode-codex-gemini/mcp/adapters.mjs','tools/claudecode-codex-gemini/mcp/runtime.mjs','tools/claudecode-codex-gemini/mcp/codex-server.mjs','tools/mcp-contract-auditor/scripts/run.mjs','tools/mcp-contract-auditor/capability.json','hooks/evidence-receipt/scripts/hook.mjs','hooks/evidence-receipt/policy.json','agents/reliability-engineer/method.json','skills/incident-postmortem/schemas/input.schema.json','skills/data-lineage-impact/scripts/run.mjs'];
write('source-manifest.json',{classification:'real_repository_material',baseCommit:'64e4ec32326bf3e4f289ac178913d2639a835926',sources:sourcePaths.map(p=>({path:p,bytes:fs.statSync(path.join(root,p)).size,sha256:hash(fs.readFileSync(path.join(root,p)))}))});
// Constructing the exported adapter reads definitions only: its call() is never run.
const adapter=createCodexAdapter({runner:()=>{throw Error('Real CLI invocation forbidden in this trial');}});
const runtime=fs.readFileSync(path.join(root,sourcePaths[1]),'utf8');
const protocolVersion=/result: \{ protocolVersion: '([^']+)'/.exec(runtime)?.[1];
assert(protocolVersion);
const snapshot={serverId:adapter.serverInfo.name,protocolVersion,complete:true,tools:[adapter.tool]};
const auditInput={context:{organizationId:'Kim_Service',workId:'repository-definition-review',revision:'1'},previous:snapshot,current:structuredClone(snapshot),approvedToolNames:[]};
write('mcp-input.json',auditInput);
const auditResult=audit(auditInput);write('mcp-output.json',auditResult);
assert.deepEqual(auditResult.result.changed,[]);
assert.deepEqual(auditResult.result.unapproved,['codex']);
assert.equal(auditResult.result.liveConnectionObserved,false);
assert.equal(auditResult.status,'needs_review');
// A static source dependency graph, not production data lineage or runtime reachability.
const adapterPath=sourcePaths[0],runtimePath=sourcePaths[1],entryPath=sourcePaths[2];
const adapterSource=fs.readFileSync(path.join(root,adapterPath),'utf8');
const entrySource=fs.readFileSync(path.join(root,entryPath),'utf8');
assert(adapterSource.includes("from './runtime.mjs'"));
assert(entrySource.includes("from './adapters.mjs'"));
const lineageInput={context:{organizationId:'Kim_Service',workId:'source-dependency-review',revision:'1'},nodes:[runtimePath,adapterPath,entryPath].map(id=>({id,owner:''})),edges:[{from:runtimePath,to:adapterPath,confidence:'observed',evidenceRef:adapterPath+':1-4'},{from:adapterPath,to:entryPath,confidence:'observed',evidenceRef:entryPath+':2'}],changed:[runtimePath]};
write('lineage-input.json',lineageInput);const lineageResult=lineage(lineageInput);write('lineage-output.json',lineageResult);
assert.equal(lineageResult.result.affected.length,2);assert.equal(lineageResult.status,'needs_review');
// Real historical code, controlled scratch fixture; not a historical host execution log.
const tmp=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'kim-real-materials-'));
try {
 const old=execFileSync('git',['show','155c906:hooks/evidence-receipt/scripts/hook.mjs'],{cwd:root});
 fs.writeFileSync(path.join(destination,'hook-before.mjs.txt'),old);
 const report=execFileSync('git',['show','--format=fuller','79251f2','--','hooks/evidence-receipt/scripts/hook.mjs'],{cwd:root});
 fs.writeFileSync(path.join(destination,'hook-fix-source.txt'),report);
 const observations=[];
 for(const [label,source] of [['before',old],['after',fs.readFileSync(path.join(root,'hooks/evidence-receipt/scripts/hook.mjs'))]]){
  const packagePath=path.join(tmp,label),alias=path.join(tmp,label+' alias 中文');
  fs.mkdirSync(path.join(packagePath,'scripts'),{recursive:true});
  fs.writeFileSync(path.join(packagePath,'scripts/hook.mjs'),source);
  fs.copyFileSync(path.join(root,'hooks/evidence-receipt/policy.json'),path.join(packagePath,'policy.json'));
  fs.symlinkSync(packagePath,alias,'dir');
  const workspace=path.join(tmp,label+'-workspace');fs.mkdirSync(workspace);
  fs.writeFileSync(path.join(workspace,'report.txt'),report);
  const config={workspaceRoot:workspace,artifactPaths:['report.txt'],receiptsDir:'receipts',workId:'real-hook-source-review',revision:'1'};
  const configPath=path.join(workspace,'config.json');fs.writeFileSync(configPath,JSON.stringify(config));
  const invoke=()=>spawnSync(process.execPath,[path.join(alias,'scripts/hook.mjs'),'--config',configPath],{input:JSON.stringify({hook_event_name:'PostToolUse',tool_name:'Write'}),encoding:'utf8',timeout:5000});
  const result=invoke();assert.ifError(result.error);assert.equal(result.status,0);
  const receipts=fs.existsSync(path.join(workspace,'receipts'))?fs.readdirSync(path.join(workspace,'receipts')):[];
  observations.push({label,exitCode:result.status,stdout:result.stdout,stderr:result.stderr,receiptCount:receipts.length,sourceSha256:hash(source)});
  if(label==='before'){assert.equal(result.stdout,'');assert.equal(receipts.length,0);continue;}
  assert.equal(receipts.length,1);
  const first=JSON.parse(fs.readFileSync(path.join(workspace,'receipts',receipts[0]),'utf8'));
  assert.equal(first.artifacts[0].sha256,hash(report));write('hook-receipt-v1.json',first);write('hook-config.json',config);
  fs.copyFileSync(path.join(workspace,'report.txt'),path.join(destination,'report-v1.txt'));
  // Author a revised report from actual source, preserving source content and history.
  fs.appendFileSync(path.join(workspace,'report.txt'),'\nReview: local alias replay now records bytes; host activation remains untested.\n');
  const revised=invoke();assert.equal(revised.status,0);assert(revised.stdout.includes('Local artifact byte snapshot'));
  const next=fs.readdirSync(path.join(workspace,'receipts'));assert.equal(next.length,2);
  const second=JSON.parse(fs.readFileSync(path.join(workspace,'receipts',next.find(n=>!receipts.includes(n))),'utf8'));
  assert.notEqual(first.artifacts[0].sha256,second.artifacts[0].sha256);write('hook-receipt-v2.json',second);
  fs.copyFileSync(path.join(workspace,'report.txt'),path.join(destination,'report.txt'));
  // Bind verifier manifest to the prior reviewed version: changed bytes must fail.
  const criterion={id:'report-integrity',description:'Reviewed report bytes match',type:'artifact_integrity',artifactId:'report'};
  const request={schemaVersion:1,taskId:'real-hook-review',artifacts:[{id:'report',path:'report.txt',bytes:first.artifacts[0].bytes,sha256:first.artifacts[0].sha256}],criteria:[criterion]};
  const verify=()=>{
   const r=spawnSync(process.execPath,[path.join(root,'agents/delivery-verifier/scripts/verify.mjs'),'--artifact-root',workspace,'--input-json','-'],{input:JSON.stringify(request),encoding:'utf8',timeout:10000});
   assert.ifError(r.error);return JSON.parse(r.stdout);
  };
  write('verification-stale-input.json',request);const stale=verify();write('verification-stale.json',stale);assert(stale.criterionResults.some(c=>c.status==='failed'));
  request.artifacts[0].bytes=second.artifacts[0].bytes;request.artifacts[0].sha256=second.artifacts[0].sha256;
  write('verification-refreshed-input.json',request);const refreshed=verify();write('verification-refreshed.json',refreshed);assert.equal(refreshed.status,'completed');
  request.criteria.push({id:'host-activation',description:'Actual host registration and event verified',type:'external_review',capability:'real-host-probe'});
  write('verification-host-pending-input.json',request);const pending=verify();write('verification-host-pending.json',pending);assert.equal(pending.status,'partial');
 }
 write('hook-replay.json',{classification:'real_historical_code_with_controlled_local_replay',platform:process.platform,node:process.version,hostRegistration:'not_performed',professionalEffect:'not_evaluated',observations});
} finally { fs.rmSync(tmp,{recursive:true,force:true}); }
write('summary.json',{classification:'real_repository_software_delivery_material',checks:'passed',mcp:'offline_definition_only',lineage:'static_import_paths_only_owners_unknown',hook:'explicit_local_invocation_not_host_enabled',industryEffect:'not_evaluated',customerImpact:'unknown',productionMTTR:'unknown'});
console.log(JSON.stringify({output:destination,status:'local_checks_passed',industryEffect:'not_evaluated'}));
