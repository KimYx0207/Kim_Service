---
name: semgrep-skill
description: "Runs the installed local Semgrep CLI through a bounded JSON wrapper with two bundled non-secret rules. Requires an explicit authorized workspaceRoot and target. No remote rules, uploads, installs, source excerpts or automatic fixes."
version: "1.1.0"
context: fork
---

# Local Semgrep security scan

Use only `<skill-dir>/scripts/scan.py`, where `<skill-dir>` contains this file.
The package `capability.json` defines the input, result and optional invocation.
Read it after the caller verifies the discovered package hash. The generated
index selects the package; it does not contain or grant the invocation.

## Safety contract

- Require the user's explicit authorized absolute local `workspaceRoot` and a
  directory `target` inside it. Never default to the current project or drive.
- The wrapper accepts only `rules/local-security.yml`, extracts just
  `python-subprocess-shell-true` and `javascript-eval` into temporary configuration
  before scanning, and records both hashes. The bundled legacy secret-pattern
  rule is not executed by this route; credential checks are outside this capability.
- It executes an already-installed trusted host CLI with an argv array and
  `shell:false`. Never execute files from the scan target as programs.
- Both the version probe and scan use `--metrics off`, `--disable-version-check`,
  isolated settings/log/cache paths, and a minimal subprocess environment.
  Caller tokens, proxies and custom Semgrep configuration are not inherited.
  Windows APPDATA and a computed installed Python user-site path may be retained
  solely to locate the existing host runtime; caller PYTHONPATH is not inherited.
- Do not use `--config auto`, registry URLs, Semgrep Cloud, login or uploads.
- Do not use `--autofix`, write reports, install Semgrep or fetch rules. The
  installer installs the Skill projection only and requires separate write approval.
- stdout contains rule IDs, workspace-relative paths, spans, severity and bundled
  rule messages. Raw source, metavariables and raw CLI diagnostics are withheld.

## Invoke and interpret

From any working directory, pass one UTF-8 JSON object over stdin:

```json
{"schemaVersion":1,"workspaceRoot":"<authorized-absolute-local-root>","target":"<directory-within-root>"}
```

```bash
python "<skill-dir>/scripts/scan.py" --input-json -
```

Equivalent named arguments are `--workspace-root <absolute-root> --target
<directory>`, optionally `--rules rules/local-security.yml`. There are no extra
Semgrep flags, executable overrides or JSON-file paths. Do not separately run a
bare `semgrep --version`: the wrapper performs its own isolated runtime check.

Return the wrapper result, not a promise to scan later. `completed` means every
selected file was confirmed scanned, not that findings were empty or security
was certified. `completed` exits 0 even with findings. `partial`, `invalid_input`,
`unavailable` and `failed` exit 2 and keep `completed:false`. An unavailable tool
must stay unavailable; no installation is attempted. Missing files or errors
must never be labeled clean. Remediation remains advisory text.

## Coverage and trust boundary

Only visible `.py`, `.js`, `.jsx`, `.ts`, `.tsx` files are selected. Hidden
directories/files, node_modules, __pycache__, venv and vendor are excluded.
Links/reparse points are rejected. Narrow targets to at most 512 eligible files,
and do not select a target containing the host temporary directory.
each at most 1 MiB. Each subprocess has a 60-second limit; output is checked
while running against an 8 MiB limit per stream. These are safety bounds in
`scripts/scan.py`, not caller-adjustable business parameters.

`networkUsed:false` describes the enforced local configuration, metrics/version
opt-outs and environment isolation; it is not OS network isolation or a packet
capture certificate. `filesModified:false` means no source edits: temporary
configuration, settings and logs are outside the target and cleaned afterward.
Use a trusted host installation and stable filesystem; this is not a sandbox for
malicious binaries or concurrent path replacement. Findings cover two patterns
only; omitted file types and excluded directories were not audited.

## Installing this Skill

`install.ps1`, `install.sh` and `scripts/install.py` remain dry-run first, require
explicit project/user scope, and require `--apply` to write. They project this
file, `capability.json`, `scripts/scan.py` and the bundled rules with hash receipts
and rollback. They never install Semgrep or overwrite legacy code-security.
See README for preview/apply/rollback commands; do not treat scan permission as
permission to install or change source.
