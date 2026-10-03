# Kim Service 维护说明

本文件面向仓库维护者，公开 README 不承载 catalog、内容哈希、门禁和发布协议等内部维护细节。

## 权威文件

- 包内 `capability.json`：组件唯一人工维护的机器合同。
- `catalog.json`：自动派生的发布库存；同时保留既有来源修订和公共图片布局。
- `generated/capabilities.json`：自动派生的 Capability 级索引。
- `VERSION`：合集公开版本。
- `CHANGELOG.md`：合集版本记录与 Release 正文来源。
- `scripts/check-repository.mjs`：仓库结构、公开边界、内容哈希、敏感信息和图片布局门禁。
- `scripts/check-components.mjs`：执行 catalog 声明的组件验证命令。
- `scripts/capability-catalog.mjs`：按目录发现包、校验合同并生成 Capability 索引。
- `scripts/catalog-automation.mjs`：确定性生成或检查 catalog 与 Capability 索引。
- `scripts/release-contract.mjs`：校验版本与变更记录合同。

包合同的可选 `capabilities[].invocation` 目前仅支持版本1的本地 Python CLI、固定 `--input-json -`、stdin/stdout JSON 和 `shell:false`。入口须为包内真实 Python 文件；schema 与发现脚本共同校验。生成索引仍保持既有投影字段，不复制 invocation；调用方核包 hash 后读取完整包合同，并另核宿主和执行授权。该可选字段不证明工具已安装，也不构成执行许可。

## 本地验证

    node scripts/catalog-automation.mjs build
    node scripts/catalog-automation.mjs check
    node scripts/check-repository.mjs
    node scripts/check-components.mjs
    node --test scripts/*.test.mjs

`.github/workflows/validate.yml` 对全部 PR 变更（包括 `SKILL.md` 和仅文档变更）以及 `main` push 执行同一组门禁：catalog freshness、repository check、所有根 `scripts/*.test.mjs` 回归、全部组件声明验证。Node 24 / Python 3.12 在 Linux、Windows、macOS 上运行；Bash 安装器行为测试在 Linux/macOS 执行，原生 Windows 明确 skip，其他已有平台条件 skip 保留在日志中。组件数量和验证入口数以运行时发现结果为准。

CI 仅使用只读权限，不访问模型密钥、不做昂贵模型行为评测、不发布版本，也不自动修改 branch protection。静态合同或离线行为回归通过，不等于模型/原生宿主行为实测、生命周期升级或最终产品验收。维护者应确认同一 PR commit 的所有平台结果，不能把平台 skip 当成已测通过。

发布 commit 完成后、创建 tag 之前，在干净的 `main` 工作树运行：

    node scripts/check-repository.mjs --release

该门禁只证明本地发布就绪。远端 branch、tag、GitHub Release 和远端 tag 全新克隆必须在推送后分别复核。

新增组件初次发现时保留 `pending-local` 来源状态。组件源码提交后，使用同一个生成器绑定其真实来源：

    node scripts/catalog-automation.mjs build --provenance-revision <source-commit>

生成器只更新待定或已经标记为 `committed-component-tree` 的本仓库组件，逐个比较该提交中的完整文件树和当前组件字节；缺文件、改动或多出的未跟踪文件都会拒绝。已有外部与 canonical direct-sync 来源保持原样。组件后续修改后必须先提交源码，再用同一命令绑定新提交。随后提交生成结果并执行干净树发布门。提交来源只证明这些字节的出处，不代表模型实测、原生支持或 Promotion Evidence。

## 组件与公开边界

- `hooks/<slug>/`、`skills/<slug>/`、`tools/<slug>/`、`agents/<slug>/` 与 `apps/<slug>/` 中的组件必须自包含，公开所需说明、许可、归属和运行文件不能依赖旧独立仓库。
- 新增或修改组件时只维护包内事实并运行根生成器；不得手工同步 catalog、Capability 索引、内容哈希或验证计划。
- 专业 Agent 可以作为独立能力包；Meta_Kim 的治理 Agent、Router、跨组件状态机和最终验收逻辑不属于本仓库。
- HookPrompt 的 `.claude` 与 `.codex` 是产品安装内容。其他组件不得携带根级运行时投影。
- 禁止嵌套 `.git`、未声明 gitlink、真实密钥、本机专属绝对路径、缓存、运行输出和私密材料。
- 联系图与两张收款码的路径、哈希、宽度和居中布局由 catalog 统一约束。

## 发布

- 公开版本使用 `V<major>.<minor>`；`VERSION`、annotated tag、GitHub Release tag 与 Release 标题保持一致。
- 发布顺序：确认远端未分叉，审查 diff，提交，运行干净树发布门禁，创建 annotated tag，推送 branch 与 tag，创建 GitHub Release。
- 发布后核对远端 branch、tag 和 Release，再从远端 tag 全新克隆并重复根门禁与组件验证。
- 已发布的 tag 和历史不得移动或改写；后续问题通过新版本修复。
