// One fixed input partition, keyed latest-version records. This is a local reference model.
export function replayPartition(current,rows,partition) {
 if(!Array.isArray(current)||!Array.isArray(rows)||typeof partition!=='string'||!partition)throw new TypeError('two record arrays and partition required');
 const records=new Map();
 for(const r of [...current,...rows]){
  if(!r||r.partition!==partition||typeof r.id!=='string'||!r.id||!Number.isSafeInteger(r.version)||r.version<0||!Number.isSafeInteger(r.amountMinor))throw new TypeError('record must bind partition, ID, version and integer amount');
  const previous=records.get(r.id);
  if(!previous||r.version>previous.version)records.set(r.id,{id:r.id,version:r.version,partition:r.partition,amountMinor:r.amountMinor});
  else if(r.version===previous.version&&r.amountMinor!==previous.amountMinor)throw new Error('conflicting equal-version record '+r.id);
 }
 return [...records.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
