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
from .identity import encoder_execution, runtime_identity, verify_model_files
from .storage import file_digest, model_fingerprint

ROOT = Path(__file__).resolve().parents[1]


class _OnnxModel:
    def __init__(self, model_dir, kind: str, threads: int):
        self.model_dir = Path(model_dir) if model_dir else ROOT / "models" / kind
        self.metadata = json.loads((self.model_dir / "manifest.json").read_text())
        verify_model_files(self.model_dir, self.metadata, kind)
        self.execution_identity = (encoder_execution(self.metadata, threads) if kind == 'embedding' else {
            'identity_schema': 2, 'artifact_fingerprint': model_fingerprint(self.metadata),
            'implementation_sha256': file_digest(Path(__file__)),
            'input': 'tokenizer pair(query, (title + newline + text).strip())',
            'max_length': self.metadata['max_length'], 'padding_id': 0, 'pad_symbol': '[PAD]',
            'output': 'raw logits flattened float32', 'runtime': runtime_identity(threads),
        })
        self.max_length = self.metadata["max_length"]
        self.tokenizer = Tokenizer.from_file(str(self.model_dir / "tokenizer.json"))
        self.tokenizer.enable_truncation(max_length=self.max_length)
        # tokenizers 0.22.1 defaults to the [PAD] symbol; its version is bound.
        self.tokenizer.enable_padding(pad_id=0)
        options = ort.SessionOptions()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = 1
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.session = ort.InferenceSession(str(self.model_dir / "model.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
        self.input_names = {item.name for item in self.session.get_inputs()}
        self.truncated_count = 0
        self._lock = threading.Lock()

    def _run(self, inputs):
        # Tokenizer padding/truncation is shared mutable state. The same model
        # may serve API requests while serializing only this short encoding step.
        with self._lock:
            encodings = self.tokenizer.encode_batch(inputs)
            self.truncated_count += sum(bool(item.overflowing) for item in encodings)
        arrays = {
            "input_ids": np.asarray([item.ids for item in encodings], dtype=np.int64),
            "attention_mask": np.asarray([item.attention_mask for item in encodings], dtype=np.int64),
            "token_type_ids": np.asarray([item.type_ids for item in encodings], dtype=np.int64),
        }
        outputs = self.session.run(None, {key: value for key, value in arrays.items() if key in self.input_names})
        return outputs[0], arrays["attention_mask"]


class EmbeddingModel(_OnnxModel):
    def __init__(self, model_dir=None, threads=3):
        super().__init__(model_dir, "embedding", threads)

    def encode(self, texts: list[str], batch_size: int = 32) -> np.ndarray:
        if not texts:
            return np.empty((0, self.metadata["output_dimension"]), dtype=np.float32)
        vectors = []
        for offset in range(0, len(texts), batch_size):
            tokens, mask = self._run(texts[offset:offset + batch_size])
            if tokens.ndim != 3:
                raise ValueError(f"Expected token embeddings [batch,sequence,dimension], got {tokens.shape}")
            weighted = tokens * mask[..., None]
            pooled = weighted.sum(axis=1) / np.maximum(mask.sum(axis=1, keepdims=True), 1)
            norms = np.linalg.norm(pooled, axis=1, keepdims=True)
            vectors.append((pooled / np.maximum(norms, 1e-12)).astype(np.float32))
        result = np.concatenate(vectors, axis=0)
        if not np.isfinite(result).all():
            raise ValueError("Embedding model returned non-finite vectors")
        return result


class Reranker(_OnnxModel):
    def __init__(self, model_dir=None, threads=3):
        super().__init__(model_dir, "reranker", threads)

    def score(self, query: str, texts: list[str], batch_size: int = 16) -> np.ndarray:
        scores = []
        for offset in range(0, len(texts), batch_size):
            logits, _ = self._run([(query, text) for text in texts[offset:offset + batch_size]])
            scores.extend(np.asarray(logits, dtype=np.float32).reshape(-1).tolist())
        return np.asarray(scores, dtype=np.float32)
