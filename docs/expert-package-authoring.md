# 专家资料作者指南

一个角色能被发现，不代表它具备专业判断。作者要写出该领域的对象、概念、不变量、诊断分支、选择理由和失败边界，并让资料通过现有方法进入当前任务。Kim Service 提供方法与内容；调用方拥有工具权限、编排、任务状态与最终验收。

当前 24 个 Agent 使用同一可选专业合同，没有按角色名称分支的加载器。可从[概念讲解方法](../agents/concept-tutor/method.json)、[供应商比较资料](../agents/supplier-comparison-analyst/references/professional-method.md)和[后端正反案例](../agents/backend-data-engineer/evals/professional-cases.json)查看完整实例。它们不是所有领域都应照抄的模板。

## 保持三个不同层次

| 层次 | 能说明什么 | 不能说明什么 |
| --- | --- | --- |
| `capability.json` | 角色身份、适用范围、输入输出、权限、副作用和检查入口 | 具备工具、真实调用或专业质量已通过 |
| `method.json`、`knowledgeAssets`、`expertise` | 原创专业方法、材料、诊断与字段指导可装配 | 自动授权、调度状态、用户批准或专家认证 |
| 当前任务的实际产物与独立评审 | 具体输入、版本和范围下观察到了什么 | 推广为所有任务、行业和运行时均验证 |

不要在专业包内再建需求状态机、批准记录或长期私人画像。缺口、候选决定和依赖返回调用方；高影响专业内容由具备相应能力的人审核。普通可逆的写作、阅读和计算按现有授权推进，不因为包里有人工边界就重新索取所有确认。

## 资料写作顺序

1. **先核现有包。** 阅读 AGENT、实际输入输出、例子、脚本、测试与来源。已有具体方法或真实 helper 应保留；没有 `method.json` 不等于包是空壳。
2. **界定领域问题。** 写具体对象和范围，例如“同规格报价在MOQ与未知运费下比较”，不要只写“世界级采购专家”。列非适用情境及相邻角色边界。
3. **补真实知识。** 解释关键量、单位、状态或证据关系，以及何时不能套某公式。诊断要能区分至少两种需要不同处理的原因；规则写“何时、选择、依据、拒绝什么”，不能只有“认真分析”。
4. **绑定当前合同。** 输入指导说明每个必填字段的含义和缺失处理；输出检查说明每个必填字段应满足什么、什么情况应拒绝。字段名引用现有 `capability.json`，不另造另一套输入输出真源。
5. **写可判别案例。** 至少一个可接受候选与一个失败边界，输入合法、情境具体、反例在表面完整时仍犯专业错误。说明为什么可接受/拒绝，不只检查关键词。保持实际类型；候选输出可以是部分片段，不能称完整正式交付。
6. **记录来源与版本。** 优先官方文档、原项目与正式出版物。GitHub 资料尽可能固定 commit；滚动网页如实记读取日期和未固定版本。写清采用与未采用原则。保留 LICENSE/NOTICE；原创组织不称为复制第三方技能。来源行不能冒充当前任务已联网读取。
7. **检查实际装配和范围。** 新增目录、合同和数据后由现有生成器发现。不要在加载器加角色白名单或角色 switch。声明工具槽不授予执行；真实 helper 仍按原接口和宿主授权调用。
8. **把实测与作者预期分开。** 合成案例保持 `not_evaluated`。需要评价实际专业效果时，记录真实任务、材料/模型/工具版本、完整观察、对照候选、判定理由和失败范围。不得把自己写的答案或 schema 通过当成独立验收。

## `expertise` 的字段与引用

机器定义见 [agent-expertise.schema.json](../schemas/agent-expertise.schema.json)，外层仍沿用 [agent-method.schema.json](../schemas/agent-method.schema.json)。

