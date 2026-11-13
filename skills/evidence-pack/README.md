# 大材料证据包

把长文原文保留成带来源哈希的分页分块索引，按字节预算取回当前模块所需材料。 evidence source chunk context budget

Read [SKILL.md](SKILL.md), then run the supplied example:

```sh
node scripts/example.mjs /absolute/path/to/new-example-workspace
node --test tests/helper.test.mjs
```

The helper accepts JSON on stdin and returns JSON on stdout. It does not call a model or change business state. The caller saves artifacts and owns acceptance. See [PROVENANCE.md](PROVENANCE.md) for method sources and licensing boundaries.

Default invocation uses `scripts/files.mjs` with an explicit workspace, source paths and a new pack path. It returns only a bounded index/context and a pack reference. `read` requires the saved file hash; source drift is checked by default. The pure `scripts/run.mjs` interface is for offline/in-process callers that intentionally handle the complete bounded pack.
