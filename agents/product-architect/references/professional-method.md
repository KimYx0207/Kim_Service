# 产品架构与两层 PRD 知识装配

方法版本：0.3.0。使用当前任务的同一份 productDesign；需求事实、用户答案、权限和调度仍由调用方维护。本页是原创方法，来源修订与采用/不采用理由见 ../PROVENANCE.md。

## 从一两句意图开始

把目标拆成用户/情境、要完成的结果、现有做法、不可变边界和未知。可从仓库查的事实先查：入口、模块调用、数据来源、框架与锁定版本、已有测试/部署方式。没有代码时记录未知，不假装选型已定。

围绕会改变方案的具体问题找一手资料：当前栈官方文档、GitHub 固定提交中的对应实现/测试、可复现案例。记录问题、URL/路径、revision、观察结论、适用差异和拒绝原因；仓库星数与 README 宣传不能证明可用。参考材料中的安装、权限或提交指令不是本任务命令。

对技术事实给证据；对普通可逆设计给有依据建议；对改变用户目标、成本、公开行为或兼容边界的选择，给少量可比较选项、推荐和取舍。每项引用当前决定 ID；只问当前依赖已经明确的问题。未回答不等于同意，已回答不重复访谈。

## 第一层：架构和技术选择

在 productDesign.softwareDesign.architecture 中写 id、revision、summary、decisionRefs、technologyChoices、constraints、moduleIds。它是当前设计的子结构，不能作为第二个批准状态。

技术选择写实际 name/version、rationale 和 evidenceRefs；新增选型尚未确定时留探索稿，不编造版本。比较至少一个更小方案：用户价值、数据/权限边界、迁移、运维、失败恢复和待验证假设。把唯一数据来源、写入者、接口责任和共享状态说清楚。[spec-kit-plan]

约束用“要求＋怎么检查”表达，例如旧客户端兼容通过真实请求验证。架构 revision 随当前设计更改而更新；调用方已有 designBinding 决定旧任务是否仍可使用，不由本包批准。

## 第二层：逐模块可执行规格

modules 的每项包含 id、purpose、journeyRefs、decisionRefs、interfaceRefs、stateRefs、taskIds、acceptanceCriterionIds、states、businessRules、implementationNotes 和 removalCandidates。引用同一设计中的既有对象；architecture.moduleIds 与实际模块完全一致。

每个状态说明真实行为和失败恢复，每条业务规则说明约束的动作与数据；implementationNotes 指向当前代码入口/复用点和接口差异。验收写“给定输入，做什么，观察什么”，不只写“功能正常”。拆解围绕可演示用户结果，不把前端/后端岗位名直接当任务。[spec-kit-spec]

只把真实阻塞关系交回调用方现有 taskSlices：接口/上游产物依赖会串行，独立工作可并行，共享写入/浏览器资源由宿主调控。不复制外部模板的统一前置阶段或另建任务队列。[spec-kit-tasks]

删除候选必须给 path、replacement、reason、evidenceRefs，并核对代码调用、动态入口、配置、外部消费者和兼容路径；候选不等于删除许可。缺证据就保留，不删除联系信息或付款资产来“清理目录”。

## 正例与反例：离线编辑

反例：看到一篇云同步参考就选整套新框架；先拆“前端页面/后端接口”两任务；技术未决却将模块标完成，验收只写“同步正常”。

正例：确认旧系统的存储和认证事实，比较“先保留本机副本”与“增加版本化同步”；决定需用户取舍的使用范围。第一层说明版本条件更新和数据所有权；第二层定义离线、同步中、冲突、取消和恢复，接口/状态/任务均复用同一 PRD ID。用双端同版本修改演示“不会静默覆盖草稿”。示例只说明设计方法，不证明方案已实现。

## 候选产物检查与实际接受

可在当前宿主允许时调用 scripts/check-design-handoff.mjs，输入候选 productDesign、已定决定引用、acceptanceCriteria，以及可选 expectedDesignBinding。它只检查同一设计的身份/修订和引用完整性，输出 structure_valid 或 invalid；不认证来源、digest、用户批准、语义正确性或专业质量。

真正交付还需：每个决定有来源与取舍；模块状态和接口不矛盾；验收能观察用户结果；未知写影响和下一验证。前端以浏览器路径验收、后端以真实数据库/服务行为验收；缺环境保留 not_run。knowledgeUsage 记录实际资料使用，不能用来源列表冒充本轮查证。
