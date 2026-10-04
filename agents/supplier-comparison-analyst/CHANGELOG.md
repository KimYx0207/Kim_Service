# Changelog

## Unreleased

- 新增可选 calculation-delivery-v1 入口：业务提问、brief、领域回执校验、问题提取和中文核算交付归本组件所有。
- 复用原计算器，保留原 CLI、helperContract、版本与只读权限；新增固定协议、缺项和负向测试。

## 0.1.0

- 新增采购供应商比较只读专业角色与稳定能力 supplier-comparison-analyze。
- 提供Decimal包数/MOQ/到货成本、用户约束与权重敏感性helper及真实执行测试。
- 完全虚构的正常、缺项、口径冲突、无工具交付参考；原生Agent状态保持needs_probe。
- 选择性吸收固定agency-agents-zh供应商评估方法，保留MIT归属；不引入固定评分、验厂人设或外部操作。

来源：Kim Service 组件目录 `agents/supplier-comparison-analyst`；当前组件树提交由根目录既有 provenance 生成器绑定。
