import test from'node:test';import assert from'node:assert/strict';import{replayPartition}from'../scripts/replay-partition.mjs';
const p='2026-11-10',r=(id,amountMinor,version=1)=>({id,amountMinor,version,partition:p});
test('same-partition duplicate and repeated runs keep the same business records',()=>{
 const input=[r('O1',10000),r('O2',20000),r('O1',10000)];
 const first=replayPartition([],input,p),second=replayPartition(first,input,p);
 assert.deepEqual(second,first);assert.equal(second.length,2);assert.equal(second.reduce((s,x)=>s+x.amountMinor,0),30000);
});
test('newer updates replace values but conflicts and another partition are visible',()=>{
 const current=replayPartition([],[r('O1',10000)],p);
 assert.equal(replayPartition(current,[r('O1',12000,2)],p)[0].amountMinor,12000);
 assert.throws(()=>replayPartition(current,[r('O1',12000)],p),/conflicting/);
 assert.throws(()=>replayPartition(current,[{...r('O2',20000),partition:'2026-11-11'}],p));
});