| 字段 | 作者需要提供的内容 | 检查范围 |
| --- | --- | --- |
| `schemaVersion` / `domain` / `scope` | 合同版本、具体领域与边界 | 类型、非空和有界列表 |
| `knowledgeAssetIds` | 当前方法实际资料的 ID | 必须引用同方法的知识资源 |
| `diagnosticSequence` | 稳定 ID、诊断问题、需查证据、缺失时如何继续 | 结构、唯一 ID；文字专业性仍需评审 |
| `decisionRules` | 稳定 ID、条件、动作、应避免的错误 | 结构和唯一 ID，不执行这些规则 |
| `contractGuidance` | capability ID，以及必填输入解释/缺失处理、输出标准/拒绝条件 | 引用实际 capability 与字段，覆盖所声明能力的必填字段 |
| `reviewBoundary` | 具体人工审核触发与不可声明的结论 | 结构；不建立新的审批状态 |
| `evaluation` | 包内案例路径、`authored_examples`、`professionalEffect: not_evaluated` | 有界真实文件与诚实证据类型；不能自升为 verified |

方法中的 `knowledgeAssets` 保留 `id/path/appliesTo/sourceRefs` 四个字段。当前核心资料用 `appliesTo: ["always"]`，指“选择此角色方法后读核心资料”，不表示所有任务都加载所有角色。`sourceRefs` 必须对应同包 PROVENANCE 表格中的行 ID。

资源必须是包内普通 UTF-8 文件，不穿越目录或符号链接。方法文件上限 64 KiB；单知识文件 12 KiB、总知识文件 64 KiB；来源与案例文件各 64 KiB。案例 JSON 另有深度和节点预算。当前限制在 schema 的 `x-contentLimits` 和根检查器中读取；不要为装更多无关背景扩大预算。

## 案例是评审材料

[agent-expertise-cases.schema.json](../schemas/agent-expertise-cases.schema.json) 定义合成案例。每条案例绑定真实 capability、完整必填输入、部分候选输出、诊断/决策 ID 和预期判断。整个文件标明 `inputProvenance: synthetic`、`evaluationStatus: not_evaluated`。

根检查器复用同一结构检查逻辑核对声明的类型、必填字段、枚举、简单范围和已知字段；它是当前包 schema 使用的有限方言，不是通用 JSON Schema 实现。`deliveryFormat`、文字描述等注释不是自动断言。输出片段可省略无关的顶层交付字段，但提供的字段及其嵌套内容须符合已有类型与要求。

例如“订单数/访客数是20%，但没有去重买家数，不能声称买家转化率”是有判别力的专业案例；“输出包含 findings 字段”只是结构检查。作者标为拒绝的候选依然可以通过案例格式验证——这表示反例文件合法，不表示候选回答正确。需要实际评测时，由当前宿主另外运行与评审，不向本文件伪填成功回执。

## 验证与更新

```bash
node scripts/check-agent-pack.mjs
node --test scripts/check-agent-pack.test.mjs scripts/industry-agent-catalog.test.mjs
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
node scripts/check-components.mjs
```

先更新受影响包的 `componentVersion` 和 CHANGELOG，再重新生成索引。包内内容变化受完整组件哈希约束；不要手写目录中的摘要来掩盖漂移。独立分发保留完整目录，单独复制 AGENT 只得到精简入口而不会自动携带专业资料。

在 Meta_Kim 工作树中，对明确选择的 Service 来源运行实际装配检查：

```bash
META_KIM_TEST_KIM_SERVICE_SOURCE=/absolute/path/to/Kim_Service \
  node --test tests/governance/dependency-method-knowledge.test.mjs
```

该检查从真实索引发现全部 Agent，按显式测试宿主选择装入方法，并核对调用上下文中完整资料字节和 SHA256。它验证运输与绑定，不调用付费模型，不宣称所有专家有实际行业效果。新角色只要按包合同加入，就由库存自动纳入，测试与加载器不需要新增名称分支。

资料维护应由真实失败驱动：记录原输入、错误判断、导致错误的知识/规则和改后反例，再有范围地更新包；已经过时的规则注明替代依据并清理，不能为保持自己结论正确而修改历史证据。
