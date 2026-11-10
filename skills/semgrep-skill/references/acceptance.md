# 本地扫描与安装的验收

## 扫描完成不等于安全

本包仅检查Python subprocess shell=True和JavaScript/TypeScript eval两种模式。completed是覆盖状态：选中的每个文件都被CLI确认扫描。发现非空也可以completed；漏扫一个选中文件即使findings为空也不能说“干净”。其他漏洞、语言、依赖、隐藏路径和被排除目录不在该结论范围。

执行必须沿用scan.py；官方CLI的不同命令/选项有不同退出策略，不能直接把Semgrep退出0解释为无发现。输出不得包含源码或原始诊断中的秘密。networkUsed=false是本包配置限制，不是网络抓包或恶意二进制沙箱证明。

## 最小完整扫描示例

合成输入：schemaVersion=1，workspaceRoot=/example/project，target=src。样本一selected=[sample.py]且scanned=[sample.py]，该文件第3行命中shell=True。报告status=completed、completed=true、findings含规则ID/相对路径/行列/等级/固定消息、errors=[]；runtime是实际Python与Semgrep版本；rules列原始与有效规则哈希、两个ID；networkUsed=false、filesModified=false。报告说明“扫描完成，发现一处模式，需人工判断实际输入可控性；不自动修复”。这里没有真实CLI运行，具体版本和哈希由实际回执填写，作者样例不能当回执。

样本二selected=[a.py,b.py]而scanned=[a.py]，输出partial/failed并说明覆盖错误；绝不能用findings=[]声称安全。缺CLI则unavailable，不自动安装依赖。实际包装器结果的状态取值以执行分支为准，不由报告作者改写。

## 预览、安装、回滚的完整示例

项目级预览给ok、action=install、mode=dry-run和准确target，前后目录无变化。得到当前范围写入授权后apply：给实际targetHash与回执路径，逐项回读SKILL、capability、method、专业reference、cases和许可证。专业文件不被安装会使入口的“请先读”失效，因此它们也是库存的一部分。

升级先验证现有回执及所有文件无外部修改，再保留上一版本。回滚预览验证上一版本回执；apply后targetHash恢复上一版，内容不能混合新旧method。无有效上一版、用户修改、未知同名目录或链接，均拒绝覆盖。失败时恢复原目标；安装不替用户安装Semgrep，不写扫描源码。

## 拒收反例

有完整哈希但投影缺acceptance.md；预览创建目录；项目安装实际改用户级；未知目录被覆盖；版本探测失败却使用旧结果；选中文件漏扫但completed=true；成功扫描冒充安全认证。任一条件失败都不能用其他检查成功抵消。

## 加载与评估边界

执行本能力时按 SKILL.md 读取本文件及 method.json 中当前 capabilityId 的诊断、决策与 outputChecks。使用已有脚本和引用资料，不另造调度或运行状态。每条 blocking 规则缺证据或失败时保持未验收；其他高分不能抵消。作者自报 pass 最多是待独立复核的线索。

本仓库校验器验证合同、引用和示例格式；professionalEffect=not_evaluated。professional-cases.json 是作者合成的教学正反例，没有真实运行或人审发生性。当前 Meta 的 Skill 发现路径不会像 Agent 方法投影一样自动把 method.json 注入 worker；实际加载依赖入口的明确阅读规则和宿主支持，未观察则如实报告。原生宿主是否触发、业务效果是否改善，都必须另取当前版本的实际任务证据。
