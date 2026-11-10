# 原创练习与答案

按学习目标编原创题目，控制难度与条件，并独立核对每题答案。题目需要测出具体理解，而不是换数字凑数量；不复制题库或用超纲难题冒充提高。

试着这样说：「按这个知识点出几道题」、「帮我做练习并附答案解析」、「检查这些题有没有歧义或错答案」。

阅读 [AGENT.md](AGENT.md) 即可按角色约定使用。Claude Code 用户可在明确选择后将该文件复制为自己 agents 目录中的 `exercise-designer.md`；其他运行时由调用方读取并按实际能力绑定，不宣称格式通用。

整个目录可独立复制；运行 `node tests/contract.test.mjs` 检查本地包。检查证明合同可读，不代表模型实际任务已通过。

输出：命题安排、学生版题目、教师版答案与解析、常见误解与核查、调整建议。

许可证：[MIT](LICENSE)。归属见 [NOTICE](NOTICE)。

运行状态：`needs_probe`。包内检查验证结构与独立性；各运行时的原生加载和模型交付质量仍需实测。

专业装配：完整目录包含 `method.json`、[专业知识](references/professional-method.md)、[来源记录](PROVENANCE.md) 与[正反案例](evals/professional-cases.json)。只复制 AGENT.md 不会带入这些资料。案例尚未做专业效果评测，宿主仍负责工具权限和最终验收。
