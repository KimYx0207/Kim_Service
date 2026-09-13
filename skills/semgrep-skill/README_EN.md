[English](./README_EN.md) | [中文](./README.md)

# Semgrep Local Security Scan Skill

This Claude Code Skill runs static-analysis and secret-pattern checks with rules bundled in the component. Its default behavior is read-only and offline: it does not upload code, fetch remote rules, or apply fixes.

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/KimYx0207/Kim_Service)
[![Version](https://img.shields.io/badge/Claude_Code-2.1.39-green.svg)](https://github.com/KimYx0207/Kim_Service)

## Boundary

The current local baseline detects only:

- credential-like literals assigned to common secret names;
- Python `subprocess(..., shell=True)`;
- JavaScript / TypeScript `eval(...)`.

A clean result is not a comprehensive security audit. The default workflow does not use `--config auto`, `p/*`, the Semgrep Registry, Semgrep Cloud, login, uploads, or rule downloads.

Semgrep must already be installed by the user. The component installer installs the Skill projection only and never invokes `pip` or another package manager.

## Usage

Ask Claude Code to run `semgrep-skill` locally. The Skill resolves its own installation directory and executes:

```bash
semgrep scan --config "<skill-dir>/rules/local-security.yml" --metrics off --disable-version-check --json "<target>"
```

Reports contain rule, path, line, severity, and redacted context. Remediation is advisory text only; changing source code is a separately authorized task.

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

The behavior test executes the bundled rules when Semgrep is available. Installer tests cover dry-run behavior, actual-hash receipts, unknown-content refusal, upgrade rollback, and receipt-write transaction rollback.

## Provenance and license

Originally imported from [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep). The maintained version is `skills/semgrep-skill/` in Kim Service. MIT License.
