# Intent-to-delivery 本地验证记录

日期：2026-11-10。范围：本次专业知识装配、两层 PRD 候选交接及 Meta_Kim 方法消费变更。以下结果来自本地 Linux 工作树；GitHub Actions 的 Linux / Windows 结果、提交状态与发布状态须分别核对。

## 环境与官方工作流

按 [Validate repository 工作流](../../.github/workflows/validate.yml) 的本地步骤执行。环境为 Node 24.22.1、Python 3.12.14、Pillow 13.0.0、fonttools 4.61.1；现有 Python 依赖满足组件 requirements，未安装全局依赖。本次未执行 Windows 作业。

在 Kim_Service 仓库根目录复现：

```bash
export PYTHONUTF8=1
export PYTHONDONTWRITEBYTECODE=1
STICKER_TEST_SYNTHETIC=1 python skills/kim-sticker-pack/evals/test_finish_frames.py
node scripts/catalog-automation.mjs check
node scripts/start-page.mjs check
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
node scripts/check-components.mjs
```

新环境应先按工作流安装 `skills/kim-sticker-pack/requirements.txt` 中的依赖。各入口可能覆盖同一逻辑，以下计数不相加作为唯一测试数量。

| 验证入口 | 实际结果 |
| --- | --- |
| Catalog freshness | 通过；35 个组件、50 项 capability |
| Start page freshness | 通过；当前页面与 capability 合同、模板一致 |
| Repository boundaries | 通过；35 个组件，3 项受保护 QR 资产通过仓库检查 |
| 根目录 Node 回归 | 117 项：116 通过、0 失败、1 跳过 |
| 组件声明的全部验证入口 | 35 个组件、58 个验证文件完成，进程退出码 0 |
| 组件 Node 报告 | 40 份报告合计 186 项：184 通过、0 失败、2 跳过 |
| 组件 Python unittest 报告 | 9 份报告合计 94 项：92 通过、0 失败、2 跳过 |
| 其他组件验证文件 | 9 个使用自定义断言或脚本报告成功，没有统一测试项计数 |
| 独立 synthetic sticker 步骤 | 20 项：19 通过、0 失败、1 跳过 |

根目录及组件完整回归执行后，四个专业包仅补充对应版本的 CHANGELOG，并重建 catalog / start 页面；随后重新执行三个 freshness / repository 检查通过。新增本记录后再次检查生成物与仓库边界。

### 跳过项及证据边界

| 所属入口 | 跳过项 | 原因 |
| --- | --- | --- |
| 根目录 Node | Windows physical root aliases | 当前主机是 Linux，Windows 路径别名分支留给 Windows CI |
| 组件 Node：delivery-verifier | unsupported platforms block before reading any artifact | 该真实不支持平台场景在 Windows CI 执行 |
| 组件 Node：claudecode-codex-gemini | installed Windows npm CLI entries can execute version probes without a shell | 需要 Windows 上实际安装的 npm CLI 入口 |
| 组件 Python：installer contract | test_powershell_wrapper_requires_and_forwards_project_dir | 当前主机没有 `pwsh` |
| 组件 Python：semgrep-skill | test_bundled_rules_find_vulnerable_fixture_only | 当前主机未安装 Semgrep；未证明真实 Semgrep 扫描结果 |
| 独立 synthetic sticker 步骤 | test_real_chinese_font_rendering | 此步骤按工作流强制使用合成几何字体，不验证真实中文字体渲染 |

## 四个真实专业包进入 Meta 的验证

在 Meta_Kim 仓库根目录，显式指定本次 Kim_Service 工作树的绝对路径；下列路径是需替换的占位符：

```bash
META_KIM_TEST_KIM_SERVICE_SOURCE=/absolute/path/to/Kim_Service \
node --test tests/governance/dependency-method-knowledge.test.mjs \
  tests/governance/dependency-method-handoff.test.mjs
```

结果：**12 项通过，0 失败，0 跳过**。实际来源测试通过既有项目注册发现组件，构造明确的测试宿主选择，调用 `loadDependencyAgentMethod`、`buildMethodInvocationContext` 和 `appendMethodInvocationContext`。测试解析最终提示中的交接 JSON，逐字节核对包内 Markdown 的完整内容、UTF-8 字节数、SHA-256 与来源引用。

| 实际专业包 | 包版本 | 进入宿主提示的完整知识字节数 |
| --- | --- | ---: |
| product-architect | 0.3.0 | 4,645 |
| interaction-designer | 0.3.0 | 3,545 |
| frontend-engineer | 0.2.0 | 4,013 |
| backend-data-engineer | 0.2.0 | 3,935 |

未设置上述环境变量时，真实来源用例会明确跳过；本次设置了真实来源，没有以 fixture 替代这四个包。其余用例还覆盖资料路径、大小、摘要漂移与来源绑定等边界。没有调用付费模型或原生宿主模型链。

## 可空未知值与交付边界回归

真实跨仓测试发现：Service 合同明确允许版本为 `null`，Meta 输入校验曾把它误判为缺失。修正后的行为是只接受合同显式声明可空的值，未知版本保留 `null`；缺少必填字段、错误类型及非可空字段的 `null` 继续失败。

在 Meta_Kim 仓库根目录复现本次选定的输入与交付回归：

```bash
node --test \
  --test-name-pattern='^(method inputs|required nested inputs|explicit unknown values|prose and structured role output|workflow projection)' \
  tests/governance/method-delivery.test.mjs
```

结果：**5 项通过，0 失败，0 跳过**，其中包含新增的可空未知值正反例。这是选定回归的计数。该文件完整运行仍有 1 项旧 durable fixture 因缺少当前 taskFacts / PRD 上下文而失败，本次保留门禁并记录为待迁移测试；完整 Meta 测试库的状态须单独报告。

## 本记录证明的范围

本次验证证明专业知识文件可以从真实能力包完整、受界限约束地交给 Meta，输入校验遵守合同，输出绑定保持当前任务与设计。worker 自报成功仍进入 `pending_independent_review`，`userOutcomeAccepted` 保持 `false`。

组件元数据、候选交接 helper、确定性测试和完整提示交付只提供结构与执行边界证据。专业判断是否合适、设计是否可用、原生模型是否按方法执行及用户是否接受成果，仍须结合实际产物、独立评审和真实宿主运行分别验收。来源引用记录也不充当一次真实外部抓取的回执。
