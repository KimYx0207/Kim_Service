# topic-planner：自媒体选题策划

给小红书、抖音、视频号、公众号、B站的博主和店主用的选题 agent。你说「不知道发什么」「没流量」「帮我想几个选题」，它给你 5 个带切入角度、目标人群、流量类型、判断标准和排期的选题，并把涉及医疗、法律、金融结论的选题拦下来。

它只做选题和排期。标题封面找 `headline-cover-optimizer`，脚本正文找 `script-writer`。

## 安装（Claude Code）

把 `AGENT.md` 复制为 `~/.claude/agents/topic-planner.md`（个人全局）或项目里的 `.claude/agents/topic-planner.md`，重启会话后对 Claude 说「用 topic-planner 帮我想选题」即可。它只用 Read 和 WebSearch 两个工具，不写文件、不发布。

Codex、Cursor、OpenClaw 目前只能把 `AGENT.md` 当参考提示词使用，没有做原生投影。

## 怎么用

告诉它：账号领域、给谁看、平台、粉丝数、最近数据（没有也行）。例如：

> 我做母婴号，粉丝 2000，最近没流量。

它先说明已有资料支持什么，缺少后台数据时不判断没流量的原因；确认会改变方向的缺项后给选题表、排期和复盘规则。完整示例见 `AGENT.md` 的「示例」一节。

## 文件

- `AGENT.md`：agent 本体，也是安装文件。
- `capability.json`：机器可读的能力说明，Kim Service 索引用。
- `tests/contract.test.mjs`：结构校验，在仓库根运行 `node agents/topic-planner/tests/contract.test.mjs`。

MIT License，署名 KimYx0207。变更见 `CHANGELOG.md`。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。
