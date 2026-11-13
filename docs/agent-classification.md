# 按行业主体与岗位寻找 Agent

能力目录现在可以先选“行业 / 通用领域”，再选“岗位 / 角色”。例如选择金融保险后选择保险理赔分析师，或选择酒店与住宿后选择酒店收益分析师；看清角色需要的材料、交付物与边界，再准备请求。

分类的唯一维护来源是 [`config/agent-taxonomy.json`](../config/agent-taxonomy.json)。每个已发现的 Agent 稳定 ID 有且只有一个主要浏览位置和中英文岗位名称。页面、搜索词和卡片中的分类都是它的投影；Agent 自身的 `capability.json`、`method.json`、原方法与输出标准继续决定实际能力，分类不新增权限、资格或专业结论。

企业财务、软件与系统工程、安全、产品设计、采购供应链、人才职场和交付核验等跨行业岗位单列通用领域。比如企业现金流建模不必假称银行业务，安全事件响应不只服务安全公司。主分类不是排他适用范围，仍可用搜索查跨场景任务。Skill、Tool、Hook 保持自身类型，不被硬塞进某个行业或伪装成岗位。

## 从找到岗位到交付

1. 选行业或通用领域，再选岗位；关键词继续与所选范围取交集。切换语言保留行业与岗位；切换到 Skill/Tool/Hook 清除 Agent 筛选，避免看不到已有能力。
2. 打开详情，核对原始方法路径、能力 ID、版本、材料与输出约定。分类名称不替代原始专业范围。
3. 填真实目标和资料，下载或复制请求到已有授权的当前宿主。浏览器只准备请求，不执行 Agent，也不推断宿主、模型或工具权限。
4. 宿主读取该角色入口以及 method.json/引用材料，按真实输入计算或形成可修改产物。没有保单、损失、工厂台账、医疗运营记录等材料时，明确缺口；先做有依据的独立部分，不编造经营结论。
5. 用实际文件、计算或观察验收逐项输出。修订后核对新版本，保留原始依据与旧回执；业务采纳、接手和效果分别记录。

真实仓库材料可复跑路径见[软件交付闭环记录](verification/professional-real-materials-20261114/README.md)。它演示实际代码定义→依赖影响→旧故障重放→产物修订→失败/通过/未验证的区分，不是金融、保险、制造或医疗行业效果证明。

## 维护与复核

新增或删除 Agent 时同步修改唯一分类文件；保持组件和能力稳定 ID。分类校验会拒绝漏项、重复、未知 ID、非 Agent ID 和缺失的中英文标签，而不会静默隐藏角色。分类变更不需要修改专业能力合同来重新命名角色。

```sh
node --test scripts/agent-taxonomy.test.mjs scripts/task-materials.test.mjs scripts/task-browser-locales.test.mjs scripts/start-page.test.mjs
node scripts/start-page.mjs build
node scripts/build-site.mjs
python -m unittest tests.browser.task_browser.BrowserAcceptance.test_industry_role_navigation_keeps_exact_contract_and_draft_on_language_change -v
```

最后一条需要实际 Playwright Chromium 环境；不能用 DOM 适配器的事件测试替代真实浏览器布局、键盘和下载验收。旧测试中的历史角色覆盖清单仍保留，但已去除旧的另一套行业分组；它只检查原有角色没有丢失。
