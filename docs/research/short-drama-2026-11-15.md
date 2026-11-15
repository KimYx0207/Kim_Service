# 短剧与短剧出海：专业能力补齐研究

研究日：2026-11-15。研究对象是业务/内容/制作/发行方法，未购买模型服务、未生成短剧、未投放。读到的实现与本轮执行证据分别列出。

## 结论与现有缺口

优先新增 `agents/short-drama-strategist/`，作为短剧策略与制作/本地化判断角色。它与写稿、媒体执行分工，不代替原调用方选人、授权、排期或最终接受。

本轮检查的 Kim_Service 基线为 `ed0817eb0fe51bf47e7deaa83d069d184ad05d21`。读取相关能力合同、方法、AGENT、评审案例及现有 schema/包校验器。没有全库内容扫描。

|现有组件|已经覆盖|本轮发现的垂直缺口|
|---|---|---|
|`agents/script-writer/`|话题/角度、钩子、正文、结尾、事实检查及平台表达|没有完整季弧线、分集承诺/回报、人物状态与系列资产连续性|
|`agents/media-production-engineer/`|素材/规格、工作流、媒体探测、视觉听检与执行证据边界|没有目标受众/付款人、真人/AI/译制业务比较、文化适配与按接受分钟计成本|
|当前相关目录|通用策划/生产能力可承接执行|未找到命名为storytelling/video-production/short-drama/localization的独立纵深方法包；不能用目录名存在代替真实能力|

新增包补齐：客户/观众和渠道、路线比较、连载设计、角色/声音/道具状态、权利范围、生成失败与收费恢复、上下文译制和母语/听检、净贡献/留存/回本口径、小样与停止条件。通常给三条不同路线；可行不足时写出淘汰证据，不凑数。用户推荐与用户选择分开，所有实质决定沿用原调用方。

## 当前一手资料带来的实际判断

