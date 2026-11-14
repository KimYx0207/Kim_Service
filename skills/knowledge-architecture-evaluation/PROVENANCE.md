# Method provenance

Original method, examples and deterministic helper; no upstream implementation or branding copied. Sources below were read during package research. Their presence does not prove a later worker fetched or consumed them. Rolling sources must be rechecked against the actual installed version.

| sourceRef | Primary source | Version/date | Adopted | Not inferred |
| --- | --- | --- | --- | --- |
| karpathy-wiki | https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f | Author idea file created 2026-04-04; inspected 2026-11-15 | Persistent compiled knowledge as an organization layer | No production implementation, universal superiority or replacement for access checks |
| microsoft-wiki | https://github.com/microsoft/llmwiki | Rolling author README inspected 2026-11-15; package example 0.1.2, Node20+, VSCode1.109+; current harness differences documented | Raw/wiki/schema layers, search/MCP use, source-derived page handling | No enterprise per-document ACL guarantee; no upstream code copied |
| cag-original | https://github.com/hhhuang/CAG | Author README and pyproject inspected 2026-11-15; Python>=3.10, Transformers>=4.47.1 declarations | Bounded all-relevant-context loading and cache experiments | Declared dependency range is not tested compatibility with every later version |
| hf-cache | https://huggingface.co/docs/transformers/kv_cache | Rolling official docs inspected 2026-11-15 | Memory/speed/cache type and model-specific compatibility tradeoffs | No model-independent cached tensors or unlimited context |
| graphrag-methods | https://microsoft.github.io/graphrag/index/methods/ | Rolling official docs inspected 2026-11-15 | Standard/Fast indexing, noisy graph/cost and language tradeoffs | No requirement to use graph extraction for every knowledge task |
| lightrag-core | https://github.com/HKUDS/LightRAG/blob/main/docs/ProgramingWithCore.md | Rolling docs inspected 2026-11-15; release page v1.5.7 / 28ff1b0 observed | Document deletion rebuilds shared entities/relations; workspace isolation semantics | No inference that workspace isolation implements every user/document ACL |
| wiki-comparison | https://reports.ai4altruism.org/tr-2026-001/ | Author report arXiv v3, 2026-10-02; inspected 2026-11-15; not peer reviewed | Separate synthesis, citation support and cost; inspect scorer correction and human calibration | No general performance winner from 24 papers/13 questions |
| qdrant-hybrid | https://qdrant.tech/documentation/hybrid-queries/ | Rolling official docs, inspected 2026-11-15; Query API since 1.10.0; installed version must be checked | Hybrid/fusion tradeoffs, comparable evaluation and holdout tuning | No universal winner or automatic compatibility promise |

Authored review cases are synthetic and not_evaluated. Offline tests prove stated algorithm/contract behavior, not real source authenticity, host invocation, human review or universal professional quality.
