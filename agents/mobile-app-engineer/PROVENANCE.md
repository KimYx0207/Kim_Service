# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| flutter-offline | [Flutter offline-first architecture](https://docs.flutter.dev/app-architecture/design-patterns/offline-first); inspected 2026-11-11 | 先确定读、写、同步语义，再把缓存状态反馈给用户；同步频率由产品约束决定。 | 不把网络连通等同请求成功，不照搬固定同步周期。 | Reference only; no upstream implementation copied |
| stripe-idempotency | [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests); inspected 2026-11-11 | 同一业务操作重试复用身份，记录请求参数与回执。 | API v1/v2失败恢复语义不同；不把某供应商保存期照搬到自建系统。 | Reference only; no upstream implementation copied |
