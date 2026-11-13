# Method provenance

Inspected 2026-11-13. Original Kim Service methods, scenarios, prose and tests. Primary projects inform the design; no upstream source code, datasets, prompts or branding are bundled. Repository references are pinned; rolling documentation retains its inspection date.

| sourceRef | Primary source | Version inspected | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- | --- |
| erpnext-stock | [ERPNext stock domain](https://github.com/frappe/erpnext/tree/0993447543070749000f2b243d976e166e98156e/erpnext/stock) | 0993447543070749000f2b243d976e166e98156e | 库存预留、拣选和出库责任分离。 | 不复制GPL库存引擎，不把账面状态当现场事实。 | GPL-3.0; method reference only |
| erpnext-pick | [ERPNext Pick List](https://docs.frappe.io/erpnext/pick-list) | rolling page / read 2026-11-13 | 执行前刷新库存、扫描核对品项和数量。 | 不假定扫码等于质量、批次或客户条件已验收。 | Official documentation; reference only |
