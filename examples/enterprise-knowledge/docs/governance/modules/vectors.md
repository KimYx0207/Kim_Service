# 模型与向量generation

任务 `T-vectors`；负责人：模型与存储维护者；准则：K02, K06, K07, K08。

真实本地编码并按checkpoint恢复；候选与active分离。

## 输入与依赖

固定brief/API；上游：corpus。范围：app/embedding.py, scripts/build_index.py, data/indexes/。

## 状态和异常恢复

- not_started：无模型/索引
- building：只有checkpoint不是可采用索引
- ready：全量文件/manifest验证完成
- active：CAS采用；旧代保留
- failed：保留已验证checkpoint

## 业务规则

- 模型固定revision；失败不假分数/不换模型
- 每批完成数据写入和checkpoint顺序需可恢复
- generation完成前不可激活；active指针CAS
- ONNX权重量化与输出向量int8实验分开报告

## 真实验收

- K02：按 docs/project-brief.md K02 和 docs/api-contract.md 实际执行，检查 真实本地编码并按checkpoint恢复；候选与active分离；证据：模型与索引 manifest、任务 checkpoint、逐 query top-k 与时延。
- K06：按 docs/project-brief.md K06 和 docs/api-contract.md 实际执行，检查 真实本地编码并按checkpoint恢复；候选与active分离；证据：实际进程停启记录、前后 SQL/哈希、幂等与并发检查。
- K07：按 docs/project-brief.md K07 和 docs/api-contract.md 实际执行，检查 真实本地编码并按checkpoint恢复；候选与active分离；证据：generation 记录、采用/回滚回执、同题对照。
- K08：按 docs/project-brief.md K08 和 docs/api-contract.md 实际执行，检查 真实本地编码并按checkpoint恢复；候选与active分离；证据：量化 manifest、Recall 相对 float32 及 qrels 指标、实测时延。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
