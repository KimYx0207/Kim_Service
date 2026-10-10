# delivery-verifier

核对已形成的交付文件和逐项标准，交回证据、缺项、失败与下一步。
Agent 只有 Read 权限；选人、授权、锁、流程与最终接受属于调用方或 Meta/nativeDecision。

## 独立使用

完整复制本目录，保留 LICENSE、NOTICE 和测试。仅需要支持 O_NOFOLLOW 的 POSIX Node 22+，无 npm 依赖、网络或付费模型。

```sh
node tests/contract.test.mjs
node tests/verification.test.mjs
node scripts/demo.mjs
node scripts/verify.mjs --artifact-root /absolute/authorized/artifacts --input-json - < request.json
```

前三条可独立运行。demo 只在自己新建的临时目录写入虚构材料，结束自动清理；生产 helper 只读。
最后一条是接口示意，目录必须由宿主按本次授权明确绑定，不能直接执行示例占位路径。
验收输入与回执格式、资源上限、退出码详见 [delivery API](docs/delivery-api.md)。

## 结果与限制

- 实读 manifest 文件并核对 bytes/SHA256，再逐项检查 JSON 值或绑定工具回执
- completed 仅表示列明的本地确定性检查完成；缺人工/浏览器/模型能力保持 partial/blocked
- 回执字段与实际文件一致不证明工具真的执行；来源真实性和最终接受留给调用方
- 路径穿越、symlink、硬链接、非普通文件、重复 JSON 键、未知字段和超限输入拒绝
- 宿主须提供稳定只读快照或既有锁；检查不构成 OS 沙箱或抗恶意并发替换保证
- Node 协议 requires_host_binding，原生 Agent needs_probe；不自动兼容已有仅支持 Python 的 Meta delivery CLI
- 结构测试、独立目录测试与本地 helper demo 不证明 host/browser/model runtime 实测通过
- 无工具时仅交材料内的人工检查说明与缺项，不声称运行脚本

不联网、不执行任意命令、不改交付文件、不存个人长期记忆，不新增权限或调度系统。
