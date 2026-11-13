# MCP连接契约审计

在替换或更新MCP服务前，对两份工具清单做有范围的差异审计，提醒新增能力、接口漂移和行为注解变化；不连接真实服务。

## 使用

读取[专业方法](references/professional-method.md)与[交付模板](references/delivery-template.md)，按 `method.json` 顺序处理实际材料。

```sh
node tools/mcp-contract-auditor/scripts/run.mjs --input-json - < tools/mcp-contract-auditor/examples/input.json
```

该示例是合成数据。替换输入时保持单位、身份和版本一致。脚本从 stdin 读取 JSON，stdout 返回一个带输入/规则哈希的回执；没有网络、付费模型调用或业务写入。脚本输出需配合领域说明，不能当成全部专业判断。完整机器结构见 `capability.json`，示例期望和反例见[案例](evals/professional-cases.json)。

## 工作顺序

1. 从当前宿主提供的工具清单导出前后快照；在采集记录中核对服务身份、账号/租户、授权范围和协议版本，分别保留分页完成标记，不保存凭证。
2. 运行离线helper，按工具名核新增/删除、描述、inputSchema、outputSchema、annotations和扩展字段变化。
3. 打开变更条目的原schema，对引用/组合和实际调用兼容性做专门检查；未执行探测就保留未观察。
4. 逐项核approvedToolNames与业务副作用，工具自报只读不替代授权或服务信任审查。
5. 交差异回执、需复核项与适用范围；连接、安装、凭证及真实调用仍由宿主执行。

## 交付与判断

按区分大小写的工具名比较所有声明字段及canonical哈希；分页不全时只给possibleAdded/possibleRemoved。added/removed仅为所给完整快照的可见工具差异；同服务、账号/租户和授权范围的采集记录由调用方核对，不同视角不能推导版本升级或服务删除能力。schema组合/$ref不能被误判为协议违规，行为注解不能成为授权来源。

身份/协议变化、增删/差异、未批准工具、部分分页或需进一步检查的schema/注解都会返回needs_review；completed仅表示当前比较没有这些变化，不是已连接或已授权。

## 范围

- 不主动连接MCP、读取凭证、调用tools/call或修改宿主设置。
- 不提供完整JSON Schema有效性/语义兼容认证；组合和引用保留为需检查。
- 工具annotations仅为声明，不授权操作或证明服务器可信。

新增工具执行权限、外部写入及凭证范围变更沿用宿主现有授权；离线比较可直接进行。 普通可逆的读取、复算与草稿编制直接按当前任务授权推进。`needs_probe` 表示宿主未认证，不意味着本地脚本不可运行。包保留完整目录即可独立运行；复制入口一份不会携带资料。

## 来源

[PROVENANCE.md](PROVENANCE.md)记录本次实际读取的原项目、固定版本、采用范围与未采用范围。原创工作流、脚本和合成例按MIT许可发布。
