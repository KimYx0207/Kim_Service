<h1 align="center">Memory 3-Layer</h1>

<p align="center">Structured, inspectable memory for long-running agent work.</p>

Memory 3-Layer stores project knowledge in three lifecycle-aware layers under `.memory-3layer/`. Claude Code and Codex have automatic Hook adapters; other Agent Skills hosts use the same data core manually. The package does not claim universal Hook compatibility.

中文说明见 [README_CN.md](README_CN.md).

## What it solves

- **Layer 1 — structured facts:** JSON facts grouped by topic, with `active` / `superseded` lifecycle states.
- **Layer 2 — daily notes:** append-only Markdown for recent work and temporal context.
- **Layer 3 — tacit knowledge:** concise, human-confirmed lessons that should survive across sessions.
- **One neutral store:** both automatic adapters write to `.memory-3layer/`, not a vendor-specific data folder.
- **Bounded loading:** recent days and active fact counts are configurable, so history does not grow unbounded in context.
- **Explicit recording:** a user-confirmed fact goes through `scripts/record_memory.py`; ordinary tool output is never silently promoted into memory.

## Capability matrix

| Platform | Agent Skill | Automatic lifecycle | Required setup |
|---|---|---|---|
| Claude Code | Yes | `SessionStart`, `PostToolUse`, `PreCompact` adapter | Enable the merged project Hooks |
| Codex | Yes | Codex Hooks adapter to the same core | Run `/hooks`, review, and trust the project Hooks |
| Other Agent Skills hosts | Host-dependent | No | Use the manual core |

Automatic support means an adapter is provided. It is only runtime-verified after a real host event has been observed.

## Install from Kim Service

The current public package lives at [`Kim_Service/skills/memory-3layer`](https://github.com/KimYx0207/Kim_Service/tree/main/skills/memory-3layer). Clone the collection and enter that directory:

```bash
git clone https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service/skills/memory-3layer
```

Then run:

Windows:

```powershell
$ProjectDir = (Resolve-Path "..\your-project").Path
.\install.ps1 -ProjectDir $ProjectDir -Platform auto
```

macOS / Linux:

```bash
chmod +x install.sh
./install.sh --project-dir /path/to/your-project --platform auto
```

The target project is required: the installer never guesses that the Kim Service clone itself is your project. Available modes are `auto`, `claude`, `codex`, `both`, and `manual`. `auto` detects both supported hosts; if neither is present, it initializes only the manual core. Existing Hook configuration is merged, not replaced.

For Codex, installation is not the final step: run `/hooks`, inspect the commands and paths, and explicitly trust the project Hooks.

## Default data layout

```text
.memory-3layer/
├── MEMORY.md
├── memory/YYYY-MM-DD.md
├── areas/topics/<topic>/items.json
└── data/session_state.json
```

Set `MEMORY_DIR` to override the root. See [architecture](docs/architecture.md) for the data flow.

## Legacy migration

The old `.claude/memory/` path is read only as a migration source. New writes default to `.memory-3layer/`.

```bash
python scripts/migrate_legacy_memory.py --project-dir /path/to/your-project
```

Migration copies recognized data, skips conflicts, does not overwrite targets, and never deletes the legacy directory. See [migration rules](references/migration.md).

## Operating contract

Each workflow step declares its input, action, observable output, transition condition, and failure route. In short:

1. Resolve the project, host, data path, and write authority.
2. Initialize or explicitly migrate without overwriting user data.
3. Load Layer 3 → Layer 2 → Layer 1 under a budget.
4. Sanitize, classify, deduplicate, and persist only trusted facts.
5. Review conflicts before changing lifecycle status.
6. Report artifact, adapter, and runtime evidence separately.

The six explicit boundaries cover non-goals, fact sources, permissions, side effects, stop conditions, and fallback behavior. See [SKILL.md](SKILL.md) and the [operating contract](references/operating-contract.md).

## Verify

```bash
python scripts/check_memory_3layer.py
python -m unittest discover -s evals -p "test_*.py"
```

These commands prove package consistency and adapter behavior under tests. They do not replace a real Claude Code or trusted Codex Hook event.

To record one confirmed fact without relying on a host-specific prompt protocol:

```bash
python scripts/record_memory.py --project-dir /path/to/your-project --fact "This project uses pnpm." --topic workflow
```

## Documentation

- [Quick start](docs/quickstart.md)
- [Architecture](docs/architecture.md)
- [Platform support](docs/platform-support.md)
- [Runtime adapters and trust](references/runtime-adapters.md)
- [Legacy migration](references/migration.md)

## Source and provenance

Current release source: [`KimYx0207/Kim_Service/skills/memory-3layer`](https://github.com/KimYx0207/Kim_Service/tree/main/skills/memory-3layer).

The former [`KimYx0207/claude-memory-3layer`](https://github.com/KimYx0207/claude-memory-3layer) repository is retained only as historical provenance. It is not the current installation source or the basis for cross-platform capability claims.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Contact

<p align="center">
  <img src="docs/images/contact-qr.png" width="720" alt="Contact QR codes">
</p>

## Support

<table align="center">
  <tr>
    <th align="center">WeChat Pay</th>
    <th align="center">Alipay</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" width="260" alt="WeChat payment QR code"></td>
    <td align="center"><img src="docs/images/alipay.jpg" width="260" alt="Alipay payment QR code"></td>
  </tr>
</table>

Company Work: the [operating contract](references/operating-contract.md) extends existing governance proposals with exact versions, adoption reasons, negative evidence, applicability/expiry and actual reuse feedback. Company-private candidates remain internal; public methods require deidentification and validation. Storage, loaders and scheduling are unchanged.
