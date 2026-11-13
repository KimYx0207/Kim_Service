# 权限删除与版本恢复

任务 `T-lifecycle`；负责人：存储与检索维护者；准则：K05, K06, K07。

隔离受控覆盖层在搜索与直接读取一致执行。

## 输入与依赖

固定brief/API；上游：corpus, retrieval。范围：app/storage.py, app/retrieval.py, app/main.py, tests/。

## 状态和异常恢复

- visible：正常允许主体可读
- restricted：仅allowlist主体可见
- deleted：直接读取404，所有分支不可见
- restored：仅更高revision显式恢复

## 业务规则

- 覆盖层是controlled_experiment不冒充生产SSO
- event_id同内容幂等，不同内容409；旧revision409
- 撤权/删除同时约束语料列表、检索、直接读取和重排输入
- 安全覆盖层独立generation，回滚不撤销删除
- 写接口只localhost、JSON及同源检查

## 真实验收

- K05：按 docs/project-brief.md K05 和 docs/api-contract.md 实际执行，检查 隔离受控覆盖层在搜索与直接读取一致执行；证据：隔离测试数据标记、事件日志、拒绝/过滤结果、回归。
- K06：按 docs/project-brief.md K06 和 docs/api-contract.md 实际执行，检查 隔离受控覆盖层在搜索与直接读取一致执行；证据：实际进程停启记录、前后 SQL/哈希、幂等与并发检查。
- K07：按 docs/project-brief.md K07 和 docs/api-contract.md 实际执行，检查 隔离受控覆盖层在搜索与直接读取一致执行；证据：generation 记录、采用/回滚回执、同题对照。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
