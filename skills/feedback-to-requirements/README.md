# 反馈转需求证据台账

将客户反馈、明确重复关系与分组转成需求候选，计算独立客户数，保留矛盾证据和版本绑定采纳记录。 feedback requirements evidence ledger

Read [SKILL.md](SKILL.md), then run the supplied example:

```sh
node scripts/run.mjs --input-json - < examples/input.json
node --test tests/helper.test.mjs
```

The helper accepts JSON on stdin and returns JSON on stdout. It does not call a model or change business state. The caller saves artifacts and owns acceptance. See [PROVENANCE.md](PROVENANCE.md) for method sources and licensing boundaries.
