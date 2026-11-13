# Method provenance

Inspected 2026-11-13. Original implementation; no upstream code or long passages copied.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| claude-hooks | [Claude Code Hooks reference](https://code.claude.com/docs/en/hooks#posttooluse); living page inspected 2026-11-13 | 采用PostToolUse stdin事件和additionalContext输出约定，只提供事实型回执。 | 不覆盖用户配置、不阻止停止、不执行事件里的命令或把完成事件当验收。 | Anthropic documentation copyright; original implementation |
