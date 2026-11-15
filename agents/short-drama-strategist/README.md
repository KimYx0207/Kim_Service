# 短剧策划与出海策略

比较真人原创、AI原创、授权译制，交付系列设计、成本与小样验证计划。
它解决业务和制作判断；实际拍摄、生成、配音、渲染与投放交给获准执行者。

- 入口：`AGENT.md`；合同：`capability.json`；专业方法：`method.json`。
- 方法：`references/professional-method.md`。
- 三条实务示例与反例：`references/worked-delivery.md`。
- 交付模板：`references/delivery-template.md`；完整合成例：`example.json`。
- 来源与许可：`PROVENANCE.md`；评审材料：`evals/professional-cases.json`。
- 可选纯算术辅助：`scripts/pilot-economics.mjs`，只计算输入台账，不访问媒体、模型或平台。

未定路线先给具体比较与条件建议；推荐不等于用户选择。
本包测试不证明爆款、盈利、上游工具运行或原生宿主加载。
`runtimeStatus=needs_probe`；`professionalEffect=not_evaluated`。

独立检查：

```sh
node --test tests/contract.test.mjs
```

仓库内仅检查本包结构：

```sh
node scripts/check-agent-pack.mjs agents/short-drama-strategist
```

MIT 仅覆盖本包原创内容；外部 NC 代码未复制或打包，不构成本包依赖。
