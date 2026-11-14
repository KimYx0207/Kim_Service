# 技术路线交付示例

以下是作者合成输入与候选交付，用于评审规则；数字不是客户实测。

## 输入

`projectContext`：内部工单查询工具，projectId=support-search，阶段 validation；目标是查找型号和错误码，月运行硬预算 100 美元。`decisionScope`：沿用现有索引还是迁移托管服务。`currentSystem`：现有运行时与锁文件由用户给定为 runtime-20/lock-4。`constraints`：保留现有认证；p95 不超过 500ms；当前不能付费调用新模型。

## 完整候选交付

- `projectContext`：valueTypes=[internal]；受益者为支持工程师；本轮验证检索是否减少找资料耗时。没有收费方不妨碍验证内部价值。
- `comparisons`：现有索引复用权限过滤，示例月成本 90、p95 480ms；托管替换示例月成本 150、p95 200ms。后者违反硬预算，速度优势不能抵消。数字只是合成演示，真实选择尚待当前环境观察。
- `evidenceLedger`：用户提供预算与现状；锁文件待读取；供应商宣传属于来源主张；示例成本/时延标 synthetic，不填写本轮 benchmark 回执。
- `decision`：保留现有路线为先测基线。若真实月成本超过预算、型号准确率不足或维护负担超标，重新比较。尚未取得实际运行数据，不声称已证明最优。
- `validationPlan`：从未调过的型号/错误码、同义问法、无答案和权限例外中选择有代表性的题；固定数据与用户身份。同一资源范围下测查找成功、引用、p95、更新成本，失败先归因再改变一个因素。
- `projectCapabilityRequirements`：projectId=support-search；baseComponentId=applied-ai-engineer；baseComponentVersion=0.2.0；role=支持资料检索工程师；domainEvidenceRefs=[型号表,权限规则]；responsibilities=[型号检索,更新撤回,分层评测]；boundaries=[不改认证策略,不自批发布]；projectDelta=[型号精确匹配规则,当前部门权限,延迟预算]；reuseConditions=[同项目与现行数据/规则版本]；targetPath=agents/support-retrieval/；requiredInputs=[锁文件,语料清单,独立题集]；toolRequirements=[只读仓库,获准离线测试]；acceptance=[型号与同义问法分层,撤回不再暴露,成本不能被速度抵消]。这只是创建需求，实际文件与审核由宿主另证。
- `facts`：硬预算是案例输入；测量未发生；无模型调用；版本与价格在真实任务中需重新查证。
- `handoff`：调用方将研究结论并入当前设计，在项目内创建或迭代独立专业包，绑定当前输入后跑最小对照。未核性能只影响选型结论，已授权的资料盘点可继续。

## 表面完整但应拒收

“查了十个热门项目，托管服务综合 95 分，因此超预算也值得买”遗漏硬约束；“官方文档很快，所以我们 p95 已达标”把来源主张变实测；“采用全局专家，不需项目规则”遗漏型号、权限和项目验收。三种情况均需要修对应判断，增加引用或文字不能补救。
