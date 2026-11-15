# Method provenance

Inspected **2026-11-15 UTC**. Kim Service authored the methods, comparison cards, templates and synthetic examples. No third-party source code, long article excerpts or branding is copied. Author research is not evidence of a later host task having searched, run a platform or improved a merchant's business.

Actual research used `mcp__codex_apps__search_service_web_run` (`system1_search_query`, recency 90, then `open`) and `mcp__codex_apps__github_fetch` (commit/directory API and fixed-commit raw source). Source retrieval batch timestamp retained: `2026-11-15T00:05:24.672Z`; later reads occurred within 00:08–00:12 UTC. Exact per-response timestamps were not retained, so no second-level timestamps are invented. Raw tool responses are preserved privately outside this repository; this public table contains independent summaries only.

| sourceRef | Primary source and inspected scope | Adopted in this package | Not adopted / limits | Rights |
| --- | --- | --- | --- | --- |
| kim-components | Existing Kim Service `store-performance-analyst`, `commerce-operations-designer`, warehouse/supply-chain/customer/listing methods and `inventory-replenishment`; read methods, contracts, money replay and store calculator on 2026-11-15 | Route selection links to bounded existing professional tools; listed-cost contribution and cash differ | Existing authored cases do not establish merchant effectiveness; no existing regression was run for research | Kim Service authored |
| shopify-inventory | [State migration](https://shopify.dev/changelog/posts/draft-order-and-transfer-shipment-inventory-is-moving-from-reserved-to-committed), dated 2026-08-05; original page read; refs `turn476899682search3`, `turn227468564view0` | Bind inventory meaning to platform/version; unchanged sellable quantities must not be mistaken for growth; professional-method inventory section | Not a universal field mapping, not the user's installed API; no code copied | Reference only |
| shopify-release | [2026-10 release notes](https://shopify.dev/changelog/release-notes/2026-10); read inventory/order/event changes; refs `turn476899682search2`, `turn227468564view1` | Confirm final cancellation/amount state; route costs include integration maintenance | No install or API migration performed; no claim all release notes were fully audited | Reference only |
| tiktok-affiliate | [US Affiliate Marketing Policy](https://seller-us.tiktok.com/university/essay?knowledge_id=2244964886103809), original page dated 2026-10-21; refs `turn476899682search7`, `turn227468564view2` | Content route needs product as well as shop eligibility, commissions and operating resources | US scope; no universal eligibility threshold or creator profitability promise | Reference only |
| tiktok-fulfillment | [US Fulfillment Policy](https://seller-us.tiktok.com/university/essay?anchor_link=EB8600D0&course_type=1&from=search%7BcontentIdParams%7D&identity=1&knowledge_id=3995852763301633&role=1), original page dated 2026-09-28; refs `turn476899682search5`, `turn227468564view3` | Match fulfillment event/time to order type before expanding demand | Not China policy; label creation is not universally dispatch proof; no current seller dashboard checked | Reference only |
| doudian-rules | Official [fulfillment](https://school.jinritemai.com/doudian/web/articlev0/101706?from=shop_default), [aftersales](https://school.jinritemai.com/doudian/web/articlev0/104600), [seasonal apparel preorder](https://school.jinritemai.com/doudian/web/articlev0/aJqjbvEndQAR) and [expired refund rule](https://school.jinritemai.com/doudian/web/articlev0/aJnLBxo1N9UM); search extracts read, open returned zero readable lines; refs `turn317903835search0/2/4/5`, `turn776240588view0/1/2/3` | Scope restrictions and source freshness matter; inaccessible detail limits the affected decision only; expired source supplies a real non-adoption example | **No full-page read claimed.** Exact current deadlines/eligibility remain unverified; no apparel rule applied to all products | Reference only |
| medusa-core | [medusajs/medusa fixed commit](https://github.com/medusajs/medusa/commit/01de0be27a7c228795d5cfc31662ca144781fbfc), `01de0be27a7c228795d5cfc31662ca144781fbfc` (2026-11-13T14:56:08Z); paths below | Separate order/payment/reservation facts; compensation checks later success; explicit backorders need feasible promises; professional-method fulfillment section | No deployment, load test or full audit; workflow flag is not a complete business-idempotency verdict | Upstream inventory package declares MIT; no implementation copied |
| saleor-stock | [saleor/saleor fixed commit](https://github.com/saleor/saleor/commit/5e1679b1e91f76ac9fd553a62adeffb6e9acf5c3), `5e1679b1e91f76ac9fd553a62adeffb6e9acf5c3` (2026-11-13T14:55:51Z); paths below | Physical stock, allocations and unexpired reservations differ; channel/country/warehouse affect availability; professional-method and worked example | Tests were read, **not executed**; main version 3.24.0-a.0 is not a stable production recommendation | pyproject declares BSD-3-Clause; no implementation copied |

## Exact GitHub read scope

All paths are bound to the full commit above. Use `https://github.com/<owner>/<repo>/blob/<commit>/<path>` to review. Successful bytes came through GitHub connector fetch. Web `open` of raw URLs returned DisabledError (`turn122521909view0`–`view3`); those error refs do not prove a source read.

Medusa:

- `packages/core/core-flows/src/cart/workflows/complete-cart.ts`: payment/idempotency limitations in comments; actual cart lock, existing order link, conditional order creation, inventory reservation, late payment authorization.
- `packages/core/core-flows/src/cart/steps/compensate-payment-if-needed.ts`: query current order link before captured-payment refund compensation.
- `packages/modules/inventory/src/services/inventory-module.ts`: quantity/location validation and transactional reservation creation; selected methods only.
- `packages/modules/inventory/integration-tests/__tests__/inventory-module-service.spec.ts`: test declarations and assertions for insufficient reservation, explicit backorder and increasing reservations beyond availability.
- `packages/modules/inventory/package.json`: full file, version 2.22.7, Node >=22.22.0 and declared license/dependency/test scripts.

Saleor:

- `saleor/warehouse/reservations.py`: stock query/locking, active reservations, allocation subtraction, split reservation and insufficient-stock branches; preorder path not fully reviewed.
- `saleor/warehouse/tests/test_stock_reservations_management.py`: physical stock unchanged by reservation, multiwarehouse allocation, replacement and insufficient-stock assertions involving existing allocations/reservations.
- `pyproject.toml`: project/runtime/dependency declarations; main 3.24.0-a.0, Python >=3.12,<3.13, Django~=5.2.19; not a complete dependency/security audit.

GitHub `releases/latest` returned [Medusa v2.22.7](https://github.com/medusajs/medusa/releases/tag/v2.22.7), published 2026-11-13T12:27:45Z, and [Saleor 3.23.49](https://github.com/saleor/saleor/releases/tag/3.23.49), published 2026-11-12T12:31:59Z. Release metadata was read; release bodies were not fully audited. No third-party tests, payments, migrations or merchant experiments were run.

## Authored examples and remaining limits

The CNY ledger, route cards, stock/capacity numbers, evaluation cases and expected assessments are synthetic author material. They do not constitute host search receipts or professional-effect evaluation. Current platform fees, merchant eligibility, full payment/tax/returns adapters, production concurrency, actual conversion/retention and operating costs remain task-specific research. `runtimeStatus: needs_probe`, `professionalEffect: not_evaluated`.
