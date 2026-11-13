import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('the documented periodic-review example independently recomputes to four cartons',()=>{
 const r=run(example());assert.equal(r.result.protectionDays,7);assert.equal(r.result.inventoryPosition,45);assert.ok(Math.abs(r.result.safetyStock-1.645*3*Math.sqrt(7))<1e-9);assert.equal(r.result.orderQuantity,48);assert.equal(r.status,'completed');
});
test('capacity leaves unmet demand and MOQ above capacity never creates an impossible order',()=>{
 const x=example();x.maxOrder=36;const r=run(x);assert.equal(r.result.orderQuantity,36);assert.ok(Math.abs(r.result.unmetQuantity-2.056782720103755)<1e-9);assert.equal(r.status,'needs_review');
 x.maxOrder=18;x.minOrder=24;const y=run(x);assert.equal(y.result.orderQuantity,0);assert.ok(y.result.constraints.includes('minimum_order_infeasible'));
});
test('ample stock creates no order despite MOQ; carton rounding never exceeds capacity',()=>{
 const x=example();x.usableOnHand=200;assert.equal(run(x).result.orderQuantity,0);
 x.usableOnHand=40;x.maxOrder=47;assert.equal(run(x).result.orderQuantity,36);
});
test('unknown or incompatible assumptions cannot be passed as a valid approximation',()=>{
 const x=example();x.assumptions.fixedLeadTime=false;assert.throws(()=>run(x),/constant/);
 const y=example();y.dailyStdDev=-1;assert.throws(()=>run(y),/bounds/);
 const z=example();z.packSize=0;assert.throws(()=>run(z),/bounds/);
});
