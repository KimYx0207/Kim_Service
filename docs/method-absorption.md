# 按任务吸收专业方法

Kim Service 使用第三方角色库中的领域方法，保留自己的包边界；调用方决定加载哪些角色和工具。角色文件、转换后的 instructions 和真实工具调用分别验证。

## 来源与吸收边界

本轮改进已有角色的交接、缺项表达与执行证据边界，并修复改稿强制问答、正文强制拍摄结构以及提供参数误当观察经历等冲突。参考方法不会自动变成新业务功能或默认交付承诺。

参考库固定为 [agency-agents-zh@811e51c](https://github.com/jnMetaCode/agency-agents-zh/tree/811e51c370f26ec4f37ca277b4368b4ff895741f)。领域方法按任务选择，角色入口和转换后的 instructions 只作为方法材料；不能从其文案推断宿主已经绑定 MCP 或真实软件工具。

上游 [角色名单](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/AGENT-LIST.md) 声明 277 个角色、213 个翻译、64 个原创；同提交 README 部分文案仍写 63，属于来源内部差异。它是翻译和原创混合的方法库，不能称为全部原创，也不能从角色数量推断可执行能力。其 MIT 来源归属为 Michael Sitarzewski（原英文版本）和 jnMetaCode（中文翻译与本地化）；本轮没有整包复制上游角色，未来复制许可内容必须一并保留相应版权与许可全文。

## 按需参考与已有角色的关系

| 方法线索 | 现有接收能力 | 本轮取舍 |
|---|---|---|
| [知识产品策划](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/marketing/marketing-knowledge-commerce-strategist.md) | launch-planner / pricing-cost-analyst | 受众、交付、试用反馈按任务参考；平台价格、增长数字和分销合规须另查，不导入经营总控或新增产品 |
| 国内内容运营 | topic-planner / headline-cover-optimizer / script-writer / xiaohongshu-skill | 保留已有职责，来源的运营方法按需要读取，避免复制相同角色或启动第二排期器 |
| [视频提示方法](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/design/design-video-prompt-engineer.md) | script-writer 的分镜与拍摄说明 | 分镜可参考；本轮未接生成 API，不承诺视频生成或渲染 |
| OpenSpace 的按任务检索思路 | 现有 capability 索引 | 先索引匹配再读相关正文；未引入其运行依赖或安装脚本 |
| [官方 Lark CLI](https://github.com/larksuite/cli) | 调用方的 provider/tool 选择 | 借鉴版本、schema 和权限相配的说明；当前未绑定该 CLI，未写飞书 |
| [CLI-Anything](https://github.com/HKUDS/CLI-Anything) | 有明确输入输出的本地工具 | 借鉴可复现的软件动作和真实产物；未运行第三方安装或宣称万能工具 |

参考不代表已经安装、调用或验证。这些外部库的版本和宿主支持在真正使用时重新核实；未知、待授权和不可用状态显式保留。

## V1.4 已实施的两条有限链

现有 `script-writer` 0.3.0 选择性适配固定提交的 [内容创作方法](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/marketing/marketing-content-creator.md)：读来源材料，定位具体读者和材料内缺口，分开来源事实、明确用户立场与作者推断，内部列大纲后交完整正文，按渠道与长度调整。沿用现有角色、输入输出和交稿边界；不把原来源的人设、永久记忆、增长目标、固定三种格式或自动发布导入。对应 MIT 许可与两项原版权保留在包内 LICENSE/NOTICE。

现有 `semgrep-skill` 1.1.0 将 `local-security-scan` 绑定到真实已安装 CLI；[包合同](../skills/semgrep-skill/capability.json) 的可选 invocation 定义固定 Python stdin/stdout JSON 路径。显式授权目录、两条非密钥规则、版本与配置 hash、扫描覆盖和失败状态均由 [唯一执行入口](../skills/semgrep-skill/scripts/scan.py) 实现。旧文档里的裸 CLI 和默认当前项目入口已替换，安装投影携带合同和执行入口。未加新工具包、业务产品、调度器或根治理系统。

这是两条限定任务的实现范围，不代表全部外部方法吸收完成。原生 Agent 宿主加载与 Meta 的跨项目治理链仍需分别核实；本机夹具扫描和模型交稿不能代替它们。

## 工具绑定与冲突处理

V1.5 继续限定为电商复盘与采购比较。现有 `store-performance-analyst` 选择性使用同一固定来源的[国内电商方法](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/marketing/marketing-china-ecommerce-operator.md)：按 SKU/渠道检查口径，分开收入、退款、成本、广告归因与可证实的变化，再交少量可观察的行动。新 `supplier-comparison-analyst` 使用[供应商评估方法](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/supply-chain/supply-chain-vendor-evaluator.md)：同规格报价、起订量、到货总成本、交期与质量证据、用户权重及敏感性。固定业绩数字、评分权重、虚构验厂记忆、自动投放/采购和未核法律规定都不导入。许可归属保留在两包内。

两个包各自带独立 stdlib Python 核算 helper，沿已用的固定 `--input-json -` 输入方式由当前宿主授权运行，结果再交领域角色。helper 的输入与 JSON 回执在包内说明；实际执行必须另外记录。它们不是新 Skill、治理系统或 Agent 原生工具声明，不放入角色的 `invocation` 字段，不让目录选中自动变成执行许可。无工具的材料内交付保留未知，不能伪称核算脚本已运行。

以 [Agent 包契约](agent-pack-contract.md) 为准。`capability.json` 定义输入、输出、权限、副作用及组件版本；`catalog.json` 和 `generated/capabilities.json` 自动派生。实际工具使用同时核对当前宿主可调用接口、包内命令和输入版本；没有工具时只返回材料内可完成部分及缺口。

根 schema 保持版本 1，仅接受严格可选的本地 Python JSON invocation；现有生成索引不透传该字段。调用方先按索引选择并验证包 hash，再读取包合同，核宿主 Python/CLI 与授权后执行；不能把方法 instructions、索引命中或该字段本身当作工具授权。Meta 继续拥有意图与宿主原生决策，Kim 只提供专业方法与执行契约。

专业角色只交当前领域成果。第三方角色中的总指挥、人设记忆、全量安装、强制多轮问答、自动发送和循环迭代不会变成本包权限。角色自查在交付前进行一次；只有真实缺项或失败需要返工，不按轮数反复让用户确认。Meta_Kim 负责需求对齐、选人、顺序、权限及最终验收。

真实工具返回值只证明对应动作，不证明模型加载了任何原生 Agent 或取得用户未观察的业务效果。现有专业角色的原生宿主加载继续保持 `needs_probe`；限定任务的模型交付可单独记录，仅凭结构检查或某个任务通过不得改成全包绿色。
