[English](./README_EN.md) | [中文](./README.md)

# Semgrep Local Security Scan Skill

Component **1.1.0** wraps an already-installed trusted local Semgrep CLI. Require an explicitly authorized absolute workspaceRoot and a directory target within it. No default current-project scan.

## Invocation and result

Read package capability.json after existing discovery/hash verification. The generated index selects the package and does not copy invocation or grant execution permission.

```json
{"schemaVersion":1,"workspaceRoot":"/authorized/project","target":"src"}
```

Send this object via stdin to the sole entry:

```bash
python "<skill-dir>/scripts/scan.py" --input-json -
```

Equivalent named arguments: --workspace-root <absolute-root> --target <directory>; optional rules is fixed to rules/local-security.yml. No Semgrep passthrough flags or executable override.

The wrapper extracts two non-secret rules before scanning: Python subprocess shell=True and JavaScript/TypeScript eval. It reports original/effective hashes. The legacy credential rule remains as provenance and is not executed by this capability. Results contain local rule messages, IDs, relative paths and spans; no source, metavariables or raw stderr.

completed means every selected file was confirmed scanned; findings still exit 0. partial, invalid_input, unavailable and failed exit 2 with completed:false. Unavailable stays unavailable; no automatic installation. A clean pattern result is not a security audit.

## Boundary

Only visible py/js/jsx/ts/tsx files are selected. Hidden entries and node_modules, __pycache__, venv and vendor are excluded. Links/reparse points are refused. Safety bounds are centralized in scan.py: 512 eligible files, 1 MiB each, 60 seconds per invocation and 8 MiB per output stream checked while running.

Both runtime probe and scan disable metrics/version checks, isolate settings/log/cache files and use a minimal environment. Caller tokens, proxies, PYTHONPATH and custom Semgrep configuration are not inherited. Windows APPDATA and a computed installed Python user-site may locate the trusted runtime. networkUsed:false reflects these execution controls, not OS network isolation or packet capture. filesModified:false refers to source files; ephemeral runtime files are outside the target and cleaned. A trusted installation and stable filesystem are required; hostile binaries/concurrent path replacement are outside this wrapper's boundary.

Scan authorization, Skill installation, Semgrep installation and source remediation are separate actions. Remediation is advisory only.

## Safe installer

Scope is mandatory and all commands are dry-run unless `--apply` / `-Apply` is present:

```powershell
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project -Apply
.\install.ps1 -Scope User
.\install.ps1 -Scope User -Apply
.\install.ps1 -Scope Project -ProjectRoot C:\path\to\project -Rollback -Apply
```

```bash
./install.sh --scope project --project-root /path/to/project
./install.sh --scope project --project-root /path/to/project --apply
./install.sh --scope project --project-root /path/to/project --rollback --apply
```

The installer records actual SHA-256 file hashes and a target aggregate hash, retains a verified prior installation for rollback, restores the old installation on transaction failure, and refuses targets containing unknown, modified, linked, or unreceipted content.

## Rename compatibility

The catalog and component directory use `semgrep-skill`; frontmatter now uses the same name. `code-security` is a legacy identifier. The installer deliberately does not overwrite, move, or delete a legacy `code-security` directory. Install and validate `/semgrep-skill`, then decide separately whether to retain the legacy copy.

## Tests

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

The behavior test executes the actual wrapper and installed CLI on synthetic fixtures only; an unavailable CLI is explicitly skipped, never claimed tested. Protocol tests cover containment, environment isolation, secret-rule exclusion, incomplete scans and sanitized failures. Installer tests verify the projected contract/entry in addition to transaction rollback.

## Provenance and license

Originally imported from [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep). The maintained version is `skills/semgrep-skill/` in Kim Service. MIT License.
