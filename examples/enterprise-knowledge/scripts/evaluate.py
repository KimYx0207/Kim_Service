"""Full 188-query official-lastturn retrieval benchmark; qrels only score results."""
import argparse,csv,json,math,os,statistics,sys,time,fcntl
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.storage import Storage,ROOT,atomic_json,now,digest,canonical,ensure
from app.retrieval import Retriever
from app.identity import evaluation_execution, fingerprint, bind_evaluation_protocol, measurement_source

def score(ids,relevant):
 if not relevant:return {'recall_5':None,'recall_10':None,'recall_50':None,'ndcg_10':None,'mrr_10':None}
 result={f'recall_{k}':len(set(ids[:k])&relevant)/len(relevant) for k in (5,10,50)};seen=set();gain=0;mrr=0
 for i,key in enumerate(ids[:10],1):
  if key in relevant and key not in seen:
   gain+=1/math.log2(i+1)
   if not mrr:mrr=1/i
  seen.add(key)
 ideal=sum(1/math.log2(i+1) for i in range(1,min(10,len(relevant))+1));result.update(ndcg_10=gain/ideal,mrr_10=mrr);return result

def read_records(path):
 if not path.exists():return []
 raw=path.read_bytes();lines=raw.splitlines(keepends=True);records=[];consumed=0;seen=set()
 for index,line in enumerate(lines):
  if not line.strip():consumed+=len(line);continue
  try:row=json.loads(line)
  except (ValueError,UnicodeError):
   if index==len(lines)-1 and not line.endswith(b'\n'):
    fragment=path.with_name(path.name+'.'+digest(line)+'.fragment')
    with fragment.open('wb') as out:out.write(line);out.flush();os.fsync(out.fileno())
    with path.open('r+b') as out:out.truncate(consumed);out.flush();os.fsync(out.fileno())
    break
   raise ValueError(f'评测文件第{index+1}行损坏，禁止静默跳过')
  key=(row.get('query_id'),row.get('mode'));ensure(all(isinstance(x,str) for x in key) and key not in seen,'duplicate_result','逐题记录重复或缺少标识',409);seen.add(key);records.append(row);consumed+=len(line)
 else:
  if raw and not raw.endswith(b'\n'):
   with path.open('ab') as out:out.write(b'\n');out.flush();os.fsync(out.fileno())
 return records

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--data-dir');p.add_argument('--generation',default='cloud-minilm-v2');p.add_argument('--id');p.add_argument('--methods',default='bm25,dense,hybrid,rerank');p.add_argument('--vector-kind',choices=['float32','int8'],default='float32');p.add_argument('--query-file',default='cloud_lastturn.jsonl');a=p.parse_args();s=Storage(a.data_dir);corpus=s.setting('corpus');ensure(corpus and corpus['qrels_coverage']==1.0,'corpus_not_ready','请先完成正式语料导入');ensure(not s.allowed_ids('public'),'overlay_active','正式基准运行前需移除隔离受控覆盖层；不得混用权限实验',409)
 modes=a.methods.split(',');ensure(all(m in ('bm25','dense','hybrid','rerank') for m in modes),'invalid_mode','评测方法不正确');run_id=a.id or f'cloud-lastturn-{a.vector_kind}-{time.strftime("%Y%m%dT%H%M%S")}';ensure(all(c.isalnum() or c in '-_' for c in run_id),'invalid_id','评测编号不正确');out=ROOT/'evidence'/'evaluations'/run_id;out.mkdir(parents=True,exist_ok=True)
 with (out/'run.lock').open('a') as run_lock:
  fcntl.flock(run_lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  queries_path=s.root/'source'/a.query_file;queries=[json.loads(x) for x in queries_path.read_text().splitlines() if x.strip()];ensure(len(queries)==188,'query_count','必须完整运行188条官方问题');qrels_path=s.root/'source'/'qrels.tsv';labels={}
  with qrels_path.open() as qrels_file:
   for row in csv.DictReader(qrels_file,delimiter='\t'):
    if int(row['score'])>0:labels.setdefault(row['query-id'],set()).add(row['corpus-id'])
  protocol={'generation':a.generation,'vector_kind':a.vector_kind,'methods':modes,'query_file':a.query_file,'query_sha256':digest(queries_path.read_bytes()),'qrels_sha256':digest(qrels_path.read_bytes()),'corpus_sha256':corpus['sha256'],'candidate_budget':50,'rrf_constant':60,'gold_injection':False,'principal':'public','metric_granularity':'official_passage_id','empty_result':'zero for labeled queries','unlabeled':'null and excluded; count separately'}
  r=Retriever(s);execution=evaluation_execution(r,modes,a.generation);protocol.update({'identity_schema':2,'execution':execution,'execution_fingerprint':fingerprint(execution)})
  previous=out/'protocol.json';bind_evaluation_protocol(previous,protocol)
  records=[];results_path=out/'queries.jsonl'
  if results_path.exists():records=read_records(results_path)
  ensure(all(x['query_id'] in {q['_id'] for q in queries} and x['mode'] in modes for x in records),'result_scope','已存结果不属于当前问题或方法',409);done={(row['query_id'],row['mode']) for row in records};job_id='evaluate-'+run_id;total=len(queries)*len(modes);failures=[]
  report={'id':run_id,'status':'running','query_count':len(queries),'corpus_count':corpus['passages'],'created_at':now(),'generation':a.generation,'vector_kind':a.vector_kind,'protocol':protocol,'measurement_source':measurement_source(),'methods':[],'limitations':['检索指标不是答案正确率','指标按query宏平均；BM25为FTS5 porter unicode61+去重词OR查询、移除前导|user|标记，最多128词','固定公开dev集未用于本轮参数调优；不声称独立隐藏测试泛化','公开人工benchmark问题，不是真实企业私有工单'],'failures':[],'records_path':f'/api/evaluations/{run_id}/queries','download_url':f'/api/evaluations/{run_id}/queries','per_query_download':f'/api/evaluations/{run_id}/queries'}
  def progress(status):
   report['status']=status;report['processed']=len(records);summaries=[]
   for mode in modes:
    rr=[x for x in records if x['mode']==mode];ok=[x for x in rr if not x.get('error')];ms=sorted(x['elapsed_ms'] for x in ok);m={'mode':mode,'status':'complete' if len(rr)==len(queries) and len(ok)==len(rr) else 'running' if status=='running' else 'partial','query_count':len(rr),'unlabeled_queries':sum(x.get('metrics',{}).get('recall_10') is None for x in rr)}
    for metric in ['recall_5','recall_10','recall_50','ndcg_10','mrr_10']:
     values=[x['metrics'][metric] for x in rr if x.get('metrics',{}).get(metric) is not None];m[metric]=sum(values)/len(values) if values else None
    m['p50_ms']=statistics.median(ms) if ms else None;m['p95_ms']=ms[min(len(ms)-1,math.ceil(.95*len(ms))-1)] if ms else None;summaries.append(m)
   report['methods']=summaries;report['failures']=sorted([{'query_id':x['query_id'],'query':x.get('query'),'mode':x['mode'],'recall_10':x.get('metrics',{}).get('recall_10'),'error':x.get('error'),'reason':'执行失败' if x.get('error') else 'top10未覆盖全部相关片段'} for x in records if x.get('error') or (x.get('metrics',{}).get('recall_10') is not None and x['metrics']['recall_10']<1)],key=lambda x:(x['recall_10'] if x['recall_10'] is not None else -1,x['query_id'],x['mode']));atomic_json(out/'report.json',report);s.job(job_id,'evaluation',status,len(records),total,{'report_id':run_id,'records':len(records)})
  progress('running')
  try:
   with results_path.open('a',buffering=1) as f:
    for query in queries:
     for mode in modes:
      if (query['_id'],mode) in done:continue
      try:
       response=r.search(query['text'],mode,50,'public',a.generation,a.vector_kind);row={'query_id':query['_id'],'query':query['text'],'mode':mode,'generation':response['generation'],'vector_kind':a.vector_kind,'elapsed_ms':response['elapsed_ms'],'relevant_ids':sorted(labels.get(query['_id'],set())),'results':[{k:v for k,v in item.items() if k in ('id','score','bm25_rank','dense_rank','rerank_score')} for item in response['results']]};row['metrics']=score([x['id'] for x in row['results']],labels.get(query['_id'],set()))
      except Exception as e:row={'query_id':query['_id'],'query':query['text'],'mode':mode,'elapsed_ms':0,'results':[],'relevant_ids':sorted(labels.get(query['_id'],set())),'metrics':score([],labels.get(query['_id'],set())),'error':str(e)}
      f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();os.fsync(f.fileno());records.append(row);done.add((row['query_id'],mode));progress('running');print(f'evaluated {len(records)}/{total} {query["_id"]} {mode} recall10={row["metrics"]["recall_10"]} ms={row["elapsed_ms"]:.1f}',flush=True)
   status='complete' if not any(x.get('error') for x in records) else 'partial';progress(status);print(json.dumps(report,ensure_ascii=False),flush=True)
  except BaseException:progress('paused');raise
if __name__=='__main__':main()
