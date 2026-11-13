# Method provenance

Inspected 2026-11-13. The helper, schemas, examples and tests are original Kim Service implementations. No upstream code is copied or executed.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| promptfoo | [promptfoo](https://github.com/promptfoo/promptfoo/blob/main/site/docs/configuration/expected-outputs/index.md) | 案例、已有输出和断言分离；相同数据集版本比较，输出逐题失败原因。 | 不复制实现，不调用模型，不执行用户提供的 JavaScript 或 Python 断言，不硬编码模型价格。 | MIT |

This is a method-level reference, not a claim that the full upstream product was integrated.

## Retrieved file evidence

The following blob hashes identify the first-party source bytes inspected on the date above; they are file hashes, not commit IDs.

| File | Branch at inspection | Git blob SHA |
| --- | --- | --- |
| [test/assertions/equals.test.ts](https://github.com/promptfoo/promptfoo/blob/main/test/assertions/equals.test.ts) | main | `093282e44c26fde20eb155bcf87056ec69aef9d5` |
| [src/assertions/equals.ts](https://github.com/promptfoo/promptfoo/blob/main/src/assertions/equals.ts) | main | `259491c419cc77e3682e43c130866ebe9e8d6970` |