|一手资料与日期|支持的事实/判断|不支持什么|
|---|---|---|
|[Adjust Q3观察，2026-10-30](https://www.adjust.com/blog/short-drama-app-trends-q3-2026/)|其样本中Q3全球会话较Q1增加67%，安装增加60%；观看时长与地区差异提示需拆获客后行为|不是全市场人口普查，不等于用户自己的付费需求/留存/利润|
|[TikTok与MADE BY US，2026-10-14](https://newsroom.tiktok.com/tiktok-and-made-by-us-studios-enter-partnership-to-co-produce-creator-led-micro-series?lang=en)|原创、创作者和本地制作/发行合作是有现实案例的路线|不代表任何团队都获得平台采购，不提供本项目订单或合同价格|
|[YouTube变现政策，读取2026-11-15](https://support.google.com/youtube/answer/1311392?hl=en)|原创/实质创作、重复或批量低差异内容、转载与版权许可要分开判断|拥有转载许可不自动满足平台变现；本包不能承诺获批|
|[TikTok AI说明，读取2026-11-15](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content?afsrc=1)|真实感AI音视频标识等要求应进入渠道条件|标识本身不替代IP、真人声音/肖像范围，也不是收入保证|
|[MiniMax官方价格，读取2026-11-15](https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise)|当日H3输出768P为0.08美元/秒、2K为0.13美元/秒；输入视频、超额图片及再生成可另计|只是选定配置单价，不是接受成片成本或当前所有模型的统一价格|

示意计算：一分钟H3输出单次为4.80或7.80美元；三次生成尝试为14.40或23.40美元，尚未包含输入视频、额外图像、废片、音频、剪辑/审查、译配、发行/投放和税费。只可说明“多次生成必须计费”，不能据此估整部剧预算。没有实际调用这些API。

这些来源共同支持的推断：短剧专业方法必须同时管理“故事继续看的理由”和“接受成片/净收入口径”；开源生成器或字幕流水线只能解决部分生产问题。此句是研究推断，非来源宣称的统一结论。

## 两个外部GitHub项目：实际读到了什么

### HuobaoDrama：可恢复的生成任务，而非商用源码授权

- 仓库：[chatfire-AI/huobao-drama](https://github.com/chatfire-AI/huobao-drama)。固定master为 [`b48e6b2312166e25b1ff141832d2e82e5d63c142`](https://github.com/chatfire-AI/huobao-drama/tree/b48e6b2312166e25b1ff141832d2e82e5d63c142)，提交2026-11-05T10:27:28Z。
- 读取 `LICENSE` 前100行、`backend/package.json`、`backend/src/services/generation.ts` 1–230、`backend/tests/video-recovery.test.ts` 1–220、`backend/src/services/adapters/registry.ts`，另读branch/tree与最近8条issue/PR元数据及正文。
- 当前依赖含Mastra/Hono/Drizzle/SQLite及静态FFmpeg工具；不能沿用历史Go架构介绍。adapter注册了若干供应商，但未验证它们对当前模型和账号的兼容。
- 生成服务记录任务/供应商/配置/上游结果；下载失败可恢复原结果。测试定义覆盖重复恢复不重提交、重启、过期URL和旧任务保护。其测试使用本地模拟服务/假媒体；这里只读，未执行。
- 参考价值：镜头ID→版本→上游任务→收费记录→接受结果的关系；先恢复下载，不为交付失败自动再次付费。方法由本包独立编写，没有复制上游实现。
- 维护风险：最近问题中仍有桌面退出、人物服装场景诉求，未合并的图像写回/脚本修复提案不作为已交付功能。[issue148](https://github.com/chatfire-AI/huobao-drama/issues/148)、[PR149](https://github.com/chatfire-AI/huobao-drama/pull/149)、[issue154](https://github.com/chatfire-AI/huobao-drama/issues/154)。
- 许可：CC BY-NC-SA 4.0；商业使用需另核许可。原始代码仅在私有研究证据中保存，未进入本仓库或新包。代码、模型、成片素材与演员/声音权利分别判断。

### VideoLingo：术语与译文可审，不代表文化与表演自动合格

- 仓库：[Huanshere/VideoLingo](https://github.com/Huanshere/VideoLingo)。固定main为 [`d2d5a046d97526ae4950294cc5663ad520b22f52`](https://github.com/Huanshere/VideoLingo/tree/d2d5a046d97526ae4950294cc5663ad520b22f52)，提交2026-11-13T10:56:08Z。
- 读取 `LICENSE` 前40行、`requirements.txt`、`core/pipeline.py` 1–220、`core/_4_2_translate.py`、`tests/test_pipeline_integration.py`、`tests/test_audio_timeline.py` 1–160，另读branch/tree与最近8条issue/PR。
- 源码串起转录/字幕导入→分段→术语审查→上下文翻译→译后人工编辑→对齐→字幕合成；配音再拆参考音频/TTS/音频与视频合成。译后编辑限制源文和行数变更，避免无意破坏对应关系。
- 依赖包含Qwen ASR、PyTorch/Apple ARM条件分支、FFmpeg、spaCy、yt-dlp、模型服务SDK等；不同平台/模型/下载源各有适用范围与成本，不概括为免费无条件商用。
- 真实集成测试显式依赖测试音频/API key和GPU/LLM/TTS，可能花API额度；主要检查文件/文本与流水线完成。音频时轴测试另检查空隙/重叠/时钟。这里只读定义，未运行，也没用作者提交信息中的通过数充当本次结果。
- 维护线索：[issue634](https://github.com/Huanshere/VideoLingo/issues/634)有速度反馈，[PR635](https://github.com/Huanshere/VideoLingo/pull/635)是解析修复提案；单用户反馈不是性能基准，未合并提案不是基线行为。
- 许可：Apache 2.0。没有复制其代码；今后复用须保留相应许可证/声明，另核模型、下载平台、IP、表演与声音范围。字幕文件和音轨非空不能证明关系、文化表达或配音情绪合格。

## 三条实质不同策略与建议

|路线|客户与收入|渠道与产物|重点验证指标|停止或返回条件|
|---|---|---|---|---|
|真人本地原创/委托|品牌/制作机构/已签发行方，制作费或使用权费|当地团队拍三集小样；客户渠道或合同发行|真实购买意向、拍摄/补拍成本、客户接受、故事理解/续集行为|未形成买方证据先停全季投入；演员/场地/权利缺失回方案；预算超限先缩剧本|
|AI原创系列|原创IP委托或经营自有原创内容，授权/委托费；平台收入单独验证|原创角色包、连续性压力镜头、前三集|关键人物/道具一致性、接受秒数、每接受分钟全部成本、目标观众续看|未授权不付费；连续性不成立回镜头/故事；预算上限停止新增收费|
|授权IP译制服务|目标语言/地域版权方，按接受分钟或整季付费|术语/关系表、源文对照、三个集段译配；客户许可发行渠道|关系/动机错误、母语审读与听检、返修工时、客户验收、净贡献|权利不覆盖则停对应分发/声音动作；语义失败回术语/翻译；返修范围失控回报价|

条件建议：已有合法素材与版权客户时，先用小额译制试单验证客户付费与返修；有原创能力、缺演员但能承担小样成本时，可先验证AI原创连续性；有当地制作伙伴与明确委托方时再比较真人路线。以上是条件推荐，不能据此把用户selectedRoute改成confirmed。实际可行不足三条时保留淘汰证据；不拿换模型凑数。

完整原创实务例与反例在新包 `references/worked-delivery.md`。所有故事、客户、报价和阈值为合成教学示例，不是外部成功案例或本轮真实业绩。

## 新专业包的验收与本轮检查

包内 `method.json` 定义8步诊断、9项决策规则、15项有验证方法/证据/阻断条件的输出检查。包含3条完整实务例、8个合成正反案例（未实质选择、NC商用、重复收费与错误分母、文件存在冒充译制质量、大盘增长冒充回本等反例）。专业效果仍为 `not_evaluated`。

算术辅助只读取传入的收费台账与接受时长：重复chargeId和混币种拒算；未知净收入或未齐全成本不算贡献；没有接受成片不返回零成本成功。它没有模型/网络/发布能力，不取代收据真实性和专业评审。

本轮定向执行：

1. `node scripts/check-agent-pack.mjs agents/short-drama-strategist`：1包通过，legacy_incomplete=0；只证包结构/引用/声明完整。
2. 在本包运行 `node --test tests/contract.test.mjs`：9项通过；覆盖独立包交接边界和接受分钟、弃片成本、重复收费、未知利润、预算封顶、混币种、退款导致负净收入及派生数值溢出等算术风险。

没有重跑旧全量回归；没有安装/运行Huobao或VideoLingo；没有付费生成、翻译/TTS、真实拍摄、母语/音画审查、发布、投放、实际收入或专业效果评测。原生宿主工具加载仍需当前任务回执。

## 研究记录可追溯性

调用工具：`mcp__codex_apps__search_service_web_run` 的 system1_search_query（带recency）及open/find；`mcp__codex_apps__github_fetch` 的仓库/branch/tree/issues；`mcp__codex_apps__github_fetch_file` 固定ref文件读取。
检索主题覆盖2026短剧最新市场/原创合作、官方变现/AI规则、Huobao、VideoLingo和官方视频价格；不把主题文字伪装为缺失的逐字查询回放。
保留的实际返回、原文内容和SHA256索引在会话私有研究目录，不提交Git。部分早期调用只保留structured/parsed payload，工具外层与精确时间缺失；索引明确区分。新网页原文补存时段为2026-11-15 00:14:30–00:14:31 UTC。第三方NC原始源码不进入公开包。
