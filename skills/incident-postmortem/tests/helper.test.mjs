import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('timezone-normalized durations equal the customer impact window and remain single-incident metrics',()=>{
 const x=example();x.incident.detectedAt='2026-11-01T02:05:00Z';const r=run(x);assert.deepEqual(r.result.durationsMinutes,{detection:5,detectionToMitigation:15,mitigationToRecovery:10,customerImpact:30});assert.equal(r.result.metricScope,'single_incident_not_mean_mttr');
});
test('unowned, overdue, or unverified actions cannot disappear in a success average',()=>{
 const x=example();x.actions[0].status='completed';const r=run(x);assert.ok(r.result.actions[0].issues.includes('completion_without_evidence'));assert.ok(r.result.actions[1].issues.includes('missing_owner'));assert.deepEqual(r.result.missingActionTypes,['mitigate']);assert.equal(r.status,'needs_review');
});
test('a completion reference is a supplied claim, not root-cause proof',()=>{
 const x=example();x.actions=[...['prevent','detect','mitigate'].map(type=>({id:type,type,owner:'role',dueAt:'2026-11-06T10:00:00Z',verification:'Replay the failure scenario and preserve observed result',status:'completed',completionEvidence:['synthetic-probe:1']}))];const r=run(x);assert.equal(r.status,'completed');assert.equal(r.result.causeAssessment,'requires_source_based_review');assert.equal(r.claims.finalAcceptance,'not_decided');
});
test('invalid calendar dates, impossible chronology and duplicate action IDs reject',()=>{
 const x=example();x.incident.startedAt='2026-02-30T10:00:00Z';assert.throws(()=>run(x),/calendar/);
 const y=example();y.incident.detectedAt='2026-11-01T11:00:00+08:00';assert.throws(()=>run(y),/chronological/);
 const z=example();z.actions.push(z.actions[0]);assert.throws(()=>run(z),/duplicate/);
});

test('blank completion references cannot support completion',()=>{ const x=example();x.actions[0].status='completed';x.actions[0].completionEvidence=['   '];const r=run(x);assert.equal(r.result.actions[0].evidenceSupportedCompletion,false);assert.ok(r.result.actions[0].issues.includes('completion_without_evidence')); });
