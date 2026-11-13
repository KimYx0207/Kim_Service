import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildStartPageData } from './start-page.mjs';
import { validateAgentTaxonomy } from '../src/data/agent-taxonomy.mjs';
import { createTaskBrowser } from '../src/application/task-browser/model.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const raw = () => JSON.parse(fs.readFileSync(new URL('../config/agent-taxonomy.json', import.meta.url)));
const data = () => buildStartPageData(root);
test('every actual Agent has exactly one primary industry/domain and role without changing capability IDs', () => {
 const page=data();const agents=[...new Set(page.capabilities.filter(x=>x.componentType==='agent').map(x=>x.componentId))];
 const taxonomy=validateAgentTaxonomy(raw(),agents);
 assert.equal(taxonomy.groups.flatMap(g=>g.roles).length,agents.length);
 for(const id of agents) assert.equal(taxonomy.groups.flatMap(g=>g.roles).filter(r=>r.componentId===id).length,1);
 assert.equal(page.capabilityCount,page.capabilities.length);
 assert.equal(page.capabilities.find(c=>c.componentId==='credit-risk-analyst').classification.groupId,'financial-services');
 assert.equal(taxonomy.groups.find(g=>g.roles.some(r=>r.componentId==='financial-modeler')).kind,'cross-industry');
 assert.ok(page.capabilities.filter(c=>c.componentType!=='agent').every(c=>!c.classification));
});
test('missing, duplicated, stale and non-Agent mappings fail instead of silently hiding roles', () => {
 const ids=data().capabilities.filter(c=>c.componentType==='agent').map(c=>c.componentId);
 for(const mutate of [x=>x.groups[0].roles.pop(),x=>x.groups[1].roles.push(x.groups[0].roles[0]),x=>x.groups[0].roles[0].componentId='nonexistent-agent',x=>x.groups[0].roles[0].componentId='mcp-contract-auditor',x=>x.groups[0].title.en='']){
  const x=raw();mutate(x);assert.throws(()=>validateAgentTaxonomy(x,ids),/taxonomy/i);
 }
});
test('industry then role filters intersect search, do not admit another industry, and keep English navigation', () => {
 const page=data();for(const locale of ['zh-CN','en']){
  const app=createTaskBrowser(page.ui,{locale});
  const selected=app.filterCapabilities(page.capabilities,'','all',{groupId:'financial-services',componentId:'insurance-claims-analyst'});
  assert.deepEqual([...new Set(selected.map(c=>c.componentId))],['insurance-claims-analyst']);
  assert.deepEqual(app.filterCapabilities(page.capabilities,'','all',{groupId:'healthcare',componentId:'insurance-claims-analyst'}),[]);
  assert.deepEqual(app.filterCapabilities(page.capabilities,'','skill',{groupId:'financial-services'}),[]);
  assert.ok(app.classificationOf(selected[0]).role.length>0);
  assert.ok(app.filterCapabilities(page.capabilities,locale==='en'?'Financial services':'金融保险','agent').some(c=>c.componentId==='credit-risk-analyst'));
 }
});
