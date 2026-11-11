# 任务入口与可编辑样板

`docs/start.html` 是可离线打开的生成页面。搜索任务后，填写目标、材料和当前 Agent 环境，再复制请求继续。每项能力的草稿分别保存在当前浏览器，刷新后可以继续；“下载草稿”和“导入草稿”可用于换浏览器或换设备接着做，“清空草稿”移除这一项的本机记录。页面不会上传材料或启动付费模型。

手动编辑请求后，修改上方表单不会覆盖手写内容。点击“按表单重新生成”会保存上一版，随后可用“恢复上一版”撤回，避免重新生成时丢失补充要求。

浏览器拒绝保存或存储空间不足时，最新内容仍留在当前页面，并提示先下载草稿。无法读取或来自其他格式版本的本机记录不会被自动覆盖。能力包更新或原宿主选项被移除时，保留原完整请求并提示核对；选定当前环境后再按表单重新生成。导入文件需属于当前能力，错误文件保留现有编辑。草稿格式版本是1，保存字段包括目标、材料、宿主、完整请求、手动编辑标记、上一版请求和包版本。

两个样板的入口、说明、所属能力都只在 `samples/index.json` 登记。设计样板支持主题、密度、字号、品牌色、表单失败与恢复，并导出 tokens；经营预测样板编辑假设后重算12个月利润与现金，支持完整 JSON 输入与 JSON/CSV 输出。它们使用合成数据，实际业务仍需核对资料。

## 目录与单一来源

| 层 | 目录 | 职责与约束 |
| --- | --- | --- |
| 数据 | `src/data/` | 读组件合同、配置与样板索引，验证路径，写生成文件；`task-drafts.mjs` 负责浏览器草稿保存与恢复，不渲染 DOM |
| 应用 | `src/application/task-browser/` | 搜索、请求生成、链接与发布内容选择；不读文件、不操作浏览器 |
| 展示 | `src/presentation/task-browser/` | HTML/CSS、DOM、键盘焦点、草稿与复制反馈；不重新计算合同或财务公式 |
| 命令适配 | `scripts/start-page.mjs`、`scripts/build-site.mjs` | 调用上述模块，保持公开 CLI 与旧 import 入口兼容 |

- 能力来源：各组件 `capability.json`；`generated/capabilities.json` 与页面只由生成器产生。
- 搜索别名、字段名称、宿主选项与仓库地址：`config/task-browser.json`。
- 草稿存储键前缀与导入文件大小：同一配置的 `drafts` 字段；各能力使用独立存储键，格式版本随草稿文件记录。
- 样板业务数据：各样板的配置文件；经营公式只在 `agents/financial-modeler/scripts/operating-forecast.js`。
- 保留数学公式、协议字段、安全路径边界等代码常量；不把业务名单、版本选择与展示数据散落进逻辑。
- 不直接改 `docs/start.html`。旧 `scripts/start-page/page.*` 实现已移动，不保留第二份实现。

## 构建、检查与发布

```sh
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/build-site.mjs
node --test scripts/*.test.mjs
python -m pip install -r tests/browser/requirements.txt
python -m playwright install chromium-headless-shell
python tests/browser/task_browser.py
```

已提供系统 Chromium 的环境，可设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向该可执行文件；不设置时使用 Playwright 管理的 Chromium。运行环境仍需允许浏览器进程及本地测试服务器。

`.site/` 是独立静态站点，包含首页以及索引所引用的两个组件的完整本地依赖。构建只清理自己上次登记的输出文件，保留未知文件；遇到文件冲突会在写入前拒绝。网站构建设置 `GITHUB_SHA` 后，源码链接绑定该提交。

`Validate repository` 在三个系统检查合同与组件，并另行启动 Chromium 操作任务入口、键盘、刷新恢复、草稿导入导出、存储失败、复制失败、样板编辑和下载。截图由 CI 作为 artifact 保存。`Publish task browser` 只接受 main 的成功 push 验证，再发布同一个提交；首次发布需仓库在 Settings → Pages 中选择 GitHub Actions。发布结果以实际部署记录为准。

## 本轮参考与吸收

- [W3C H102 原生 dialog](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)：保留浏览器原生模态、Escape 和背景不可操作行为；长详情初始聚焦标题，关闭后回到原按钮。
- [WAI 模态对话框模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：关注可见焦点、标题关系和键盘回退。复制被拒绝时先展开编辑器再全选，让提示对应实际可见的操作。
- [Primer Dialog](https://primer.style/product/components/dialog/)：吸收任务标题、主动作、内容滚动及错误恢复的组织方式；没有引入另一套 UI 框架。
- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)：将验证、构建和部署关联到同一提交；首次启用是仓库设置操作。
- [Playwright Python](https://github.com/microsoft/playwright-python)：使用实际 Chromium 操作与下载断言；运行环境限制不等于测试通过。

进一步扩展先新增真实任务样本和交付验收，再决定是否引入其他依赖。能在现有模块解决的问题不额外增加框架。
