import test from'node:test';import assert from'node:assert/strict';import{replayMoneyEvents}from'../scripts/replay-money-events.mjs';
const paid={kind:'payment_succeeded',operationId:'P1',amountMinor:10000},refund={kind:'refund_succeeded',operationId:'R1',amountMinor:2500};
test('duplicate notifications and late pending events do not duplicate money effects',()=>{
 const r=replayMoneyEvents([paid,refund,refund,{kind:'payment_pending',operationId:'P1',amountMinor:10000}]);
 assert.deepEqual(r,{status:'reconciled',paidMinor:10000,refundedMinor:2500,netMinor:7500,pendingPayments:[]});
});
test('pending-only payments remain visible and contribute no confirmed money',()=>{
 const pending={kind:'payment_pending',operationId:'P2',amountMinor:5000};
 assert.deepEqual(replayMoneyEvents([pending]),{status:'pending',paidMinor:0,refundedMinor:0,netMinor:0,pendingPayments:[{operationId:'P2',amountMinor:5000}]});
});
test('success clears its own pending operation regardless of delivery order, while another remains pending',()=>{
 const p1={kind:'payment_pending',operationId:'P1',amountMinor:10000};
 assert.equal(replayMoneyEvents([p1,paid]).status,'reconciled');
 assert.equal(replayMoneyEvents([paid,p1]).status,'reconciled');
 const r=replayMoneyEvents([paid,p1,{kind:'payment_pending',operationId:'P2',amountMinor:5000}]);
 assert.equal(r.status,'pending');assert.equal(r.netMinor,10000);assert.deepEqual(r.pendingPayments,[{operationId:'P2',amountMinor:5000}]);
});
test('out-of-order events reconcile after replay, while unexplained refunds remain inconsistent',()=>{
 assert.equal(replayMoneyEvents([refund,paid]).netMinor,7500);
 assert.equal(replayMoneyEvents([refund]).status,'incomplete_or_inconsistent');
 assert.throws(()=>replayMoneyEvents([paid,refund,{...refund,amountMinor:3000}]),/conflicting/);
});
