import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('expired evidence and amendment drift block the mandatory clause independently',()=>{
 const r=run(example());assert.deepEqual(r.result.blockingClauseIds,['qualification']);assert.deepEqual(r.result.rows[0].issues,['stale_clause_version','expired_evidence:cert-1']);assert.equal(r.result.rows[1].status,'documented_pending_content_review');
});
test('future expiry before the deadline is also visible and unknown clause responses are retained',()=>{
 const x=example();x.evidence[0].validUntil='2026-11-18T00:00:00Z';x.responses.push({...x.responses[0],clauseId:'foreign-clause'});const r=run(x);assert.ok(r.result.rows[0].issues.includes('expires_before_deadline:cert-1'));assert.deepEqual(r.result.unknownResponseClauses,['foreign-clause']);
});
test('complete references still do not authenticate evidence or determine legal compliance',()=>{
 const x=example();x.responses[0].clauseVersion='addendum-2';x.evidence[0].validUntil='2027-01-01T00:00:00Z';const r=run(x);assert.equal(r.status,'completed');assert.equal(r.result.readiness,'ready_for_content_review');assert.equal(r.result.legalCompliance,'not_determined');assert.equal(r.result.evidenceAuthentication,'supplied_references_not_verified');
});
test('missing responses, noncompliance and duplicate identities cannot be silently dropped',()=>{
 const x=example();x.responses=[];assert.equal(run(x).result.rows.length,2);assert.deepEqual(run(x).result.blockingClauseIds,['qualification']);
 const y=example();y.responses[0].assessment='noncompliant';assert.equal(run(y).result.rows[0].status,'noncompliant');
 const z=example();z.evidence.push(z.evidence[0]);assert.throws(()=>run(z),/duplicate/);
});
test('deadline comparisons honor offsets and invalid calendar dates reject',()=>{
 const x=example();x.asOf='2026-11-20T09:00:00Z';assert.equal(run(x).result.deadlinePassed,true);
 const y=example();y.deadline='2026-11-31T00:00:00Z';assert.throws(()=>run(y),/calendar/);
});

test('blank source locations cannot count as evidence',()=>{ const x=example();x.evidence[1].sourceRef='   ';const r=run(x);assert.equal(r.result.rows[1].status,'needs_review');assert.ok(r.result.rows[1].issues.includes('missing_evidence_source:sla-1')); });
