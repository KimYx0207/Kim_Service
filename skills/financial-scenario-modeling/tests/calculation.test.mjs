import test from 'node:test';import assert from 'node:assert/strict';
import {npv,cashTimeline} from '../scripts/calculate.mjs';
test('positive closing cash does not hide an earlier funding gap',()=>{
 const r=cashTimeline(1000000,[{at:'5日',amountMinor:-1200000},{at:'10日',amountMinor:800000}]);
 assert.equal(r.closingMinor,600000);assert.equal(r.minimumMinor,-200000);assert.deepEqual(r.firstShortfall,{index:0,at:'5日',shortfallMinor:200000});
});
test('NPV leaves t0 investment undiscounted and uses explicit end-of-period timing',()=>{
 assert.ok(Math.abs(npv([-100,60,60],0.1)-4.132231404958674)<1e-10);
 assert.equal(npv([-100,60,60],0),20);
 assert.throws(()=>npv([100],-1));assert.throws(()=>cashTimeline(100,[{at:'now',amountMinor:0.5}]));
});
