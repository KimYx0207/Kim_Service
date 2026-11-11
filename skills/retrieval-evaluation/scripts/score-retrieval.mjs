// P@k keeps k slots: duplicates occupy rank positions but earn no extra hit.
export function scoreRetrieval({ relevantIds, retrievedIds, k }) {
 if(!Array.isArray(relevantIds)||!Array.isArray(retrievedIds)||!Number.isSafeInteger(k)||k<1)throw new TypeError('ID arrays and positive integer k required');
 const valid=x=>(typeof x==='string'&&x.length>0)||(typeof x==='number'&&Number.isSafeInteger(x));
 if(!relevantIds.every(valid)||!retrievedIds.every(valid))throw new TypeError('document IDs must be nonempty strings or safe integers');
 const gold=new Set(relevantIds),top=retrievedIds.slice(0,k);
 if(gold.size===0)return {hits:0,precision:null,recall:null,reciprocalRank:null,unlabeled:true};
 const hits=new Set(top.filter(x=>gold.has(x))).size;
 const rank=top.findIndex(x=>gold.has(x));
 return {hits,precision:hits/k,recall:hits/gold.size,reciprocalRank:rank<0?0:1/(rank+1),unlabeled:false};
}
export function macroAverage(results, metric) {
 if(!['precision','recall','reciprocalRank'].includes(metric))throw new TypeError('unknown metric');
 const values=results.map(r=>r[metric]).filter(v=>v!==null);
 if(!values.every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw new TypeError('invalid score');
 return {value:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,observed:values.length,excluded:results.length-values.length};
}
