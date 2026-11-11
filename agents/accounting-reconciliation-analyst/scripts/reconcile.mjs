// Match stable source IDs within a currency; never infer identity from equal totals.
export function reconcile(left,right) {
 function index(rows){
  if(!Array.isArray(rows))throw new TypeError('transaction array required');
  const map=new Map();
  for(const row of rows){
   if(!row||typeof row.id!=='string'||!row.id||typeof row.currency!=='string'||!row.currency||!Number.isSafeInteger(row.amountMinor))throw new TypeError('id, currency and integer amountMinor required');
   const key=JSON.stringify([row.currency,row.id]);if(map.has(key))throw new Error('duplicate source transaction '+row.id);map.set(key,row);
  }return map;
 }
 const l=index(left),r=index(right),matched=[],mismatched=[],leftOnly=[],rightOnly=[];
 for(const [key,a] of l){const b=r.get(key);if(!b){leftOnly.push(a);continue;}if(a.amountMinor===b.amountMinor)matched.push({left:a,right:b});else mismatched.push({left:a,right:b});}
 for(const [key,b] of r)if(!l.has(key))rightOnly.push(b);
 return {matched,mismatched,leftOnly,rightOnly};
}
