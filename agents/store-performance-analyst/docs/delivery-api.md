# Component-owned calculation delivery v1

这是可选的组件交付入口，不替代原有 `calculation-tool.json` 或 `scripts/calculate.py` CLI。`capability.json` 的 `deliveryContract` 指向 `delivery-tool.json`；宿主仍须核对来源、固定入口和文件哈希，并按自己的既有权限执行。描述符和本地调用不表示原生 Agent 已加载，角色权限仍为 Read。

## 固定协议

```sh
python -I -B scripts/deliver.py --input-json -
```

stdin 是 UTF-8 JSON 外层对象，且只有两个字段：

```json
{"task":"本次用户原始请求","inputJson":"本包原有计算器输入 JSON 的原始字符串"}
```

`task` 必须是非空字符串，最多 6000 个 UTF-16 code units。外层最多 1600000 字节，供原始 JSON 转义；`inputJson` 解码后的 UTF-8 字节仍受原计算器的 MAX_BYTES 限制。外层与原始材料均使用相邻计算器的重复键检查；不得先把材料解析成对象再重新序列化，否则重复键会丢失。`inputJson` 不能是计算回执。

适配器用 `importlib.util` 导入相邻 `scripts/calculate.py`，复用实际解析/计算函数及 Decimal 精度，不调用子进程、网络，不读用户文件、不写文件；导入时禁用 Python bytecode。描述符 `files` 列出两个执行文件，方便宿主快照核验。

stdout 是一行 JSON，固定字段：
- `schemaVersion: 1`、`status`、`tool`、`toolVersion`
- `calculationPerformed`：是否实际尝试原材料解析/核算，包括被严格解析器或计算器拒绝的输入；不表示形成了成功数值
- `brief`：含原请求 `request`、本次业务上下文和禁止业务动作的范围声明
- `missing`、`questions`、`issues`：缺项、组件提出的澄清与从真实回执提取的受限问题字段
- `receipt`：原有计算器回执；`receiptJson`：该回执的 ASCII JSON 精确字节文本；`receiptSha256`：`receiptJson` 的 UTF-8 SHA-256。宿主可通用检查文本哈希及 JSON 与 receipt 相等，不需要复制领域字段规则
- `delivery`：中文核算交付，未知保持未知；无可用输入时为 null
- `handoff: {status, code, questions}`：`status` 为 `ready`、`needs_input` 或 `blocked`
- `networkUsed: false`、`filesModified: false`

`status` 为 `completed`、`partial`、`invalid_input` 或 `needs_input`。仅 `invalid_input` 退出 2，其余退出 0。缺业务材料时不核算，receipt/receiptJson/receiptSha256/delivery 为 null；输入为零或 false 不会误作缺项，而由原计算器验证。原始材料无效时保留原格式 invalid_input 回执并阻断交接。外层协议错误或回执验证失败时返回脱敏 invalid_input，不回显异常、路径或原始输入。

业务材料问题、brief、领域回执校验、问题提取和中文表达由本组件负责；宿主只负责路由、授权、来源与传输核验、进程边界及是否接受交接，不重复定义这些业务规则。任何输出都不授权联系、发布、付款或业务后台变更。

## 检查

```sh
node tests/contract.test.mjs
node tests/delivery.test.mjs
```

测试实际运行固定 CLI，比较原始计算器回执，覆盖缺项、重复键、零/false、外层与原始字节上限、未知值、领域回执变异及无 bytecode 副作用。只证明本地工具协议与算例，不证明用户材料真实性、原生加载或模型结果。

## 本组件口径

原始材料上限 65536 字节。缺少或空 rows 时询问期间、SKU、渠道及明确指标行，退款或成本未知可留空；不向用户询问内部 schemaVersion。

brief 保留 comparison/definitions，scope 为 review_supplied_store_rows_only，permitsBusinessChanges 为 false。

回执保持原来的 version 字段，外层统一使用 toolVersion。领域校验检查回执精确顶层字段、工具与版本、行数量及 period/sku/channel 对应、数值字符串/null、质量问题及比较分支。口径冲突保留各期指标和 partial，禁止跨期比较和收入分解；这种可阅读的局部结果仍可 ready 交回宿主。
