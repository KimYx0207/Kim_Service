// Reference replay for one order and one currency; does not call a payment API.
export function replayMoneyEvents(events) {
 if(!Array.isArray(events))throw new TypeError('event array required');
 const operations=new Map(),pending=new Map(),confirmedPayments=new Set();let paidMinor=0,refundedMinor=0;
 for(const e of events){
  if(!e||!['payment_succeeded','refund_succeeded','payment_pending'].includes(e.kind)||typeof e.operationId!=='string'||!e.operationId||!Number.isSafeInteger(e.amountMinor)||e.amountMinor<0)throw new TypeError('valid event kind, operationId and nonnegative integer amount required');
  if(e.kind==='payment_pending'){pending.set(e.operationId,e.amountMinor);continue;}
  const key=JSON.stringify([e.kind,e.operationId]);
  if(operations.has(key)){if(operations.get(key)!==e.amountMinor)throw new Error('conflicting duplicate operation');continue;}
  operations.set(key,e.amountMinor);if(e.kind==='payment_succeeded'){paidMinor+=e.amountMinor;confirmedPayments.add(e.operationId);}else refundedMinor+=e.amountMinor;
  if(!Number.isSafeInteger(paidMinor)||!Number.isSafeInteger(refundedMinor))throw new RangeError('amount exceeds exact integer range');
 }
 const pendingPayments=[...pending].filter(([id])=>!confirmedPayments.has(id)).map(([operationId,amountMinor])=>({operationId,amountMinor}));
 const status=refundedMinor>paidMinor?'incomplete_or_inconsistent':pendingPayments.length?'pending':'reconciled';
 return {status,paidMinor,refundedMinor,netMinor:paidMinor-refundedMinor,pendingPayments};
}
