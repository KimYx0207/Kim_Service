# V1.19 最小兼容性修复验证

日期：2026-11-15。修复提交：`ad0e1651f9dbf0ad26fccbe979bb4c640cca4c1b`。本记录覆盖已修改的三类组件；最终发布源码与 CI 由 Release 随附的 `SOURCE-REVISION.txt`、`verification.json` 和 SHA-256 清单绑定。

## 逐项改动

| 组件 | 修复 | 保留的边界 |
| --- | --- | --- |
| Memory 3Layer | 启动器进入已经解析的安装项目根目录，再执行记忆脚本，避免子目录产生第二份记忆 | 现有数据、确认要求、迁移与宿主选择不变；没有增加其他宿主的自动 Hook |
| Codex/Gemini bridge 的 Claude 入口 | 私有编排器要求明确多引擎调用；两个命令有真实内容时才建产物文件 | 保留全部显式命令、阶段、文件覆盖确认和回滚；实际多引擎任务仍需对应工具可用 |
| HookPrompt README | 更正 Claude 参数输入与 Codex 标准输入的说明 | 仅说明修正，未改 Hook 执行代码或权限 |

未删除专业 Agent、Skill、方法、案例或验收规则。集合仍为 97 个组件、112 项能力。生成目录只刷新对应内容标识，保留既有来源记录。

## 已执行的本地检查

- `node --test scripts/*.test.mjs`：247 项，246 通过、1 个既有跳过。
- `node scripts/check-components.mjs`：97 个组件、141 个验证文件通过；子测试保留自身平台跳过说明。
- Memory 3Layer 安装回归：11 项，10 通过、1 项因本机没有 PowerShell 跳过。覆盖 Claude-only、Codex-only，以及默认和相对 `MEMORY_DIR`；实际检查根目录读取、事实与每日记录、压缩前会话保存，并断言没有另一宿主目录或子目录记忆树。
- Memory 3Layer 包检查：42 个文件、0 个错误。
- 多 CLI 宿主文件回归：5 项通过；编排 Skill 的 YAML 与正文边界一致。
- `node scripts/catalog-automation.mjs check`、`node scripts/start-page.mjs check`、`node scripts/check-repository.mjs` 和 `git diff --check` 通过。
- V1.19 发布准备再次运行 `release-contract`、`github-release`、`check-zcode-release` 三组现有回归，27 项通过；日志结构、中英文版本段落、目录和仓库检查通过。
- 用当前源码在隔离目录实际运行 DSH 构建与 `--check`，93 个方法组件生成 94 个 Skills、4969 个文件，逐文件检查通过；结果明确记录 `nativeExecutionVerified=false`。

## 分发与宿主范围

发布采用现有 V1.19 合集版本格式；ZCode 的 Kim 插件由 `VERSION` 生成 `1.19.0`，Meta 插件使用发布配置指定的 `3.15.1`。发布工作流从精确提交重建源码、DSH 和 ZCode 包，用上一正式 `V1.18` 的 ZCode 资产比较版本与实际文件内容。

DSH、Gemini、ZCode、Cursor、OpenClaw 的支持仍以各自已有文档和适配器为准。Service 的专业方法可通过相应接入方式读取，并不因此自动获得全部原生 Agent、Hook 或多引擎执行能力。本次没有把 Claude/Codex 的自动记忆接线扩展到这些宿主。

上述回归使用隔离目录、固定输入和本地脚本，没有使用个人模型 token，没有把合成或包结构检查写成真实模型任务通过。最终发布必须通过当前主干提交的三个系统合同/回归与浏览器 CI，并保留资产身份、哈希和来源检查；原生宿主实际任务和业务效果不在这份本地证据范围内。
