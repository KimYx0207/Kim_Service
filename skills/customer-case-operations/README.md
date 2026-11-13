# 公司客户事项推进

按可配置阶段、角色、材料和事件重放客户事项，输出下一步与缺项，独立保留验证、回执与采纳。 customer case operations workflow receipt

Read [SKILL.md](SKILL.md), then run the supplied example:

```sh
node scripts/run.mjs --input-json - < examples/input.json
node --test tests/helper.test.mjs
```

The helper accepts JSON on stdin and returns JSON on stdout. It does not call a model or change business state. The caller saves artifacts and owns acceptance. See [PROVENANCE.md](PROVENANCE.md) for method sources and licensing boundaries.
