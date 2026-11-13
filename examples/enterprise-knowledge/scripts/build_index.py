"""Checkpoint real full-corpus embeddings; completed candidate requires explicit adoption."""
import argparse,fcntl,hashlib,json,os,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
from app.storage import Storage,atomic_json,ensure,now,model_fingerprint
from app.identity import validate_execution,generation_identity_fields,measurement_source

def file_hash(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  while b:=f.read(1024*1024):h.update(b)
 return h.hexdigest()

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--data-dir');p.add_argument('--generation',default='cloud-minilm-v2');p.add_argument('--batch-size',type=int,default=32);p.add_argument('--threads',type=int,default=3);p.add_argument('--checkpoint-every',type=int,default=128);p.add_argument('--stop-after',type=int);p.add_argument('--activate',action='store_true');a=p.parse_args();s=Storage(a.data_dir)
 import re
 ensure(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}',a.generation),'invalid_generation','索引版本名称不正确');corpus=s.setting('corpus');ensure(corpus and corpus['passages']==s.count(),'corpus_not_ready','请先完成全量导入与覆盖验证',409)
 folder=s.index_root/a.generation;folder.mkdir(exist_ok=True)
 with (folder/'build.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  from app.embedding import EmbeddingModel
  model=EmbeddingModel(threads=a.threads);rows=s.all_passages();total=len(rows);dimension=model.metadata['output_dimension'];fingerprint=model_fingerprint(model.metadata);existing=s.generation(a.generation)
  if existing:
   m=existing['manifest'];ensure(m.get('corpus_sha256')==corpus['sha256'] and m.get('model_fingerprint')==fingerprint,'incompatible_resume','语料或模型变化，不能续接此索引',409)
   validate_execution(m, model.metadata, model.execution_identity)
   if existing['status']=='complete':
    s.validate_generation(a.generation)
    print(json.dumps(existing,ensure_ascii=False));
    if a.activate:print(s.activate(a.generation,s.setting('active_generation')))
    return
   processed=existing['embedded'];truncated_before=m.get('truncated_count',0);elapsed_before=m.get('elapsed_seconds',0)
  else:processed=0;truncated_before=0;elapsed_before=0
  path=folder/'vectors.f32.npy';ids=[r['id'] for r in rows];atomic_json(folder/'ids.json',ids)
  if processed:
   vectors=np.lib.format.open_memmap(path,mode='r+');ensure(vectors.shape==(total,dimension),'invalid_checkpoint','向量文件形状与检查点不一致')
  else:vectors=np.lib.format.open_memmap(path,mode='w+',dtype=np.float32,shape=(total,dimension))
  started=time.perf_counter();manifest={'generation':a.generation,'corpus_sha256':corpus['sha256'],'source_revision':corpus['source_commit'],'model_fingerprint':fingerprint,'model':model.metadata,'dimension':dimension,'total':total,'input_format':'title + newline + text','max_length':model.max_length,'truncated_count':truncated_before,'elapsed_seconds':elapsed_before,'created_at':now(),**generation_identity_fields(model.metadata,a.threads,model.execution_identity),'measurement_source':measurement_source()}
  def checkpoint(status,error=None):
   vectors.flush()
   with open(path,'rb') as f:os.fsync(f.fileno())
   manifest.update({'embedded':processed,'truncated_count':truncated_before+model.truncated_count,'elapsed_seconds':elapsed_before+time.perf_counter()-started,'updated_at':now()})
   atomic_json(folder/'checkpoint.json',manifest)
   if status=='complete':atomic_json(folder/'manifest.json',manifest)
   s.save_generation(a.generation,status,processed,total,dimension,model.metadata,manifest);s.job('build-'+a.generation,'embedding',status,processed,total,{'generation':a.generation,'offset':processed,'manifest':str(folder.relative_to(s.root) / 'checkpoint.json')},error)
  checkpoint('running');last=processed
  try:
   for offset in range(processed,total,a.batch_size):
    batch=rows[offset:offset+a.batch_size];values=model.encode([(r['title']+'\n'+r['text']).strip() for r in batch],batch_size=a.batch_size);ensure(values.shape==(len(batch),dimension),'invalid_vectors','模型输出形状不正确');vectors[offset:offset+len(batch)]=values;processed=offset+len(batch)
    if processed-last>=a.checkpoint_every or processed==total:
     checkpoint('running');last=processed;print(f'embedded {processed}/{total} elapsed={manifest["elapsed_seconds"]:.1f}s truncated={manifest["truncated_count"]}',flush=True)
    if a.stop_after and processed>=a.stop_after:checkpoint('paused');return
   # A separate real output-vector storage experiment. ONNX weight quantization
   # and embedding output quantization are deliberately reported separately.
   scales=np.maximum(np.max(np.abs(vectors),axis=1)/127,1e-12).astype(np.float32);quantized=np.rint(np.asarray(vectors)/scales[:,None]).clip(-127,127).astype(np.int8);np.save(folder/'vectors.i8.npy',quantized);np.save(folder/'scales.f32.npy',scales)
   manifest['files']={p.name:{'bytes':p.stat().st_size,'sha256':file_hash(p)} for p in [path,folder/'vectors.i8.npy',folder/'scales.f32.npy',folder/'ids.json']};manifest['storage_experiment']={'float32_bytes':path.stat().st_size,'int8_plus_scales_bytes':(folder/'vectors.i8.npy').stat().st_size+(folder/'scales.f32.npy').stat().st_size,'scheme':'per-row symmetric int8; float32 scales; exact dot-product over reconstructed values'}
   checkpoint('complete');s.validate_generation(a.generation);print(json.dumps({'status':'complete','generation':a.generation,'embedded':processed,'seconds':manifest['elapsed_seconds'],'files':manifest['files']},ensure_ascii=False),flush=True)
   if a.activate:print(json.dumps(s.activate(a.generation,s.setting('active_generation'))))
  except BaseException as e:checkpoint('paused' if isinstance(e,KeyboardInterrupt) else 'failed',str(e));raise
if __name__=='__main__':main()
