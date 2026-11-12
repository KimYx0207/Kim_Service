---
name: memory-review
description: Review all three layers and propose durable rules without silently promoting them
version: 1.0.0
---

# Memory Review

Read the writable root (`MEMORY_DIR` or `<repo>/.memory-3layer/`) and, when it
exists, the legacy `<repo>/.claude/memory/` only when `MEMORY_LEGACY_READ=1` was explicitly enabled.

1. Validate every `items.json`; report invalid files without rewriting them.
2. Find exact duplicates after whitespace/case normalization.
3. Identify high-frequency, recent-trend, decay, and potential-conflict patterns.
4. Propose Layer 3 promotions only when evidence is traceable.
5. Ask for confirmation before changing `status` or `MEMORY.md`.

Permanent repository rules may belong in `AGENTS.md`, `CLAUDE.md`, or another
runtime-native instruction file. Do not assume Claude Code is the only host.
Never promote model inference, secrets, raw transcripts, or full tool output.

For company Work, use the candidate template in `references/operating-contract.md` through the existing governance proposals. Preserve exact adopted versions and original decision references, including failed/rejected/not-applicable evidence, expiry triggers and actual reuse feedback. Keep company-private candidates internal; deidentify, generalize and validate before proposing a public method. Existing specific authorization is reusable; unknown reasons stay unknown. This command neither schedules nightly processing nor grants access or silently changes the storage schema.
