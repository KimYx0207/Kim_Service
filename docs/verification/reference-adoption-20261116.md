# 三项外部参考：采纳、归属与边界（2026-11-16）

本记录服务于本轮 MetaKim / Kim Service 迭代。原则：先核现有能力，只补有证据的缺口；外部方法仅作参考，不能因此声称真实模型、商业结果或原生宿主已通过测试。

## 1. Craft Anything：研究—制作—检查

来源：[storytold/craft-anything](https://github.com/storytold/craft-anything)，公开项目处于 Alpha 阶段。可借鉴的机制是证据身份、区分观察与推断、把假设和未知问题写成可追问项、跨会话保存研究—构建—检查的真实进度与依据。采纳到现有 `source-evidence-analyst` 与 `product-architect` 的 `professional-method.md`，绑定 MetaKim 已有 `researchEvaluation`、设计/决定引用和交接字段。不创建第二套状态机，不复制 Rust 执行器，不把尚未运行的步骤说成通过。

## 2. cn-math-taxonomy：人类 PRD 的图谱阅读方式

来源：[xiaoyang111222/cn-math-taxonomy](https://github.com/xiaoyang111222/cn-math-taxonomy)。参考“可搜索目录→关系图→节点详情”的导航，以及显式依赖方向和可阅读的图谱范围。归属 **Meta_Kim Live**：唯一 `softwareDesign` 的一级 architecture 与二级 modules 只读可视化；代码 Graphify 独立存在，仅凭稳定 ID 建立可核的后续联系。参考项目使用 **CC BY-NC 4.0**；不拷贝其代码、内容、样式或拓扑数据。具体验收与限制见 Meta_Kim `docs/live-workspace.md` 和 PRD 图谱定向测试。

## 3. X 帖：真实问题、决策、练习与复盘

原作者：[PaulYoungX 主帖](https://x.com/PaulYoungX/status/2121474498364915967)及其编号回复。本轮公开浏览器实际见到 **10 条**，而非截图/转述里最初以为的 7 条。用户所给的 [KimYx0207 链接](https://x.com/KimYx0207/status/2121756642165543291)是对第 7 条的补充，强调**先实际练习、提交作品，再根据证据反馈**。随后用户明确纠正：这类方法应提供给**所有专业 Agent**，教育只是其中一个应用场景。

**公共能力单一入口**：`skills/agent-thinking-patterns/SKILL.md` 和 `references/patterns.json` 提供十种模式的跨 Agent 选择方式，MetaKim 的 `meta-theory` 按实际任务缺口发现和绑定。原 Agent 的专业方法、宿主权限和现有状态不变；并不要求所有 Agent 每次执行十种模式。

| 编号与原帖 | 可检验的做法（概述） | 现有归属 / 本轮处理 |
| --- | --- | --- |
| [1 · 思考伙伴](https://x.com/PaulYoungX/status/2121474500466258014) | 先识别真正的问题，动态提出能改变选择的关键追问 | 共享 `clarify-real-problem`；不固定提问数 |
| [2 · 严格质疑](https://x.com/PaulYoungX/status/2121474501858697239) | 找薄弱假设、遗漏、失败条件及反证 | 共享 `adversarial-review`；复用专业 Agent 的实证能力 |
| [3 · 倒推目标](https://x.com/PaulYoungX/status/2121474503351906447) | 目标→步骤、能力、工具、关键决策、检查点 | 共享 `backcast-goal`；可借助现有 GoalPro / Meta taskSlices |
| [4 · 专家方法对照](https://x.com/PaulYoungX/status/2121474504618590365) | 通过真实领域证据对比新手误区与专业做法 | 共享 `expert-comparison`；由实际领域 Agent 提供专业依据 |
| [5 · 决策架构](https://x.com/PaulYoungX/status/2121474506053017749) | 比较方案的收益、风险、机会成本与长期后果 | 共享 `decision-tradeoffs`；不替换现有人类拍板关口 |
| [6 · 机会猎手](https://x.com/PaulYoungX/status/2121474507449716898) | 调查谁会付费、如何变现、验证机会的证据 | 共享 `opportunity-scan`；不同领域采用相应价值证据 |
| [7 · 学习加速](https://x.com/PaulYoungX/status/2121474508825501705) | 先练习和提交，再根据具体错因反馈并复习迁移 | **共享 `practice-feedback`：任意专业 Agent 可用**；教育 Agent 另外保留答案隔离与评分细节 |
| [8 · 复用系统](https://x.com/PaulYoungX/status/2121474510171918695) | 行动触发、检查点和后续反馈 | 共享 `repeatable-system`；不虚构宿主自动化已调度 |
| [9 · 知识提取](https://x.com/PaulYoungX/status/2121474511799279728) | 提取洞见、前提、适用范围与反向判断 | 共享 `knowledge-extraction`；原资料与推断分离 |
| [10 · 战略取舍](https://x.com/PaulYoungX/status/2121474513405645035) | 找最大杠杆与应停事项，再给可执行下一步 | 共享 `strategic-focus`；尊重已确认的优先级和授权 |

### 结果与边界

- 研究方法：两个既有专业 Agent 的方法文件已增强，仍由当前宿主决定何时实际联网、创建计划、实施和验证。
- 通用方法：十条模式已整理成可发现的 `agent-thinking-patterns` Skill，专业 Agent 按任务缺口选用；测试涵盖代码评审与电商等非教育角色。两个教育 Agent 继续保留其专属题目、答案和评分规则。没有真实用户提交就保留 `awaiting_submission` / `not_run`；完成方法测试不等于实际学习成效。
- 图谱：由 MetaKim Live 用现有架构、模块和依赖绘制；没有把代码 Graphify 静态符号关系当作人类 PRD 权威。
- 结果级别：专业方法属于结构/合同验证，真实 AI 模型执行、学员学习成果、不同宿主的 UI/权限行为目前仍是 `not_evaluated`。
