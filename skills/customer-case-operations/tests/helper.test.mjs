import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {run} from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('replay advances only the configured local projection; repeated event is idempotent',()=>{
 const input=example();input.events.push(structuredClone(input.events[0]));const result=run(input).result;assert.equal(result.cases[0].state,'review');assert.equal(result.cases[0].version,2);assert.equal(result.events[1].status,'duplicate_ignored');assert.equal(result.notificationsSent,false);assert.equal(result.schedulerRunning,false);assert.equal(result.cases[0].effect,'not_observed');
});
test('missing materials, wrong roles, unknown state and conflicting event IDs fail',()=>{
 const a=example();a.cases[0].materials=[];assert.throws(()=>run(a),/materials/);
 const b=example();b.events[0].actorId='manager';assert.throws(()=>run(b),/role/);
 const c=example();c.cases[0].state='unknown';assert.throws(()=>run(c),/state/);
 const d=example();d.events.push({...d.events[0],expectedVersion:2});assert.throws(()=>run(d),/Conflicting/);
});
test('human decision uses a version-bound snapshot; stale decisions fail',()=>{
 const input=example();const current=run(input).result.cases[0];const event={id:'e2',kind:'transition',caseId:'case-1',actorId:'ops',expectedVersion:2,transitionId:'accept',decision:{actorId:'manager',caseSnapshotSha256:current.caseSnapshotSha256,transitionId:'accept',reason:'材料齐全',evidenceRef:'decision/2'}};input.events.push(event);assert.equal(run(input).result.cases[0].state,'ready');event.decision.caseSnapshotSha256='0'.repeat(64);assert.throws(()=>run(input),/stale/);
});
test('human decisions cannot cross company, Work, workflow, customer or artifact versions',()=>{
 const input=example();const current=run(input).result.cases[0];input.events.push({id:'e2',kind:'transition',caseId:'case-1',actorId:'ops',expectedVersion:2,transitionId:'accept',decision:{actorId:'manager',caseSnapshotSha256:current.caseSnapshotSha256,transitionId:'accept',reason:'已核对当前材料',evidenceRef:'decision/2'}});
 assert.equal(run(input).result.cases[0].state,'ready');
 const changes=[value=>{value.context.organizationId='another-company';},value=>{value.context.workId='another-work';},value=>{value.context.revision='r2';},value=>{value.workflow.revision='r2';},value=>{value.workflow.states[1].label='另一复核规则';},value=>{value.cases[0].artifactVersion='v2';},value=>{value.cases[0].customerId='another-customer';}];
 for(const change of changes){const altered=structuredClone(input);change(altered);assert.throws(()=>run(altered),/stale decision/);}
});
test('receipt, verification and adoption stay distinct and require the actual configured roles',()=>{
 const input=example();input.events.push({id:'r1',kind:'receipt',caseId:'case-1',actorId:'ops',expectedVersion:2,receiptKind:'received',artifactVersion:'v1',evidenceRef:'receipt/1'});
 const adoption={id:'a1',kind:'adoption',caseId:'case-1',actorId:'manager',expectedVersion:2,artifactVersion:'v1',status:'adopted',reason:'采用这版',evidenceRef:'decision/3'};input.events.push(adoption);assert.throws(()=>run(input),/verification/);
 input.events.splice(2,0,{id:'r2',kind:'receipt',caseId:'case-1',actorId:'reviewer',expectedVersion:2,receiptKind:'verified',artifactVersion:'v1',evidenceRef:'review/2'});assert.equal(run(input).result.cases[0].adoption.status,'adopted');
 input.events[2].actorId='ops';assert.throws(()=>run(input),/verification role/);
});
test('new material revisions make old adoption inactive while retaining its evidence',()=>{
 const input=example();input.events.push({id:'r2',kind:'receipt',caseId:'case-1',actorId:'reviewer',expectedVersion:2,receiptKind:'verified',artifactVersion:'v1',evidenceRef:'review/2'},{id:'a1',kind:'adoption',caseId:'case-1',actorId:'manager',expectedVersion:2,artifactVersion:'v1',status:'adopted',reason:'采用',evidenceRef:'decision/3'},{id:'m1',kind:'material',caseId:'case-1',actorId:'ops',expectedVersion:2,material:{...input.cases[0].materials[0],sha256:'a'.repeat(64)}});
 const result=run(input).result.cases[0];assert.equal(result.adoption.status,'not_decided');assert.equal(result.adoption.previous.status,'adopted');assert.equal(result.receipts[0].caseVersion,2);
});
test('offline CLI has no model invocation, real notification or scheduler claim',()=>{
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/run.mjs',import.meta.url)),'--input-json','-'],{input:JSON.stringify(example()),encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).claims.modelCalled,false);
});
