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


test('instance examples and keyword-shaped property names are not schema references',()=>{
 const x=example();
 const tool={name:'keyword_payload',inputSchema:{type:'object',properties:{
   $ref:{type:'string'},not:{type:'boolean'},if:{type:'string'},
   payload:{type:'object',default:{$ref:'https://example.invalid/data',not:{}},examples:[{allOf:[],if:{}}],const:{$dynamicRef:'data'}}
 }},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}};
 x.previous.tools=[structuredClone(tool)];x.current.tools=[tool];x.approvedToolNames=[tool.name];
 const r=run(x);assert.equal(r.status,'completed');
 assert.equal(r.result.schemaReviews[0].referenceCount,0);
 assert.equal(r.result.schemaReviews[0].inputAssessment,'object_root_declared_not_validated');
});
test('actual nested schema references and conditions retain specialist review',()=>{
 for(const nested of [
   {properties:{payload:{$ref:'#/$defs/value'}}},
   {patternProperties:{'^x':{if:{type:'string'},then:{maxLength:3}}}},
   {items:[{$ref:'#/definitions/value'}]},
   {prefixItems:[{$dynamicRef:'#value'}]},
   {dependentSchemas:{payload:{$ref:'#/$defs/value'}}},
   {dependencies:{payload:{$ref:'#/definitions/value'}}},
   {additionalProperties:{$ref:'#/$defs/value'}},
   {$defs:{value:{anyOf:[{type:'string'},{type:'number'}]}}}
 ]){
   const x=example();x.current.tools[0].inputSchema={type:'object',...nested};
   const row=run(x).result.schemaReviews.find(v=>v.name==='lookup_customer');
   assert.equal(row.inputAssessment,'requires_schema_review',JSON.stringify(nested));
 }
});

test('boolean input schema is retained for diagnosis but never certified as a valid MCP tool',()=>{
 for(const schema of [true,false]){
  const x=example();x.current.tools[0].inputSchema=schema;
  const r=run(x);assert.equal(r.status,'needs_review');
  assert.equal(r.result.schemaReviews.find(v=>v.name==='lookup_customer').inputAssessment,'requires_schema_review');
 }
});
