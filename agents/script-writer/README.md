# script-writer：自媒体脚本文案

给小红书、抖音、视频号、公众号的博主和店主用的脚本 agent。提供已定选题与角度，可附来源文章、说明材料、目标读者和明确立场；它先读证据与限制，再选具体切口、在内部列大纲，写出完整口播、分镜或正文。交付保留 3 个开头、2 句结尾和说法核对；只有拍摄类才附口播全文、时长和拍摄清单。

它不定选题、不起最终标题、不生成图片、不发布。选题找 `topic-planner`，标题封面找 `headline-cover-optimizer`。

## 安装（Claude Code）

把 `AGENT.md` 复制为 `~/.claude/agents/script-writer.md`（个人全局）或项目里的 `.claude/agents/script-writer.md`，重启会话后对 Claude 说「用 script-writer 帮我写脚本」即可。它只用 Read 一个工具，不写文件、不联网、不发布。

Codex、Cursor、OpenClaw 目前只能把 `AGENT.md` 当参考提示词使用，没有做原生投影。

## 怎么用

给它选题、平台、形式、时长或字数和口气；读者、来源资料和个人立场是可选输入。例如：

> 30 秒理线视频。我周末整理桌面，用了 2 条魔术贴；充电线走左侧线夹，键盘线沿显示器支架后方走。有前后照片，没有测效率数据。不露品牌，口气直接。

也可以说：“根据这份工具说明和试用记录，给团队组织者写公众号正文。我的立场是先小样验证再迁移。”它区分来源事实、用户立场与作者分析，再交完整正文；资料足够就写，普通缺项注明假设。完整合成正文与原 30 秒分镜实例见 `AGENT.md` 的「示例」。

## 方法适配与来源

方法参考 [内容创作者原文](https://github.com/jnMetaCode/agency-agents-zh/blob/811e51c370f26ec4f37ca277b4368b4ff895741f/marketing/marketing-content-creator.md)（固定修订 `811e51c370f26ec4f37ca277b4368b4ff895741f`）。将其受众需求与内容缺口、先列大纲再创作、个人观点、渠道表达迁入现有步骤 2–5；材料分析与观点归属由步骤 1、3、6约束。“问题—分析—方案—实操”仅适用于教程或建议型，不强制其他形式。

上游的跨平台运营、最终标题、发布分发、增长目标和长期记忆没有进入本角色。上游 MIT 版权保留在 `LICENSE` 与 `NOTICE`；本组件仍只交内容。

## 文件

- `AGENT.md`：agent 本体，也是安装文件。
- `capability.json`：机器可读的能力说明，Kim Service 索引用。
- `tests/contract.test.mjs`：结构校验，在仓库根运行 `node agents/script-writer/tests/contract.test.mjs`。

MIT License，KimYx0207 的组件与上游方法归属详见 `LICENSE`、`NOTICE`。变更见 `CHANGELOG.md`。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。
