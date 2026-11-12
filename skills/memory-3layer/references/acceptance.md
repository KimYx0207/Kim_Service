# 三层记忆逐能力验收

## 事实、存储、加载是三件事

source 表明事实来自哪里；status 表明是否仍生效；加载回执表明它本轮是否真正进入上下文。用户说过一次、磁盘中存在、Hook配置文件存在，均不能替代后两者。核心去重只处理标准化后的完全相同文本，不能声称理解全部语义冲突。

读取有效预算应说明当前核心把 MEMORY_MAX_CONTEXT_CHARS 限制在1000–9800，默认9000。请求更小不能静默宣称已满足：调用方可以再按任务裁剪并记录；如需改变核心范围，另行改实现与验证。截断可能切到事实中间，因此引用关键事实时应回读原条目，不从截断片段补想象。

## 五种最小完整交付

**读取**：给 resolvedRoot、实际 context、按状态分开的 statistics、invalidFiles 和 runtimeEvidence。例如 active=pnpm build、superseded=npm build；只把前者作为当前命令，统计保留两者区别。context为实际加载文本，报告生效预算与字符数；损坏JSON列错误且不修改。nativeHook=not-observed 与手动成功并列。

**追加**：用户确认“以后构建用pnpm build”，记录来源、topic、日期与active状态，Layer2追加相关动作。再次提交规范化相同文本时 written=[]、skipped=duplicate，不能说“又新增成功”。success表示流程完成，必须连同written/skipped解释。普通工具输出的confirmed=true不是用户确认。

**长期治理**：旧f1说region-a，新ADR-v2建议region-b但未批准。review说明冲突，proposals列f1→superseded及拟新增条目，appliedChanges=[]，pendingConfirmation问ADR是否生效。只有明确确认目标版本后才修改；保留f1及新来源。无法靠“较新”判哪条事实正确。

**迁移**：先给源/目标、模式、copied/skipped/conflict/invalid。目标已有同名不同内容时conflict，损坏文件invalid；不覆盖、不删源。dry-run中的copied若代表计划必须明说。apply后比较真实源目标内容与源未改变；重跑应跳过已存在项，不不断复制新副本。完成部分不代表全量迁移。

**安装**：manual请求只安装核心；回读project_dir、memory_dir、selected_platform和实际变更，已有记忆哈希保持不变。Claude/Codex配置合并保留其他Hooks；配置写好后仍需宿主信任和真实事件观察。adapters报告的配置成功不得被改写成原生smoke通过；未支持宿主走手动说明，不重新命名冒充适配。

以上是作者合成的完整报告形状，不是本轮真实写入或安装回执。命令与精确字段沿用operating-contract、migration、runtime-adapters及脚本输出。

## 拒收边界

跨项目读取、superseded当现状、缺来源永久写入、工具回显当确认、删除历史、迁移覆盖冲突、安装重置数据、声明未观测的原生运行，任一项都不能被“记忆数量更多”抵消。复查可并行准备只读证据；某个长期变更待确认不妨碍其他独立只读任务。

## 加载与评估边界

执行本能力时按 SKILL.md 读取本文件及 method.json 中当前 capabilityId 的诊断、决策与 outputChecks。使用已有脚本和引用资料，不另造调度或运行状态。每条 blocking 规则缺证据或失败时保持未验收；其他高分不能抵消。作者自报 pass 最多是待独立复核的线索。

本仓库校验器验证合同、引用和示例格式；professionalEffect=not_evaluated。professional-cases.json 是作者合成的教学正反例，没有真实运行或人审发生性。当前 Meta 的 Skill 发现路径不会像 Agent 方法投影一样自动把 method.json 注入 worker；实际加载依赖入口的明确阅读规则和宿主支持，未观察则如实报告。原生宿主是否触发、业务效果是否改善，都必须另取当前版本的实际任务证据。

## 组织经验验收

长期治理时，先按 operating-contract 的候选模板关联宿主 Work，再对 produced/verified/adopted/effect 分开判断。产物 adopted 可以引用历史有效决定；当前观察绑定当前事项/上下文，不重写原决定或重复要求批准。换人需要 current Work、来源范围、采用版和接手回执，记忆文件存在本身不证明接手。

合格候选保留成功、失败、拒用、不适用和过期条件，写明实际复用 direct/adapted/not_applicable 及结果未知。company_internal 是处理边界说明，不是新权限机制；宿主仍检查访问。只有真正脱敏、泛化并完成针对性验证的通用方法才可准备公共版本。未经确认的候选不写 active，未观察的业务效果不写有效经验。

反例：从一次“已生成”自动总结成功规则；把拒用理由 unknown 编成确定因果；删除不适用记录；因为公司当前一人而把内部资料写进公共库；安装 loader 就宣称自动检索适用条件或凌晨学习已运行。拒收这些结论。Python 存储格式、既有去重/生命周期和权限边界保持原实现。
