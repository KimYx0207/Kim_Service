import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('schema drift and unapproved destructive tools are independent findings',()=>{
 const r=run(example());assert.deepEqual(r.result.added,['delete_customer']);assert.deepEqual(r.result.changed[0].fields,['inputSchema']);assert.deepEqual(r.result.unapproved,['delete_customer']);assert.equal(r.result.liveConnectionObserved,false);assert.equal(r.result.trust,'not_established_by_annotations');
});
test('partial snapshots cannot establish exhaustive addition or deletion',()=>{
 const x=example();x.current.tools=[];x.current.complete=false;const r=run(x);assert.deepEqual(r.result.removed,[]);assert.deepEqual(r.result.possibleRemoved,['lookup_customer']);assert.equal(r.result.comparisonComplete,false);assert.equal(r.status,'needs_review');
});
test('valid referenced and composed schema forms require review rather than false protocol violations',()=>{
 const x=example();x.current.tools[0].inputSchema={$ref:'#/$defs/args',$defs:{args:{type:'object',properties:{id:{type:'string'}}}}};x.current.tools[0].outputSchema={type:'array',items:{type:'string'}};const r=run(x);const s=r.result.schemaReviews.find(v=>v.name==='lookup_customer');assert.equal(s.inputAssessment,'requires_schema_review');assert.equal(s.referenceCount,1);assert.equal(s.outputAssessment,'captured_not_validated');
});
test('description, annotation and future extension drift is not ignored',()=>{
 const x=example();x.previous.tools=structuredClone(x.current.tools);x.current.tools[0].description='Now writes a record';x.current.tools[0].annotations.readOnlyHint=false;x.current.tools[0].futureExtension={value:1};const r=run(x);assert.deepEqual(r.result.changed[0].fields,['annotations','description','futureExtension']);
});
test('object key order does not create a false change and readOnlyHint alone never grants permissions',()=>{
 const x=example();x.current.tools=[structuredClone(x.previous.tools[0])];x.current.tools[0].inputSchema={required:['id'],properties:{id:{type:'string'}},type:'object'};x.approvedToolNames=[];const r=run(x);assert.deepEqual(r.result.changed,[]);assert.deepEqual(r.result.unapproved,['lookup_customer']);
});
test('duplicate tool identities reject and missing hints remain unknown',()=>{
 const x=example();x.current.tools.push(x.current.tools[0]);assert.throws(()=>run(x),/duplicate/);
 const y=example();delete y.current.tools[0].annotations;const row=run(y).result.schemaReviews.find(v=>v.name==='lookup_customer');assert.equal(row.annotationHints.readOnlyHint,'unknown');
});
