# Backend method provenance

Inspected 2026-11-10. Component method version 0.2.0. This package adds original method prose and synthetic examples; it does not bundle third-party code. Research sources do not authorize access or certify runtime behavior.

| sourceRef | Source and revision | Adopted | Not adopted |
| --- | --- | --- | --- |
| owasp-bola | [OWASP API1:2023 object-level authorization](https://github.com/OWASP/API-Security/blob/33cea37b2ffde3e2e62f6b5d79a029a22a846633/editions/2023/en/0xa1-broken-object-level-authorization.md) | Every object action checks actual policy; exercise denied cross-user cases, including batch paths | Treating randomized IDs or matching a supplied owner field as authorization; copying attack scripts |
| vercel-server-auth | [Vercel server-auth-actions](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/rules/server-auth-actions.md), MIT | Public mutation entrypoints need their own verified authentication and authorization | Prescribing Next.js, adopting an upstream sample as the project's complete access policy or deploying automatically |
| spec-kit-plan | [GitHub spec-kit plan template](https://github.com/github/spec-kit/blob/08252af8c5fb1c68135768fde2049d6578fa46c3/templates/plan-template.md) | Record runtime/dependency versions, storage, test strategy and compatibility constraints before implementation | A new workflow authority, fixed directory layout, CLI installation or unmeasured scale promises |

Database-specific transaction, isolation and migration details must come from the actual installed product/version and its official documentation. The package deliberately provides no universal SQL or purported production migration. Existing project tests and observed behavior take priority over speculative framework advice. The included MIT LICENSE covers original package material.
