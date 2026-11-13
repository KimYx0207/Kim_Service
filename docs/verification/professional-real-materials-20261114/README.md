# 真实仓库材料专业闭环验证 — 2026-11-14（Asia/Shanghai）

本轮采用已有可靠性工程师、交付核验 Agent 的完整方法，配合数据血缘 Skill、MCP 契约审计 Tool、本地证据回执 Hook，处理 **Kim_Service 自身的软件交付材料**。源版本为 `64e4ec32326bf3e4f289ac178913d2639a835926`；本轮另外修正 MCP Schema 扫描误报。运行结果在 [results](results/)，输入、输出、历史代码和来源哈希一起保留。

这不是保险、信贷、医疗、制造等行业效果评测，不把仓库示例当企业材料。行业 professionalEffect 仍为 `not_evaluated`。MCP 没有建立连接，Codex/Gemini 没有被调用，Hook 没有注册到宿主。真实的是源码、修复提交、这次本地进程及文件检查；历史客户影响、生产指标和宿主启用状态未知。

## 三条可追踪路径

| 路径 | 实际输入与方法 | 产物及验收 | 未知/未通过项 |
| --- | --- | --- | --- |
| MCP 定义审计 | 从仓库 `createCodexAdapter().tool` 读取真实定义，协议版本取 runtime 常量；只构造对象，不调用 call；将同一份定义比较自身 | `mcp-input.json` / `mcp-output.json`；changed=[]，unapproved=[codex]，liveConnectionObserved=false | 未提供工具执行授权，所以批准名单为空；行为提示缺失保持 unknown；status=needs_review。静态完整定义不是已完成远端分页，也不是账号视角认证 |
| 依赖变更影响 | 实读 runtime→adapters→codex-server 两条 import；使用 data-lineage-impact 的有界图方法，明确是静态源依赖，不是生产数据血缘 | `lineage-input.json` / `lineage-output.json`；两项 affected、均 observed_path，coverage=supplied_edges_only | owner 未提供，保留空值导致 needs_review；不臆造维护人，不把两条边当整库完整图或证明函数实际执行 |
| 回执故障→修订→复核 | 实际历史 155c906 Hook 与 79251f2 修复，按 reliability-engineer 的用户旅程、对照、恢复和观测方法；显式本地调用 Hook；用 delivery-verifier 实读检查 | `hook-replay.json`、`hook-receipt-v1/v2.json`、三个 verification 输出；旧版 exit0/无回执，新版生成 1 份回执，改文后 2 份且 SHA 不同；旧绑定 failed，新绑定 completed，加入宿主检查后 partial | 历史生产发生/发现/恢复时刻未知；本次是 Linux 目录别名重放，未假称 macOS、Claude 原生宿主或真实用户采纳通过 |

`source-manifest.json` 固定本次材料的文件 SHA256。Hook 配置显式只选 `report.txt`，原配置保留在 `hook-config.json`（临时 workspace 已清理，复跑会创建新目录）。`report-v1.txt` 是实际修复提交说明与差异；`report.txt` 是在其后追加本次真实本地观察的修订，不包含虚构企业数据。

## 可靠性工程师的实际交付

### serviceObjectives：按用户结果定义成功

本次旅程是“对明确选定的已存在产物发起本地回执命令，取得可解析的 stdout 和实际不可覆盖字节快照”。成功须同时满足回执存在、工作/版本绑定正确、产物 SHA 与实际字节一致。**退出 0 不是成功分子**：旧版目录别名路径返回 0 且 stdout 为空、回执为 0。

本次隔离重放同一配置、同一事件、同一报告，旧源码一次 0/1，新源码首次一次 1/1；修订后另一次成功生成第二个快照。这只是有限确定性回归观察，不能外推生产可用率、故障概率或 SLO 达标。未提供客户请求、影响起止、检测延迟或恢复窗口，因此客户影响、MTTR、业务 SLO 均 unknown。`incident-postmortem` 要求真实事故开始/发现/缓解/恢复时间；本次不使用提交时间填这些字段，不凑出可执行但虚假的事故输入。

### rollout：对照与适用范围

旧源码固定为 `155c906:hooks/evidence-receipt/scripts/hook.mjs`，修复来源为 `79251f2`；当前源码内容哈希记录在 replay/source manifest 中。两份源码在同一环境通过含空格和中文的目录 symlink 启动，其他材料保持一致。旧版比较 lexical argv URL 与 Node 已 realpath 的 import.meta.url，未进入 CLI 主体；修复以实际文件身份比较，两种路径表示归一到同一文件。

