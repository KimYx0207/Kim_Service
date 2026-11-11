import test from'node:test';import assert from'node:assert/strict';import{replayMoneyEvents}from'../scripts/replay-money-events.mjs';
const paid={kind:'payment_succeeded',operationId:'P1',amountMinor:10000},refund={kind:'refund_succeeded',operationId:'R1',amountMinor:2500};
test('duplicate notifications and late pending events do not duplicate money effects',()=>{
 const r=replayMoneyEvents([paid,refund,refund,{kind:'payment_pending',operationId:'P1',amountMinor:10000}]);
 assert.deepEqual(r,{status:'reconciled',paidMinor:10000,refundedMinor:2500,netMinor:7500});
});
test('out-of-order events reconcile after replay, while unexplained refunds remain inconsistent',()=>{
 assert.equal(replayMoneyEvents([refund,paid]).netMinor,7500);
 assert.equal(replayMoneyEvents([refund]).status,'incomplete_or_inconsistent');
 assert.throws(()=>replayMoneyEvents([paid,refund,{...refund,amountMinor:3000}]),/conflicting/);
});
