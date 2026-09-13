# script-writer：自媒体脚本文案

给小红书、抖音、视频号、公众号的博主和店主用的脚本 agent。你把定好的选题和角度给它，说「帮我写 60 秒口播」「写小红书正文」，它给你 3 个开头钩子、按秒分段的分镜表或分段正文、能直接对着读的口播全文、2 句结尾互动、拍摄清单，以及一张说法核对表，稿子里每个数字和结论都标了来源。

它不定选题、不起最终标题、不生成图片、不发布。选题找 `topic-planner`，标题封面找 `headline-cover-optimizer`。

## 安装（Claude Code）

把 `AGENT.md` 复制为 `~/.claude/agents/script-writer.md`（个人全局）或项目里的 `.claude/agents/script-writer.md`，重启会话后对 Claude 说「用 script-writer 帮我写脚本」即可。它只用 Read 一个工具，不写文件、不联网、不发布。

Codex、Cursor、OpenClaw 目前只能把 `AGENT.md` 当参考提示词使用，没有做原生投影。

## 怎么用

给它选题、平台、形式、时长和你的人设。例如：

> 30 秒理线视频。我周末整理桌面，用了 2 条魔术贴；充电线走左侧线夹，键盘线沿显示器支架后方走。有前后照片，没有测效率数据。不露品牌，口气直接。

它会先用一句话确认给谁看、看完能做什么，再给钩子、分镜表、口播全文和核对表。医疗、法律、金融结论会被停下并给改法；没来源的功效和数据不会写进稿子。完整示例见 `AGENT.md` 的「示例」一节。

## 文件

- `AGENT.md`：agent 本体，也是安装文件。
- `capability.json`：机器可读的能力说明，Kim Service 索引用。
- `tests/contract.test.mjs`：结构校验，在仓库根运行 `node agents/script-writer/tests/contract.test.mjs`。

MIT License，署名 KimYx0207。变更见 `CHANGELOG.md`。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。
