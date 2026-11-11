# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| openapi31 | [OpenAPI Specification 3.1.1](https://spec.openapis.org/oas/v3.1.1.html); inspected 2026-11-11 | 精确定义请求、响应、错误和安全方案的接口边界。 | 按项目实际规范版本工作，不把schema语法通过当业务正确。 | Reference only; no upstream implementation copied |
| stripe-idempotency | [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests); inspected 2026-11-11 | 同一业务操作重试复用身份，记录请求参数与回执。 | API v1/v2失败恢复语义不同；不把某供应商保存期照搬到自建系统。 | Reference only; no upstream implementation copied |
