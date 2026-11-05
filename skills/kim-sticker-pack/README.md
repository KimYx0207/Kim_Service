# kim-sticker-pack

入口是 SKILL.md。此版先搜索同类经典案例，拆解外形、表情、动作和聊天场景，再按镜头和动作设计角色参考并等待用户确认，再按聊天场景设计文案和动作，先展示样片，认可后批量。

支持规划精细二次元、原创动物、写实人物，三类不共用橡皮形变模板。尚未经过对应样片的路线只属于方案，不是已验证能力。

## 实际使用

让宿主读取 SKILL.md 与 references/production.md，提供角色参考与用途。执行者先看真实经典案例、解释设计依据和来源边界，再生成必要角色参考，等你确认，再给少量聊天场景和真实样片。

示例请求：

> 按 kim-sticker-pack 做这个角色的动态聊天表情。先搜索并实际查看同类经典案例，拆解特征后再给正面、侧面、背面角色设定，等我确认，不要直接批量。确认后先做收到、好耶、困了三条，每条有清楚中文与不同自然动作，实际播放给我看，认可后扩展。

已明确确认过的角色设定不需重复确认，但新增角色和重画设定需要。角色确认不等于动画样片确认。

角色确认是硬门，三视图不是一刀切。真实人物正脸近景可用基准脸加必要角度与表情参考；涉及全身转身或用户明确要求时提供三视图。

## 当前交付状态

本包提供角色研究、设计确认、动作与文字美术制作流程，以及已有动作帧的收尾工具。此目录不携带旧版统一摇摆脚本，不靠GIF文件数量冒充作品验收。

核心产出是可用的实际表情包，文档、技术测试和检查表只服务这个结果。没有实际动画或没有用户认可时如实说明，不写假通过。

代码许可和人物素材许可独立。非商用角色不可与原创商业素材混装，售卖建议只针对具有相应权利且符合平台规则的作品。

## 已有动作帧可直接合成

实际可执行工具 `scripts/finish_frames.py` 支持透明连续帧、每帧不同的分镜时长、固定中文图层、可配置字体、明暗底160px预览与技术报告。详见 `references/export.md`。它只收尾，不生成或修复自然动作，不能绕过角色和样片确认门。

文字位置须按整段动作、负空间、阅读路径与边距设计，逐帧保护眼睛、表情和关键手势，不默认底部，也不禁止字适度压住身体。现已实测头顶、底部和倾斜前景叠字；气泡与随动字尚未实现，实际构图仍待播放及用户反馈。

文字是每条表情的美术设计，先读 references/lettering.md。手绘、原生生成文字美术层、字体二次造型和常规排字按创意选择，不统一工具字体与位置。现有脚本不具备全部艺术字能力，必须以两条实际应用的样片和反馈验证后再发布。

每张成品都必须具备真实文字美术与画面整体设计，而不是可选装饰。已认可样片的方向不等于复用固定配色与装饰模板；每张按角色、情绪、动作和场景重新设计。程序只是制作工具，默认工具字不能直接交成品。

处理预算、跨平台字体测试和分发隐私边界见 references/export.md。输出带源PNG与授权信息，仅供工作复现，不应默认整体公开。

## 安装与离线验证

本包安装源为 Kim_Service 中的 `skills/kim-sticker-pack/`。复制整个目录到宿主支持的技能目录，保留脚本、参考资料与许可证。已有同名包时先比较版本和用户修改，不直接覆盖。宿主还须具备实际参考研究、图像查看及动画播放能力；本包不安装生图服务或调用 Codex CLI。

在本技能目录运行：

```sh
python -m pip install -r requirements.txt
python evals/test_finish_frames.py
```

Python 3.10+；依赖为 Pillow 与 fontTools。虚拟环境应放在技能目录外。建议先运行 `python -m venv ../kim-sticker-venv`，Linux/macOS执行 `source ../kim-sticker-venv/bin/activate`，Windows PowerShell执行 `..\kim-sticker-venv\Scripts\Activate.ps1`，再安装依赖；若系统禁止脚本激活，可直接用虚拟环境内的Python，不修改系统安全策略。模型生成、付费视频与平台上传不是这些测试的一部分。字体配置与边界见 references/export.md。独立中文字体和角色素材不随包分发。技术测试与安装成功均不等于角色、自然动作或文字美术已获用户验收。

## Codex 与 Claude Code 安装和调用

以下面向本地CLI/桌面会话，不代表账户同步或云端宿主已安装。无需修改两端全局权限，也不预授权外部服务。

从本技能目录执行，项目目录必须已经存在：

```sh
python scripts/install_skill.py --host codex --project /path/to/project
python scripts/install_skill.py --host claude --project /path/to/project
```

Codex项目安装目标是 `.agents/skills/kim-sticker-pack/`；Claude Code是 `.claude/skills/kim-sticker-pack/`。只装你需要的宿主。个人范围改用 `--user`，分别复制到 `~/.agents/skills/` 或 `~/.claude/skills/`。安装器拒绝覆盖现有目录、符号链接和复制到源码内部；不会调用模型或配置登录。Windows在PowerShell使用相同Python命令，把项目路径替换成实际路径并加引号。

安装完成后在对应项目启动或刷新宿主会话，先确认技能已出现在列表，再调用：

- Codex：`$kim-sticker-pack`，附角色方向与用途；也可先在技能选择器查看是否已发现。
- Claude Code：`/kim-sticker-pack`，附角色方向与用途。
- 两端均可按描述自动选择，但是否实际触发必须看当前会话，不以文件存在作证明。

本包仅使用共同的name/description元数据；未依赖Claude专有工具预授权、子代理配置或动态命令，也不要求Codex可选界面元数据。辅助脚本路径相对技能目录，宿主必须据实际安装位置解析。

安装不提供生图/视频服务。开始时先核对工具能力；没有生图能力的Claude Code或Codex只能研究、规划或处理用户提供的已有素材，不能声称独立生成自然动画。外部工具与费用须另有授权。

本技能遵循Codex与Claude Code的技能格式和安装目录要求。安装后由当前宿主发现并按本会话可用工具执行；工作流的生图、视频和播放环节仍以实际工具能力与用户授权为前提。

参考：[Codex官方技能说明](https://developers.openai.com/codex/skills/)；[Claude Code官方技能说明](https://code.claude.com/docs/en/skills)。

## 联系方式

<p align="center">
  <img src="docs/images/contact-qr.png" width="720" alt="联系二维码">
</p>

## 支持项目

如果这个项目帮你节省了时间，可以请作者喝杯咖啡：

<table align="center">
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" width="260" alt="微信收款码"></td>
    <td align="center"><img src="docs/images/alipay.jpg" width="260" alt="支付宝收款码"></td>
  </tr>
</table>
