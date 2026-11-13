# Method provenance

Inspected 2026-11-13. The helper, schemas, examples and tests are original Kim Service implementations. No upstream code is copied or executed.

| sourceRef | Primary source | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| chatwoot | [chatwoot](https://github.com/chatwoot/chatwoot/blob/develop/app/services/automation_rules/conditions_filter_service.rb) | 先校验条件再评估动作；公司范围、角色、对象和回执分别记录。 | 不复制实现，不引入企业 SLA 代码，不自动发消息，不创建后台调度或冒充授权服务。 | MIT community code; enterprise and premium features excluded |

This is a method-level reference, not a claim that the full upstream product was integrated.

## Retrieved file evidence

The following blob hashes identify the first-party source bytes inspected on the date above; they are file hashes, not commit IDs.

| File | Branch at inspection | Git blob SHA |
| --- | --- | --- |
| [app/services/automation_rules/action_service.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/services/automation_rules/action_service.rb) | develop | `a2c448b0a4df68f1d746893caeead9dd7f374a17` |
| [app/services/automation_rules/conditions_filter_service.rb](https://github.com/chatwoot/chatwoot/blob/develop/app/services/automation_rules/conditions_filter_service.rb) | develop | `1d193f8bca3ca454e571f8e4b4847abd19e5e3ba` |
| [spec/services/automation_rules/condition_validation_service_spec.rb](https://github.com/chatwoot/chatwoot/blob/develop/spec/services/automation_rules/condition_validation_service_spec.rb) | develop | `33eec6c6bf07e93fc1a38419895b144d12f4810e` |
