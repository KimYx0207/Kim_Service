# 专业 Agent 包契约

Kim Service 的 Agent 是独立的专业角色：接收明确材料，完成一种有边界的交付，再把结果交回调用方。选人、跨角色顺序、授权与最终验收由调用方负责；接入 Meta_Kim 时由 Meta_Kim 治理。第三方包可供参考，不因此获得治理权限。

## 一个包里有什么

| 文件 | 责任 |
|---|---|
| `AGENT.md` | 角色入口：名称、触发、输入、输出、步骤、拒绝边界、完整输入输出示例与自查 |
| `capability.json` | 唯一人工维护的机器合同，声明能力、适用与不适用场景、输入输出、权限、副作用与检查入口 |
| `README.md` | 用人话解释用途、使用方式及当前运行限制 |
| `LICENSE`、`NOTICE` | 可独立分发的许可全文和归属 |
| `CHANGELOG.md` | 组件版本与变化 |
| `tests/contract.test.mjs` | 仅依赖 Node 内置模块和本包文件，可在单独复制的目录运行 |

`catalog.json` 和 `generated/capabilities.json` 由根生成器生成，禁止手填哈希或手动补库存。复制整个包才能保持许可、合同和验证完整；只复制入口到原生运行时属于用户选择的安装方式，不代表其他运行时已支持。

## 输入、输出与交接

- 输入必须声明真正影响任务的必填项。缺关键事实先问清，普通表达可说明假设后继续；不按提问数量配额作判断，不把未回答当批准。
- 输出按合同列出的结构交付。`conceptual-human-delivery` 表示面向人的表格、正文或清单，不是声称模型已经返回可直接解析的 JSON。
- 每个包包含一个有具体输入、推理依据和完整交付的示例。示例数字只在该例前提下有效，不能充当用户的事实或真实调用记录。
- 交回调用方时带上原始事实、使用的来源、草稿、缺项、边界和检查结果。相邻角色的名字是建议，不是自动调用指令。
- 默认只读用户为当前任务明确提供的资料。热点核查仅由声明 WebSearch 的包在工具实际可用时进行；无工具就交常青内容并说明限制。
- `sideEffects: []` 表示不自动发布、发消息、改订单、付款或保存个人长期记忆。医疗、法律、金融等专业结论按包内边界处理；合同中的人工决定条件不构成对普通可逆写作的反复审批要求。

## 与 Agent 设计标准的对应

包内事实可映射到 Meta_Kim 的 Agent 设计契约，但本仓库不导入治理代理、Hook 或跨组件状态机。

| 设计字段 | 本包中的依据 |
|---|---|
| name / description | `AGENT.md` frontmatter，名称稳定，描述同时有中文场景和英文能力词 |
| flowPosition / purpose | 角色定位、适用场景以及相邻角色边界 |
| capabilities / nonCapabilities | `useWhen`、`doNotUseWhen` 与实际承诺交付 |
| loadoutSlots | 只读工具声明、`permissions` 与使用条件；具体任务命令不写进身份 |
| inputs / outputs | `input`、`output`，对应正文输入、交付结构与实例 |
| handoff | 草稿、事实、缺项交给调用方；邻接角色由调用方选择 |
| memoryPolicy | 仅保留本次任务必要上下文，不长期记录个人与第三方资料 |
| gapPolicy | 资料不足缩小结论或提出关键问题，不编造效果、数据和执行证据 |
| verificationPolicy | 本包结构检查、独立目录检查、领域自查；模型行为需另做实测 |
| installProjection | 当前 `needs_probe`；Markdown 入口不等于已验证的 Codex TOML 或其他原生 Agent |
| identityCleanliness | 稳定身份不包含本机路径、工单、临时交付链接或当日验证步骤 |

评审逐项检查身份清晰、领域具体、流程适配、最小工具、记忆边界、缺口诚实、交接完整、可验证、运行状态明确、身份干净和依赖边界。这是 11 项设计维度；结构测试通过不能代替这些判断，更不能当作 11 项模型行为实测通过。

## 完整实例入口

例如商品页文案包，输入是已知的帆布袋尺寸、材质、拉链、颜色、价格及「未做承重测试」。输出必须覆盖事实清单、多个标题、每个卖点的证据、可用详情正文和发布前待核实项；不得擅自写防水、承重或已上架。

该实例的完整正文在 [商品页文案](../agents/product-listing-writer/AGENT.md)；其他 14 个包也各有独立实例。它们是设计样例，不是已发生的客户结果。

## 本地检查

在单独复制的包目录运行 `node tests/contract.test.mjs`。仓库维护者运行：

```sh
node scripts/check-agent-pack.mjs
node --test scripts/industry-agent-catalog.test.mjs scripts/check-agent-pack.test.mjs
node scripts/catalog-automation.mjs build
node scripts/catalog-automation.mjs check
node scripts/check-repository.mjs
```

前两步检查包设计和独立性，后续检查生成索引及来源一致性。发布门和跨运行时模型实测是另行取得的证据，不能用本地结构通过代称。

## 方法、声明与真实工具绑定

方法参考按任务加载。角色不接受外部参考里的总指挥、安装命令、长期记忆或固定提问轮数为本包权限。内容/视频沿选题、脚本、标题封面和小红书已有边界融合；其他专业方法也先匹配现有职责，不从参考示例推导新增产品需求。来源见 [方法吸收说明](method-absorption.md)。

`tools: Read` 或 WebSearch 只声明需求。调用方发现当前宿主真实工具，绑定权限、实际命令、组件版本及输入输出后才可执行；只装 Markdown 或运行 convert 不等于 MCP/tool 就绪。无工具时返回材料内可完成部分和缺口，不虚构调用。Meta 的 7 维意图与 nativeDecision 仍归 Meta，不在角色里重复。

真实调用记录只证明该次动作及实际产物，不能升级其他角色的 needs_probe，也不能把计划、示例或静态检查当作已经执行。调用方选择角色顺序、工具权限和最终接受结果；沿现有包契约接入，不新增并行治理或 provider 注册系统。
