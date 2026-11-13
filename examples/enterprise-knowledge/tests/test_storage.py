import json,tempfile,unittest
from pathlib import Path
from app.storage import Storage,AppError,atomic_json,digest
class PublicationTest(unittest.TestCase):
 def test_database_complete_without_durable_manifest_must_not_activate(self):
  with tempfile.TemporaryDirectory() as tmp:
   store=Storage(tmp);store.save_generation('broken','complete',1,1,2,{}, {'corpus_sha256':'source','model_fingerprint':'model'})
   with self.assertRaises(AppError):store.activate('broken',None)
   self.assertIsNone(store.setting('active_generation'))

import numpy as np
from app.storage import model_fingerprint,file_digest
from app.retrieval import Retriever
from app.identity import encoder_execution,generation_identity_fields
class FixtureEmbedding:
 metadata={'repository':'controlled-test-only','revision':'fixture','max_length':8,'output_dimension':2,'files':[]}
 @property
 def execution_identity(self):return encoder_execution(self.metadata)
 def encode(self,texts):return np.array([[1.,0.] for _ in texts],dtype=np.float32)
class FixtureReranker:
 def __init__(self):self.seen=[]
 def score(self,query,texts):self.seen+=texts;return np.array(list(range(len(texts))),dtype=np.float32)
def seed_fixture(store):
 rows=[(1,'doc-a','restricted secret zebra','Private title','https://example.test/a',digest('restricted secret zebra'),'controlled_experiment'),(2,'doc-b','zebra public documentation','Public title','https://example.test/b',digest('zebra public documentation'),'controlled_experiment')]
 with store.connect() as db:
  db.executemany('INSERT INTO passages VALUES(?,?,?,?,?,?,?)',rows);db.executemany('INSERT INTO passage_fts(rowid,id,title,text) VALUES(?,?,?,?)',[(r[0],r[1],r[3],r[2]) for r in rows])
 store.set_setting('corpus_sha256','fixture-corpus')
 for name in ('g1','g2'):
  folder=store.index_root/name;folder.mkdir();np.save(folder/'vectors.f32.npy',np.array([[1.,0.],[.9,.1]],dtype=np.float32));np.save(folder/'vectors.i8.npy',np.array([[127,0],[114,13]],dtype=np.int8));np.save(folder/'scales.f32.npy',np.array([1/127,1/127],dtype=np.float32));atomic_json(folder/'ids.json',['doc-a','doc-b']);manifest={'embedded':2,'total':2,'corpus_sha256':'fixture-corpus','model':FixtureEmbedding.metadata,'model_fingerprint':model_fingerprint(FixtureEmbedding.metadata),**generation_identity_fields(FixtureEmbedding.metadata),'files':{p.name:{'bytes':p.stat().st_size,'sha256':file_digest(p)} for p in folder.iterdir()}};atomic_json(folder/'manifest.json',manifest);store.save_generation(name,'complete',2,2,2,FixtureEmbedding.metadata,manifest)
 store.activate('g1',None)
def ev(event_id,revision,operation,principals=None):return {'event_id':event_id,'passage_id':'doc-a','revision':revision,'operation':operation,'allowed_principals':principals or [],'label':'controlled_experiment'}
class VisibilityAndGenerationTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.store=Storage(self.tmp.name);seed_fixture(self.store);self.reranker=FixtureReranker();self.r=Retriever(self.store,FixtureEmbedding(),self.reranker)
 def tearDown(self):self.tmp.cleanup()
 def test_all_routes_filter_before_scoring_and_old_generation_cannot_restore_deleted(self):
  self.store.apply_event(ev('restrict',1,'restrict',['support']))
  for mode in ('bm25','dense','hybrid','rerank'):
   self.assertNotIn('doc-a',[x['id'] for x in self.r.search('zebra',mode,50)['results']])
  self.assertFalse(any('secret' in text for text in self.reranker.seen))
  with self.assertRaises(AppError):self.store.get('doc-a')
  self.assertEqual(self.store.get('doc-a','support')['id'],'doc-a')
  self.store.apply_event(ev('delete',2,'delete'));self.store.activate('g2','g1');self.store.activate('g1','g2')
  for mode in ('bm25','dense','hybrid','rerank'):
   self.assertNotIn('doc-a',[x['id'] for x in self.r.search('zebra',mode,50,'support')['results']])
  with self.assertRaises(AppError):self.store.apply_event(ev('stale-restore',1,'restore'))
  self.store.apply_event(ev('fresh-restore',3,'restore'));self.assertEqual(self.store.get('doc-a')['id'],'doc-a')
 def test_duplicate_event_is_not_reapplied_and_cas_rejects_stale_pointer(self):
  self.store.apply_event(ev('same',1,'restrict',['support']));self.store.apply_event(ev('delete',2,'delete'));self.assertTrue(self.store.apply_event(ev('same',1,'restrict',['support']))['idempotent'])
  with self.assertRaises(AppError):self.store.get('doc-a','support')
  with self.assertRaises(AppError):self.store.apply_event(ev('same',3,'restore'))
  self.store.activate('g2','g1')
  with self.assertRaises(AppError):self.store.activate('g1','g1')
  self.assertEqual(self.store.setting('active_generation'),'g2')
 def test_cached_index_tamper_and_missing_publication_cannot_be_used(self):
  self.r.search('zebra','dense',2);path=self.store.index_root/'g1'/'vectors.f32.npy';b=bytearray(path.read_bytes());b[-1]^=1;path.write_bytes(b)
  with self.assertRaises(AppError):self.r.search('zebra','dense',2)
  with self.assertRaises(AppError):self.store.activate('g1','g1')
 def test_concurrent_revision_events_have_one_winner(self):
  from concurrent.futures import ThreadPoolExecutor
  def apply(name):
   try:self.store.apply_event(ev(name,1,'delete'));return 'applied'
   except AppError as e:return e.code
  with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(apply,['one','two']))
  self.assertEqual(sorted(results),['applied','stale_revision'])

 def test_revocation_committed_during_reranking_is_filtered_before_response(self):
  store=self.store
  class RevokingReranker:
   def score(self,query,texts):
    store.apply_event(ev('during-rerank',1,'delete'))
    return np.ones(len(texts),dtype=np.float32)
  r=Retriever(self.store,FixtureEmbedding(),RevokingReranker())
  self.assertNotIn('doc-a',[x['id'] for x in r.search('zebra','rerank',50)['results']])
if __name__=='__main__':unittest.main()
