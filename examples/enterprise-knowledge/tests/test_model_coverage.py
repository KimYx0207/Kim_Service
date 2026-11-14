"""Real tokenization with controlled ONNX outputs; no model quality claim."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
from tokenizers import Tokenizer, models, pre_tokenizers, processors

from app.embedding import EmbeddingModel, Reranker
from app.storage import digest


def model_files(folder):
    unknown_symbol = '[UNK]'
    vocab = {'[PAD]': 0, '[CLS]': 1, '[SEP]': 2, unknown_symbol: 3,
             'plain': 4, 'tail': 5, 'query': 6, 'document': 7}
    tokenizer = Tokenizer(models.WordLevel(vocab, unknown_symbol))
    tokenizer.pre_tokenizer = pre_tokenizers.Whitespace()
    tokenizer.post_processor = processors.TemplateProcessing(
        single='[CLS] $A [SEP]', pair='[CLS] $A [SEP] $B:1 [SEP]:1',
        special_tokens=[('[CLS]', 1), ('[SEP]', 2)])
    names = ('model.onnx', 'tokenizer.json', 'tokenizer_config.json', 'config.json',
             'sentence_bert_config.json', '1_Pooling/config.json')
    for name in names:
        target = folder / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(b'controlled test file; not a model')
    tokenizer.save(str(folder / 'tokenizer.json'))
    metadata = {'repository': 'controlled-test-only', 'revision': 'fixture',
                'max_length': 8, 'output_dimension': 2,
                'files': [{'local_path': n, 'sha256': digest((folder/n).read_bytes()),
                           'bytes': (folder/n).stat().st_size} for n in names]}
    (folder / 'manifest.json').write_text(json.dumps(metadata))


class ControlledSession:
    def __init__(self, kind='embedding'):
        self.kind = kind
        self.inputs = []

    def get_inputs(self):
        return [SimpleNamespace(name=n) for n in ('input_ids', 'attention_mask', 'token_type_ids')]

    def run(self, _, inputs):
        ids = inputs['input_ids']
        assert ids.shape[1] <= 8, 'Every submitted sequence must fit the model window'
        self.inputs.append({key: value.copy() for key, value in inputs.items()})
        if self.kind == 'reranker':
            return [np.any(ids == 5, axis=1).astype(np.float32)[:, None]]
        return [np.stack([np.ones_like(ids), ids == 5], axis=-1).astype(np.float32)]


class FullTextCoverageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.folder = Path(self.tmp.name)
        model_files(self.folder)

    def test_tail_changes_embedding_after_the_first_window(self):
        session = ControlledSession()
        with patch('app.embedding.ort.InferenceSession', return_value=session):
            model = EmbeddingModel(self.folder)
            values = model.encode([' '.join(['plain'] * 12), ' '.join(['plain'] * 11 + ['tail'])])
        self.assertFalse(np.allclose(values[0], values[1]), 'The final token must reach inference')
        self.assertEqual(model.coverage_stats['input_tokens'], 24)
        self.assertEqual(model.coverage_stats['covered_tokens'], 24)
        self.assertEqual(model.coverage_stats['dropped_tokens'], 0)
        np.testing.assert_allclose(np.linalg.norm(values, axis=1), [1, 1], atol=1e-6)

    def test_long_query_and_document_tails_reach_reranker(self):
        session = ControlledSession('reranker')
        with patch('app.embedding.ort.InferenceSession', return_value=session):
            model = Reranker(self.folder)
            values = model.score(' '.join(['query'] * 11 + ['tail']), [' '.join(['document'] * 12)])
            other = model.score('query', [' '.join(['document'] * 11 + ['tail'])])
        self.assertEqual(values.tolist(), [1.0])
        self.assertEqual(other.tolist(), [1.0])
        self.assertEqual(model.coverage_stats['dropped_tokens'], 0)
        self.assertEqual(model.coverage_stats['input_tokens'], 37)
        self.assertEqual(model.coverage_stats['covered_tokens'], 37)

    def test_explicit_head_baseline_records_loss_and_distinct_identity(self):
        with patch('app.embedding.ort.InferenceSession', return_value=ControlledSession()):
            full = EmbeddingModel(self.folder)
            head = EmbeddingModel(self.folder, coverage_strategy='head')
            text = ' '.join(['plain'] * 11 + ['tail'])
            self.assertFalse(np.allclose(full.encode([text]), head.encode([text])))
        self.assertEqual(head.coverage_stats['dropped_tokens'], 6)
        self.assertNotEqual(full.execution_identity, head.execution_identity)

    def test_empty_inputs_need_no_model_inference(self):
        session = ControlledSession()
        with patch('app.embedding.ort.InferenceSession', return_value=session):
            self.assertEqual(EmbeddingModel(self.folder).encode([]).shape, (0, 2))
            self.assertEqual(Reranker(self.folder).score('query', []).shape, (0,))
        self.assertEqual(session.inputs, [])


if __name__ == '__main__':
    unittest.main()
