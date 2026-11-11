# 两项目审计修正记录 · 2026-11-11

审计基线：Meta_Kim `2cc4a9ba53a693fc257043c084054a89604c9a16`，Kim_Service `19e9d22388e234736000382fe408f56026f499e1`。本记录区分源码修复、实际验收和仍需外部条件的交付，不以文件数量或静态检查证明专业效果。

## 原始发现与落地

| 发现 | 本轮改变 | 验收重点 |
| --- | --- | --- |
| F01：Hook与CLI判断不同 | 共享入口分类核心和配置词表 | 纯咨询不创建任务；解释后明确执行危险动作仍进入治理 |
| F02：未知风险被掩盖 | 就绪判定拆成独立维度 | 未知不冒充已知；不影响独立可逆诊断继续 |
| F03：auto固定Windows | 按真实宿主平台识别，目标平台单独处理 | 自动识别与显式设置优先级 |
| F04：前端小改验证规则冲突 | AGENT引用method唯一方法源 | 验证与改动风险匹配，保留用户正文 |
| F05：重试次数冲突 | 统一任务预算、进展与恢复规则 | 恢复不重置已耗预算；无进展停止对应路径 |
| F06：ECC可选安装缺Hook选择 | 固定受测版本，默认显式no-hooks | 参数合同与干跑检查；未冒称执行上游安装 |
| F07：退休规划包被重新推荐 | Meta模式使用原生计划与连续性 | 可选手册不再建立第二个调度器 |
| F08：内部换执行者打扰用户 | 单一实质决策策略 | 同结果的owner、模型、工具选择留在内部 |
| F09：Graphify版本分叉 | 普通与托管路径共用受测版本 | 真实安装版本与受测配置相符 |
| F10：依赖组合漂移 | Service提交固定、npm shrinkwrap与真实npm ci安装 | 保留用户内容，真实首装、升级和重复升级 |
| F11：agent-desktop接口漏登记 | 登记有版本条件的原生MCP入口 | 发现路径不自动授予权限或声称实机通过 |
| F12：任务入口先显示源码 | 可离线任务页、静态网站构建、成功验证后发布 | 在线发布仍需仓库启用GitHub Pages |
| F13：效果证据没有区分力 | 增加真实文件任务、独立复算、实际浏览器观察 | 保留负结果和题面缺陷，不宣称已证明收益 |
| F14：缺少可操作成品 | 新增设计系统、12个月经营预测样板 | 实际编辑、错误恢复、窄屏和下载 |

## 分层与单一来源

Kim_Service的数据读写在`src/data/`，纯任务逻辑在`src/application/task-browser/`，HTML/CSS/DOM在`src/presentation/task-browser/`，命令脚本仅作适配。旧`start-page/page.*`已移动，没有保留第二份实现。

能力合同来自各组件的`capability.json`；生成目录和页面由构建器派生。界面选项、搜索别名、宿主和仓库地址在`config/task-browser.json`，样板登记在`samples/index.json`。财务公式只由`operating-forecast.js`负责，页面调用它；设计业务数据和tokens从配置读取。

Meta_Kim保留已有领域层；Live产物的受限文件读取移入数据仓库模块，应用层选择交付物，展示层提供预览与下载。下载类型来自配置，原始字节和内容哈希保持一致。

## 第二次审查补修

- 解释请求后附带删除或部署，不能被误判成纯咨询；否定执行和仅解释仍正确区分。
- 重新生成请求可恢复上一版手写内容，表单变更不会默默覆盖编辑。
- CSV等文本下载保留原始编码与字节；预览支持BOM编码，不把错误解码后的内容当原文件。
- Live只接受实际执行者声明的对应产物，不能用任意一次执行解锁无关旧文件。
- 评审绑定本次运行和全部产物哈希，文件修改后旧意见失效。
- 准备试验时冻结题目、评分器和参考计算；历史缺元数据记录保持待核。
- 递归检查已声明的HTML/CSS/JS静态资源；动态资源仍需浏览器验证，静态扫描不声称证明全闭包。
- 财务题面明确共同取整、格式和索引路径基准，交付方法要求从真实消费目录逐文件打开。

## 已有证据与发布边界

- Kim_Service本轮本地根回归：199通过、1项平台跳过、0失败；71个组件的合同与声明验证由三系统CI持续运行。
- [修复窄屏后的真实浏览器与三系统验证](https://github.com/KimYx0207/Kim_Service/actions/runs/43014148973)全部通过；包含任务入口和两个样板。后续修订的精确结果见当前提交的Actions及其截图artifact。
- [独立文件成果试跑与原始记录](outcome-trials-20261111/README.md)保留两组结果、单独格式修复及其限制。
- [首次Pages部署](https://github.com/KimYx0207/Kim_Service/actions/runs/43014484600)因仓库尚未启用Pages而失败；不能将构建成功写成网站已经上线。启用后再以实际部署URL验收。
- Meta完整安装升级验收独立运行，最终报告由Meta对应提交提供；这里不把Service验证代替Meta发布验收。

## 本轮吸收的参考

[W3C原生dialog](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)和[Primer Dialog](https://primer.style/product/components/dialog/)用于焦点、Escape、主动作与失败恢复；[Playwright Python](https://github.com/microsoft/playwright-python)用于真实操作；[GitHub Pages工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)用于将发布绑定到已验证源码；[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/)用于按受测锁定依赖安装。现有同题对照思想继续用于实际文件试验，没有因此引入另一套运行时框架。

当前优先验证用户能否从目标与材料拿到可打开、可修改、可核对的结果。方法数量、星数或单次满分不构成“最优解”或市场成功的证据。
