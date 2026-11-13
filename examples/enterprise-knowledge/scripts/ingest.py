"""Download pinned complete Cloud corpus and atomically checkpoint SQLite ingestion."""
import argparse,csv,json,os,sys,urllib.request,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.storage import Storage,ROOT,COMMIT,atomic_json,canonical,digest,ensure,now
FILES={'cloud.jsonl.zip':'corpora/passage_level/cloud.jsonl.zip','cloud_lastturn.jsonl':'mtrag-human/retrieval_tasks/cloud/cloud_lastturn.jsonl','cloud_questions.jsonl':'mtrag-human/retrieval_tasks/cloud/cloud_questions.jsonl','cloud_rewrite.jsonl':'mtrag-human/retrieval_tasks/cloud/cloud_rewrite.jsonl','qrels.tsv':'mtrag-human/retrieval_tasks/cloud/qrels/dev.tsv','LICENSE':'LICENSE'}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--data-dir');p.add_argument('--batch-size',type=int,default=1000);p.add_argument('--stop-after',type=int,help='受控中断：提交到指定条数后退出，可原命令续接');a=p.parse_args();store=Storage(a.data_dir);source=store.root/'source';source.mkdir(exist_ok=True);manifest={'source_commit':COMMIT,'license':'Apache-2.0','source_kind':'public_benchmark','declared_documents':57638,'declared_passages':61022,'files':[]}
 for name,remote in FILES.items():
  target=source/name;url=f'https://raw.githubusercontent.com/IBM/mt-rag-benchmark/{COMMIT}/{remote}'
  if not target.exists():
   temp=target.with_suffix(target.suffix+'.download');print('download',name,flush=True)
   with urllib.request.urlopen(url,timeout=120) as response,temp.open('wb') as out:
    while chunk:=response.read(1024*1024):out.write(chunk)
   os.replace(temp,target)
  b=target.read_bytes();manifest['files'].append({'path':name,'url':url,'bytes':len(b),'sha256':digest(b)})
 atomic_json(source/'manifest.json',manifest);corpus_hash=manifest['files'][0]['sha256'];prior=store.setting('corpus_sha256');ensure(prior in (None,corpus_hash),'source_changed','来源摘要变化，不能续接原导入');store.set_setting('corpus_sha256',corpus_hash)
 jobs={j['id']:j for j in store.jobs()};processed=jobs.get('ingest-cloud',{}).get('processed',0)
 with zipfile.ZipFile(source/'cloud.jsonl.zip') as source_zip:total=sum(1 for _ in source_zip.open('cloud.jsonl'))
 store.job('ingest-cloud','ingest','running',processed,total,{'line':processed,'source_sha256':corpus_hash});batch=[]
 try:
  with zipfile.ZipFile(source/'cloud.jsonl.zip') as z:
   ensure(z.namelist()==['cloud.jsonl'],'invalid_archive','压缩包内容与预期不一致')
   for line_no,line in enumerate(z.open('cloud.jsonl'),1):
    if line_no<=processed:continue
    row=json.loads(line);ensure(isinstance(row.get('_id'),str) and row['_id']==row.get('id',row['_id']) and isinstance(row.get('text'),str),'invalid_record','语料记录字段无效');batch.append((line_no,row['_id'],row['text'],row.get('title') or '',row.get('url') or '',digest(row['text']),COMMIT))
    if len(batch)>=a.batch_size:
     commit_batch(store,batch,line_no,total,corpus_hash);processed=line_no;batch=[];print(f'ingested {processed}/{total}',flush=True)
     if a.stop_after and processed>=a.stop_after:store.job('ingest-cloud','ingest','paused',processed,total,{'line':processed,'source_sha256':corpus_hash});return
   if batch:commit_batch(store,batch,line_no,total,corpus_hash);processed=line_no
  count=store.count();ensure(count==total and processed==count,'count_mismatch','正式语料记录数与完整快照不一致')
  queries=[json.loads(l) for l in (source/'cloud_lastturn.jsonl').read_text().splitlines() if l.strip()];qrels=list(csv.DictReader((source/'qrels.tsv').open(),delimiter='\t'))
  with store.connect() as db:
   ids={r[0] for r in db.execute('SELECT id FROM passages')};fts=db.execute('SELECT count(*) FROM passage_fts').fetchone()[0]
  missing=sorted({r['corpus-id'] for r in qrels}-ids);ensure(not missing,'qrels_not_covered',f'相关性标注存在{len(missing)}个缺失片段');ensure(len(queries)==188 and len(qrels)==494 and fts==count,'benchmark_mismatch','评测或全文索引完整性不满足预期')
  qids={q['_id'] for q in queries};ensure(len(qids)==188 and {r['query-id'] for r in qrels}<=qids,'query_mismatch','查询标识重复或相关性查询缺失')
  document_ids={x.rsplit('-',2)[0] for x in ids};result={'passages':count,'documents':None,'documents_basis':'unverified: original document-level corpus has not been counted','derived_document_prefixes':len(document_ids),'declared_passages':61022,'declaration_mismatch':count!=61022,'declared_documents':57638,'source_commit':COMMIT,'sha256':corpus_hash,'source_kind':'public_benchmark','query_count':len(queries),'qrels_count':len(qrels),'qrels_unique_passages':len({r['corpus-id'] for r in qrels}),'qrels_coverage':1.0,'fts_rows':fts,'created_at':now()};store.set_setting('corpus',result);store.job('ingest-cloud','ingest','complete',count,count,{'line':count,'source_sha256':corpus_hash});atomic_json(ROOT/'evidence'/'ingest-manifest.json',{'source':manifest,'validation':result});print(json.dumps(result,ensure_ascii=False),flush=True)
 except BaseException as e:
  store.job('ingest-cloud','ingest','failed',processed,total,{'line':processed,'source_sha256':corpus_hash},str(e));raise

def commit_batch(store,batch,processed,total,source_hash):
 with store.connect() as db:
  db.executemany('INSERT INTO passages VALUES(?,?,?,?,?,?,?)',batch);db.executemany('INSERT INTO passage_fts(rowid,id,title,text) VALUES(?,?,?,?)',[(r[0],r[1],r[3],r[2]) for r in batch]);store.job('ingest-cloud','ingest','running',processed,total,{'line':processed,'source_sha256':source_hash},db=db)
if __name__=='__main__':main()
