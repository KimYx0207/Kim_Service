import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {run} from '../scripts/run.mjs';
import {hash} from '../scripts/runtime.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('a higher average does not hide a critical regression or a missing baseline result',()=>{
 const result=run(example()).result;assert.equal(result.summaries[0].total,3);assert.equal(result.summaries[0].missing,1);assert.equal(result.summaries[0].passRate,1/3);
 assert.equal(result.summaries[1].passRate,2/3);assert.equal(result.summaries[1].gate,'blocked');assert.deepEqual(result.comparisons[0].regressions,['amount']);assert.equal(result.providerExecutionObserved,false);
});
test('unknown measurements stay unknown; mixed currencies are never summed',()=>{
 const input=example();let result=run(input).result;assert.equal(result.summaries[1].budget.cost,'unknown');assert.equal(result.summaries[1].measuredTotalCost,null);
 delete input.budget;input.runs[1].outputs.forEach((output,index)=>{output.measurement={cost:1,currency:index?'CNY':'USD',latencyMs:10};});result=run(input).result;assert.equal(result.summaries[1].measuredTotalCost,null);
 input.budget={maxTotalCost:100};assert.throws(()=>run(input),/currency/);
});
test('dataset, input and output evidence mismatches reject independently',()=>{
 const x=example();x.runs[0].datasetSha256='0'.repeat(64);assert.throws(()=>run(x),/dataset/);
 const y=example();y.runs[0].outputs[0].caseInputSha256='0'.repeat(64);assert.throws(()=>run(y),/case input/);
 const z=example();z.runs[0].outputs[0].outputSha256='0'.repeat(64);assert.throws(()=>run(z),/output hash/);
});
test('unknown code assertions, duplicate case IDs and cross-company output are rejected',()=>{
 const x=example();x.dataset.cases[0].assertions[0].type='javascript';assert.throws(()=>run(x),/unsupported/);
 const y=example();y.runs[0].outputs.push(y.runs[0].outputs[0]);assert.throws(()=>run(y),/duplicate/);
 const z=example();z.runs[0].context.organizationId='another';assert.throws(()=>run(z),/mismatch/);
});
test('JSON pointer treats escaped slash keys correctly and budgets can fail a passing candidate',()=>{
 const input=example();input.dataset.cases=[{id:'pointer',input:{},tags:[],assertions:[{id:'slash',type:'json_pointer_equals',path:'/a~1b/~0key',value:2,critical:true}]}];input.runs=[{...input.runs[0],datasetSha256:hash(input.dataset),outputs:[{caseId:'pointer',caseInputSha256:hash({}),value:{'a/b':{'~key':2}},measurement:{cost:2,currency:'CNY',latencyMs:20}}]}];const result=run(input).result;assert.equal(result.summaries[0].passed,1);assert.equal(result.summaries[0].budget.cost,'fail');assert.equal(result.summaries[0].gate,'blocked');
});
test('documented CLI runs offline and emits one JSON receipt',()=>{
 const child=spawnSync(process.execPath,[new URL('../scripts/run.mjs',import.meta.url).pathname,'--input-json','-'],{input:JSON.stringify(example()),encoding:'utf8'});
 assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);assert.equal(result.claims.modelCalled,false);assert.equal(result.context.workId,'work-onboarding');
});
