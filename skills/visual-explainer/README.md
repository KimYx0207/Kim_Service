# 分阶段图解

用单一图数据生成居中分层 SVG、可逐步播放的 HTML 与文字说明，核查边、阶段及退回路径。 visual explainer storyboard SVG diagram

Read [SKILL.md](SKILL.md), then run the supplied example:

```sh
node scripts/run.mjs --input-json - < examples/input.json
node --test tests/helper.test.mjs
```

The helper accepts JSON on stdin and returns JSON on stdout. It does not call a model or change business state. The caller saves artifacts and owns acceptance. See [PROVENANCE.md](PROVENANCE.md) for method sources and licensing boundaries.

To save a complete viewable example: `node scripts/example.mjs /absolute/path/to/new-diagram-folder`, then open `storyboard.html`.
