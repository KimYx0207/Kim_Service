import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareTrial, gradeTrial } from './professional-outcomes.mjs';
import operating from '../agents/financial-modeler/scripts/operating-forecast.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function trial(t,id='finance-conflict'){
  const base=fs.mkdtempSync(path.join(root,'.outcome-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const dir=path.join(base,'trial');prepareTrial({taskId:id,destination:dir,condition:'baseline',model:'deterministic-test-fixture-not-a-model'});return dir;
}
function completeFinance(dir){
  const input=JSON.parse(fs.readFileSync(path.join(dir,'inputs/confirmed-budget.json'),'utf8'));
  const write=(name,value)=>fs.writeFileSync(path.join(dir,'output',name),typeof value==='string'?value:JSON.stringify(value));
  write('forecast.json',operating.forecast(input));write('decision.md','Synthetic test fixture; real judgment remains unreviewed.');
  write('facts.json',{conflicts:[{issue:'variable-cost',sources:['confirmed-budget.json','supplier-proposal.md'],status:'unresolved',appliedValue:45,alternateValue:50,unit:'CNY/order'}]});
  write('submission.json',{artifacts:{forecast:'forecast.json',decision:'decision.md',facts:'facts.json'},professionalEffect:'claimed-pass-is-not-evidence'});
}
test('real files and correct arithmetic still require actual qualitative review',t=>{
  const dir=trial(t);completeFinance(dir);const report=gradeTrial(dir);
  assert.ok(report.automaticChecks.every(check=>check.status==='pass'));assert.equal(report.status,'needs_review');
  assert.equal(report.professionalEffect,'not_evaluated');assert.equal(report.durationMs,null);assert.equal(report.totalTokens,null);
  assert.ok(report.humanChecks.every(check=>check.status==='not_run'));
});
test('wrong cash cannot pass because the artifact exists or reports its own success',t=>{
  const dir=trial(t);completeFinance(dir);const file=path.join(dir,'output/forecast.json');const value=JSON.parse(fs.readFileSync(file,'utf8'));value.scenarios[0].months[1].endingCash+=100;fs.writeFileSync(file,JSON.stringify(value));
  const report=gradeTrial(dir);assert.equal(report.status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='finance-12-month-arithmetic').status,'fail');
});
test('a missing artifact or an escaping artifact reference is rejected',t=>{
  const dir=trial(t);completeFinance(dir);fs.writeFileSync(path.join(dir,'output/submission.json'),JSON.stringify({artifacts:{forecast:'../inputs/confirmed-budget.json',decision:'missing.md',facts:'facts.json'}}));
  const report=gradeTrial(dir);assert.equal(report.status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='artifact-forecast').status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='artifact-decision').status,'fail');
});
test('input changes do not silently change the reference answer for an existing run',t=>{
  const dir=trial(t);completeFinance(dir);fs.appendFileSync(path.join(dir,'inputs/supplier-proposal.md'),'changed');
  const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'fail');
});
test('with-method trials freeze the actual package and detect later snapshot edits',t=>{
  const base=fs.mkdtempSync(path.join(root,'.outcome-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const dir=path.join(base,'trial');
  prepareTrial({taskId:'finance-conflict',destination:dir,condition:'with_method',model:'test-fixture'});completeFinance(dir);
  const run=JSON.parse(fs.readFileSync(path.join(dir,'run.json'),'utf8'));assert.equal(run.method.componentId,'financial-modeler');assert.ok(run.method.files['AGENT.md']);
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'pass');
  fs.appendFileSync(path.join(dir,'method/AGENT.md'),'changed during run');assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'fail');
});
test('design external dependencies are not an offline deliverable and layout is never auto-passed',t=>{
  const dir=trial(t,'design-states');const out=path.join(dir,'output');
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html><script src="https://example.test/code.js"></script></html>');
  fs.writeFileSync(path.join(out,'tokens.json'),'{}');fs.writeFileSync(path.join(out,'handoff.md'),'Synthetic fixture');
  fs.writeFileSync(path.join(out,'submission.json'),JSON.stringify({artifacts:{page:'index.html',tokens:'tokens.json',handoff:'handoff.md'}}));
  const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(x=>x.id==='design-local-resource-closure').status,'fail');assert.ok(report.humanChecks.every(x=>x.status==='not_run'));
});
test('resuming a heading edit preserves the user draft and existing cancel code',t=>{
  const dir=trial(t,'frontend-resume');const source=fs.readFileSync(path.join(dir,'inputs/index.html'),'utf8');const out=path.join(dir,'output');
  fs.writeFileSync(path.join(out,'index.html'),source.replace('<h1>编辑文章</h1>','<h1>继续编辑草稿</h1>'));fs.writeFileSync(path.join(out,'handoff.md'),'Changed heading only.');fs.writeFileSync(path.join(out,'submission.json'),JSON.stringify({artifacts:{page:'index.html',handoff:'handoff.md'}}));
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='resume-preserves-user-content-and-behavior').status,'pass');
  fs.writeFileSync(path.join(out,'index.html'),source.replace('用户已修改：请保留这段正文。',''));
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='resume-preserves-user-content-and-behavior').status,'fail');
});
