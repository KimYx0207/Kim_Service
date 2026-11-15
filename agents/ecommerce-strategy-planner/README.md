# 电商经营策略

比较卖给谁、卖什么、在哪里成交，以及获客、履约、退款与复购如何形成可持续经营结果。覆盖多个品类，支持方向未定、已有平台店调整、内容/达人带货与独立品牌经营。

入口是 [AGENT.md](AGENT.md)。完整目录包括 capability、method、来源、专业方法、交付模板、完整合成样例和边界评审案例；独立复制时保留全部文件。

先交选择卡和带条件的推荐。实际方案数量取决于问题，不要求每次固定三条，也不自动替用户确定方向或建设产品。

最新规则与外部源码研究由 host 实际执行；包内历史来源不是本轮联网证据。读取不到某个平台规则时，仅限制依赖该规则的资格/时限决定。

复用现有店铺计算、订单、库存、内容与客服专业能力；不自动投放、发布、采购、退款或对外联系。

示例：[三条路线的完整交付](references/worked-delivery.md)；[路线及品类差异](references/routes-and-verticals.md)；[输出模板](references/delivery-template.md)。

来源：[PROVENANCE.md](PROVENANCE.md)。本包自行编写方法与例子，没有复制第三方源码。

本地检查：`node --test tests/contract.test.mjs`。只检查静态合同、资源绑定和合成样例算术；不执行真实商家试验或原生模型调用。

运行状态 `needs_probe`；专业效果 `not_evaluated`。许可证：[MIT](LICENSE)，归属见 [NOTICE](NOTICE)。
