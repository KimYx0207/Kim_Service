# 专业成果文件试验

这套任务补充现有作者正反例。它提供真实输入文件、冲突材料和续做检查点，要求模型交实际文件，再分别核计算、文件、交互和判断。没有自动启动模型，也不会更改69个方法的 `professionalEffect: not_evaluated`。

旧的 [三题同题对照](../../docs/verification/professional-trials-2026-11-11/README.md) 保持原记录：两组37/37通过，观察差异为零。本套任务和工具通过不改写该结果。

## 准备一次实际运行

```sh
node scripts/professional-outcomes.mjs prepare --task finance-conflict --out /path/to/new-run --condition with_method --model "当前宿主实际暴露的模型名"
```

另外两个任务是 `design-states` 与 `frontend-resume`。`--condition baseline` 不提供方法包；比较方法迭代时，应为旧版和新版分别保留版本快照，不能把不同任务或不同模型混算为提升。`--attempt` 记录重复次数，默认1。路径必须是新目录，工具拒绝覆盖已有结果。

准备器生成给模型的 `task.md`、原始 `inputs/`、空的 `output/`、宿主记录 `run.json` 和供验收使用的冻结 `task.json`；方法组另有完整 `method/` 快照。输入目录没有评分答案。将任务交给全新独立上下文，仅提供可见题目、输入及该组方法包，不把验收记录、审计诊断或预期答案放入提示。文件任务是原创合成材料；不声称随机行业抽样或真实客户工作。

产物写入 `output/`。`submission.json` 的 `artifacts` 对象指向实际相对文件，不能引用外部路径、符号链接或空文件。任务里已经给出了需要交付的产物名称与格式。为用户说明事实的 `decision.md` 和交接文件也要真实写出。

## 评分

```sh
node scripts/professional-outcomes.mjs grade --run /path/to/new-run
node scripts/professional-outcomes.mjs grade --run /path/to/new-run --review /path/to/independent-review.json
node scripts/professional-outcomes.mjs summarize /path/to/baseline /path/to/with-method
```

自动检查读取冻结输入、方法快照、产物及内容哈希。金融任务核三情景各12个月的收入/利润/回款/付款/融资/现金和缺口；矛盾报价要求记录双方来源及未决定状态。设计任务递归检查声明的静态 HTML/CSS/JS 资源；它不能证明动态计算的 URL 或全部运行时资源闭包，始终注明还需实际浏览器检查，不会把 HTML 文件存在当成界面合格。续做任务检查只改用户指定标题，原正文和已完成行为保持。

视觉、键盘、实际交互与解释质量由宿主或独立评审者读取/操作产物后记录。使用 [评审模板](review-template.json)，将 `taskId`、`reviewer` 和当前任务 `humanCriteria` 对应的 `id` 填正确；每项 `pass`/`fail` 都需写具体观察与证据，没做的保留 `not_run`。评分脚本不证明评审人身份、是否盲评或浏览器是否真的操作过；这些仍需宿主实际回执支持。

`grade.json` 的状态含义：

- `fail`：实际文件、计算或审阅有失败。
- `needs_review`：自动项目未发现失败，但还有未做的人工/浏览器检查。
- `task_pass`：这一次合成任务的全部规定检查通过，不是所有领域或模型已认证。

`grade` 命令对应退出码为：通过0、失败1、参数或读取错误2、待实际评审3。产生评分文件不等于验收通过，自动化不要把 `needs_review` 当绿色成功。

`summarize` 回读当前运行、题目、输入、方法、全部产物和评分器的指纹。任一内容在评分后改变，或旧记录缺少完整快照，汇总行显示 `needs_regrade`，`recordedStatus` 保留历史状态；旧通过数不计为当前通过。当前文件不可读时同样保留历史并给出复核动作，不改写原 `grade.json`。存在待重评行时，汇总退出码为3。先对当前文件重新评分，再绑定当前产物进行必要审阅；旧试跑的原始评分只能按其对应版本回读，不能修改历史记录把它变成新版本验收。

时间和 token 只采用宿主实测：在 `run.json` 记录 `durationMs`、`totalTokens` 与 `measurement` 的来源。宿主没暴露就留 null；不要用答案字数冒充 token，用准备到评分的含等待时长冒充模型耗时。模型内部版本未暴露时写 `unexposed` 或准确的继承说明。

## 怎样避免又测成“都满分”

先看实际成品而非字段数。三类任务分别检验跨文件事实冲突、可操作设计、续做范围；作者样板能帮助使用，但不能作为独立效果证据。若两组都通过，保留零差异结果，增加与目标用户实际失误相符的新材料或比较完成时间和修改轮数；不事后改评分把方法组调成获胜。

多次运行、相同模型与任务、冻结版本和独立判断齐全后，才讨论这些任务上的可观察变化。金融计算参考复用包内纯工具，确定性测试另有人工可复算算例；它不是独立会计审计。专业效果仍等待更广任务与真实使用的证据。


## v2：显式口径与不可复用的审阅

2026-11-11 第一轮试跑发现题面未公开销量取整、summary必需字段和status/unit值域。该轮金融分数不用于方法效果比较；原任务与原始结果保留在验证记录中。v2向两组同时提供计算口径和机器字段约束。

准备时保存task.json与可见task.md的哈希、评分脚本及财务参考实现哈希。评分实现变化后旧记录会失败或待核，不静默换参考答案。没有这些元数据的旧试跑仍能展示文件检查，但不会成为完整task_pass。

每份grade.json返回reviewBinding。独立评审文件的binding必须逐字使用当前reviewBinding，绑定运行、任务以及output目录全部文件的哈希。修改HTML、CSS、脚本、说明或其他产物后必须重新审阅，不能复用旧的通过意见。模板不预先填写通过。
