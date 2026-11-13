"""Controlled identity failures, not model-quality measurements."""
import json
import tempfile
import unittest
import contextlib
import io
from pathlib import Path
from unittest.mock import Mock, patch

from app.embedding import EmbeddingModel
from app.storage import AppError, digest
from app.storage import Storage, atomic_json, model_fingerprint
from app.identity import encoder_execution, evaluation_execution, fingerprint, bind_evaluation_protocol
from app.retrieval import Retriever
from scripts import build_index, evaluate
import numpy as np


def model_fixture(folder):
    names = ('model.onnx', 'tokenizer.json', 'tokenizer_config.json', 'config.json',
             'sentence_bert_config.json', '1_Pooling/config.json')
    files = []
    for name in names:
        target = folder / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b'controlled-test-bytes')
        files.append({'local_path': name, 'sha256': digest(target.read_bytes()),
                      'bytes': target.stat().st_size})
    metadata = {'repository': 'controlled-test-only', 'revision': 'fixture',
                'max_length': 8, 'output_dimension': 2, 'files': files,
                'pooling': 'attention-mask mean; L2 normalization', 'format': 'fixture'}
    (folder / 'manifest.json').write_text(json.dumps(metadata))
    return metadata


class ModelBytesIdentityTests(unittest.TestCase):
    def test_changed_actual_bytes_are_rejected_before_session_load(self):
        for filename in ('model.onnx', 'tokenizer.json', 'config.json'):
            with self.subTest(filename=filename), tempfile.TemporaryDirectory() as tmp:
                folder = Path(tmp)
                model_fixture(folder)
                session = Mock()
                session.get_inputs.return_value = []
                with patch('app.embedding.Tokenizer.from_file'), patch(
                        'app.embedding.ort.InferenceSession', return_value=session) as load:
                    EmbeddingModel(folder)
                    load.reset_mock()
                    target = folder / filename
                    target.write_bytes(b'changed-actual-bytes')
                    with self.assertRaises(AppError):
                        EmbeddingModel(folder)
                    load.assert_not_called()


class ControlledEncoder:
    """No real model quality is exercised by these checkpoint fixtures."""
    metadata = {'repository': 'controlled-test-only', 'revision': 'fixture',
                'max_length': 8, 'output_dimension': 2, 'files': []}
    max_length = 8
    truncated_count = 0

    def __init__(self, threads=3):
        self.execution_identity = encoder_execution(self.metadata, threads)

    def encode(self, texts, batch_size=32):
        return np.array([[1., 0.] for _ in texts], dtype=np.float32)


class CheckpointIdentityTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        self.store = Storage(self.folder / 'data')
        rows = [(i, f'doc-{i}', f'zebra {i}', '', '', digest(f'zebra {i}'), 'fixture')
                for i in (1, 2)]
        with self.store.connect() as db:
            db.executemany('INSERT INTO passages VALUES(?,?,?,?,?,?,?)', rows)
            db.executemany('INSERT INTO passage_fts(rowid,id,title,text) VALUES(?,?,?,?)',
                           [(r[0], r[1], r[3], r[2]) for r in rows])
        self.store.set_setting('corpus_sha256', 'fixture')
        self.store.set_setting('corpus', {'passages': 2, 'sha256': 'fixture',
                                         'source_commit': 'fixture'})
        self.source = self.folder / 'encoder.py'
        self.source.write_text('controlled encoder implementation v1\n')
        self.patch_source = patch('app.identity.ENCODER_SOURCE', self.source)
        self.patch_source.start()
        self.addCleanup(self.patch_source.stop)

    def run_build(self, *extra):
        with patch('app.embedding.EmbeddingModel', ControlledEncoder), patch('sys.argv', [
                'build_index.py', '--data-dir', str(self.store.root), '--generation', 'test-v2',
                '--batch-size', '1', '--checkpoint-every', '1', *extra]), contextlib.redirect_stdout(io.StringIO()):
            build_index.main()

    def test_changed_encoder_rejects_resume_without_advancing_checkpoint(self):
        self.run_build('--stop-after', '1')
        before = self.store.generation('test-v2')
        self.assertEqual(before['embedded'], 1)
        self.source.write_text('controlled encoder implementation v2: changed pooling\n')
        with self.assertRaisesRegex(AppError, '编码实现'):
            self.run_build()
        self.assertEqual(self.store.generation('test-v2'), before)

    def test_identical_execution_resumes_and_changed_encoder_rejects_complete_and_load(self):
        self.run_build('--stop-after', '1')
        self.run_build('--activate')
        self.assertEqual(self.store.generation('test-v2')['embedded'], 2)
        r = Retriever(self.store, ControlledEncoder())
        self.assertEqual(len(r.search('zebra', 'dense', 2)['results']), 2)
        self.source.write_text('controlled encoder implementation v2\n')
        for action in (self.run_build, lambda: self.store.activate('test-v2', 'test-v2'),
                       lambda: r.search('zebra', 'dense', 2)):
            with self.assertRaises(AppError):
                action()

    def test_legacy_generation_cannot_be_resumed_or_relabelled(self):
        manifest = {'corpus_sha256': 'fixture',
                    'model_fingerprint': model_fingerprint(ControlledEncoder.metadata)}
        self.store.save_generation('test-v2', 'paused', 1, 2, 2,
                                   ControlledEncoder.metadata, manifest)
        with self.assertRaisesRegex(AppError, '旧索引'):
            self.run_build()
        self.assertEqual(self.store.generation('test-v2')['manifest'], manifest)

    def test_runtime_version_change_rejects_resume(self):
        self.run_build('--stop-after', '1')
        import importlib.metadata
        original = importlib.metadata.version
        with patch('app.identity.importlib.metadata.version', side_effect=lambda name:
                   'changed-version' if name == 'tokenizers' else original(name)):
            with self.assertRaises(AppError):
                self.run_build()


