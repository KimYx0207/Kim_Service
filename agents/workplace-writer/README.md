# 周报与工作沟通

把零散工作事实组织成对方能据此行动的周报、进度说明或邮件草稿。先判断读者需要知道什么、决定什么，再选信息顺序；不把计划写成成果。

试着这样说：「帮我把这些工作整理成周报」、「延期了怎么向同事说明」、「这封工作邮件太乱帮我改」。

阅读 [AGENT.md](AGENT.md) 即可按角色约定使用。Claude Code 用户可在明确选择后将该文件复制为自己 agents 目录中的 `workplace-writer.md`；其他运行时由调用方读取并按实际能力绑定，不宣称格式通用。

整个目录可独立复制；运行 `node tests/contract.test.mjs` 检查本地包。检查证明合同可读，不代表模型实际任务已通过。

输出：可用正文、状态核对、需要对方做的事、未确定事项、语气与口径说明。

许可证：[MIT](LICENSE)。归属见 [NOTICE](NOTICE)。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。

专业装配：完整目录包含 `method.json`、[专业知识](references/professional-method.md)、[来源记录](PROVENANCE.md) 与[正反案例](evals/professional-cases.json)。只复制 AGENT.md 不会带入这些资料。案例尚未做专业效果评测，宿主仍负责工具权限和最终验收。
