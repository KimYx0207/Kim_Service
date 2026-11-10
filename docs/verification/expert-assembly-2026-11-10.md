# 24 角色专业知识装配：本地验证

日期：2026-11-10。范围是本轮 24 个 Agent 的知识/方法/专业合同与实际 Meta_Kim 消费路径。此前四个软件角色的验证记录保留在 [intent-to-delivery](intent-to-delivery-2026-11-10.md) 中；下面是完成行业扩展后的新快照，不把不同轮次相加成测试覆盖。

本轮仍为 35 个组件、50 项能力、24 个 Agent。新增 20 份原创知识文档、17 个 method 和 48 条合成案例；全部 Agent 具有可选 expertise 合同。四个软件角色原核心知识字节、已有 helper 源码/描述符及 LICENSE/NOTICE 均与扩展前 `7e0cc4b10c855a24960aac0ea3bd62c4e4bf7e57` 相同。例外是包版本与对应合同断言按本轮内容更新，工具自身版本没有因资料更新而假装升级。

## 环境与官方入口

本地 Linux：Node 24.22.1、Python 3.12.14、Pillow 13.0.0、fonttools 4.61.1。已有依赖满足 [Validate repository](../../.github/workflows/validate.yml)；本轮没有全局安装依赖、调用付费模型或执行 Windows CI。

在 Kim_Service 根目录：

```bash
export PYTHONUTF8=1
export PYTHONDONTWRITEBYTECODE=1
node scripts/check-agent-pack.mjs
node scripts/catalog-automation.mjs check
node scripts/start-page.mjs check
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
node scripts/check-components.mjs
STICKER_TEST_SYNTHETIC=1 python skills/kim-sticker-pack/evals/test_finish_frames.py
```

| 入口 | 本轮结果 |
| --- | --- |
| 专业包检查 | 24 包通过 |
| 专业包检查器定向回归 | 18 项通过，0 失败、0 跳过；已包含在根回归中 |
| catalog / start / repository | 通过；35 组件、50 能力，3 项受保护 QR 资产通过仓库检查 |
| 根 Node 回归 | 123 项：122 通过、0 失败、1 跳过 |
| 全部声明组件验证 | 35 组件、58 个验证文件完成，退出码 0 |
| 组件 Node 报告 | 40 份报告，186 项：184 通过、0 失败、2 跳过 |
| 组件 Python unittest | 9 份报告，94 项：92 通过、0 失败、2 跳过 |
| 其他组件脚本 | 9 个文件以自定义断言/脚本报告成功，不虚构统一测试项数 |
| 独立 synthetic sticker 步骤 | 20 项：19 通过、0 失败、1 跳过 |

最后一次完整根与组件回归在标题布局合同改为非空说明字符串、相关专业案例修订及目录重建后执行。该兼容扩展仍接受历史三种布局名，也能表达流程图和局部标注；布局是否具体、可制作，由原有专业输出标准及当前产物评审判断，不由字符串类型通过自动证明。之后仅增加本验证记录并重查 freshness / repository。

### 跳过原因

| 入口 | 跳过项 | 原因 |
| --- | --- | --- |
| 根 Node | Windows physical root aliases | 当前为 Linux，Windows 路径分支留给该平台 CI |
| 组件 Node / Delivery Verifier | unsupported platforms block before reading any artifact | 当前平台支持该安全读取路径；真实不支持平台分支由 Windows CI 覆盖 |
| 组件 Node / claudecode-codex-gemini | installed Windows npm CLI entries | 需要 Windows 上实际 npm CLI 入口 |
| 组件 Python / installer | PowerShell project-directory forwarding | 当前没有 pwsh |
| 组件 Python / Semgrep | bundled rules on vulnerable fixture | 当前没有 Semgrep，未验证实际扫描 |
| 独立 synthetic sticker | real Chinese font rendering | 工作流该步骤强制使用合成字体，真实中文字体不属于此步骤 |

这些是明确未覆盖范围，不计为通过。相同代码可能被多个入口调用，表中各行不能简单相加为互不重叠的测试数量。

## 全部真实专业包进入 Meta

在 Meta_Kim 根目录，用明确选择的当前 Service 来源：

```bash
META_KIM_TEST_KIM_SERVICE_SOURCE=/absolute/path/to/Kim_Service \
  node --test tests/governance/dependency-method-knowledge.test.mjs \
    tests/governance/dependency-method-handoff.test.mjs
```

结果 **33 项通过、0 失败、0 跳过**。其中知识文件单文件入口为 29 项（含 24 个实际角色子项），交接入口另有 4 项。没有以虚构包替代本次真实来源，也没有调用原生模型。

测试从真实能力索引发现全部 Agent，作明确的测试宿主选择，然后使用 `loadDependencyAgentMethod`、`buildMethodInvocationContext`、`appendMethodInvocationContext`。它解析实际提示中的 JSON，对照文件逐字节检查完整 UTF-8 内容、字节数、SHA256、来源引用和全部 expertise；并保留 worker 自报结果的 `pending_independent_review` 与 `userOutcomeAccepted: false`。

