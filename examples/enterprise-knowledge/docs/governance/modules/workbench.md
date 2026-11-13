# 知识工作台与复现

任务 `T-workbench`；负责人：界面维护者；准则：K04, K09, K10。

展示真实进度、检索证据、失败与采用回滚；保留截图。

## 输入与依赖

固定brief/API；上游：retrieval, lifecycle, evaluation。范围：public/, README.md。

## 状态和异常恢复

- loading：请求进行中
- ready：API实数与来源
- blocked：模型/索引未就绪的可解释错误
- conflict：保留输入并重新读取

## 业务规则

- GET/api/project展示本项目工作记录，不叫原生MetaLive
- null/status不得替换静态成功数字
- 桌面/窄屏/键盘路径需真实浏览器验证
- 截图索引含实际路径/hash，不能模拟终端结果

## 真实验收

- K04：按 docs/project-brief.md K04 和 docs/api-contract.md 实际执行，检查 展示真实进度、检索证据、失败与采用回滚；保留截图；证据：API 回执、真实界面截图、引用读取测试。
- K09：按 docs/project-brief.md K09 和 docs/api-contract.md 实际执行，检查 展示真实进度、检索证据、失败与采用回滚；保留截图；证据：实际项目材料与 stage 工作记录；Meta 原生 gate 单独记录。
- K10：按 docs/project-brief.md K10 和 docs/api-contract.md 实际执行，检查 展示真实进度、检索证据、失败与采用回滚；保留截图；证据：README、依赖锁定、启动脚本、截图索引和文件 hash。

状态：设计内容已提供，执行/验证尚待实际回执；不是原生Meta阶段完成。
