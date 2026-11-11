# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| shopify-webhooks | [Shopify webhook delivery verification](https://shopify.dev/docs/apps/build/webhooks/verify-deliveries); inspected 2026-11-11 | 核对事件身份与重复投递，再处理订单状态变化。 | 具体重试时长和接口字段随API版本核实；不把收取通知等同业务完成。 | Reference only; no upstream implementation copied |
| stripe-idempotency | [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests); inspected 2026-11-11 | 同一业务操作重试复用身份，记录请求参数与回执。 | API v1/v2失败恢复语义不同；不把某供应商保存期照搬到自建系统。 | Reference only; no upstream implementation copied |
