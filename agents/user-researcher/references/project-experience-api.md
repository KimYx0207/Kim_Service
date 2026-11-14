# 项目体验上下文与候选模型检查

本 helper 是只处理传入 JSON 的包内纯检查器，不访问网络、读取引用文件、创建项目能力、执行浏览器或写入批准。四个 UX 角色随包保留同一实现，独立项目副本不依赖全局路径。

## 输入

`prepareProjectExperience(input)` 接受当前角色输入；`input.designContext.projectExperience` 不存在时返回 `not_configured`，旧合同继续有效。新项目应由调用方先保存自己的能力/专业规则并投影进来；兼容旧输入不表示项目已经配置。

```json
{
  "designBinding": {"designId":"current-design","revision":3},
  "designContext": {
    "projectExperience": {
      "schemaVersion":1,
      "projectId":"current-project",
      "revision":1,
      "tasks":[{"id":"compare","actor":"购买者","goal":"判断能否安装","successCondition":"核对尺寸、接口和总价并选择适配商品"}],
      "layers":[
        {"level":"base","source":{"ref":"基础方法路径","version":"适用修订"},"rules":[]},
        {"level":"domain","source":{"ref":"本项目领域规则路径","version":"1"},"rules":[
          {"id":"installation-visible","kind":"visible_information","target":"comparison/selection","requirement":"安装条件和价格可直接发现","verification":"从商品比较入口核对真实内容","value":["dimensions","installation-constraints","total-price"]}
        ]},
        {"level":"brand","source":{"ref":"本项目品牌规则路径","version":"1"},"rules":[]},
        {"level":"task","source":{"ref":"当前模块与状态规则路径","version":"1"},"rules":[]}
      ]
    }
  }
}
```

上例用于展示形状；字段里的路径和版本须替换为实际来源，不是已存在的产物。四层依次为 `base/domain/brand/task`，每层来源必须存在于记录；没有本轮新增规则可用空数组。项目和设计 revision 分别表示上下文修订与现有设计绑定，不能取代彼此。`source.digest` 可选，helper 不认证来源字节。`taskIds` 可限定规则适用任务，缺省为当前全部任务。

调用方可在 `designContext.applicableExperienceTaskIds` 给出本切片负责的非空任务 ID 子集。helper 保留完整来源/冲突校验，只输出相关 taskBriefs 和 taskIds 相交的有效规则；未写 taskIds 的规则是共享规则，始终适用。没有 applicableExperienceTaskIds 时采用完整 profile，不按岗位名猜任务或静默丢规则。当前单一 PRD 保留完整 profile，该字段只是现有任务切片投影。

每条规则有 `id/kind/target/requirement/verification`。规则按每个任务分别解析；局部覆盖保留其他任务的基础规则。同一任务的相同 kind 和 target（representation 另含 informationId）变更时用 `overrides` 引用当前规则 ID；不会自动将两段相反的要求拼接。`invariant:true` 的必需可见信息和恢复要求只能增加或保留；其他必需专业判断须由专业评审解释，helper 不解释自然语言。

| kind | value | target / 检查 |
| --- | --- | --- |
| visible_information | 信息 ID 数组 | `page/state`；对应信息需为 primary 或 visible |
| representation | `{informationId,purpose}`，purpose 为 exact/trend/relationship/instruction | `page/state`；exact 需要可读精确数据，图形另需 summary |
| recovery | `{preserve:[],actions:[]}` | `page/state`；核本项目输入保留和继续动作 |
| theme | 字符串、数字或布尔值 | 语义 token 键；核候选输出实际值 |
| professional_judgment | 可选专业解释/约束 | 独立关切名，例如 accessibility 或 brand-art-direction；留给专业审查 |

结果 `prepared` 包含有效 `rules`、每规则来源 `lineage` 和按当前任务生成的 `taskBriefs`；修改领域规则会改变任务上下文。`invalid` 返回具体冲突/缺项，不能继续将该投影当已定规则。

## 输出消费

`checkExperienceApplication(input, output)` 检查输出的现有 `designBinding` 和下列可选新增组。在本轮提供了 projectExperience 时，该组由方法要求填写；旧输出不因此被追溯改变。

```json
{
  "designBinding":{"designId":"current-design","revision":3},
  "experienceApplication":{
    "projectId":"current-project","revision":1,"scope":"design",
    "ruleApplications":[{"ruleId":"installation-visible","status":"specified","application":"比较表直接显示尺寸、安装条件和总价，原理放次级说明","artifactRefs":["当前模块规格路径"]}],
    "surfaceModels":[{"target":"comparison/selection","taskId":"compare","information":[
      {"id":"dimensions","visibility":"primary"},
      {"id":"installation-constraints","visibility":"visible"},
      {"id":"total-price","visibility":"visible"}
    ]}]
  }
}
```

`scope` 为 research/design/implementation，只描述当前角色成果。每条有效规则都应有应用或 `not_run` 的影响说明。`status:observed` 另需 `observationRefs`；有引用仍需真实材料认证。不得把 fixture、模拟参与者和任务计划写成用户观察。

`surfaceModels` 是当前产物的候选结构投影，不是另一份 PRD。每个 target 绑定当前 taskId；同一页面状态可在不同任务下各有一条模型，以 taskId 与 target 的组合唯一。information 的 visibility 可为 primary/visible/on_demand；同信息重复出现需各有不同 `purpose`。representation 项给 `informationId/format`；精确数据用 text/table/list 加 `dataRef`，或通过 `alternative:{format,ref}` 提供。chart/diagram/image 需要 `summary`。recovery 项写 `preserve/actions`。有效 theme 规则须在 `themeTokens` 中体现。

研究阶段尚无界面时，helper 保留 `surface_not_supplied` 未验证项；设计或实现阶段缺必需状态会返回 invalid。scope 及规则覆盖是否符合真实交付范围仍由调用方按当前任务判断，不能用改成 research 绕过已要求的页面验收。

命令行从标准输入读 `{input}`，或 `{input,output}`，向标准输出写同一结果，输入上限 262144 字节。退出 1 表示结构/声明冲突，退出 0 仅表示准备完成或还需评审。

```sh
node scripts/project-experience.mjs < current-task-input.json
node --test tests/project-experience.test.mjs
```

检查后只会得到 not_applicable / invalid / review_required，`runtimeVerified` 恒为 false。它不验证被引用文件的存在、内容、截图、真实 DOM、参与者身份、商业效果、审美或授权；独立评审必须回看当前产物，实际操作关键用户路径。测试内四行业例和反例均标 synthetic / not_evaluated，只证明这些声明检查发生并能检出指定错误。
