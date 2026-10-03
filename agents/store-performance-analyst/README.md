# 店铺数据复盘

按SKU/渠道检查期间口径，分析漏斗、退款净收入和已列成本后贡献，给低成本核查及用户参数下的停止条件。
试着说：「店铺有浏览但没订单怎么查」「帮我复盘这周店铺数据」「活动花了钱但效果不清楚」。

读[AGENT.md](AGENT.md)按角色约定交付；输出保持五项中文成品。只读本次明确资料，不登录后台、投放或保证收益。
角色的`tools: Read`及权限未扩张；Meta_Kim负责意图、工具授权、选人和最终决策。
运行状态仍为`needs_probe`：本地helper可执行不等于原生Agent加载或模型交付已验证。

本包附独立Python标准库计算helper（版本0.2.0），宿主单独授权调用并传入实际receipt。无文件/网络/子进程/安装操作。
固定入口：`python scripts/calculate.py --input-json -`，stdin输入UTF-8 JSON，stdout一行JSON。建议`PYTHONDONTWRITEBYTECODE=1`。
输入最大65536字节：`schemaVersion:1`，`rows`1–200行，每行必须有`period/sku/channel`，同三键不得重复。
可选数字：`impressions/visitors/paidOrders/grossRevenue/refundAmount/adSpend/goodsCost/fulfilmentCost/platformFees`。
数量必须整数；所有数字非负、不含bool/NaN/Infinity，最大1e18，最多6位小数；缺失或null表示未知，不能传数字字符串。
`definitions`字段：`currency/periodDays/visitorBasis/orderBasis/refundBasis/adAttributionWindow`；可全局或`{byPeriod:{期间:定义}}`。
期间天数为1–3660整数，其余为口径文本（无归因也明确填写）；标识和口径文本最多80字符。缺定义为partial且不比较。
可选`comparison:{baselinePeriod,currentPeriod}`；不提供就只列每行，不猜期间；仅同SKU/渠道且全部定义相同可比。
不汇总访客、订单或收入，避免重复访客和渠道重叠；退款基准由材料定义，工具不证明数据出处准确。
输出`schemaVersion/tool/version/status/calculationTable/comparisons/quality/limitations/networkUsed/filesModified`。
`status`为`completed/partial/invalid_input`；exit为0/0/2。CLI错误也返回脱敏JSON，不回显输入或异常。
指标见[API和四类成品](docs/examples.md)：金额/比率返回Decimal字符串（6位小数、half-even），null为未知或不适用，率差是百分点。
成本缺项不算贡献；广告费/全部订单不是广告CAC或ROAS；收入分解是算术而非因果，贡献未含固定开支与税费。
`networkUsed:false/filesModified:false`只描述helper实现的无这些I/O操作，不代表宿主或操作系统隔离认证。
工具不可用仍可给材料内定性判断，明确未执行，不制造receipt。样例输出是参考成品，不能当作调用证据。

固定夹具：[normal.json](fixtures/normal.json)、[missing-fields.json](fixtures/missing-fields.json)、[definition-conflict.json](fixtures/definition-conflict.json)。
整个目录可独立复制；运行`node tests/contract.test.mjs`检查合同并实际调用Python helper。无Python将明确失败，不伪装通过。
角色仍接受必填文字`metrics`；可选`table/definitions/decisionConstraints/calculationReceipt`，helper有自己的薄JSON接口，capability不新增invocation。

许可证：[MIT](LICENSE)。固定来源及选择性吸收边界见[NOTICE](NOTICE)。
