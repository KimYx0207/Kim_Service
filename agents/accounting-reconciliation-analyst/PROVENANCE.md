# Method provenance

Inspected 2026-11-11. Kim Service authored the workflows, examples and acceptance rules. These are reference adaptations, not copies of upstream code or branding.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| beancount-ledger | [Beancount language syntax](https://beancount.github.io/docs/beancount_language_syntax/); inspected 2026-11-11 | 用逐笔记账、账户与币种余额核对记录。 | 不把借贷平衡或总额一致当作每笔交易真实且匹配。 | Reference only; no upstream implementation copied |
| stripe-idempotency | [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests); inspected 2026-11-11 | 同一业务操作重试复用身份，记录请求参数与回执。 | API v1/v2失败恢复语义不同；不把某供应商保存期照搬到自建系统。 | Reference only; no upstream implementation copied |
