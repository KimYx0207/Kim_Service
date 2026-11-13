# 真实截图采集

在本示例目录执行：

```bash
python scripts/capture-tutorial.py --output evidence/tutorial-captures --resume
```

执行脚本的 Python 需要安装 `playwright==1.62.0`；浏览器使用本机 Chrome/Chromium，或 `python -m playwright install chromium` 安装的浏览器。可用 `--browser-path /path/to/chrome` 显式指定，`--server-python /path/to/python` 指定后端环境。默认视口 1920×1080；`--width 390 --height 844` 可另行检查手机页面。

脚本在同一调用中启动真实 API 子进程并在 finally 关闭。它不启动索引或评测、不采用 generation、不提交有效 ACL 事件。模型或索引未就绪时截真实错误并标 blocked；不会自动生成假结果。

| 编号 | 实际对象 |
|---|---|
| 01 | 总体 PRD |
| 02-xx | 各模块 PRD |
| 03 | 八阶段公开准备记录，不是原生 Live |
| 04 | 实际语料计数与任务进度 |
| 05 / 05b | BM25 与完整原文 |
| 06 / 07 / 08 | dense / hybrid / rerank 的实际成功或失败 |
| 09-xx | 真实评测报告，按各方法实际题数与状态判断完整性 |
| 10-xx | 已存在的原生边界文件；明确未认证，不制造原生通过记录 |

`manifest.json` 保存截图 URL、title、SHA-256、源码哈希、视口、真实数据状态及对应 state JSON。`capture_status` 只说明有没有拍到图片，`data_status` 才描述被拍对象的运行状态；二者都不等于产品质量验收。

默认 resume 校验旧图哈希与输入指纹，相同来源可复用；状态变化会新增带时间的文件，旧证据保留。浏览器启动失败会写 blocked 原因并退出非零，CI 不会把它写成成功。受限环境若禁止浏览器 socket，应在允许普通浏览器运行的本机或 CI 执行，不应通过伪造渲染图补位。

总体与模块 PRD 使用真实弹窗滚动分页，每页保留重叠上下文，后续页以 `-p02`、`-p03` 编号。manifest 对应 state 文件记录总页数、实际 scrollTop、可见高度与正文高度，保证长文档不会只拍顶部。截图为可读的视口大小，不把正文压缩成一张不可读长图。

需要完整评测截图时，先完成正式索引和全部 188 题四方法评测。API 冒烟检查不替代真实浏览器检查。CI 上传该目录及真实报告，不包含模型、原始大包或访问凭据。
