# 在 DSH（DeepSeek Harness）中使用 Kim_Service

Kim_Service 现在可以把目录中所有已声明的专业 Agent 与 Skill，构建成 DSH 能发现和读取的原生 **Skills** 包。每个入口保留完整方法、知识材料、质量合同、样例、验证脚本、附件与许可文件。新组件进入标准能力目录后会自动纳入构建，不需要维护另一份写死的职业名单。组件 README 共用的联系和付款图片也按根目录声明及原始哈希复制到相同相对位置，保持包内图片可打开。

这里的 DSH 指 [DeepSeek 官方开源 Harness](https://github.com/deepseek-ai/deepseek-harness)，不是在其他客户端里选择 DeepSeek 模型。本适配依据 `fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159` / `0.2.2-rc.1`；DSH 本身要求 Node >=24.9.0。

> 名称说明：对外统一使用 **DSH（DeepSeek Harness）**。早期验证和答题记录中的 `DSh` 是旧写法，原始记录保持不变。命令、npm 包、API 标识和目录仍使用其原有的小写 `dsh`。

## 安装和使用

在 Kim_Service 仓库执行，选择一个尚不存在的输出目录：

```sh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh --check
```

然后用 Meta_Kim 的公开安装入口接入完整生命周期：

```sh
meta-kim dsh install --service-package /path/to/kim-service-dsh
meta-kim dsh check
dsh --profile meta-kim
```

使用自定义 DSH_HOME 时，安装命令传 `--dsh-home /path/to/dsh-home`，运行 DSH 时使用相同 DSH_HOME。只安装到某个项目：

```sh
meta-kim dsh install --scope project --project-root /path/to/project --service-package /path/to/kim-service-dsh
```

从项目根目录启动安装结果中给出的 `dsh --profile web --patch ...` 命令。保留用户原有的 DSH_HOME；不要把项目目录设成新的用户主页。DSH 默认扫描最近的 Git 根，`.git` 目录和 worktree 标记文件都算；没有 Git 根时才用启动目录。若指定的是仓库子目录，安装器会在写入前指出应该使用的根目录，避免“装了但看不见”。已有安装后来出现这类错位，`check` 会报告不完整，仍可用 `uninstall` 清理其托管文件。最后还要检查宿主真实技能目录，目录位置正确本身不能证明加载成功。

更新时构建一个新目录，再执行 `meta-kim dsh update --service-package /path/to/new-package`；省略 Service 包参数会保留已安装的 Service 内容。卸载用 `meta-kim dsh uninstall`，项目安装补上同样的 scope/project-root。安装器会校验全部文件和哈希，不覆盖无主文件或用户改动；卸载保留用户修改并报告需要处理的项目。安装账本继续使用 Meta_Kim 原有的 `.meta-kim/install-manifest.json`，不建立第二套安装权威。

包中的 `projection.json` 只记录预期内容闭包，用来发现丢失的账本记录或不完整资源；它不能授权写入或删除。DSH 专用卸载会保留与其他宿主共享的 immutable package、事务备份以及用户内容，这些继续由 Meta_Kim 既有生命周期管理。

在 DSH 会话中调用 `/kim-service`，根据目录选择方法；也可以调用目录里对应的 `/kim-frontend-engineer` 等入口。只有目录中实际存在且成功加载的名字才有效。构建完成和文件存在不等于宿主已加载，更不等于任务已完成。

## 为什么入口短、方法仍然完整

DSH 默认标准 preset 的结果裁剪器可能截断超过 8192 字符的工具结果。直接粘贴一份很长的专家提示词，会让后半部分的边界或验收规则消失。因此每个原生 Skill 只负责导航，正文控制在 6000 字符以内。

每个入口附带 `method.json`，指向主方法、完整能力合同以及专业方法合同的分段索引。使用前必须读取这些必需合同的所有索引页和分段，包含后半部分的 outputChecks 和验收规则，再按任务加载其他知识。不能只保护 Markdown，却把 JSON 里的标准截掉。

Markdown、JSON、YAML、TOML、文本、CSV，以及 JavaScript/TypeScript、Python、Shell、PowerShell、SQL、HTML/CSS、XML、SVG 等文本源码旁都有 `<文件名>.dsh-parts/index.json`。每段最多 6000 字符、120 行、每行 1500 字符；这是同时给结果裁剪器、原生读取工具的行长限制、行号和路径展示留空间。较长索引也分页。所有分段拼接后必须等于原始字节内容；分段内的链接仍以原文件目录为基准，索引里的页和分段路径以索引目录为基准。原始文件与完整组件目录保留在共享 `kim-service/source`。需要检查某份脚本时按分段完整读取，执行时仍运行未改动的原脚本，不能运行分段文件；程序验证器继续读取完整原文件。

这同时解决两个问题：宿主能以短目录发现方法，执行者又能获取完成任务真正需要的专业知识。只有一句“你是前端专家”不构成这个包的能力定义。

## Agent、Skill、MCP、Hook 的边界

| 项目 | 本包提供什么 | 还需要什么证据 |
|---|---|---|
| 专业 Agent 方法 | 以原生 Skill 加载完整职责、知识、方法、输入输出和验收规则 | 实际任务输出逐项通过其合同验收 |
| 原生子 Agent | 使用宿主当前已配置的 `subagent`，带入专业方法与任务合同；默认继承当前 preset | 真实子任务的开始、终态和审核证据；不能把 Skill 名当作自定义 preset ID |
| 浏览器、计算机控制、外部工具 | 声明任务需要的能力和权限绑定 | 宿主真实可用工具、资源范围、授权和操作回执；方法包不会自动授予这些能力 |
| MCP | Meta_Kim 的独立 DSH 集成可配置原生 MCP 客户端并连接稳定包中的服务 | 实际协议握手、工具/资源发现与调用结果；连接不代表允许所有动作 |
| Hook | 本包不声称提供 DSH 原生强制 Hook | 单独实现、审查并验证真实阻断语义，不能用提示词或实验桥接配置代替 |

任务交给子 Agent 时要带上完整方法引用、相关事实、允许范围、真实工具绑定、输出合同、标准和审核人。开始回执只是开始；拿到终态、检查产物后才能合并。A 分支等人验收时，不依赖它、没有资源冲突的 B/C 可以继续，但 A 的验收状态不能被自动改成通过。

## 制作和验证标准

- **来源闭合**：能力必须来自标准 `capability.json` 目录扫描；原始组件的资源树保留；构建拒绝链接、路径穿越、缺失入口和命名冲突。
- **知识完整**：每份入口可以定位完整主方法、知识、JSON 等格式的标准和参考材料；分段拼接与原文哈希一致；原生宿主探针还要验证实际读取和结果裁剪不会丢掉行或规则。任何必要方法缺失都不能靠目录数量掩盖。
- **行为边界**：工具可用性、权限和人类决策独立验证；缺失、拒绝、未验证不能被写成可用。
- **产物验收**：运行能力合同指定的验证，逐条关联真实证据；有可执行检查时实际运行。无法运行的项目保留原因及替代证据，不能写成已测试。
- **安装可逆**：由 Meta_Kim 现有账本和事务层管理安装、更新、检查、卸载；保留用户文件和改动。
- **宿主证据分层**：构建与哈希校验、DSH 真实配置/技能加载、MCP 连接、原生委派、业务质量分别记录。无模型探针只证明其实际观测层。

Meta_Kim 的官方无模型探针分别检查全局 profile 和项目 overlay，使用 DSH 自身的 Skill 注册表验证同名技能优先加载项目版本，逐份读取方法、合同和全部分段，并检查卸载项目包后全局包仍完整。`dsh check` 会分别报告文件完整性和 MCP 配置状态；安装记录缺失或被修改时，MCP 状态为未知，不会把未知误报为关闭。

构建器不会下载模型、使用 API 凭据、注册自定义原生 Agent preset 或启动外部付费调用。用户已经拥有的 DSH 模型、工具和权限配置继续由宿主管理。

## 官方依据

- [CLI profile、插件解析和 patch 顺序](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/apps/cli/README.md)
- [原生 Skills 的目录、frontmatter 和发现优先级](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/skill/skill-filesystem/README.md)
- [技能加载与资源基目录](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/skill/tool-skill/README.md)
- [原生 subagent 的 preset 继承和异步行为](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/subagent/tool-subagent/README.md)
- [preset 与工具结果长度](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/preset/agent-preset/README.md)
- [原生 MCP 接入](https://github.com/deepseek-ai/deepseek-harness/blob/fcc0ad462172522aaf5c93a7b2e01f6b9f0b0159/packages/mcp/mcp-client/README.md)
