# MCP连接契约审计方法

## 三种对象分开

服务身份决定你在比较谁；工具契约描述它声称能做什么；宿主授权决定本任务能调用什么。工具名相同不意味着服务器相同，名称相同而参数必填字段改变也可能破坏客户端。跨租户、不同scope或不同协议版本的工具清单未必具有同一发现范围，先写采集上下文再解释差异。

[MCP Tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#capabilities)允许工具列表按请求携带的授权范围变化。先在采集记录中核对同一服务、账号/租户、授权范围和协议版本，再解释同一视角的增删；账号或授权不同，即使两份清单都已收齐，也不能把可见工具差异归因为服务版本升级、删除能力或破坏性变更。只保存非秘密的身份/范围引用，不保存凭证。

helper不读取或验证账号与授权上下文。其complete与comparisonComplete仅描述所给分页是否齐全；added/removed是两份完整快照的可见名称集合差，不证明变化原因。若任一complete=false，helper改用possibleAdded/possibleRemoved。身份/授权未知或不一致时，在交付说明中保留范围不一致及待核证据，不改写脚本回执或把完整分页改称缺页；可继续审查共同出现工具的实际字段差异。

## 差异与兼容不是同义词

helper对工具对象各顶层字段做canonical比较，对象键顺序不影响哈希，数组顺序保留；数组变化可能只是等价声明，但仍值得查看。描述、标题、注解、执行配置、未来扩展字段都可能改变模型使用方式，不能只看参数名。它不把字节差异直接判成破坏性变更。

输入JSON Schema需表达对象参数，但可能通过引用和组合描述。`$ref`、`allOf`、`anyOf`、`oneOf`、条件schema和未识别根类型在本审计中是“需进一步检查”，不是“官方违规”。输出schema允许更广的JSON结构；本工具保留、比较，不强行只允许object。远程引用只计数，不发网络请求。本地脚本不是通用JSON Schema validator，也不证明tools/call或structuredContent已满足契约。

## 行为注解不是权限

readOnlyHint、destructiveHint、idempotentHint、openWorldHint是服务提供的提示。没有注解时记录unknown；有注解仍不能证明行为。approvedToolNames来自当前宿主已有授权，任何工具不在列表里都报告unapproved，不反向修改列表。即使工具可重复调用，也不意味着可无限重试；是否外发、修改或承担费用仍需实际宿主按任务处理。

## 合成工作例

lookup_customer的必填参数从id改为customerId，另增加delete_customer。审计返回lookup_customer的inputSchema变化及delete_customer未批准。服务同样叫crm-readonly也不能隐藏新增删除能力；更不能因为原查询工具自报readOnlyHint=true就允许整个服务所有工具。

未调用SDK或真实服务，不承诺MCP协议完整认证。官方SDK当前许可处于Apache/MIT迁移，文档另有CC-BY条款；本包没有复制其实现。
