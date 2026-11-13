// Recompute actual per-query retrieval results with the existing Kim_Service
// calculator. This never adds relevance labels to retrieval candidates.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
const service=path.resolve(option('--service-root',path.join(root,'..','..')));
const run=path.resolve(option('--run',path.join(root,'evidence/evaluations/cloud-lastturn-bm25-baseline')));
const helper=path.join(service,'skills/retrieval-evaluation/scripts/score-retrieval.mjs');
const {scoreRetrieval,macroAverage}=await import(pathToFileURL(helper).href);
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report=JSON.parse(fs.readFileSync(path.join(run,'report.json'),'utf8'));
const rows=fs.readFileSync(path.join(run,'queries.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const queryFile=report.protocol.query_file;
if(!['cloud_lastturn.jsonl','cloud_questions.jsonl','cloud_rewrite.jsonl'].includes(queryFile))throw new Error('Unknown query input setting');
const queryMap=new Map(fs.readFileSync(path.join(root,'data/source',queryFile),'utf8').trim().split('\n').map(line=>{const q=JSON.parse(line);return[q._id,q.text];}));
const queries=new Set(queryMap.keys());
const qrels=new Map();
for(const line of fs.readFileSync(path.join(root,'data/source/qrels.tsv'),'utf8').trim().split('\n').slice(1)){
  const [query,id,grade]=line.split('\t');
  if(Number(grade)>0){if(!qrels.has(query))qrels.set(query,[]);qrels.get(query).push(id);}
}
const seen=new Set();
for(const row of rows){
  const key=`${row.query_id}\0${row.mode}`;
  if(seen.has(key)||!queries.has(row.query_id))throw new Error(`Duplicate/unknown query: ${key}`);
  if(row.query!==queryMap.get(row.query_id))throw new Error(`Recorded query differs from official input: ${row.query_id}`);
  seen.add(key);
  if(row.results.length>50)throw new Error('Unexpected candidate budget');
}
const comparisons=[];
for(const method of report.methods){
  const records=rows.filter(row=>row.mode===method.mode);
  if(records.length!==queries.size)throw new Error(`Incomplete method ${method.mode}: ${records.length}/${queries.size}`);
  const values={};
  for(const k of [5,10,50]){
    const scores=records.map(row=>scoreRetrieval({relevantIds:qrels.get(row.query_id)||[],retrievedIds:row.results.map(item=>item.id),k}));
    values[`recall_${k}`]=macroAverage(scores,'recall').value;
    if(k===10)values.mrr_10=macroAverage(scores,'reciprocalRank').value;
  }
  for(const [key,value] of Object.entries(values))if(Math.abs(value-method[key])>1e-12)throw new Error(`${method.mode} ${key}: expected ${value}, got ${method[key]}`);
  comparisons.push({mode:method.mode,query_count:records.length,values,matched:true});
}
const result={status:'verified_against_existing_service_calculator',checked_at:new Date().toISOString(),run_id:report.id,corpus_count:report.corpus_count,
  service:{repository:'KimYx0207/Kim_Service',commit:execFileSync('git',['rev-parse','HEAD'],{cwd:service,encoding:'utf8'}).trim(),helper:'skills/retrieval-evaluation/scripts/score-retrieval.mjs',helper_sha256:hash(helper)},
  inputs:{qrels_sha256:hash(path.join(root,'data/source/qrels.tsv')),records_sha256:hash(path.join(run,'queries.jsonl')),report_sha256:hash(path.join(run,'report.json'))},
  comparisons,scope:'Offline calculation of recall and MRR from real retrieval results; not answer correctness or native host verification.'};
fs.writeFileSync(path.join(run,'service-independent-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
