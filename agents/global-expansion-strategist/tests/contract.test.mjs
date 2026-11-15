import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('copied package preserves real methods, source scope, caller authority and authored counterexamples',()=>{
 const c=JSON.parse(read('capability.json')),m=JSON.parse(read('method.json'));
 assert.equal(c.id,path.basename(root));assert.equal(m.roleId,c.id);
 assert.equal(m.automaticInvocation,false);assert.equal(m.runtimeStatus,'needs_probe');
 assert.equal(m.coordinationOwner,'caller');assert.equal(m.finalAcceptance,'caller_only');
 assert.ok(read(c.entrypoint).includes('name: '+c.id));
 for(const asset of m.knowledgeAssets){
  assert.equal(fs.lstatSync(path.join(root,asset.path)).isSymbolicLink(),false);
  assert.ok(Buffer.byteLength(read(asset.path))<=12288,asset.path+' exceeds knowledge budget');
  for(const ref of asset.sourceRefs)assert.ok(read('PROVENANCE.md').includes('| '+ref+' |'),ref);
 }
 for(const g of m.expertise.contractGuidance){
  const cap=c.capabilities.find(x=>x.id===g.capabilityId);assert.ok(cap);assert.deepEqual(cap.sideEffects,[]);
  for(const field of cap.output.required){
   const check=g.outputChecks.find(x=>x.field===field);assert.ok(check);
   assert.ok(check.id&&check.criterion&&check.rejectWhen&&check.evidenceRequired.length);
   assert.equal(typeof check.blocking,'boolean');
  }
  for(const file of cap.validation)assert.ok(read(file).trim());
 }
 const examples=JSON.parse(read(m.expertise.evaluation.casesPath));
 assert.equal(examples.evaluationStatus,'not_evaluated');assert.equal(examples.inputProvenance,'synthetic');
 for(const example of examples.cases){
  const cap=c.capabilities.find(x=>x.id===example.capabilityId);assert.ok(cap);
  for(const field of cap.input.required)assert.ok(Object.hasOwn(example.input,field));
  for(const field of Object.keys(example.candidateOutputExcerpt))assert.ok(Object.hasOwn(cap.output.properties,field));
  for(const ref of example.diagnosticRefs)assert.ok(m.expertise.diagnosticSequence.some(x=>x.id===ref));
  for(const ref of example.decisionRuleRefs)assert.ok(m.expertise.decisionRules.some(x=>x.id===ref));
 }
 for(const file of ['LICENSE','NOTICE','README.md','CHANGELOG.md'])assert.ok(read(file).trim());
});
