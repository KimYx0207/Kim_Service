import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Test/demo harness only. Production helpers neither write artifacts nor dispatch peers.
export function runTaskAgentDemo() {
  if (process.platform === 'win32') return {status:'not_run',reason:'POSIX safe-open verification requires a supported host',nativeAgentVerified:false};
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'service-task-demo-')));
  try {
    const periods = [.01,-.02,.03].map((returnRate,i)=>({time:`2026-01-0${i+1}T16:00:00.000Z`,signalAvailableAt:`2026-01-0${i+1}T09:00:00.000Z`,executedAt:`2026-01-0${i+1}T10:00:00.000Z`,returnRate,turnover:1,benchmarkReturn:0}));
    const input = Buffer.from(JSON.stringify({costRate:.001,periods}));
    fs.writeFileSync(path.join(temp,'input.json'),input);
    const execution = spawnSync(process.execPath,[path.join(root,'agents/quantitative-researcher/scripts/calculate.mjs'),'--input-json','-'],{input,encoding:'utf8',shell:false,timeout:10000});
    assert.ifError(execution.error);assert.equal(execution.status,0,execution.stderr);
    const report=JSON.parse(execution.stdout);
    // Independently fixed arithmetic oracle, not the helper's own passed flag.
    assert.ok(Math.abs(report.totalReturn-(1.009*.979*1.029-1))<1e-12);
    assert.ok(Math.abs(report.maxDrawdown-.021)<1e-12);
    fs.writeFileSync(path.join(temp,'report.json'),execution.stdout);
    const artifact=(id,name)=>{const bytes=fs.readFileSync(path.join(temp,name));return {id,path:name,bytes:bytes.length,sha256:sha(bytes)};};
    const inputArtifact=artifact('input','input.json'),reportArtifact=artifact('report','report.json');
    const receipt={schemaVersion:1,taskId:'synthetic-return-demo',tool:'supplied-return-arithmetic',toolVersion:'0.1.0',invocationId:'local-cli-demo',inputSha256:inputArtifact.sha256,status:'completed',exitCode:execution.status,outputArtifacts:[{id:reportArtifact.id,bytes:reportArtifact.bytes,sha256:reportArtifact.sha256}],result:{periodCount:report.periods.length,arithmeticOracleMatched:true}};
    fs.writeFileSync(path.join(temp,'receipt.json'),JSON.stringify(receipt));
    const request={schemaVersion:1,taskId:receipt.taskId,artifacts:[inputArtifact,reportArtifact,artifact('receipt','receipt.json')],criteria:[
      {id:'report-integrity',description:'Actual output matches manifest',type:'artifact_integrity',artifactId:'report'},
      {id:'scope',description:'Supplied arithmetic only',type:'json_equals',artifactId:'report',pointer:'/scope',equals:'supplied_return_arithmetic_only'},
      {id:'no-trading',description:'Trading not authorized',type:'json_equals',artifactId:'report',pointer:'/tradingAuthorized',equals:false},
      {id:'actual-cli-binding',description:'Actual invocation bound to input and output',type:'tool_receipt',receiptArtifactId:'receipt',inputArtifactId:'input',outputArtifactIds:['report'],tool:receipt.tool,toolVersion:receipt.toolVersion,invocationId:receipt.invocationId,assertions:[{pointer:'/result/periodCount',equals:3},{pointer:'/result/arithmeticOracleMatched',equals:true}]}
    ]};
    const verify=()=>{const result=spawnSync(process.execPath,[path.join(root,'agents/delivery-verifier/scripts/verify.mjs'),'--artifact-root',temp,'--input-json','-'],{input:JSON.stringify(request),encoding:'utf8',shell:false,timeout:10000});assert.ifError(result.error);return {exitCode:result.status,...JSON.parse(result.stdout)};};
    const verified=verify();assert.equal(verified.status,'completed',JSON.stringify(verified));
    // Negative control: a changed delivery cannot retain the previous verification.
    fs.appendFileSync(path.join(temp,'report.json'),' ');
    const tampered=verify();assert.notEqual(tampered.status,'completed');
    return {status:'completed',scope:'real_local_cli_and_file_verification_with_synthetic_data',periodCount:report.periods.length,totalReturn:report.totalReturn,maxDrawdown:report.maxDrawdown,verifiedCriteria:verified.criterionResults.length,tamperedStatus:tampered.status,nativeAgentVerified:false,externalPlatformVerified:false,receiptAuthenticity:'caller_observed_demo_only',paidModelCalls:0,networkCalls:0};
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url) console.log(JSON.stringify(runTaskAgentDemo(),null,2));
