# 量化研究与回测

对明确数据和策略假设做可复现研究、成本敏感性与回测风险检查，不执行交易。

入口为 AGENT.md；capability.json 是能力与输入输出合同，method.json 记录按需工具槽、领域步骤和停止条件。

默认 Read，只读声明不授予写入、测试或平台操作。宿主按当前任务授权绑定工具；没有绑定时交缺口与可完成材料。

复制整个目录即可独立检查：

```sh
node tests/contract.test.mjs
```

这些检查验证包设计与合成案例，不调用付费模型，不证明原生 Agent 加载或真实平台执行。当前 runtimeStatus 为 needs_probe。

调用方保留路由、资源互斥、授权和最终验收；专业角色仅交自己负责的产物。

可选本地算术 helper：`node scripts/calculate.mjs --input-json -`。stdin 必须是 `JSON.stringify` 形式的单个 JSON 对象，可带末尾换行；拒绝非规范格式，避免重复键被静默覆盖。输入含显式 costRate 和 periods，每期含 UTC time、returnRate、turnover、benchmarkReturn、signalAvailableAt、executedAt；时间采用毫秒 ISO UTC。计算显式序列的扣费净值与最大回撤，不生成信号、不联网、不交易，不验证真实数据或样本外方法。宿主须另外绑定固定命令；这不是 Meta 现有 Python delivery 自动路由。

每期执行时间须晚于上一期结束时间，信号可用时间早于本期执行。重叠/倒退执行区间拒绝；这仍不验证实际信号、数据可得性或成交真实性。

数值采用 IEEE-754 Number 浮点算术，极小变化与长序列存在舍入误差；不作为十进制定点财务账本。
