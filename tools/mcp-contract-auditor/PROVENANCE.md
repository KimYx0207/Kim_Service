# Method provenance

Inspected 2026-11-13. Original Kim Service workflow, calculations and synthetic cases. Source retrieval establishes provenance, not a current task runtime call or industry certification.

| sourceRef | Primary source / version | Adopted | Not adopted | Rights |
| --- | --- | --- | --- | --- |
| mcp-tools | [MCP Tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools); [official SDK snapshot 919bb8e](https://github.com/modelcontextprotocol/typescript-sdk/tree/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c) | 比较工具身份、input/output schema 与行为注解；核对请求授权造成的可见集差异，区分分页完整性与同一授权视角；注解不是授权或可信执行证明。 | 不连接服务器、不运行tools/call、不复制SDK、不把本地差异检查当完整协议认证。 | Upstream transition: Apache-2.0 new code/spec, legacy MIT, docs CC-BY-4.0; no copied source |

Living references require rechecking when the real task depends on current rules. No upstream implementation or long passage is copied.
