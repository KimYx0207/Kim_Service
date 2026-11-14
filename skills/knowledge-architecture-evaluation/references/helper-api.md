# 知识派生轨迹 API

Node.js 20+，无外部依赖。函数 `auditKnowledgeTrace(input)` 与 stdin CLI 接受显式快照，最大 1 MiB，每组最多 1024 行。不读取文件或服务，不删除任何对象。

```json
{
  "corpusVersion":"corpus-4", "policyVersion":"policy-7", "allowedSourceIds":["manual"],
  "nodes":[
    {"id":"manual","kind":"source","revision":"4","revoked":false},
    {"id":"wiki","kind":"wiki","revision":"3","inputs":[{"id":"manual","revision":"4"}]},
    {"id":"cache","kind":"cache","revision":"1","inputs":[{"id":"wiki","revision":"3"}],"policyVersion":"policy-7"}
  ],
  "exposedIds":["cache"], "citedIds":["manual"]
}
```

`source` 为原文，其余 `chunk/wiki/graph/summary/cache` 必须有依赖；每条依赖绑定所读节点的 revision。调用方须传本轮实际提供给模型/用户的所有 `exposedIds`，不只传最终引用；`allowedSourceIds` 来自当前真实身份授权。缓存额外绑定 `policyVersion`。

检查沿被暴露/引用节点的传递依赖，发现 revoked_source、unauthorized_source、stale_dependency、missing_lineage、unknown_node、lineage_cycle、stale_cache_policy 时返回 `rejected`。没有暴露材料返回 `unverified`；给定快照一致才是 `consistent_trace`。无关未暴露的已撤回资料不阻断其他查询。

输出 `sourceIds` 和逐项 `issues`，始终 `answerQualityVerified=false`、`humanReviewVerified=false`、`nativeRuntimeVerified=false`。完整轨迹、正确身份、现实版本、删除发生性和答案支撑度仍需实际系统回执与评审。把已删除原文从清单里抹去却留下派生内容，会产生未知依赖而失败；若调用方隐瞒整条依赖，helper 无法识破，因此必须独立回读实际存储与输入。
