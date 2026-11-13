# Kim_Service 的豆包工作入口

本版本提供单个 Agent 或 Skill 的完整技能 ZIP 导出。Agent 作为专业方法被 Skill 载入，不自动注册为豆包工作伙伴；工具权限、连接器授权和 Hook 启用仍由真实宿主决定。

使用 Service `V1.16` 配套的 Meta `v3.13.0`。两个项目共用 Meta 的导出器，Service 的薄入口会检查版本配对，完整资源与 SHA-256 写入产物清单。`installed`、`nativeInvocationVerified`、`nativeExecutionVerified` 在没有本机证据时保持 `false`。

**完整 Windows 下载、SHA-256 核验、导入、调用、重启与升级步骤**见 [Meta 豆包工作指南](https://github.com/KimYx0207/Meta_Kim/blob/v3.13.0/docs/doubao-work.md)。已经下载两份源码时，可运行：

```powershell
$metaRoot = (Resolve-Path '../Meta_Kim-3.13.0').Path
$serviceOutput = Join-Path (Split-Path (Get-Location).Path -Parent) 'doubao-reliability-export'
node scripts/build-desktop-skill-package.mjs --meta-root $metaRoot --host doubao --component reliability-engineer --output $serviceOutput
if ($LASTEXITCODE -ne 0) { throw '导出失败，请保留完整错误信息。' }
node scripts/build-desktop-skill-package.mjs --meta-root $metaRoot --host doubao --component reliability-engineer --output $serviceOutput --check
if ($LASTEXITCODE -ne 0) { throw '导出包读回校验失败。' }
```

这里的相邻目录示例只适用于你实际把两个源码目录放在同一父目录的情况；正式完整指南会自动计算路径。`--source-record` 可绑定已从正式 Release 核验的 `SOURCE-REVISION.txt`。没有 Git 元数据或来源记录时，只报告实际内容哈希，不能自行补一个提交号。

在 [能力目录](https://kimyx0207.github.io/Kim_Service/) 先选行业、再选角色/岗位，再根据需求导出对应稳定组件 ID。读取 `capability.json` 的输入清单、`method.json` 的专业方法和逐项验收标准；真实业务材料缺失时报告缺口。合成案例仍是 `synthetic / not_evaluated`，不可作为行业效果通过的证据。

官方本地技能导入依据为 [飞书的豆包工作说明](https://www.feishu.cn/content/article/7677519271848610746)；[豆包公开技能上架](https://open.doubao.com/document/doubao-developer-guide/skill-integration-guide) 的企业认证及审核是另一条流程，本次未提交，也未冒称上架完成。
