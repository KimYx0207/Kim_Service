# Changelog

## 0.1.0

- Canonical source: `agents/delivery-verifier`; release provenance is bound to the committed component tree.

- Add a read-only delivery-verifier Agent with component-owned Node helper binding.
- Check actual artifact bytes/SHA256 and explicit JSON/receipt acceptance criteria.
- Reject unsafe paths, links, invalid inputs and unsupported criteria; preserve gaps.
- Add standalone temporary-file demo, contract tests and failure-path tests.
- Keep host/browser/model runtime untested and final acceptance with the caller.
