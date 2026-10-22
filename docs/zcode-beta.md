# Zcode Beta 内容包

这是可下载、可重建的兼容内容分发，不是 Meta_Kim 新增正式 runtime。它复用已经存在的专业方法：9 个 Meta canonical agents、完整 meta-theory、5 个 Kim skills，以及 frontend-engineer / workplace-writer 两个完整组件。没有新增角色能力。

## 重建

准备两个已下载的完整 Git checkout，分别来自 `KimYx0207/Meta_Kim` 和 `KimYx0207/Kim_Service`。使用发布说明列出的确切 40 位 source commit，并确认各 checkout 的 HEAD 就是该提交。脚本不下载、不切分支、不初始化依赖，也不执行源目录中的程序。

```text
node scripts/build-zcode-marketplace.mjs --meta-root <absolute-meta-checkout> --meta-commit <exact-meta-commit> --kim-root <absolute-kim-checkout> --kim-commit <exact-kim-commit> --output <new-absolute-output-directory>
```

从 Kim_Service 的发布树运行脚本。输出父目录必须已存在，输出目录必须全新且位于两个源根之外；脚本不合并、不清理、不覆盖任何现有目录。源 checkout 必须干净，不能用含未提交修改的日常项目。Git 内容过滤器与 fsmonitor 在只读检查中被禁用，不执行其命令；依赖过滤转换或未下载 LFS 内容的 checkout 可能被拒绝。符号链接、硬链接、选中组件新增或缺少的文件、非法路径均拒绝。

选择清单固定为 175 份源文件拷贝、11 个 Agent Markdown 入口和 6 个 Skill 根目录。其余角色和文件不纳入。每份内容来自所声明提交的 Git blob，文本字节不改写；root 和各组件的 LICENSE/NOTICE、合同、资料、测试与参考脚本完整保留。参考脚本只是源文件，构建过程不会运行它们。不同源提交可以改变内容和哈希；选中组件若新增文件，先审查并更新固定清单，再构建。

产物包含：

- 标准 `marketplace.json` 与两个插件的 `.zcode-plugin/plugin.json`。
- `source-manifest.json`：公开仓库、source commit/tree/version、每个源 Git blob、目标路径、bytes/SHA256 和保留边界。
- `bundle-manifest.json`：除清单自身外的完整文件列表、bytes/SHA256 和闭包哈希。
- 完整组件许可证与用法。不含个人目录、vendor 路径、密钥、历史私有日志或第三方 loader 原文摘录。

同样的输入产生同样的文件和闭包，不使用构建时间戳。哈希表示字节一致性，不能替代来源审查、签名或实际运行验收。脚本仅读取本地源和写新输出；需要宿主提供稳定 checkout 与输出父目录，不能作为恶意并发替换的 OS 沙箱。

## 使用现有正常安装入口

参照 [Zcode 官方插件文档](https://zcode.z.ai/en/docs/plugin)。先核对发布来源和产物清单，将整个目录放到由你保管的长期位置；不要把临时解压目录长期注册为 source。

```text
zcode plugins validate <persistent-marketplace-directory>
zcode plugins marketplace add <persistent-marketplace-directory> --scope user
zcode plugins install meta-kim-local@kim-local-reviewed -s user
zcode plugins install kim-service-local@kim-local-reviewed -s user
zcode plugins list --json
```

这些是用户正常 CLI 操作，builder 不会代为执行。既有同名插件使用正常 marketplace refresh / plugins update 路线，先查看现有来源和状态，不覆盖未知个人 Agent。两插件/marketplace ID 保持既有名称；Kim V1.9 的插件版本为 `1.9.0`，Meta 插件版本来自绑定 source 的 package.json。

Meta 入口用 `meta-kim-local:meta-warden` 等 qualified name；Kim 用 `kim-service-local:frontend-engineer` 或 `kim-service-local:workplace-writer`。完整角色资料位于 `components/agents/`；frontend 的 `agents/method.json` 是与完整组件一致的 sidecar。安装并不证明模型自动读取了 method、已绑定工具槽或完成业务任务。

HookPrompt 暂无原生 Zcode adapter，继续 deferred。本包不注册 Hook、MCP、Command，不自动安装依赖或执行脚本，不增加权限。官方 validate/list/inspect、模型调用、宿主工具权限、视觉检查和最终用户接受分别需要实际证据；静态构建成功不代表这些已通过。
