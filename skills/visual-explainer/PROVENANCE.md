# Method provenance

Inspected 2026-11-13. The helper, schemas, examples and tests are original Kim Service implementations. No upstream code is copied or executed.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| slidev | [slidev](https://github.com/slidevjs/slidev/blob/main/docs/guide/animations.md) | 按阶段逐步显现，保留静态全图、键盘操作和减少动态效果的选择。 | 不复制实现，不用图生绘制精确架构，不声称动画代表真实执行；本版只支持有界分层布局。 | MIT |

This is a method-level reference, not a claim that the full upstream product was integrated.

## Retrieved file evidence

The following blob hashes identify the first-party source bytes inspected on the date above; they are file hashes, not commit IDs.

| File | Branch at inspection | Git blob SHA |
| --- | --- | --- |
| [docs/guide/animations.md](https://github.com/slidevjs/slidev/blob/main/docs/guide/animations.md) | main | `ce4deea115b44303851af23b54bda6b7bda6c0d9` |
| [packages/client/builtin/VClicks.ts](https://github.com/slidevjs/slidev/blob/main/packages/client/builtin/VClicks.ts) | main | `1f312361cb2e9fcf31dba8d01cd825d7ab9908d5` |
| [packages/client/composables/useClicks.ts](https://github.com/slidevjs/slidev/blob/main/packages/client/composables/useClicks.ts) | main | `4b3ffa5b0ad9b8652061037eac0ceb0f52e2d6aa` |
