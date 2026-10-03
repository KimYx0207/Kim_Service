# 采购供应商比较

比较用户提供的同规格报价：包数与MOQ、运费与费用、交期和质量证据；交付条件短名单与验证建议。

试着说：「帮我比较这几家供应商」「同规格报价谁的到货成本更低」「预算和交期限制下先试哪家」。

按 [AGENT.md](AGENT.md) 读取角色，整个目录可独立复制。只读本次用户材料，不联系供应商、不下单付款；服务报价经济测算交给 pricing-cost-analyst。

机器合同 [capability.json](capability.json) 采用 conceptual-human-delivery；角色输出为表格正文，保持 `needs_probe`，不宣称已验证原生Agent加载。

本包 Python 标准库helper仅核算数值，没有文件、网络或子进程动作。调用方须单独授权宿主执行，再把实际 `calculationReceipt` 给角色；Agent权限未包含执行。真实宿主命令：

```sh
python -B scripts/calculate.py --input-json -
```

stdin传schemaVersion1 JSON，stdout返回JSON；completed/partial退出0，invalid_input退出2。所有输入金额/数值使用普通十进制，输出数值为十进制字符串或null。

最小业务输入：quantity/currency/specification/quotes；报价含supplierId、规格币种、packSize/packPrice/minimumPacks/freight/otherFees/leadDays及qualityEvidence。未知报价字段可省略，得到partial而非零成本。

可选weights含cost/delivery/quality三项非负用户权重；qualityScore须配统一qualityScale和qualityDefinition。maxLeadDays、minimumQualityScore、sensitivityDelta仅使用用户给值，无默认权重或阈值。

成本/交期使用候选min/max归一，质量使用用户尺度；同值同分，同分共享名次。缺项、口径冲突不排行，不重分权重。不猜汇率或换算单位；质量证据不是认证。

完整严格API见 [tool-api.md](docs/tool-api.md)；四类虚构输入与可理解输出见 [examples.md](docs/examples.md)。工具不可用时给材料内定性比较和缺口，不造回执。

调用方从 `capability.json` 或生成索引的 `helperContract` 找到 [calculation-tool.json](calculation-tool.json)，核对组件与脚本后执行。用户已明确要求材料内核算时，按宿主既有工具权限直接计算；缺权重不重复询问，缺规格、数量、币种或候选报价（quotes 缺失或为空）先合并澄清必要材料。这个辅助工具合同不扩大 Agent 的 `Read` 权限，也不允许任意命令。

运行 `node tests/contract.test.mjs`：仅Node内置模块加已安装Python；实际spawn本包helper核算。通过证明结构和工具算例，不等于模型交付或nativeAgent实测。

许可证：[MIT](LICENSE)；来源及选择性吸收边界见 [NOTICE](NOTICE)。组件版本0.1.0。
