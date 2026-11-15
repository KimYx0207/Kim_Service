# 来源与独立编写范围

研究日期：2026-11-15；实际读取本轮公开一手网页与GitHub文件。精确原始回执仅保留在会话私有研究记录，不将第三方全文或源码放入包。本包代码、方法和案例独立编写，外部项目不是运行依赖。

|sourceRef|一手来源/固定版本|实际采用的判断|边界|
|---|---|---|---|
|original-method|本包原创方法，0.1.0，2026-11-15|将客户/观众、连载、制作、译制、合格分钟成本和小样停止条件连成可审核交付|合成案例与算术不是专业有效性证据|
|adjust-q3-2026|[Adjust Q3 2026](https://www.adjust.com/blog/short-drama-app-trends-q3-2026/)，发布2026-10-30|按地区与同批行为观察获客后的观看/回访；行业增长不能直接变成本项目需求|供应商所观测样本，不是整个市场或利润保证|
|tiktok-originals-2026|[TikTok与MADE BY US STUDIOS](https://newsroom.tiktok.com/tiktok-and-made-by-us-studios-enter-partnership-to-co-produce-creator-led-micro-series?lang=en)，发布2026-10-14|真人本地原创/创作者与发行合作是独立于AI生成的路线|不是面向所有项目的采购承诺或公开报价|
|huobao-pinned|[chatfire-AI/huobao-drama](https://github.com/chatfire-AI/huobao-drama/tree/b48e6b2312166e25b1ff141832d2e82e5d63c142)，master，提交2026-11-05T10:27:28Z|保存生成任务与上游结果；下载失败先恢复；过期任务不能覆盖新版本；收费重做单独记账|CC BY-NC-SA 4.0；仅研究抽象机制，未复制代码/打包/运行；商业代码使用另核许可|
|videolingo-pinned|[Huanshere/VideoLingo](https://github.com/Huanshere/VideoLingo/tree/d2d5a046d97526ae4950294cc5663ad520b22f52)，main，提交2026-11-13T10:56:08Z|术语先审、带上下文翻译、译后编辑、源文/行数保护、时间轴与听检分层|Apache 2.0；未复制或运行；模型、平台下载、素材、声音权利另核|
|youtube-monetization|[YouTube频道变现政策](https://support.google.com/youtube/answer/1311392?hl=en)，读取2026-11-15|原创性/实质变化与版权许可是不同判断；不能把授权译制当自动变现|规则会变；检查具体内容、渠道和账号条件，不保证获批|
|tiktok-ai-label|[TikTok AI内容说明](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content?afsrc=1)，读取2026-11-15|真实感AI音视频需按当前规则标识；声音/肖像使用范围单独确认|只纳入渠道条件；本包没有代为标识或发布|
|minimax-pricing|[MiniMax官方计价](https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise)，读取2026-11-15|视频输出/输入/额外图像/再生成可能分别收费；按所有尝试与接受成片重算|价格快照，不是报价；未付费调用，adapter存在不证明当前模型已兼容|

## GitHub实际读取路径

Huobao 固定commit `b48e6b2312166e25b1ff141832d2e82e5d63c142`：

- [LICENSE](https://github.com/chatfire-AI/huobao-drama/blob/b48e6b2312166e25b1ff141832d2e82e5d63c142/LICENSE)：请求前100行；确认 CC BY-NC-SA 4.0。
- [backend/package.json](https://github.com/chatfire-AI/huobao-drama/blob/b48e6b2312166e25b1ff141832d2e82e5d63c142/backend/package.json)：依赖与license；当前是TypeScript/Electron相关后端，不沿用历史Go描述。
- [backend/src/services/generation.ts](https://github.com/chatfire-AI/huobao-drama/blob/b48e6b2312166e25b1ff141832d2e82e5d63c142/backend/src/services/generation.ts)：请求1–230行，生成任务/参数/上游结果与恢复边界。
- [backend/tests/video-recovery.test.ts](https://github.com/chatfire-AI/huobao-drama/blob/b48e6b2312166e25b1ff141832d2e82e5d63c142/backend/tests/video-recovery.test.ts)：请求1–220行，读到本地模拟请求、恢复及防重复提交测试定义；未运行。
- [backend/src/services/adapters/registry.ts](https://github.com/chatfire-AI/huobao-drama/blob/b48e6b2312166e25b1ff141832d2e82e5d63c142/backend/src/services/adapters/registry.ts)：供应商注册；不推断最新模型可用。
- 最近8条issue/PR元数据与正文：包括[#148](https://github.com/chatfire-AI/huobao-drama/issues/148)、[#149](https://github.com/chatfire-AI/huobao-drama/pull/149)、[#154](https://github.com/chatfire-AI/huobao-drama/issues/154)。开放问题/未合并修复不是基线已解决的证据。

VideoLingo 固定commit `d2d5a046d97526ae4950294cc5663ad520b22f52`：

- [LICENSE](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/LICENSE)：请求前40行，确认Apache 2.0。
- [requirements.txt](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/requirements.txt)：读取依赖与不同平台条件。
- [core/pipeline.py](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/core/pipeline.py)：请求1–220行，读到术语/译后暂停编辑、分段对齐及译配步骤。
- [core/_4_2_translate.py](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/core/_4_2_translate.py)：上下文、术语、分块并发、源文对应与输出。
- [tests/test_pipeline_integration.py](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/tests/test_pipeline_integration.py)：真实GPU/LLM/TTS集成测试需要显式条件并可能耗API额度；只读定义，未执行。
- [tests/test_audio_timeline.py](https://github.com/Huanshere/VideoLingo/blob/d2d5a046d97526ae4950294cc5663ad520b22f52/tests/test_audio_timeline.py)：请求1–160行，音频间隔/重叠/时钟测试定义；未运行。
- 最近8条issue/PR：包括[#634](https://github.com/Huanshere/VideoLingo/issues/634)性能反馈、[#635](https://github.com/Huanshere/VideoLingo/pull/635)解析修复提案。用户报告不是统一性能基准，未合并PR不当作已发布。

工具：`mcp__codex_apps__search_service_web_run`（system1_search_query带recency、open/find）；`mcp__codex_apps__github_fetch`（仓库/branch/tree/issues）；`mcp__codex_apps__github_fetch_file`（固定ref文件）。
早期调用精确时刻未逐条保留；会话研究窗口约2026-11-15 00:02–00:14 UTC。补存原文抓取记录为00:14:30–00:14:31 UTC。不得把这些时刻解释为作者测试时间。

## 明确未完成的验证

没有安装或运行两个上游项目，没有调用付费视频/翻译/TTS，没有拍摄/制作真实短剧、母语审稿、音画验收、发布、买量或客户收入验证。仓库本包结构/本地算术检查只覆盖声明及算术；professionalEffect 仍为 not_evaluated，原生宿主实际加载仍需单独回执。
