"""Real local ONNX text representations and pairwise relevance scoring.

No generative model, network inference, retrieval labels or fallback scoring.
"""
from __future__ import annotations

import json
import threading
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer
from .identity import (IDENTITY_SCHEMA, coverage_configuration, encoder_execution,
                       runtime_identity, verify_model_files)
from .storage import file_digest, model_fingerprint

ROOT = Path(__file__).resolve().parents[1]


def token_windows(ids, capacity: int, overlap: int):
    """Contiguous token windows with weights summing to unique input tokens.

    No decode/re-tokenize round trip: every original token ID reaches a window.
    The empty input has a single unit-weight window for the model's specials.
    """
    if type(capacity) is not int or capacity < 1 or type(overlap) is not int or not 0 <= overlap < capacity:
        raise ValueError('Window capacity must be positive and 0 <= overlap < capacity')
    if not ids:
        return [{'ids': [], 'start': 0, 'end': 0, 'weight': 1}]
    result = []
    covered = 0
    for start in range(0, len(ids), capacity - overlap):
        end = min(start + capacity, len(ids))
        result.append({'ids': ids[start:end], 'start': start, 'end': end,
                       'weight': end - covered})
        covered = end
        if end == len(ids):
            break
    return result


class _OnnxModel:
    def __init__(self, model_dir, kind: str, threads: int,
                 coverage_strategy='sliding', window_overlap=32):
        self.model_dir = Path(model_dir) if model_dir else ROOT / "models" / kind
        self.metadata = json.loads((self.model_dir / "manifest.json").read_text())
        verify_model_files(self.model_dir, self.metadata, kind)
        self.coverage = coverage_configuration(self.metadata, coverage_strategy, window_overlap, kind)
        self.execution_identity = (encoder_execution(self.metadata, threads, coverage_strategy, window_overlap) if kind == 'embedding' else {
            'identity_schema': IDENTITY_SCHEMA, 'artifact_fingerprint': model_fingerprint(self.metadata),
            'implementation_sha256': file_digest(Path(__file__)),
            'input': 'tokenizer pair(query, (title + newline + text).strip())',
            'max_length': self.metadata['max_length'], 'padding_id': 0, 'pad_symbol': '[PAD]',
            'output': 'raw logits flattened float32', 'runtime': runtime_identity(threads),
            'coverage': self.coverage,
        })
        self.max_length = self.metadata["max_length"]
        self.tokenizer = Tokenizer.from_file(str(self.model_dir / "tokenizer.json"))
        self.tokenizer.no_truncation()
        self.tokenizer.no_padding()
        # Both revision-pinned models use BERT's CLS/A/SEP[/B/SEP] layout.
        # IDs come from their verified tokenizer bytes, never guessed IDs.
        self.cls_id = self.tokenizer.token_to_id('[CLS]')
        self.sep_id = self.tokenizer.token_to_id('[SEP]')
        self.pad_id = self.tokenizer.token_to_id('[PAD]')
        if not all(type(x) is int for x in (self.cls_id, self.sep_id, self.pad_id)):
            raise ValueError('The pinned BERT tokenizer must declare CLS, SEP and PAD')
        self.head_tokenizer = None
        if coverage_strategy == 'head':
            self.head_tokenizer = Tokenizer.from_file(str(self.model_dir / 'tokenizer.json'))
            self.head_tokenizer.enable_truncation(max_length=self.max_length)
            self.head_tokenizer.enable_padding(pad_id=self.pad_id)
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(str(self.model_dir / "model.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
        self.input_names = {item.name for item in self.session.get_inputs()}
        self.truncated_count = 0
        self.coverage_stats = {'inputs': 0, 'input_tokens': 0, 'covered_tokens': 0,
                               'dropped_tokens': 0, 'window_count': 0,
                               'long_inputs': 0}
        self._lock = threading.Lock()

    def _tokenize(self, texts):
        with self._lock:
            return [e.ids for e in self.tokenizer.encode_batch(texts, add_special_tokens=False)]

    def _record(self, lengths, covered, windows, long_inputs):
        dropped = sum(lengths) - sum(covered)
        with self._lock:
            self.coverage_stats['inputs'] += len(lengths)
            self.coverage_stats['input_tokens'] += sum(lengths)
            self.coverage_stats['covered_tokens'] += sum(covered)
            self.coverage_stats['dropped_tokens'] += dropped
            self.coverage_stats['window_count'] += windows
            self.coverage_stats['long_inputs'] += long_inputs
            self.truncated_count += sum(a > b for a, b in zip(lengths, covered))

    def _infer(self, sequences):
        width = max(len(ids) for ids, _ in sequences)
        arrays = {name: np.zeros((len(sequences), width), dtype=np.int64)
                  for name in ('input_ids', 'attention_mask', 'token_type_ids')}
        arrays['input_ids'].fill(self.pad_id)
        for i, (ids, types) in enumerate(sequences):
            n = len(ids)
            arrays['input_ids'][i, :n] = ids
            arrays['attention_mask'][i, :n] = 1
            arrays['token_type_ids'][i, :n] = types
        outputs = self.session.run(None, {key: value for key, value in arrays.items() if key in self.input_names})
        return outputs[0], arrays['attention_mask']

    def _run_head(self, inputs):
        # Preserve the explicit baseline's exact tokenizer longest_first rule.
        with self._lock:
            encodings = self.head_tokenizer.encode_batch(inputs)
        arrays = {
            "input_ids": np.asarray([item.ids for item in encodings], dtype=np.int64),
            "attention_mask": np.asarray([item.attention_mask for item in encodings], dtype=np.int64),
            "token_type_ids": np.asarray([item.type_ids for item in encodings], dtype=np.int64),
        }
        outputs = self.session.run(None, {key: value for key, value in arrays.items() if key in self.input_names})
        return outputs[0], arrays["attention_mask"]

    def _single(self, ids):
        sequence = [self.cls_id, *ids, self.sep_id]
        return sequence, [0] * len(sequence)

    def _pair(self, query, document):
        return ([self.cls_id, *query, self.sep_id, *document, self.sep_id],
                [0] * (len(query) + 2) + [1] * (len(document) + 1))


class EmbeddingModel(_OnnxModel):
    def __init__(self, model_dir=None, threads=3, coverage_strategy='sliding', window_overlap=32):
        super().__init__(model_dir, 'embedding', threads, coverage_strategy, window_overlap)

    def encode(self, texts: list[str], batch_size: int = 32) -> np.ndarray:
        if not texts:
            return np.empty((0, self.metadata["output_dimension"]), dtype=np.float32)
        if type(batch_size) is not int or batch_size <= 0:
            raise ValueError('batch_size must be positive')
        vectors = []
        for offset in range(0, len(texts), batch_size):
            batch = texts[offset:offset + batch_size]
            token_ids = self._tokenize(batch)
            capacity = self.coverage['window_tokens']
            head = self.coverage['strategy'] == 'head'
            windows = [[{'ids': ids[:capacity], 'weight': max(1, min(len(ids), capacity))}]
                       if head else token_windows(ids, capacity, self.coverage['overlap_tokens'])
                       for ids in token_ids]
            flat = [self._single(window['ids']) for group in windows for window in group]
            window_vectors = []
            for start in range(0, len(flat), batch_size):
                tokens, mask = self._infer(flat[start:start + batch_size])
                if tokens.ndim != 3:
                    raise ValueError(f'Expected token embeddings [batch,sequence,dimension], got {tokens.shape}')
                pooled = (tokens * mask[..., None]).sum(axis=1) / np.maximum(mask.sum(axis=1, keepdims=True), 1)
                window_vectors.extend(pooled / np.maximum(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12))
            cursor = 0
            for group in windows:
                n = len(group)
                pooled = window_vectors[cursor] if n == 1 else np.average(
                    window_vectors[cursor:cursor + n], axis=0,
                    weights=[window['weight'] for window in group])
                if n != 1:
                    pooled /= max(float(np.linalg.norm(pooled)), 1e-12)
                vectors.append(pooled.astype(np.float32))
                cursor += n
            lengths = [len(ids) for ids in token_ids]
            self._record(lengths, [min(n, capacity) if head else n for n in lengths],
                         len(flat), sum(n > capacity for n in lengths))
        result = np.stack(vectors, axis=0)
        if not np.isfinite(result).all():
            raise ValueError("Embedding model returned non-finite vectors")
        return result


class Reranker(_OnnxModel):
    def __init__(self, model_dir=None, threads=3, coverage_strategy='sliding', window_overlap=32):
        super().__init__(model_dir, 'reranker', threads, coverage_strategy, window_overlap)

    def score(self, query: str, texts: list[str], batch_size: int = 16) -> np.ndarray:
        if not texts:
            return np.empty((0,), dtype=np.float32)
        if type(batch_size) is not int or batch_size <= 0:
            raise ValueError('batch_size must be positive')
        query_ids = self._tokenize([query])[0]
        scores = []
        for offset in range(0, len(texts), batch_size):
            batch = texts[offset:offset + batch_size]
            documents = self._tokenize(batch)
            lengths = [len(query_ids) + len(ids) for ids in documents]
            if self.coverage['strategy'] == 'head':
                logits, mask = self._run_head([(query, text) for text in batch])
                scores.extend(np.asarray(logits, dtype=np.float32).reshape(-1).tolist())
                covered = [int(n) - 3 for n in mask.sum(axis=1)]
                self._record(lengths, covered, len(batch), sum(a > b for a, b in zip(lengths, covered)))
                continue
            budget = self.max_length - 3
            query_capacity = max(1, min(len(query_ids), budget // 2))
            query_windows = token_windows(query_ids, query_capacity,
                                          min(self.coverage['overlap_tokens'], query_capacity - 1))
            pairs = []
            owners = []
            counts = [0] * len(documents)
            maxima = [-np.inf] * len(documents)
            def flush():
                if not pairs:
                    return
                logits, _ = self._infer(pairs)
                values = np.asarray(logits).reshape(-1)
                if len(values) != len(owners):
                    raise ValueError('Reranker output count differs from its input batch')
                if not np.isfinite(values).all():
                    raise ValueError('Reranker returned non-finite window scores')
                for owner, value in zip(owners, values):
                    maxima[owner] = max(maxima[owner], float(value))
                pairs.clear()
                owners.clear()
            for owner, document in enumerate(documents):
                for q in query_windows:
                    capacity = budget - len(q['ids'])
                    for d in token_windows(document, capacity, min(self.coverage['overlap_tokens'], capacity - 1)):
                        pairs.append(self._pair(q['ids'], d['ids']))
                        owners.append(owner)
                        counts[owner] += 1
                        if len(pairs) == batch_size:
                            flush()
            flush()
            scores.extend(maxima)
            for document, count in zip(documents, counts):
                length = len(query_ids) + len(document)
                self._record([length], [length], count, int(count > 1))
        result = np.asarray(scores, dtype=np.float32)
        if not np.isfinite(result).all():
            raise ValueError('Reranker returned non-finite scores')
        return result
