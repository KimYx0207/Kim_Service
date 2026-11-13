import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {run} from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('duplicate reports do not invent more customers; contradictions remain visible',()=>{
 const result=run(example()).result;assert.deepEqual(result.counts,{records:4,uniqueIssues:3,uniqueCustomers:2,anonymousFeedback:1});assert.equal(result.candidates[0].adoption.status,'proposed');assert.equal(result.contradictions.length,1);assert.equal(result.candidates[0].sourceRecordIds.length,4);
});
test('missing, self and cyclic duplicate references are rejected',()=>{
 for(const target of ['missing','f2']){const input=example();input.records[1].duplicateOf=target;assert.throws(()=>run(input),/reference/);}
 const input=example();input.records[0].duplicateOf='f2';assert.throws(()=>run(input),/Cyclic/);
});
test('scope, grouping and actor references cannot silently cross the project boundary',()=>{
 const a=example();a.records[0].projectId='other';assert.throws(()=>run(a),/another project/);
 const b=example();b.groups[0].recordIds.push('missing');assert.throws(()=>run(b),/missing/);
 const c=example();c.groups=[];const result=run(c).result;assert.equal(result.unclassifiedRecordIds.length,4);
});
test('valid existing adoption is reused, changed requirements or evidence makes it stale',()=>{
 const input=example();const candidate=run(input).result.candidates[0];input.decisions=[{candidateId:candidate.id,candidateSha256:candidate.candidateSha256,actorId:'pm',status:'adopted',reason:'当前版已审阅',evidenceRef:'decision/1'}];assert.equal(run(input).result.candidates[0].adoption.status,'adopted');
 input.records[0].text+=' changed';assert.throws(()=>run(input),/stale/);
});
test('adoption binds company, Work revision, project and configured adoption role',()=>{
 const input=example();const candidate=run(input).result.candidates[0];input.decisions=[{candidateId:candidate.id,candidateSha256:candidate.candidateSha256,actorId:'pm',status:'adopted',reason:'已核对',evidenceRef:'decision/1'}];
 const changes=[value=>{value.context.organizationId='another-company';},value=>{value.context.workId='another-work';},value=>{value.context.revision='r2';},value=>{value.projectId='another-project';for(const record of value.records)record.projectId=value.projectId;},value=>{value.adoptionRole='another-role';value.members[0].roles.push(value.adoptionRole);}];
 for(const change of changes){const altered=structuredClone(input);change(altered);assert.throws(()=>run(altered),/stale/);}
});
test('out-of-group duplicate ancestry changes invalidate adoption while unrelated evidence does not',()=>{
 const input=example();input.groups[0].recordIds=['f2','f3'];input.contradictions=[];
 const candidate=run(input).result.candidates[0];assert.equal(candidate.uniqueIssues,2);assert.deepEqual(candidate.evidenceRecordIds,['f1','f2','f3']);
 input.decisions=[{candidateId:candidate.id,candidateSha256:candidate.candidateSha256,actorId:'pm',status:'adopted',reason:'已核对',evidenceRef:'decision/1'}];
 input.records[3].text+=' unrelated';assert.equal(run(input).result.candidates[0].adoption.status,'adopted');
 input.records[0].duplicateOf='f3';assert.throws(()=>run(input),/stale/);
 input.decisions=[];const changed=run(input).result.candidates[0];assert.equal(changed.uniqueIssues,1);assert.notEqual(changed.candidateSha256,candidate.candidateSha256);
});
test('adoption includes directly related contradictions and their external source evidence',()=>{
 const input=example();input.groups[0].recordIds=['f3'];
 const candidate=run(input).result.candidates[0];assert.deepEqual(candidate.evidenceRecordIds,['f3','f4']);assert.deepEqual(candidate.contradictionIds,['density']);
 input.decisions=[{candidateId:candidate.id,candidateSha256:candidate.candidateSha256,actorId:'pm',status:'adopted',reason:'已核对矛盾',evidenceRef:'decision/1'}];
 const changedReason=structuredClone(input);changedReason.contradictions[0].reason+=' changed';assert.throws(()=>run(changedReason),/stale/);
 input.records[3].text+=' changed';assert.throws(()=>run(input),/stale/);
});
test('offline CLI produces traceable candidates without business writes',()=>{
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/run.mjs',import.meta.url)),'--input-json','-'],{input:JSON.stringify(example()),encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).claims.businessStatePersisted,false);
});
