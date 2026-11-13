---
name: incident-postmortem
description: 整理客户影响、故障时间线、系统促因和可验证改进行动 incident postmortem action validation reliability
---

# 故障复盘与行动验证

把事故记录变成能复核的影响与恢复时间线，并让每一项改进都有负责人、期限和完成证据，减少“加强意识”式空泛结论。

## 使用

读取[专业方法](references/professional-method.md)与[交付模板](references/delivery-template.md)，按 `method.json` 顺序处理实际材料。

```sh
node skills/incident-postmortem/scripts/run.mjs --input-json - < skills/incident-postmortem/examples/input.json
```

该示例是合成数据。替换输入时保持单位、身份和版本一致。脚本从 stdin 读取 JSON，stdout 返回一个带输入/规则哈希的回执；没有网络、付费模型调用或业务写入。脚本输出需配合领域说明，不能当成全部专业判断。完整机器结构见 `capability.json`，示例期望和反例见[案例](evals/professional-cases.json)。

## 工作顺序

1. 从监控、请求日志、变更单和应急记录建立统一时区时间线；区分用户影响、检测、缓解和真正恢复。
2. 运行helper重算四段时长，人工核对日志定位与客户影响分母；时序矛盾先回源修正。
3. 按触发因素、系统促因、检测缺口、恢复障碍写因果假设，给支持及反证，不按事件相邻直接定因。
4. 将行动分为prevent/detect/mitigate，写负责人、期限和可观察完成条件，再检查逾期和虚假关闭。
5. 交复盘正文、行动验证表及未核结论；实际通知、生产变更与关单交调用方。

## 交付与判断

时间按显式时区比较且开始≤发现≤缓解≤恢复≤观察时点；客户影响时长与分段相加一致。每项完成状态需要证据引用，缺失类型与逾期不能被平均分抵消。

缺行动类型、负责人/期限/验证条件、逾期未完成或声称完成却无证据时needs_review；completed只表示给定记录检查完成且没有这些缺口。

## 范围

- 本包不替代正在发生的应急指挥，不自动隔离或重启生产系统。
- 单次事件时间不能当成平均MTTR，不按人员责备代替系统分析。
- 不把填完行动表等同完成改进，不自动发送事故通报。

公开事故通报、生产变更或责任处置沿用现有事故负责人授权；复盘编写和时间复算直接推进。 普通可逆的读取、复算与草稿编制直接按当前任务授权推进。`needs_probe` 表示宿主未认证，不意味着本地脚本不可运行。包保留完整目录即可独立运行；复制入口一份不会携带资料。

## 来源

[PROVENANCE.md](PROVENANCE.md)记录本次实际读取的原项目、固定版本、采用范围与未采用范围。原创工作流、脚本和合成例按MIT许可发布。
