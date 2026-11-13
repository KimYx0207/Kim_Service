# 在 WorkBuddy 使用一个 Kim Service 方法

WorkBuddy 官方支持通过「专家·技能·连接器 → 技能 → 添加技能 → 上传技能」导入本地技能。本仓为一个指定 Agent 或 Skill 导出完整方法 ZIP，使用 Meta_Kim 的共享导出器，不另建宿主配置或执行框架。

先取得本版 `.github/release.json` 指定的 Meta_Kim 正式源码/npm 包。然后在 Kim_Service 根目录运行：

```sh
node scripts/build-desktop-skill-package.mjs --meta-root /absolute/Meta_Kim --host workbuddy --component financial-modeler --output /absolute/new-workbuddy-finance
node scripts/build-desktop-skill-package.mjs --meta-root /absolute/Meta_Kim --host workbuddy --component financial-modeler --output /absolute/new-workbuddy-finance --check
```

`--component` 取 `agents/` 或 `skills/` 中的一项，如 `financial-modeler`、`inventory-replenishment`、`evidence-pack`。每次只导出一个方法，完整保留原组件、知识、例子、脚本、公共资源和许可。输出目录必须是新的绝对路径；已有文件不会替换。`--check` 全量核对输出闭包和 ZIP，不能用它证明宿主已经加载。

在 Windows 11 的 PowerShell 中可自动创建新输出目录，只有 Meta 源码位置需要按实际解压路径指定：

```powershell
$KimMeta = (Resolve-Path 'C:/path/to/Meta_Kim').Path
$KimOutput = Join-Path ([IO.Path]::GetTempPath()) ('service-workbuddy-' + [guid]::NewGuid().ToString('N'))
node scripts/build-desktop-skill-package.mjs --meta-root $KimMeta --host workbuddy --component inventory-replenishment --output $KimOutput
if ($LASTEXITCODE -ne 0) { throw '导出失败' }
node scripts/build-desktop-skill-package.mjs --meta-root $KimMeta --host workbuddy --component inventory-replenishment --output $KimOutput --check
if ($LASTEXITCODE -ne 0) { throw '输出文件核验失败' }
Write-Host (Join-Path $KimOutput 'kim-inventory-replenishment.zip')
```

将输出 ZIP 上传 WorkBuddy，核对已安装名称、版本、启用状态，再开新任务。原 Agent 是包内专业方法，**不是已经注册的原生专家/Agent**。MCP、Hook、外部账号和工具须按当前客户端另行配置；不能把方法里的工具名称当作实际权限。脚本中未执行模型调用，`installed`、`nativeInvocationVerified`、`nativeExecutionVerified` 保持 false。

manifest 绑定共享 Meta exporter 版本/实现哈希、Service VERSION、组件来源 revision 与全部实际文件哈希。若源 Git HEAD 或显式 `--source-record /absolute/SOURCE-REVISION.txt` 可用，还会比对 Meta 对 Service 的 commit pin；版本、仓库或 pin 不一致则停止。独立来源附件应先与正式 Release SHA256SUMS 校验；仅有附件声明仍不能替代实际源内容校核。没有 Git/记录时明确标记 content-hash-only、pin 未认证。

升级时把个人修改另存，重新输出到新目录，检查 ZIP 后通过 WorkBuddy 界面管理同名更新并实际核对；工具不会清理或覆盖旧用户目录。完整原生验证还需：宿主读取原入口、实际运行样例和错误输入、核验产物、退出后继续未完成任务。没有这些记录就不宣称执行/恢复已验。

官方依据（2026-11-13 UTC 核对）：[Skill 上传使用](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)、[Skill 文件结构](https://open.workbuddy.cn/docs/skill)、[专家规范](https://open.workbuddy.cn/docs/expert)、[连接器规范](https://open.workbuddy.cn/docs/connector)。WorkBuddy 本地 user/project 自动发现目录未获稳定官方确认，因此不写死 `.workbuddy/skills` 或借用 CodeBuddy CLI 的目录。Windows/macOS 要求、模型和运行时边界见 [Meta_Kim WorkBuddy 接入说明](https://github.com/KimYx0207/Meta_Kim/blob/main/docs/workbuddy.md)。