总计 **132,733 字节**的角色知识在各自选择的上下文中完整到达，每个文件为 3,545–6,455 字节；没有把所有角色一次性塞入一个上下文。

| 角色 | 版本 | 实际交接知识字节 |
| --- | --- | ---: |
| backend-data-engineer | 0.3.0 | 3935 |
| concept-tutor | 0.2.0 | 5579 |
| customer-service-writer | 0.2.0 | 5922 |
| delivery-verifier | 0.2.0 | 6365 |
| exercise-designer | 0.2.0 | 5580 |
| frontend-engineer | 0.3.0 | 4013 |
| headline-cover-optimizer | 0.2.0 | 6455 |
| interaction-designer | 0.4.0 | 3545 |
| interview-coach | 0.3.0 | 5584 |
| launch-planner | 0.2.0 | 5965 |
| lesson-planner | 0.2.0 | 5671 |
| media-production-engineer | 0.2.0 | 5826 |
| pricing-cost-analyst | 0.2.0 | 5833 |
| product-architect | 0.4.0 | 4645 |
| product-listing-writer | 0.2.0 | 5503 |
| quantitative-researcher | 0.2.0 | 5887 |
| resume-editor | 0.2.0 | 5695 |
| script-writer | 0.4.0 | 5882 |
| side-business-evaluator | 0.2.0 | 5859 |
| source-evidence-analyst | 0.2.0 | 5964 |
| store-performance-analyst | 0.3.0 | 5630 |
| supplier-comparison-analyst | 0.2.0 | 6381 |
| topic-planner | 0.2.0 | 5483 |
| workplace-writer | 0.2.0 | 5531 |

未提供环境变量时，真实来源用例会明确跳过。本次已提供来源，没有把跳过计为通过。源索引 SHA256 为 `cc5052239c3d5e11143a39f8ab00cf56ac6a415febdee22b7f4f260ce15c1d2f`；实际角色装配核对每份文件与完整组件摘要，不靠该表作授权。

## 本轮发现并修复的具体问题

- 新增案例首先被现有真实合同拒绝了错误格式：文章形式枚举、标题推荐字段、题目/教案数组类型等。修订案例而没有放松这些已有规则。
- 新增版本触发 Delivery Verifier、Store Performance、Supplier Comparison 三处旧组件版本断言。断言按新组件版本更新；各工具版本、脚本、调用权限和安全边界保持原值。
- 全 24 包真实装配暴露 Meta 的默认值问题：共享 `nonGoals` 被包成对象，填进 Resume / Supplier 的可选字符串 `constraints`，使方法 readiness 失败。默认候选现在先经过现有字段检查，符合才补入；不转换未知对象、不覆盖显式输入。非目标仍完整保存在任务 context，必填缺口与显式错误值继续失败。
- 标题/封面原文把平台降权说成必然因果，并将布局限制为三种固定值。现在依据内容和材料描述布局，保留旧值，区分平台规则、曝光构成和真实实验；不宣称推荐已经是点击赢家。

输入与交付选定回归：

```bash
node --test \
  --test-name-pattern='^(method inputs|required nested inputs|explicit unknown values|prose and structured role output|workflow projection)' \
  tests/governance/method-delivery.test.mjs
```

结果 **5 项通过、0 失败、0 跳过**。这不是完整 Meta 测试库的声明；其基线债务、其他治理测试与真实宿主检查由 Meta 的独立验证记录报告。另一个 Round 8 测试按真实 Critical 场景迁移：无 Critical 时保持 inactive；提交明确当前 Critical 和材料分支后才要求 awaiting，并仍验证绕过回调调用数为 0。该定向用例通过，不放松权威边界。

## 证据限制与可复核摘要

自动检查证明文件、引用、接口结构和方法运输满足所测范围。48 条案例是作者设计的合成输入与候选片段，专业效果仍为 `not_evaluated`。没有将字段齐全、资料装入、确定性 helper 或自报 pass 当作全部行业专家已获实测认证。专业输出仍需当前任务产物、领域判断及高影响情境下的人类专业审核。

本地输出摘要（SHA256 用于同一次运行记录的字节识别，不等于第三方认证）：

| 记录 | SHA256 |
| --- | --- |
| 根回归 | `1df586b0f1a3fee9ddf4e83216751352c91c9eeb9339221caa7b06fb0e9d2fb0` |
| 全组件验证 | `10403f89773bdb0f3bd39ea3e12273ed6a7f7951b8d34a10ddfcda5bfec9c7b3` |
| Meta 真实来源知识与交接 | `f8f177ff603e29b2d64ebcca1739c9f2c7557bcde8ed965c5f4a4c79c1c8cb55` |
| 合成字体步骤 | `d2dca45a90960abf7d65c502067857875d90c4b789acafd153164f1a30773ce9` |
| Meta 选定输入回归 | `0b3c2cf52ed0de90230d38b6a78945e063a917389ee85be6b5caadf47e5e345a` |

GitHub PR CI、合并状态、公开 Release、Windows 和原生模型表现应各自核对，本记录不替代那些结果。
