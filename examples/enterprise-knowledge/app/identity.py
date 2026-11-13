"""Versioned execution identities. No legacy adoption or unchecked resume."""
import importlib.metadata
import os
import platform
import sqlite3
from pathlib import Path

from .storage import ROOT, AppError, canonical, digest, ensure, file_digest, model_fingerprint

IDENTITY_SCHEMA = 2
ENCODER_SOURCE = ROOT / 'app/embedding.py'
SCORER_SOURCE = ROOT / 'scripts/evaluate.py'


def runtime_identity(threads=3):
    return {
        'python': platform.python_version(),
        'numpy': importlib.metadata.version('numpy'),
        'onnxruntime': importlib.metadata.version('onnxruntime'),
        'tokenizers': importlib.metadata.version('tokenizers'),
        'provider': 'CPUExecutionProvider',
        'session': {'intra_op_num_threads': threads, 'inter_op_num_threads': 1,
                    'graph_optimization_level': 'ORT_ENABLE_ALL'},
    }


def encoder_execution(metadata, threads=3):
    return {
        'identity_schema': IDENTITY_SCHEMA,
        'artifact_fingerprint': model_fingerprint(metadata),
        'implementation': {'encoder_sha256': file_digest(ENCODER_SOURCE),
                           'identity_sha256': file_digest(Path(__file__)),
                           'build_sha256': file_digest(ROOT / 'scripts/build_index.py')},
        'document_input': '(title + "\\n" + text).strip()',
        'query_input': 'raw query string',
        'tokenizer': {'max_length': metadata['max_length'], 'padding_id': 0,
                      'pad_symbol': '[PAD]', 'truncation': 'tokenizers default longest_first'},
        'pooling': 'attention_mask weighted mean; denominator >= 1',
        'normalization': 'L2; denominator >= 1e-12; float32; finite required',
        'dimension': metadata['output_dimension'],
        'runtime': runtime_identity(threads),
    }


def fingerprint(identity):
    return digest(canonical(identity))


def generation_identity_fields(metadata, threads=3, execution=None):
    execution = execution or encoder_execution(metadata, threads)
    return {'identity_schema': IDENTITY_SCHEMA, 'encoder_execution': execution,
            'execution_fingerprint': fingerprint(execution)}


def measurement_source():
    return {'implementation': 'Kim_Service/examples/enterprise-knowledge',
            'identity_schema': IDENTITY_SCHEMA,
            'runner': 'github_actions' if os.environ.get('GITHUB_ACTIONS') == 'true' else 'local',
            'source_commit': os.environ.get('GITHUB_SHA'),
            'run_id': os.environ.get('GITHUB_RUN_ID')}


def validate_execution(manifest, metadata, execution=None):
    ensure(manifest.get('identity_schema') == IDENTITY_SCHEMA,
           'legacy_identity', '旧索引未绑定执行身份，请以新版本名称从零构建', 409)
    saved = manifest.get('encoder_execution', {})
    try:
        current = execution or encoder_execution(
            metadata, saved['runtime']['session']['intra_op_num_threads'])
    except (KeyError, TypeError, OSError) as exc:
        raise AppError('execution_mismatch', '执行身份缺失或实现文件不可读取', 409) from exc
    ensure(manifest.get('execution_fingerprint') == fingerprint(saved) == fingerprint(current),
           'execution_mismatch', '编码实现、输入规范或运行库已变化，不能恢复或读取旧索引', 409)


def verify_model_files(folder, metadata, kind):
    """Verify actual bytes before creating a tokenizer or ONNX session."""
    folder = Path(folder).resolve()
    required = {'model.onnx', 'tokenizer.json', 'tokenizer_config.json', 'config.json'}
    if kind == 'embedding':
        required |= {'sentence_bert_config.json', '1_Pooling/config.json'}
    entries = metadata.get('files', [])
    names = [entry.get('local_path') for entry in entries]
    ensure(all(isinstance(name, str) for name in names)
           and len(names) == len(set(names)) and required <= set(names),
           'model_corrupt', '模型清单缺少文件或包含重复路径', 409)
    try:
        for entry in entries:
            name = entry['local_path']
            if name == 'README.md':
                continue
            relative = Path(name)
            ensure(not relative.is_absolute() and '..' not in relative.parts,
                   'model_corrupt', '模型文件路径越界', 409)
            path = folder / relative
            ensure(path.resolve().is_relative_to(folder) and not path.is_symlink()
                   and path.is_file(), 'model_corrupt', '模型文件不存在或路径无效', 409)
            ensure(path.stat().st_size == entry['bytes'] and file_digest(path) == entry['sha256'],
                   'model_corrupt', '模型文件实际摘要与清单不一致', 409)
    except (OSError, KeyError, TypeError) as exc:
        raise AppError('model_corrupt', '模型文件或清单无法验证', 409) from exc


def evaluation_execution(retriever, modes, generation=None):
    """Bind retrieval/scoring code and every model actually used by this run."""
    identity = {
        'identity_schema': IDENTITY_SCHEMA,
        'implementation': {name: file_digest(path) for name, path in {
            'retrieval': ROOT / 'app/retrieval.py', 'scorer': SCORER_SOURCE,
            'storage': ROOT / 'app/storage.py', 'identity': Path(__file__),
        }.items()},
        'runtime': {'python': platform.python_version(), 'sqlite': sqlite3.sqlite_version,
                    'numpy': importlib.metadata.version('numpy')},
        'models': {},
    }
    if any(mode != 'bm25' for mode in modes):
        g = retriever.storage.validate_generation(generation)
        threads = g['manifest']['encoder_execution']['runtime']['session']['intra_op_num_threads']
        retriever.models('rerank' in modes, threads)
        validate_execution(g['manifest'], retriever.embedding.metadata,
                           retriever.embedding.execution_identity)
        identity['generation_manifest_sha256'] = fingerprint(g['manifest'])
        identity['models']['embedding'] = retriever.embedding.execution_identity
    if 'rerank' in modes:
        identity['models']['reranker'] = retriever.reranker.execution_identity
    return identity


def bind_evaluation_protocol(path, protocol):
    import json
    from .storage import atomic_json
    if path.exists():
        ensure(json.loads(path.read_text()) == protocol, 'protocol_conflict',
               '评测协议或执行身份变化，请使用新评测编号', 409)
    else:
        atomic_json(path, protocol)
