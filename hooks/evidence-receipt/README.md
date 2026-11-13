# 产物证据回执 Hook

产物改完之后，记录“这个版本的文件字节是什么”。回执仅保存相对路径、大小和SHA256，方便后续审查绑定实际文件版本。

## 先跑一个完整例子

```sh
node hooks/evidence-receipt/scripts/example.mjs /absolute/path/to/new-demo-workspace
```

此命令要求目标目录尚不存在，建立合成report.md、配置、实际回执，并输出回执位置。它不注册到当前宿主。

## 在自己的项目使用

复制 `examples/config.example.json`，填实际绝对workspaceRoot、明确的artifactPaths、本地receiptsDir、workId和revision。产物列表只列允许记录版本的文件；原文件需已存在。回执目录不能与产物路径重叠。

```sh
node hooks/evidence-receipt/scripts/hook.mjs --config /absolute/path/to/evidence-config.json < hooks/evidence-receipt/examples/event.json
```

宿主接入参考 `examples/claude-settings.fragment.json`。只合并这一条PostToolUse注册，保留已有设置；替换实际路径并按宿主shell正确加引号。不会自动安装或覆盖设置。当前适配的是Claude Code PostToolUse stdin/stdout合同，其他宿主需各自适配和实测。

## 回执意味着什么

成功时stdout包含短哈希事实，回执目录有不可覆盖的JSON快照。相同配置和文件字节复用同一快照；这不是逐事件日志。不匹配或失败时输出{}、退出0，错误另给固定stderr代码；因此不能只凭退出码判断记录成功。

哈希是版本证据，内容质量与用户验收需另外核查。读取[方法](references/professional-method.md)、[接入交付](references/delivery-template.md)与[来源](PROVENANCE.md)；合成案例保持not_evaluated，真实宿主状态保持needs_probe直到实际验证。
