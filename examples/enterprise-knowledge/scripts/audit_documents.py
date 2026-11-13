"""Audit the pinned document-level archive independently of passage identifiers."""
import argparse
import collections
import hashlib
import json
import os
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.storage import COMMIT, ROOT, Storage, atomic_json, ensure, now

DECLARED_DOCUMENTS = 57638  # Upstream README claim; never used as the observed count.
ARCHIVE_SHA256 = 'c74ac6248f7255cc0a3ed13338d9e9c94df78c58bd0fdf32e7ec5aabe89218f9'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', default=str(ROOT/'data'))
    parser.add_argument('--archive', help='Existing original ZIP to audit; default downloads into data/source')
    parser.add_argument('--output', default=str(ROOT/'evidence/document-corpus-audit.json'))
    parser.add_argument('--audit-only', action='store_true', help='Write the independent audit without updating SQLite')
    args = parser.parse_args()
    archive = Path(args.archive) if args.archive else Path(args.data_dir)/'source/cloud-documents.jsonl.zip'
    url = f'https://raw.githubusercontent.com/IBM/mt-rag-benchmark/{COMMIT}/corpora/document_level/cloud.jsonl.zip'
    if not archive.exists():
        ensure(not args.archive, 'archive_missing', '指定原包不存在；请检查路径')
        archive.parent.mkdir(parents=True, exist_ok=True)
        temporary = archive.with_suffix(archive.suffix+'.download')
        with urllib.request.urlopen(url, timeout=120) as source, temporary.open('wb') as target:
            while chunk := source.read(1024*1024): target.write(chunk)
            target.flush(); os.fsync(target.fileno())
        temporary.replace(archive)
    archive_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
    ensure(archive_hash == ARCHIVE_SHA256, 'source_hash_mismatch', '文档级原包与固定提交的已核实 SHA-256 不一致')
    ids = collections.Counter(); urls = collections.Counter(); hosts = collections.Counter(); prefixes = collections.Counter()
    lines = blank = empty = 0; raw_hash = hashlib.sha256(); empty_documents = []
    with zipfile.ZipFile(archive) as package:
        ensure(package.namelist() == ['cloud.jsonl'], 'invalid_archive', '文档级原包内容不符合合同')
        member = package.getinfo('cloud.jsonl')
        with package.open('cloud.jsonl') as stream:
            for line in stream:
                lines += 1; raw_hash.update(line)
                if not line.strip(): blank += 1; continue
                row = json.loads(line)
                ensure(isinstance(row.get('document_id'), str) and row['document_id'], 'invalid_document_id', '文档 ID 缺失')
                ensure(isinstance(row.get('url'), str) and row['url'], 'invalid_document_url', '文档来源 URL 缺失')
                ensure(isinstance(row.get('text'), str), 'invalid_document_text', '文档正文不是文本')
                ids[row['document_id']] += 1; urls[row['url']] += 1
                hosts[urllib.parse.urlparse(row['url']).netloc] += 1; prefixes[row['document_id'].split('_')[0]] += 1
                if not row['text'].strip():
                    empty += 1; empty_documents.append({'document_id':row['document_id'],'url':row['url']})
    ensure(len(ids) == lines-blank and all(v == 1 for v in ids.values()), 'duplicate_document_id', '文档 ID 不唯一')
    audit = {
        'schema_version':1, 'audit_kind':'independent_document_level_corpus_audit', 'audited_at':now(),
        'source':{'repository':'https://github.com/IBM/mt-rag-benchmark','commit':COMMIT,'url':url,'license':'Apache-2.0'},
        'archive':{'bytes':archive.stat().st_size,'sha256':archive_hash,'member':'cloud.jsonl','uncompressed_bytes':member.file_size,'uncompressed_sha256':raw_hash.hexdigest()},
        'actual':{'physical_lines':lines,'nonblank_lines':lines-blank,'blank_lines':blank,'valid_json_documents':lines-blank,'unique_document_ids':len(ids),'duplicate_document_id_count':sum(v-1 for v in ids.values()),'unique_urls':len(urls),'duplicate_url_rows':sum(v-1 for v in urls.values()),'empty_text':empty,'id_prefix_counts':dict(prefixes),'url_host_counts':dict(hosts)},
        'declared_readme_documents':DECLARED_DOCUMENTS, 'declared_matches_actual':len(ids)==DECLARED_DOCUMENTS,
        'empty_text_documents':empty_documents,
        'boundary':'Direct document-level JSONL count; not inferred from passage IDs; historical public benchmark.'
    }
    atomic_json(args.output, audit)
    if not args.audit_only:
        store=Storage(args.data_dir);corpus=store.setting('corpus')
        ensure(corpus and corpus.get('source_commit')==COMMIT, 'corpus_not_ready', '请先导入同一固定提交的正式段落语料')
        corpus.update(documents=len(ids),actual_documents=len(ids),declared_documents=DECLARED_DOCUMENTS,
                      documents_basis='independent document-level JSONL audit',empty_documents=empty,
                      document_source_sha256=archive_hash,document_source_commit=COMMIT,
                      document_audit_ref='evidence/document-corpus-audit.json')
        store.set_setting('corpus',corpus)
    print(json.dumps(audit,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
