import tempfile,unittest,json
from pathlib import Path
from scripts.evaluate import read_records
class EvaluationRecovery(unittest.TestCase):
 def test_torn_final_append_preserves_completed_query_and_evidence(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'queries.jsonl';row={'query_id':'q1','mode':'bm25'};p.write_bytes((json.dumps(row)+'\n{"query_id":"q2').encode())
   self.assertEqual(read_records(p),[row]);self.assertEqual(len(list(Path(tmp).glob('*.fragment'))),1)
 def test_complete_corrupt_middle_line_must_not_be_hidden(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'queries.jsonl';p.write_text('{"query_id":"q1","mode":"bm25"}\nBROKEN\n{"query_id":"q2","mode":"bm25"}\n')
   with self.assertRaises(Exception):read_records(p)
if __name__=='__main__':unittest.main()
