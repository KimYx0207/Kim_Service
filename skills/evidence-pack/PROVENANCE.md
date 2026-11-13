# Method provenance

Inspected 2026-11-13. The helper, schemas, examples and tests are original Kim Service implementations. No upstream code is copied or executed.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| docling | [docling](https://github.com/docling-project/docling-core/blob/main/docling_core/transforms/chunker/hierarchical_chunker.py) | 来源、标题、页码和分块正文分开；保留追溯信息，再按需构建上下文。 | 不复制上游代码，不安装 OCR 或模型，不声明已提取 PDF 页面。 | MIT (docling-core code); model licenses are separate |

This is a method-level reference, not a claim that the full upstream product was integrated.

## Retrieved file evidence

The following blob hashes identify the first-party source bytes inspected on the date above; they are file hashes, not commit IDs.

| File | Branch at inspection | Git blob SHA |
| --- | --- | --- |
| [docling_core/transforms/chunker/doc_chunk.py](https://github.com/docling-project/docling-core/blob/main/docling_core/transforms/chunker/doc_chunk.py) | main | `059796ad2e44935c89ccf1cc8225540173492dd2` |
| [tests/test_hierarchical_chunker.py](https://github.com/docling-project/docling-core/blob/main/tests/test_hierarchical_chunker.py) | main | `ffc3c48a79e58fafc62c0611151528db36898090` |
| [LICENSE](https://github.com/docling-project/docling-core/blob/main/LICENSE) | main | `671b116e543b17720685f3868800226e84b1ce12` |
