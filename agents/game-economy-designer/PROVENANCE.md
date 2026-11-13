# Method provenance

Inspected 2026-11-13. Original Kim Service methods, scenarios, prose and tests. Primary projects inform the design; no upstream source code, datasets, prompts or branding are bundled. Repository references are pinned; rolling documentation retains its inspection date.

| sourceRef | Primary source | Version inspected | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- | --- |
| nakama | [Nakama](https://github.com/heroiclabs/nakama/tree/37618ad4b927a9dd0671599ffc7387a7386f70fa) | 37618ad4b927a9dd0671599ffc7387a7386f70fa | 持久钱包状态与服务端交易明细分开审计。 | 不复制后端或自动注册支付/钱包接口；不假定事务等于业务幂等。 | Apache-2.0; method reference only |
| nakama-wallet | [Nakama virtual wallet documentation](https://heroiclabs.com/docs/nakama/concepts/user-accounts/) | rolling page / read 2026-11-13 | 钱包变更来自服务器运行时，保留交易及前后余额。 | 不采纳客户端可任意提交余额或重复奖励的设计。 | Official documentation; reference only |
