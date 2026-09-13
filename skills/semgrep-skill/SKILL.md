---
name: semgrep-skill
description: "Runs offline Semgrep static-analysis and secret-pattern scans with bundled local rules. Use for local security scanning, vulnerability pattern checks, or leaked-secret checks. Never downloads rules, uploads code, installs packages, or modifies findings automatically."
version: "1.0.0"
context: fork
---

# Local Semgrep security scan

Use the bundled `rules/local-security.yml` file to scan source code locally. The
default workflow is read-only, offline, and does not apply fixes.

## Safety contract

- Treat the directory containing this `SKILL.md` as `<skill-dir>`.
- Scan only the target explicitly requested by the user. Default to the current
  project when no narrower target was requested.
- Use only `<skill-dir>/rules/local-security.yml` by default.
- Pass `--metrics off` and `--disable-version-check`.
- Do not use `--config auto`, `p/*`, registry URLs, remote URLs, Semgrep Cloud,
  login, CI upload, or any other network-backed rules or service.
- Do not use `--autofix`, edit source files, install packages, or write a report
  file unless the user separately authorizes that action.
- Do not print matched secret values. Report the rule, path, line, severity, and
  a redacted explanation.

## Runtime check

Check for an existing Semgrep executable:

```bash
semgrep --version
```

If it is unavailable or cannot start, stop and report the exact failure. You may
suggest a platform-appropriate installation command, but must not execute `pip`,
`pipx`, `brew`, a package manager, or a downloaded installer without explicit
human approval.

## Default local scan

Resolve `<skill-dir>` to the installed Skill directory, then run:

```bash
semgrep scan --config "<skill-dir>/rules/local-security.yml" --metrics off --disable-version-check --json "<target>"
```

The bundled rules currently detect a small, explicit baseline:

- credential-like literals assigned to common secret names;
- Python `subprocess` calls using `shell=True`;
- JavaScript/TypeScript `eval(...)` calls.

This is not a comprehensive security audit. A clean result means only that these
local rules found no matches.

## Reporting

Return:

1. Semgrep version and the exact local rules path.
2. Scanned target and whether the command completed successfully.
3. Findings grouped by severity, with file and line but no secret values.
4. False-positive caveats and manual remediation suggestions.
5. Explicit confirmation that no code was uploaded, no remote rules were used,
   and no source files were modified.

Suggested fixes are advisory text only. Any source-code change is a separate
task requiring the user's authorization.

## Installing this Skill

The repository includes `install.ps1`, `install.sh`, and
`scripts/install.py`. Installation is dry-run by default, requires an explicit
`project` or `user` scope, and requires `--apply` to write. Those installers copy
this Skill and its bundled rules only; they never install Semgrep.

The former frontmatter name and install directory, `code-security`, are legacy
identifiers. New installations use `semgrep-skill`. Existing legacy directories
are not overwritten or removed automatically.
