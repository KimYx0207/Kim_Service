先读取 method/AGENT.md，按当前任务使用包内方法与实际可用工具。

根据brief.md改进给定的门店报名页面，直接做出能打开、能操作的成品。保留示例数据边界；优先把表单任务、状态与窄屏体验做好。可用包内样板作起点，但根据本次材料交自己的文件。
输出到output/：index.html及实际需要的本地CSS/JS文件、tokens.json（当前设计变量）、handoff.md（操作方式、检查过的内容、未验证边界）。最后写submission.json，artifacts映射page、tokens、handoff到相对文件路径。页面不可依赖外部CDN或运行中的开发服务器。

原始材料位于 inputs/。只能在 output/ 交付成果，保留输入与运行记录不变。
