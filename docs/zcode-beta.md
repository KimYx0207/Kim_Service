# Zcode Beta 内容包

这是可下载、可重建的兼容内容分发，不是 Meta_Kim 新增正式 runtime。它复用已经存在的专业方法：9 个 Meta canonical agents、完整 meta-theory、5 个 Kim skills，以及 frontend-engineer / workplace-writer / product-architect / interaction-designer 四个完整组件。没有新增角色能力。

## 重建

准备两个已下载的完整 Git checkout，分别来自 `KimYx0207/Meta_Kim` 和 `KimYx0207/Kim_Service`。使用发布说明列出的确切 40 位 source commit，并确认各 checkout 的 HEAD 就是该提交。脚本不下载、不切分支、不初始化依赖，也不执行源目录中的程序。

```text
node scripts/build-zcode-marketplace.mjs --meta-root <absolute-meta-checkout> --meta-commit <exact-meta-commit> --kim-root <absolute-kim-checkout> --kim-commit <exact-kim-commit> --output <new-absolute-output-directory>
```

从 Kim_Service 的发布树运行脚本。输出父目录必须已存在，输出目录必须全新且位于两个源根之外；脚本不合并、不清理、不覆盖任何现有目录。源 checkout 必须干净，不能用含未提交修改的日常项目。Git 内容过滤器与 fsmonitor 在只读检查中被禁用，不执行其命令；依赖过滤转换或未下载 LFS 内容的 checkout 可能被拒绝。符号链接、硬链接、选中组件新增或缺少的文件、非法路径均拒绝。

选择清单固定为 195 份原样源文件拷贝、2 个带方法路径绑定的生成入口、13 个 Agent Markdown 入口和 6 个 Skill 根目录。其余角色和文件不纳入。195 份源拷贝来自所声明提交的 Git blob，文本字节不改写；两个新增设计角色入口保留原始正文并追加各自 method.json 的明确路径，避免误读 frontend 的同名 sidecar，source-manifest 的 derivedEntrypoints 单独记录这些生成入口与摘要；root 和各组件的 LICENSE/NOTICE、合同、资料、测试与参考脚本完整保留。参考脚本只是源文件，构建过程不会运行它们。不同源提交可以改变内容和哈希；选中组件若新增文件，先审查并更新固定清单，再构建。

产物包含：

- 标准 `marketplace.json` 与两个插件的 `.zcode-plugin/plugin.json`。
- `source-manifest.json`：公开仓库、source commit/tree/version、每个源 Git blob、目标路径、bytes/SHA256 和保留边界。
- `bundle-manifest.json`：除清单自身外的完整文件列表、bytes/SHA256 和闭包哈希。
- 完整组件许可证与用法。不含个人目录、vendor 路径、密钥、历史私有日志或第三方 loader 原文摘录。

同样的输入产生同样的文件和闭包，不使用构建时间戳。哈希表示字节一致性，不能替代来源审查、签名或实际运行验收。脚本仅读取本地源和写新输出；需要宿主提供稳定 checkout 与输出父目录，不能作为恶意并发替换的 OS 沙箱。

## 发布前版本门禁

离线 builder 可以反复准备尚未发布的候选；它不替代发布检查。发布带 Beta 资产的版本前，从上一次真实 GitHub Release 下载已公开的 Beta 包，核对 Release 来源和资产摘要，再解压到独立目录。下列目录均指包含 `marketplace.json` 的内容根，而不是外层 ZIP 解压目录。

```text
node scripts/check-repository.mjs --release --zcode-candidate <absolute-candidate-content> --zcode-previous <absolute-previous-public-content>
```

门禁重新读取两个插件目录的实际文件，比较路径、字节数与 SHA256，不信任清单中声明的旧哈希。Skill、Agent、插件 README、sidecar、生成包装或文件增删，只要消费者目录改变，就必须升级对应插件版本；同版本不同内容、版本回退、marketplace 插件条目与 `plugin.json` 版本不一致均拒绝。版本按 SemVer 比较，`1.10.0` 高于 `1.9.0`；构建元数据不能代替版本升级。不增加任意 hash 后缀。Kim 插件仍从合集 `VERSION` 派生，Meta 插件仍从其绑定 source 的 `package.json` 派生；升级实际受影响的版本后重新构建。

插件目录的路径和字节完全相同时，允许同版本重复构建。只有包根 `source-manifest.json` 的 commit/tree 或其他根级 provenance 改变，不要求升级未改变的插件。比较包括插件自身的 `plugin.json` 与 README；不能只比较源 Skill 或源文件清单。

首次公开 Beta 包没有公开基线时，先实际查看该仓库的 GitHub Release 历史，确认确实从未公开过该 Beta 资产，再显式运行：

```text
node scripts/check-repository.mjs --release --zcode-candidate <absolute-candidate-content> --zcode-initial
```

没有候选包，或既没有公开基线也未显式选择首次发布，普通 `--release` 均拒绝。私有安装包、未发布候选和自行重建的旧版本不能冒充上一次公开基线。这个检查是离线输入门禁，不会联网证明基线来源或首次发布历史，不会创建 Release，也不证明消费者已更新。维护者仍须记录所用真实 Release/资产来源，发布后再通过官方更新入口核对实际新版本。

只检查输入包、暂不执行源码的干净树发布门禁时，可使用 `node scripts/check-zcode-release.mjs --candidate <absolute-candidate-content> --previous <absolute-previous-public-content>`（首次改为 `--initial`）。只发布源码、不携带 Beta 资产时，使用 `node scripts/check-repository.mjs --release --source-only`；输出明确标记 Beta 资产未检查，该结果不能用于宣称 Beta 可发布。

## 使用现有正常安装入口

参照 [Zcode 官方插件文档](https://zcode.z.ai/en/docs/plugin)。先核对发布来源和产物清单，将整个目录放到由你保管的长期位置；不要把临时解压目录长期注册为 source。

```text
zcode plugins validate <persistent-marketplace-directory>
zcode plugins marketplace add <persistent-marketplace-directory> --scope user
zcode plugins install meta-kim-local@kim-local-reviewed -s user
zcode plugins install kim-service-local@kim-local-reviewed -s user
zcode plugins list --json
```

这些是用户正常 CLI 操作，builder 不会代为执行。既有同名插件使用正常 marketplace refresh / plugins update 路线，先查看现有来源和状态，不覆盖未知个人 Agent。两插件/marketplace ID 保持既有名称；Kim V1.10 的插件版本为 `1.10.0`，Meta 插件版本来自绑定 source 的 package.json。

Meta 入口用 `meta-kim-local:meta-warden` 等 qualified name；Kim 用 `kim-service-local:frontend-engineer`、`kim-service-local:workplace-writer`、`kim-service-local:product-architect` 或 `kim-service-local:interaction-designer`。完整角色资料位于 `components/agents/`；frontend 的 `agents/method.json` 是与完整组件一致的 sidecar。安装并不证明模型自动读取了 method、已绑定工具槽或完成业务任务。

HookPrompt 暂无原生 Zcode adapter，继续 deferred。本包不注册 Hook、MCP、Command，不自动安装依赖或执行脚本，不增加权限。官方 validate/list/inspect、模型调用、宿主工具权限、视觉检查和最终用户接受分别需要实际证据；静态构建成功不代表这些已通过。
