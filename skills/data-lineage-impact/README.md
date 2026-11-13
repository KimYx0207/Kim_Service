# 数据血缘与变更影响

把“改这个字段会影响谁”变成带路径、来源、责任人和缺口的影响清单，先区分确认依赖与可能依赖，再安排有范围的回归。

## 使用

读取[专业方法](references/professional-method.md)与[交付模板](references/delivery-template.md)，按 `method.json` 顺序处理实际材料。

```sh
node skills/data-lineage-impact/scripts/run.mjs --input-json - < skills/data-lineage-impact/examples/input.json
```

该示例是合成数据。替换输入时保持单位、身份和版本一致。脚本从 stdin 读取 JSON，stdout 返回一个带输入/规则哈希的回执；没有网络、付费模型调用或业务写入。脚本输出需配合领域说明，不能当成全部专业判断。完整机器结构见 `capability.json`，示例期望和反例见[案例](evals/professional-cases.json)。

## 工作顺序

1. 对照变更单和数据目录确认全限定ID、版本、字段类型及口径，保留未匹配对象。
2. 把SQL、运行日志和人工声明整理成edges；OpenLineage事件先按专业方法处理facet优先级再转换，保留证据位置与采集日期，未观察依赖标declared/unknown。
3. 运行包内helper，复核两条代表路径和所有unmatchedSeeds，检查循环与责任人缺失。
4. 按高影响报表、指标、接口和调度任务分配回归责任，把图外系统作为明确缺口。
5. 交付影响清单、回归样例及回滚触发条件；实际迁移与最终采用仍由调用方执行。

## 交付与判断

影响对象不含重复，路径从变更对象开始且每条边存在；只有整条路径均有已观察证据时标observed_path。未知对象、证据空白、循环和责任人缺口不能丢失。

未知变更对象、相关无证据边、可能路径、未知责任人或循环使status为needs_review；completed只表示所给图已完成遍历，coverage始终为supplied_edges_only。

## 范围

- 不自动解析全部SQL或发现生产全量血缘；只分析本次提供的图。
- 不将名称相似视为同一字段，不因图中没连线宣布没有影响。
- 不自动修改数据库、调度任务或发布迁移。

生产字段删除、数据权限变更或迁移执行由现有变更责任人确认；影响分析与草稿不新增审批。 普通可逆的读取、复算与草稿编制直接按当前任务授权推进。`needs_probe` 表示宿主未认证，不意味着本地脚本不可运行。包保留完整目录即可独立运行；复制入口一份不会携带资料。

## 来源

[PROVENANCE.md](PROVENANCE.md)记录本次实际读取的原项目、固定版本、采用范围与未采用范围。原创工作流、脚本和合成例按MIT许可发布。
