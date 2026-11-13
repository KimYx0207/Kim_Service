# 跨客户端离线评测

用相同数据集比较不同模型客户端的已有输出，保留缺失项、关键断言、分层回归和成本延迟预算。 agent evaluation offline regression budget

Read [SKILL.md](SKILL.md), then run the supplied example:

```sh
node scripts/run.mjs --input-json - < examples/input.json
node --test tests/helper.test.mjs
```

The helper accepts JSON on stdin and returns JSON on stdout. It does not call a model or change business state. The caller saves artifacts and owns acceptance. See [PROVENANCE.md](PROVENANCE.md) for method sources and licensing boundaries.