class EvaluationIdentityTests(unittest.TestCase):
    def test_changed_scorer_cannot_resume_existing_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            scorer = folder / 'scorer.py'
            scorer.write_text('controlled scorer implementation v1\n')
            retriever = Retriever(Storage(folder / 'data'))
            with patch('app.identity.SCORER_SOURCE', scorer):
                execution = evaluation_execution(retriever, ['bm25'])
                protocol = {'identity_schema': 2, 'execution': execution,
                            'execution_fingerprint': fingerprint(execution)}
                path = folder / 'protocol.json'
                bind_evaluation_protocol(path, protocol)
                original = path.read_bytes()
                scorer.write_text('controlled scorer implementation v2\n')
                changed = evaluation_execution(retriever, ['bm25'])
                with self.assertRaises(AppError):
                    bind_evaluation_protocol(path, {**protocol, 'execution': changed,
                                                   'execution_fingerprint': fingerprint(changed)})
                self.assertEqual(path.read_bytes(), original)

    def test_cli_checks_changed_scorer_before_touching_partial_results(self):
        # 188 controlled fixtures exercise the CLI's fixed-count contract only.
        # They are isolated from all official corpus/evaluation evidence.
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            store = Storage(folder / 'data')
            source = store.root / 'source'
            source.mkdir()
            queries = [{'_id': f'fixture-{i}', 'text': 'zebra'} for i in range(188)]
            (source / 'cloud_lastturn.jsonl').write_text(
                ''.join(json.dumps(q) + '\n' for q in queries))
            (source / 'qrels.tsv').write_text('query-id\tcorpus-id\tscore\n' +
                ''.join(q['_id'] + '\tdoc-a\t1\n' for q in queries))
            with store.connect() as db:
                db.execute('INSERT INTO passages VALUES(1,?,?,?,?,?,?)',
                           ('doc-a', 'zebra fixture', '', '', digest('zebra fixture'), 'fixture'))
                db.execute('INSERT INTO passage_fts(rowid,id,title,text) VALUES(1,?,?,?)',
                           ('doc-a', '', 'zebra fixture'))
            store.set_setting('corpus', {'qrels_coverage': 1.0, 'passages': 1, 'sha256': 'fixture'})
            # BM25 requires only the named-generation record, not vector files.
            store.save_generation('fixture', 'paused', 0, 1, 2, {}, {})
            scorer = folder / 'scorer.py'
            scorer.write_text('controlled scorer v1\n')
            args = ['evaluate.py', '--data-dir', str(store.root), '--methods', 'bm25',
                    '--generation', 'fixture', '--id', 'fixture']
            with patch('app.identity.SCORER_SOURCE', scorer), patch.object(evaluate, 'ROOT', folder), \
                    patch('sys.argv', args), contextlib.redirect_stdout(io.StringIO()):
                evaluate.main()
                output = folder / 'evidence/evaluations/fixture'
                self.assertEqual(json.loads((output / 'report.json').read_text())['status'], 'complete')
                records = output / 'queries.jsonl'
                with records.open('ab') as handle:
                    handle.write(b'{"query_id":')
                before = records.read_bytes()
                scorer.write_text('controlled scorer v2\n')
                with self.assertRaises(AppError):
                    evaluate.main()
                self.assertEqual(records.read_bytes(), before)
                self.assertFalse(list(output.glob('*.fragment')))


if __name__ == '__main__':
    unittest.main()
