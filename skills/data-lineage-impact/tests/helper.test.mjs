import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from '../scripts/run.mjs';
const example = () => JSON.parse(fs.readFileSync(new URL('../examples/input.json', import.meta.url), 'utf8'));
test('a declared downstream stays possible while observed direct lineage remains observed', () => {
 const result=run(example());assert.equal(result.status,'needs_review');assert.equal(result.result.affected.length,2);
 assert.equal(result.result.affected.find(x=>x.id.includes('dashboard')).certainty,'possible_path');
 assert.equal(result.result.affected.find(x=>x.id.includes('mart')).certainty,'observed_path');
 assert.equal(result.result.coverage,'supplied_edges_only');
});
test('later observed alternative improves certainty without dropping the original graph',()=>{
 const x=example();x.edges.push({from:x.changed[0],to:x.nodes[2].id,evidenceRef:'observed-query:1',confidence:'observed'});
 assert.equal(run(x).result.affected.find(n=>n.id===x.nodes[2].id).certainty,'observed_path');
});
test('cycles terminate and unknown seeds remain visible',()=>{
 const x=example();x.edges.push({from:x.nodes[2].id,to:x.nodes[0].id,evidenceRef:'replay:2',confidence:'observed'});x.changed.push('missing/system#value');
 const y=run(x);assert.equal(y.result.cycleDetected,true);assert.deepEqual(y.result.unmatchedSeeds,['missing/system#value']);assert.equal(y.result.affected.length,2);
});
test('an observed label without evidence cannot certify a path',()=>{
 const x=example();x.edges[0].evidenceRef='';const y=run(x);assert.ok(y.result.affected.every(n=>n.certainty==='possible_path'));assert.equal(y.result.evidenceMissing.length,1);
});
test('duplicate node identity and orphan edges reject; input changes produce a new receipt hash',()=>{
 const x=example();x.nodes.push(x.nodes[0]);assert.throws(()=>run(x),/duplicate/);
 const y=example();y.edges[0].to='unknown';assert.throws(()=>run(y),/unknown/);
 const a=example(),b=example();b.nodes[1].owner='changed-owner';assert.notEqual(run(a).inputSha256,run(b).inputSha256);
});
