# 已有连续动作帧的实际合成

`finish_frames.py` 是常规排字与编码工具，可用于技术样稿：读取已经成立的连续动作PNG、逐帧时长、中文文案与权利说明，统一构图后合成GIF。它不生成人体动作，不插帧，不自动修复换脸、手型或姿态跳变，不推断用户批准。它也不会自动完成真正的文字美术设计，仅改位置、颜色或倾角不能据此报成品。每张成品须按lettering.md制作真实美术文字与整体构图。

## 文字布局配置

已实测top头顶、bottom底部、overlay前景叠字。前景字可倾斜并适量压住身体，不自动判作失败，关键在于保留眼睛、表情焦点与主要手势的可读性。

```json
"layout": {"position":"overlay", "center":[160,237], "angle_deg":-12, "art_region":[8,6,304,308]}
```

center是最终画布中的固定文字中心，angle_deg为-30至30度，art_region是人物放置矩形x/y/宽/高，所有帧共用同一缩放和定位，不逐帧乱动。省略region时按top/bottom/overlay安排默认区域，但默认只是起点，不代替构图。顶部可用 `"layout":{"position":"top"}`。

每帧可补 `"protected_regions":[[100,20,220,90]]`，坐标为最终画布left/top/right/bottom，表示这帧必须避开的眼睛、表情或关键手势。脚本只检查文字实际alpha是否碰这些标注区域，不自动识别脸与手，也不把零标注误报成语义无遮挡。报告semantic_occlusion_review始终pending。

倾斜后的文字和人物都须保留画布安全边距，超出拒绝导出。请据全段动作标保护区并播放两轮，允许躯干叠字并不允许把表情压没。气泡、按帧随动路径当前没有实现。

## 输入

每帧PNG须同画布、透明背景且预先对齐。脚本默认将所有帧的可见区域取共同并集后统一裁边、缩放和定位，不逐帧单独适配，所以不会自动把人物忽大忽小。设置 crop_to_content 为 false 可保留原画布。

manifest及其引用素材放在同一工作目录内，引用路径不得越出目录。示例字段：

```json
{
  "name": "收到",
  "rights": "rights.json",
  "animation_method": "实际的源帧制作方式与限制",
  "font_license": "字体名称、许可及核对来源",
  "size": 320,
  "font_size": 40,
  "caption_area": 64,
  "caption_lines": ["收到"],
  "frames": [
    {"file": "frames/000.png", "duration_ms": 200, "phase": "anticipation"},
    {"file": "frames/001.png", "duration_ms": 100, "phase": "action"},
    {"file": "frames/002.png", "duration_ms": 400, "phase": "settle"}
  ]
}
```

这三个文件名只是结构示例，不自带动作素材。最少3个不同源帧，最多120帧，可以重复姿态形成停顿，但不能把一个静帧重复成“自然动画”。phase可填 anticipation、action、follow-through、settle、hold。阶段字段用于解释节奏，实际时长由动作设计决定，脚本不从标签猜运动，也不把任意标签当动作成立证据。

每帧时长20至655350毫秒，必须为10毫秒倍数。预备较短、动作较快、末尾停住只是可选设计，不是所有表情的统一模板。文案支持明确的一至两行，不自动改字，不为塞下长句无限缩小字体。

rights.json示例：

```json
{"character":"角色名","source":"具体来源","license":"实际授权说明","commercial_use":false,"attribution":"署名"}
```

商用未知保持false。`--commercial`需要角色和字体商业证据，但字段存在不能替代真实法律核对。

## 命令

在技能目录安装已核依赖后：

```sh
python -m pip install -r requirements.txt
python scripts/finish_frames.py input/manifest.json output/sample-01 --font /actual/path/NotoSansCJK-Bold.ttc --font-index 2
```

字体路径与TTC索引按实际环境填写。脚本检查Unicode字符映射，缺字拒绝导出，字体授权仍须单独核实。提供字体路径不等于有分发字体的许可，交付默认不复制字体文件。

输出目录必须不存在，已有目录和悬空符号链接都会拒绝。输出包括sticker.gif、完整合成帧、逐帧真实报告、160px明暗底拼图、可直接打开播放的preview.html、文案与权利记录。

## 如何验收

先打开HTML真实播放两轮，再看160px文字与动作。报告核实际时长、不同帧、透明、接缝、容量；也保留每个源文件hash、字体hash、源时长、动作阶段和common_crop。

visual_review保持pending，user_approval保持not_inferred。文件可编码不代表动作自然或用户认可。已有源帧的换脸、手指跳变只能由源素材返修解决，调时长和叠字幕救不了坏动作。

## 实测范围

本地曾对已有8帧透明素材进行合成和解码验证，输出320×320、1.6秒GIF；这些素材与成品不随包分发。该结果仅覆盖收尾流程，不是新角色或自然动作生成证据，也不代表用户认可。

自动回归运行 `python -m unittest discover -s evals -v`。真实中文渲染专项依赖实际CJK字体，缺字体会明确skip；其余回归使用可移植测试夹具。脚本运行不以测试数量作为作品质量。

源PNG任一可见区域接触画布边缘会在裁边前被拒绝，防止本来已经截断的手脚被缩进新画布后误报完整。请返修源图，不用共同裁边隐藏原始截断。

## 内存与输入边界

源帧在解码前先检查头信息：每个输入必须是单帧PNG，最长边不超过4096px，单帧不超过400万像素，全部源帧合计不超过2400万像素，单文件不超过32MiB。输出帧数乘画布像素不得超过1600万；manifest限1MiB、字体文件限32MiB。超过时先降源分辨率、减少帧数或拆分任务，不会尝试先全部解码再报内存错误。

这是一组保守的处理预算，不是所有机器都保证足够内存。工具不会据此宣称可本地生成视频或自然动作。

## 跨平台运行与测试

导出命令的 `--font` 指向你实际拥有的字体，`--font-index` 是实际TTC字面索引，TTF/OTF一般为0；不要求Linux路径和固定索引2。测试优先读取环境变量 STICKER_TEST_FONT、可选 STICKER_TEST_FONT_INDEX，未设置时尝试常见Linux Noto、Windows微软雅黑/黑体与macOS苹方，逐个检查实际中文字形。

PowerShell测试示例：

```powershell
$env:STICKER_TEST_FONT = 'C:\Windows\Fonts\msyh.ttc'
python -m unittest discover -s evals -v
```

不要把示例路径当作已验证文件。无适合字体时，仅真实中文渲染专项明确skip；测试运行时会用 FontBuilder 生成原创几何字形夹具，让核心布局、编码与安全回归继续执行。几何夹具不是可读中文字，不能证明中文字体或美术效果。环境变量 STICKER_TEST_SYNTHETIC=1 可强制验证此分支。显式配置的字体不存在或缺所需字形会报错，不默默跳过。Windows不允许创建符号链接时该平台测试明确skip，不假称通过。

## 分发不是整个工作目录自动打包

输出保留source原PNG、input-manifest原记录、可复现manifest、rights授权/署名信息和hash。这些资料可能含私人备注、内部路径或不能再分发的输入。每次生成DISTRIBUTION-NOTICE.txt提醒：不要直接把整个输出目录公开。

分享前按本次收件人与授权范围选择GIF、预览或必要源文件，检查原素材、字体、角色及授权信息的可分发范围。没有新的分享授权，不自动上传或售卖；不要把“文件能生成”说成素材可商业分发。
