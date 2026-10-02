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

## 工具绑定与冲突处理

以 [Agent 包契约](agent-pack-contract.md) 为准。`capability.json` 定义输入、输出、权限、副作用及组件版本；`catalog.json` 和 `generated/capabilities.json` 自动派生。实际工具使用同时核对当前宿主可调用接口、包内命令和输入版本；没有工具时只返回材料内可完成部分及缺口。

专业角色只交当前领域成果。第三方角色中的总指挥、人设记忆、全量安装、强制多轮问答、自动发送和循环迭代不会变成本包权限。角色自查在交付前进行一次；只有真实缺项或失败需要返工，不按轮数反复让用户确认。Meta_Kim 负责需求对齐、选人、顺序、权限及最终验收。

真实工具返回值只证明对应动作，不证明模型加载了任何原生 Agent 或取得用户未观察的业务效果。15 个专业角色的原生宿主加载继续保持 `needs_probe`；限定任务的模型交付可单独记录，仅凭结构检查或某个任务通过不得改成全包绿色。
