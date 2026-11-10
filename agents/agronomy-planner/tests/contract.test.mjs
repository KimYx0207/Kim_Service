import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('independently copied package preserves method, evidence rules and real knowledge resources',()=>{
 const c=JSON.parse(read('capability.json')),m=JSON.parse(read('method.json'));
 assert.equal(c.id,path.basename(root));assert.equal(m.roleId,c.id);assert.equal(m.automaticInvocation,false);
 assert.equal(m.runtimeStatus,'needs_probe');assert.equal(m.finalAcceptance,'caller_only');
 assert.ok(read(c.entrypoint).includes('name: '+c.id));
 for(const a of m.knowledgeAssets){const p=path.join(root,a.path);assert.equal(fs.lstatSync(p).isSymbolicLink(),false);assert.ok(Buffer.byteLength(read(a.path))<=12288);for(const s of a.sourceRefs)assert.ok(read('PROVENANCE.md').includes('| '+s+' |'));}
 for(const g of m.expertise.contractGuidance){const cap=c.capabilities.find(x=>x.id===g.capabilityId);assert.ok(cap);assert.deepEqual(cap.sideEffects,[]);const checks=new Map(g.outputChecks.map(x=>[x.field,x]));for(const f of cap.output.required){const q=checks.get(f);assert.ok(q);assert.ok(q.id&&q.criterion&&q.rejectWhen&&q.evidenceRequired.length);assert.ok(['artifact_inspection','deterministic_recompute','behavior_probe','source_check','domain_review'].includes(q.verificationMethod));assert.equal(typeof q.blocking,'boolean');}}
 const examples=JSON.parse(read(m.expertise.evaluation.casesPath));assert.equal(examples.evaluationStatus,'not_evaluated');assert.equal(examples.inputProvenance,'synthetic');
 for(const ex of examples.cases){const cap=c.capabilities.find(x=>x.id===ex.capabilityId);assert.ok(cap);for(const f of cap.input.required)assert.ok(Object.hasOwn(ex.input,f));for(const f of Object.keys(ex.candidateOutputExcerpt))assert.ok(Object.hasOwn(cap.output.properties,f));}
 for(const f of ['LICENSE','NOTICE','README.md','CHANGELOG.md'])assert.ok(read(f).trim());
});
