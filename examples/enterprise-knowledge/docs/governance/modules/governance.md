# 治理记录与公开证据

任务 T-governance；准则 K09、K10。输入为总体和模块 PRD；输出是可复现步骤、实际 CI 证据和来源边界。

## 责任

公开 stage-facts 标记 prepared，表示方案存在，绝不是执行成功。CI 产生的状态、报告和截图是单独的 ci_observation。缺少原生 transcript 或原生 gate 时，native_meta.verified 保持 false。

## 验收

七份模块 PRD 共享 K01—K10。每次运行保存源码、输入、模型和配置指纹；截图保存 URL、页面标题、图像 SHA 与对应真实数据。失败不得改名成通过。用户接受与企业上线不由 CI 代替。
