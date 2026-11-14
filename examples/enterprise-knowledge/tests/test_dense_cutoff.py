"""Deterministic dense cutoff regression; no model, browser, DB or network.

Only index loading is supplied as an in-memory fixture: ranking executes the
actual app.retrieval.Retriever.dense implementation under review.
"""
import sys
from pathlib import Path
import unittest

sys.dont_write_bytecode = True
example = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(example))

import numpy as np
from app.retrieval import Retriever


class InMemoryStore:
    def validate_generation(self, generation):
        return {'generation': 'controlled-ties', 'manifest': {
            'encoder_execution': {
                'runtime': {'session': {'intra_op_num_threads': 1}},
                'coverage': {'strategy': 'sliding', 'overlap_tokens': 0},
            },
        }}

    def allowed_ids(self, principal):
        return set()


class InMemoryEncoder:
    def encode(self, texts):
        return np.array([[1., 0.] for _ in texts], dtype=np.float32)


class DenseCutoffTests(unittest.TestCase):
    def test_equal_scores_at_cutoff_use_id_order_before_selecting_top_k(self):
        retriever = Retriever(InMemoryStore(), embedding=InMemoryEncoder())
        ids = ['z', 'y', 'a', 'b']
        vectors = np.array([[1., 0.]] * len(ids), dtype=np.float32)

        def load_fixture(generation=None, vector_kind='float32', embedding=None):
            return 'controlled-ties', ids, vectors

        retriever.load_index = load_fixture
        generation, ranked = retriever.dense('controlled query', 'public',
                                             'controlled-ties', limit=2)
        self.assertEqual(generation, 'controlled-ties')
        self.assertEqual([score for _, score in ranked], [1., 1.])
        self.assertEqual([identifier for identifier, _ in ranked], ['a', 'b'],
                         'Equal scores must use ID ascending before truncation; '
                         'sorting an arbitrary argpartition subset is insufficient.')


if __name__ == '__main__':
    unittest.main(verbosity=2)
