# 数据库渐进迁移工作方法

## 目标与四阶段执行框架（Expand → Backfill → Switch → Contract）

将有状态数据库变更拆解为可共存、可断点续跑、可核对且在不可逆点前随时可退回的步骤，杜绝在业务高峰期执行长表锁 DDL 或一次性破坏旧版应用读写。

1. **阶段 0：盘点与基线（Inventory & Baseline）**
   - 确认数据库引擎与精确大版本（如 PostgreSQL 15/16、MySQL 8.0）、表行数与磁盘体积、QPS/TPS 峰值、长事务/定时报表连接、主从复制延迟基线，以及全部读写该表的服务、异步 Worker、CDC 管道与 BI 抽取任务。
2. **阶段 1：兼容扩展（Expand）**
   - 仅执行向后兼容的结构新增（如新增可空列、新建影子表、并发建立索引），确保当前线上旧版本代码不改一行即可正常读写。
   - 部署**双写代码（Dual-Write）**：应用写入旧结构的同时同步或通过事务内触发器写入新结构，读路径仍以旧结构为准（或开启只记录差异不阻断业务的 Shadow Read 对账）。
3. **阶段 2：幂等分批回填（Backfill）**
   - 按主键或单调有序唯一键游标切分小批次（如每批 `1,000 ~ 5,000` 行），持久化 `last_processed_id` 检查点。
   - 更新语句必须附带保护条件（如 `WHERE target_col IS NULL` 或比较 `updated_at` 版本号），严禁用旧快照覆盖双写上线后产生的新写入。
4. **阶段 3：校验与切流（Verify & Switch）**
   - 执行存量与增量对账（行数、非空率、校验和/抽样字段逐行比对、双读零差异窗口），通过特性开关将读路径逐步切至新结构；确认稳定后再停止旧字段写入（保留旧字段兼容默认值以备快速回切）。
5. **阶段 4：安全收缩（Contract）**
   - 仅在确认所有旧版本实例、定时任务与下游消费者全部下线，且已过回滚观察窗口并完成有效备份核验后，才执行删除旧列/旧表或收紧破坏性约束，并显式标注**不可逆点（Point of No Return）**。

## 常见 DDL 锁风险与安全替代矩阵（以 PostgreSQL / MySQL 8.0 为例）

严禁笼统宣称“在线 DDL 零锁”——即使元数据变更只需毫秒级排他锁，只要前方存在慢查询占住读锁，后续所有读写都会在锁队列中雪崩阻塞：

| 变更目标 | 直接写法的高危风险 | 渐进安全写法与门禁参数 |
|---|---|---|
| 大表新增带默认值列 | 旧版本引擎或动态函数默认值可能触发全表重写与长时间排他锁 | 确认引擎支持元数据级常量默认值；总是显式设置 `lock_timeout`（如 `2s`）与 `statement_timeout`，锁获取失败立即快速放弃重试而非阻塞业务队列 |
| 大表新建索引 | 普通 `CREATE INDEX` 阻塞并发写操作直至建完 | PostgreSQL 用 `CREATE INDEX CONCURRENTLY`（不可置于显式事务块内，失败若留 `INVALID` 索引需先清理重建）；MySQL 核查 `ALGORITHM=INPLACE, LOCK=NONE` 支持性 |
| 新增 `NOT NULL` 约束 | 直接 `SET NOT NULL` 全表扫描期间持有强锁阻塞写入 | PostgreSQL 先加 `CHECK (col IS NOT NULL) NOT VALID`（仅锁极短元数据且校验新写入），低峰期跑 `VALIDATE CONSTRAINT`（仅需 `ShareUpdateExclusiveLock`），PostgreSQL 12+ 再安全转 `SET NOT NULL` |
| 新增外键约束 | 双表加锁并全表扫描校验引用完整性 | 先建索引，再 `ADD CONSTRAINT ... FOREIGN KEY ... NOT VALID` + 独立 `VALIDATE CONSTRAINT` |
| 列重命名或改小字段类型 | 旧实例 SQL 立即报错；窄化类型可能截断数据并重写全表 | 严禁原地 `RENAME COLUMN`；走“新增目标列 → 双写 → 回填校验 → 切读 → 下线旧列”完整四阶段 |

## 幂等分批回填与主从健康节流要点

```sql
-- 游标分批回填示意（避免 OFFSET 深翻页，保护新写入不被覆盖）
WITH batch AS (
  SELECT id, legacy_payload
  FROM orders
  WHERE id > :checkpoint_id AND id <= :upper_bound_id
    AND normalized_status IS NULL
  ORDER BY id ASC
  LIMIT 2000
)
UPDATE orders AS t
SET normalized_status = derive_status(b.legacy_payload)
FROM batch AS b
WHERE t.id = b.id
  AND t.normalized_status IS NULL;
```

- **节流与熔断条件**：每批提交后检查从库复制延迟（Replication Lag）、数据库 CPU/IOPS、连接池活跃数与锁等待数；超过阈值自动休眠退避或暂停在当前 `checkpoint_id`。
- **回填验收不等于脚本跑完**：必须给出验证 SQL（`COUNT(*) FILTER (WHERE normalized_status IS NULL)`、异常枚举分布、金额/数量汇总前后差值 = `0`）。

## 输入不全时的降级与推进规则

- **`change`（当前/目标 Schema 与不变量）**：若未提供数据库小版本，按保守锁模型输出双方案并标明版本分界线。
- **`traffic`（表规模、QPS、部署拓扑）**：缺真实行数与流量时，先提供可配置批大小与 `lock_timeout` 的标准分段脚本，要求在预发环境用生产量级样本实测单批耗时。
- **`recovery`（备份、RPO/RTO 与回滚预案）**：未确认物理/逻辑备份可恢复前，只推进到 Switch 观察阶段，将 Contract 删列动作列为待人工签字门禁。

## 参考规范与来源边界

- **PostgreSQL `ALTER TABLE` / `CREATE INDEX` 官方文档**：按具体子句核定锁级别（`AccessExclusiveLock` vs `ShareUpdateExclusiveLock`）、全表重写条件与 `NOT VALID` 两段式约束校验。
- **Apache Airflow 幂等分区任务实践**：按确定性边界读取并保证中断重跑收敛到一致状态。

出处与适用边界见 [PROVENANCE.md](../PROVENANCE.md)。本包迁移阶段表、锁对照矩阵与回填规范为原创整理。
