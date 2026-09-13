# Provenance and migration record

Upstream repository: `KimYx0207/Claudecode-Codex-Gemini`

Pinned upstream commit: `fce3202fc48d98173d8756f8002809cefb28fca5`

Imported as: Kim Service component type `tool`

## Imported core

- All ten upstream Claude command documents: `kim-api`, `kim-code`, `kim-crud`, `kim-form`, `kim-help`, `kim-plan`, `kim-review`, `kim-setup`, `kim-team`, and `kim-ui2code`.
- The upstream `kim-orchestrator` Skill definition and its four prompt documents.
- The Codex and Gemini MCP bridge behavior, reimplemented locally behind a shared bounded runtime.
- Project-scoped installation behavior, implemented here as explicit plan/apply/rollback operations with receipts.

The imported command and prompt text remains upstream-derived. The MCP runtime, installer, tests, and local operational documentation are Kim Service adaptations needed to satisfy the V1 component contract and security boundary.

## Deliberately excluded

- `src/`, `tests/auth/`, and `examples/alternative-auth-impl/`: unrelated FastAPI/JWT example application code, not part of the multi-CLI bridge.
- Other example READMEs: tutorials, not executable Tool core.
- `.git`, caches, environments, logs, and CI metadata.
- Upstream `.claude/settings.json`: its `PreToolUse` hook automatically creates requested paths and files.
- Upstream `.mcp.json` and `mcp-config.json`: they embed unsafe defaults including a sample proxy, writable sandbox settings, and Gemini `--yolo`.
- Upstream MCP server implementations: they use `shell: true`, write context/log files under the user profile at startup, forward broad process environments, and accept insufficiently bounded input. Their user-visible MCP functions are retained through the hardened replacement.
- Upstream `orchestrate.sh`: it writes workflow artifacts and invokes CLIs immediately. The host Skill/prompts remain available, while installation and invocation are separated by explicit gates in this package.

No upstream Git history or nested repository is embedded in this component.

## License resolution

The pinned upstream commit contained conflicting MIT and CC BY-NC 4.0
statements. On 2026-08-09, the repository owner selected MIT as the single
authoritative license for this Kim Service component. See `LICENSE` for the
terms and `LICENSE-RESOLUTION.md` for the decision record. The historical
conflict remains documented here as provenance rather than being presented as
an unresolved publication blocker.
