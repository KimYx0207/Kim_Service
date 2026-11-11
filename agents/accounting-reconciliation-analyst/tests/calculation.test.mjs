import test from'node:test';import assert from'node:assert/strict';import{reconcile}from'../scripts/reconcile.mjs';
const row=(id,amountMinor,currency='CNY')=>({id,amountMinor,currency});
test('equal totals with unrelated transaction identities remain unmatched',()=>{
 const r=reconcile([row('A',100),row('B',200)],[row('X',150),row('Y',150)]);
 assert.equal(r.matched.length,0);assert.equal(r.leftOnly.length,2);assert.equal(r.rightOnly.length,2);
});
test('currency and source identity control matching; duplicate records cannot consume one counterpart twice',()=>{
 const r=reconcile([row('A',100),row('B',200)],[row('A',100,'USD'),row('B',190)]);
 assert.equal(r.matched.length,0);assert.equal(r.mismatched.length,1);assert.equal(r.leftOnly.length,1);
 assert.throws(()=>reconcile([row('A',100),row('A',100)],[row('A',100)]),/duplicate/);
 const matched=reconcile([row('A',100)],[row('A',100)]);assert.equal(matched.matched.length,1);
});