只确认本地目录别名触发问题已重放且当前修复满足回归条件。本次不发布、不更新宿主配置、不将试验 1/1 当上线流量。后续发布判断由现有发布流程持有；其他独立 helper 不因该 Hook 路径故障整体停用。

### recovery：可执行且保留证据

1. 保留旧源码、修复差异、当前源哈希与 stdout/receiptCount；来源文件分别为 `hook-before.mjs.txt`、`hook-fix-source.txt`、`hook-replay.json`。
2. 若本机实际出现相同症状，先用已配置的显式产物白名单与真实绝对路径检查 CLI 输出及回执文件，不以 exit0 判完成。沿用该项目已授权路径，不扩大记录范围。
3. 本次已证明实际文件路径识别修复可运行；回退不得盲目恢复到已经重放失败的旧版。保留原宿主配置；若本机已启用的注册失败，只暂停这条回执注册并保留其他 Hook，待对应宿主的真实事件验证后恢复。这里是操作候选，未执行宿主变更。
4. 修改产物后旧 SHA 必须失败。实际 `verification-stale.json` 为 blocked，criterion failed；用新快照绑定再核，`verification-refreshed.json` completed。加入外部宿主检查后 `verification-host-pending.json` partial，明确不能用字节一致替代宿主观察。

### observability：可接手的检查

告警对象为配置中该 Hook 的 stdout 与 receiptsDir；责任暂为“调用方/项目维护者待指派”，未伪造具体个人。成功检查包含 stdout.hookSpecificOutput、实际文件字节哈希、不可覆盖旧回执、revision 与选定产物数；失败保留固定 stderr code，不复制敏感材料。下一轮本机观察需要宿主类型/版本、注册片段、触发事件、事件后 stdout 和实际回执路径；持续窗口与生产阈值由该业务已有 SLO 定义，本次没有数据来设数值。

## 新发现与修复

原 MCP 审计递归扫描所有 object 值，因而把 `properties.$ref` 业务字段名、`default`/`examples`/`const` 中普通 JSON 的 `not`、`if`、`$ref` 当成真正 Schema 规则。这会制造错误“复杂 Schema/引用”提示。现只沿已知 Schema 位置遍历，覆盖 properties、$defs、items/tuple、prefixItems、组合、条件、附加属性、schema dependency 等；仍不实现完整 Schema validator。

针对测试同时确认“关键词形状的业务数据不误报”及“真正嵌套引用/条件仍需复核”，并保留 boolean 输入定义为诊断材料且 requires_schema_review。合成边界测试用于证明算法行为，**不是本轮真实 MCP 工具定义含这些缺陷的证据**。

依据：[JSON Schema annotations](https://json-schema.org/understanding-json-schema/reference/annotations)说明 default/examples 是注解/示例数据；[MCP 2025-11-25 Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools#tool)要求工具 inputSchema 为有效对象。有限扫描完成并非 MCP 合格证书。原有工具注解不可信、离线不连接和 finalAcceptance 未决定边界保持。

## 复跑与继续修改

从仓库根目录执行，输出目录必须是不存在的绝对路径：

```sh
node docs/verification/professional-real-materials-20261114/run.mjs /absolute/path/to/new-professional-trial
node --test tools/mcp-contract-auditor/tests/helper.test.mjs skills/data-lineage-impact/tests/helper.test.mjs hooks/evidence-receipt/tests/hook.test.mjs
```

本次这三包 23 项测试全部通过；复跑脚本的所有断言通过。脚本需要包含历史提交的 Git checkout、Node 22+、支持目录 symlink 与 POSIX 安全打开的环境；它仅创建新输出目录和受控临时文件，不安装或注册任何组件。缺历史 Git、symlink 或安全打开能力时会显式失败，不降级编造通过。

保留的 `verification-*-input.json` 可独立对结果目录复核，例如：

```sh
node agents/delivery-verifier/scripts/verify.mjs --artifact-root /absolute/path/to/new-professional-trial --input-json - < /absolute/path/to/new-professional-trial/verification-refreshed-input.json
```

下一轮改源码时先复跑对应边界测试，再生成新结果目录；核对 source-manifest，补齐受改动影响的证据。补 owner 后仅重算依赖影响；取得真实宿主事件后仅补该外部验收，不改写历史未观察状态、不重复请求已有授权。
