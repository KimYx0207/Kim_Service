# headline-cover-optimizer：自媒体标题封面优化

给小红书、抖音、视频号、公众号的博主和店主用的标题封面 agent。你把正文或至少 3 句要点给它，说「标题想不出来」「封面写什么字」，它给你 5 个带类型和风险说明的标题候选、推荐的主标题加 A/B 备选、2 套封面文字版式，并检查标题、封面、正文是不是同一个承诺。

它不写正文、不生成图片、不做标题党。选题找 `topic-planner`，脚本正文找 `script-writer`。

## 安装（Claude Code）

把 `AGENT.md` 复制为 `~/.claude/agents/headline-cover-optimizer.md`（个人全局）或项目里的 `.claude/agents/headline-cover-optimizer.md`，重启会话后对 Claude 说「用 headline-cover-optimizer 帮我起标题」即可。它只用 Read 一个工具，不写文件、不联网、不发布。

Codex、Cursor、OpenClaw 目前只能把 `AGENT.md` 当参考提示词使用，没有做原生投影。

## 怎么用

把正文贴给它，或者给要点和平台。例如：

> 小红书图文，讲上班族带饭一周不重样。要点：周日 1 小时备菜、5 个菜谱、每份成本 8 块、微波炉 3 分钟热好。标题想不出来。

它先写出「这条内容对谁、承诺什么」，再给标题表、推荐组合、封面方案和一致性检查。没有证据的比较、功效和收益承诺会被拦下；不凭一个字判断法律问题。完整示例见 `AGENT.md` 的「示例」一节。

## 文件

- `AGENT.md`：agent 本体，也是安装文件。
- `capability.json`：机器可读的能力说明，Kim Service 索引用。
- `tests/contract.test.mjs`：结构校验，在仓库根运行 `node agents/headline-cover-optimizer/tests/contract.test.mjs`。

MIT License，署名 KimYx0207。变更见 `CHANGELOG.md`。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。
