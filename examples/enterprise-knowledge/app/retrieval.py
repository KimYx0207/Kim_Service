"""Actual lexical, exact dense, RRF and cross-encoder retrieval; no qrels here."""
import json,re,threading,time
import numpy as np
from .storage import AppError,ensure,model_fingerprint
from .identity import validate_execution
class Retriever:
 def __init__(self,storage,embedding=None,reranker=None):
  self.storage=storage;self.embedding=embedding;self.reranker=reranker;self._indexes={};self._lock=threading.RLock()
 def models(self,need_reranker=False,encoder_threads=3):
  with self._lock:
   if self.embedding is None:
    try:
     from .embedding import EmbeddingModel
     self.embedding=EmbeddingModel(threads=encoder_threads)
    except (OSError,ImportError) as e:raise AppError('index_not_ready','语义模型尚未就绪',409) from e
   if need_reranker and self.reranker is None:
    try:
     from .embedding import Reranker
     self.reranker=Reranker()
    except (OSError,ImportError) as e:raise AppError('index_not_ready','重排模型尚未就绪',409) from e
 def load_index(self,generation=None,vector_kind='float32'):
  name=generation or self.storage.setting('active_generation');ensure(name,'index_not_ready','尚未采用索引版本',409);g=self.storage.validate_generation(name);key=(g['generation'],vector_kind)
  if self.embedding is not None:ensure(model_fingerprint(self.embedding.metadata)==g['manifest']['model_fingerprint'],'model_mismatch','查询模型与索引模型不一致',409)
  if self.embedding is not None:validate_execution(g['manifest'],self.embedding.metadata,self.embedding.execution_identity)
  with self._lock:
   if key not in self._indexes:
    folder=self.storage.index_root/g['generation'];ids=json.loads((folder/'ids.json').read_text())
    if vector_kind=='float32':matrix=np.load(folder/'vectors.f32.npy',mmap_mode='r')
    elif vector_kind=='int8':
     values=np.load(folder/'vectors.i8.npy',mmap_mode='r');scales=np.load(folder/'scales.f32.npy',mmap_mode='r');matrix=values.astype(np.float32)*scales[:,None];matrix/=np.maximum(np.linalg.norm(matrix,axis=1,keepdims=True),1e-12)
    else:raise AppError('invalid_vector_kind','向量存储类型不正确')
    ensure(matrix.shape==(len(ids),g['dimension']) and len(ids)==g['total'],'index_corrupt','索引文件与登记不一致',409);self._indexes[key]=(ids,matrix)
  return g['generation'],*self._indexes[key]
 def lexical(self,query,principal,limit=50):
  tokens=re.findall(r'[^\W_]+',re.sub(r'^\s*\|user\|:\s*','',query,flags=re.I),flags=re.UNICODE)[:128]
  if not tokens:return []
  expression=' OR '.join('"'+token.replace('"','""')+'"' for token in dict.fromkeys(tokens));hidden=self.storage.allowed_ids(principal)
  clause='';params=[expression]
  if hidden:clause=' AND f.id NOT IN ('+','.join('?' for _ in hidden)+')';params+=sorted(hidden)
  with self.storage.connect() as db:
   rows=db.execute('SELECT f.id,bm25(passage_fts) AS score FROM passage_fts f WHERE passage_fts MATCH ?'+clause+' ORDER BY score ASC,f.id ASC LIMIT ?',params+[limit]).fetchall()
  return [(r['id'],-r['score']) for r in rows]
 def dense(self,query,principal,generation=None,limit=50,vector_kind='float32',query_vector=None):
  g=self.storage.validate_generation(generation);self.models(encoder_threads=g['manifest']['encoder_execution']['runtime']['session']['intra_op_num_threads']);generation,ids,vectors=self.load_index(generation,vector_kind);v=self.embedding.encode([query])[0] if query_vector is None else query_vector;scores=vectors@v;hidden=self.storage.allowed_ids(principal)
  if hidden:
   for i,key in enumerate(ids):
    if key in hidden:scores[i]=-np.inf
  count=min(limit,int(np.isfinite(scores).sum()))
  if not count:return generation,[]
  indices=np.argpartition(-scores,count-1)[:count];indices=sorted(indices,key=lambda i:(-float(scores[i]),ids[i]));return generation,[(ids[i],float(scores[i])) for i in indices]
 @staticmethod
 def fuse(lexical,dense,limit=50):
  scores={}
  for source in (lexical,dense):
   for rank,(key,_) in enumerate(source,1):scores[key]=scores.get(key,0)+1/(60+rank)
  return sorted(scores.items(),key=lambda x:(-x[1],x[0]))[:limit]
 def search(self,query,mode='hybrid',top_k=10,principal='public',generation=None,vector_kind='float32'):
  ensure(isinstance(query,str) and query.strip() and len(query)<=10000,'invalid_query','请输入有效问题（最多10000字符）');ensure(mode in ('bm25','dense','hybrid','rerank'),'invalid_mode','检索方式不正确');ensure(type(top_k) is int and 1<=top_k<=50,'invalid_top_k','结果数量须为1到50');ensure(isinstance(principal,str) and len(principal)<=100,'invalid_principal','主体格式不正确');start=time.perf_counter();lexical=[];dense=[];rerank_scores={}
  if mode in ('bm25','hybrid','rerank'):lexical=self.lexical(query,principal)
  if mode in ('dense','hybrid','rerank'):generation,dense=self.dense(query,principal,generation,vector_kind=vector_kind)
  elif generation:
   ensure(self.storage.generation(generation),'index_not_ready','索引版本不存在',409)
  else:generation=self.storage.setting('active_generation')
  if mode=='bm25':ranked=lexical
  elif mode=='dense':ranked=dense
  else:ranked=self.fuse(lexical,dense)
  if mode=='rerank':
   self.models(True);available=[]
   for key,score in ranked:
    try:available.append((key,self.storage.get(key,principal)))
    except AppError as e:
     if e.status!=404:raise
   scores=self.reranker.score(query,[(p['title']+'\n'+p['text']).strip() for _,p in available]);rerank_scores={key:float(score) for (key,_),score in zip(available,scores)};ranked=sorted(rerank_scores.items(),key=lambda x:(-x[1],x[0]))
  bm={key:i for i,(key,_) in enumerate(lexical,1)};de={key:i for i,(key,_) in enumerate(dense,1)};results=[]
  for key,score in ranked:
   try:passage=self.storage.get(key,principal)
   except AppError as e:
    if e.status==404:continue
    raise
   results.append({**passage,'score':float(score),'bm25_rank':bm.get(key),'dense_rank':de.get(key),'rerank_score':rerank_scores.get(key)})
   if len(results)>=top_k:break
  # Recheck global overlay immediately before publication, including changes
  # committed while a slower cross-encoder was running.
  hidden=self.storage.allowed_ids(principal);results=[r for r in results if r['id'] not in hidden]
  return {'query':query,'mode':mode,'generation':generation,'elapsed_ms':(time.perf_counter()-start)*1000,'candidate_count':len(ranked),'results':results,'answer_status':'evidence_only'}
