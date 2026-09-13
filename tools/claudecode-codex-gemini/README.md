# Claude Code - Codex - Gemini Tool

This is a Kim Service **Tool**, not an App, Hook, Agent, or standalone Skill. It supplies two local MCP CLI bridges plus optional Claude-host commands and a private orchestration Skill. Kim Service makes the component discoverable and verifiable; it does not become a Router, cross-component state machine, or final acceptance brain.

## Safe defaults

- MCP processes use argument arrays with `shell: false`.
- Codex defaults to `read-only`; Gemini is always launched with `--approval-mode plan` and never receives upstream `--yolo`.
- Codex receives only its OpenAI credential variable; Gemini receives only Gemini/Google credential variables. Cross-engine secrets are not forwarded.
- Codex `workspace-write`, Gemini without sandbox, and proxy forwarding each require an operator-set environment gate in addition to the MCP argument.
- Working directories must resolve inside `KIM_CCG_WORKSPACE_ROOT` (default: the server start directory).
- Frames, prompts, output, queue depth, and execution time are bounded.
- Child process environments use an allowlist. Proxy forwarding is off unless `KIM_CCG_FORWARD_PROXY=1`, and forwarded proxy URLs are validated.
- The servers do not create user-profile context directories, logs, or configuration files at startup.
- Host assets are dry-run planned by default; project writes require an explicit `apply` command and produce a hash receipt.

## Run the MCP servers

```powershell
node mcp/codex-server.mjs
node mcp/gemini-server.mjs
```

Set `KIM_CCG_WORKSPACE_ROOT` to an existing project root before starting a server when the host process starts elsewhere.

## Install Claude host assets

Plan only (default, no writes):

```powershell
node cli.mjs install --target D:\path\to\project
```

Apply after reviewing the plan:

```powershell
node cli.mjs install apply --target D:\path\to\project --confirm-project-write
```

A conflicting file is refused. Add `--replace` only after reviewing the conflict. Rollback requires the receipt ID and another explicit confirmation:

```powershell
node cli.mjs install rollback --target D:\path\to\project --receipt RECEIPT_ID --confirm-project-write
```

The installer never writes user-wide Claude configuration and never edits `.mcp.json`. Configure the MCP host separately after inspecting the absolute server paths.

Receipt checksums detect accidental corruption and are validated together with the current bundled-asset manifest. They are not signatures and do not authenticate a receipt against an attacker who can rewrite both the receipt and its checksum; rollback therefore also restricts targets and backups to fixed receipt-owned manifest paths.

## License and release status

This component is licensed under the [MIT License](LICENSE). The repository
owner's choice and the historical conflict in the pinned upstream commit are
recorded in [LICENSE-RESOLUTION.md](LICENSE-RESOLUTION.md).

Resolving the license does not by itself make the component release-ready.
Technical maturity, promotion evidence, finalized provenance, a clean release
commit, and the repository's human approval gates still apply.
