export function npv(cashFlows, rate) {
 if(!Array.isArray(cashFlows)||cashFlows.length===0||!cashFlows.every(Number.isFinite)||!Number.isFinite(rate)||rate<=-1) throw new TypeError('finite t0/end-of-period cash flows and rate > -1 required');
 const result=cashFlows.reduce((total,flow,t)=>total+flow/(1+rate)**t,0);
 if(!Number.isFinite(result)) throw new RangeError('NPV overflow');
 return result;
}
// Sequence is an explicit ordered business timeline; amounts are integer minor units.
export function cashTimeline(openingMinor, events) {
 if(!Number.isSafeInteger(openingMinor)||!Array.isArray(events)) throw new TypeError('integer opening balance and ordered events required');
 let balance=openingMinor;let minimum=balance;let firstShortfall=null;
 const timeline=events.map((event,index)=>{
  if(!event||typeof event.at!=='string'||!event.at.trim()||!Number.isSafeInteger(event.amountMinor)) throw new TypeError('event requires label and integer amountMinor');
  balance+=event.amountMinor;if(!Number.isSafeInteger(balance))throw new RangeError('balance exceeds exact integer range');
  minimum=Math.min(minimum,balance);if(balance<0&&firstShortfall===null)firstShortfall={index,at:event.at,shortfallMinor:-balance};
  return {...event,balanceMinor:balance};
 });
 if(openingMinor<0)firstShortfall={index:-1,at:'opening',shortfallMinor:-openingMinor};
 return {timeline,closingMinor:balance,minimumMinor:minimum,firstShortfall};
}
