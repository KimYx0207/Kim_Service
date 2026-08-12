[English](./README_EN.md) | [中文](./README.md)

# Claude Code Security Scanning Skill

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/KimYx0207/Kim_Service)
[![Version](https://img.shields.io/badge/Claude_Code-2.1.39-green.svg)](https://github.com/KimYx0207/Kim_Service)

**Just say "scan for vulnerabilities" in Claude Code — powered by Semgrep**

</div>

---

## Overview

A [Semgrep](https://semgrep.dev/)-based code security scanning skill for Claude Code. After installation, trigger security scans with natural language — no commands to memorize.

## Features

- **Comprehensive Security Scanning**: Auto-detect OWASP Top 10 vulnerabilities
- **Secret Detection**: Find hardcoded API keys, passwords, and tokens
- **Multi-Language Support**: Python, JavaScript/TypeScript, Go, and dozens more
- **Structured Reports**: Categorized by High/Medium/Low severity with fix suggestions
- **Natural Language Triggers**: Say "security scan" or "scan for vulnerabilities"

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed

Python and Semgrep are auto-installed by the setup script.

## Installation

### Option 1: Clone + One-Click Install (Recommended)

```bash
git clone --depth 1 https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service/skills/semgrep-skill
```

> `skills/semgrep-skill/` in Kim Service is the maintained, self-contained publication package. The former standalone repository is retained only as provenance for the imported snapshot.

**Mac/Linux:**
```bash
bash install.sh
```

**Windows (PowerShell):**
```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

**Windows (Git Bash):**
```bash
bash install.sh
```

### Option 2: Manual Installation

**Mac/Linux:**
```bash
pip install semgrep
mkdir -p ~/.claude/skills/code-security
curl -fsSL https://raw.githubusercontent.com/KimYx0207/Kim_Service/main/skills/semgrep-skill/SKILL.md -o ~/.claude/skills/code-security/SKILL.md
```

**Windows (PowerShell):**
```powershell
pip install semgrep
New-Item -ItemType Directory -Path "$env:USERPROFILE\.claude\skills\code-security" -Force
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/KimYx0207/Kim_Service/main/skills/semgrep-skill/SKILL.md" -OutFile "$env:USERPROFILE\.claude\skills\code-security\SKILL.md"
```

No restart needed — Claude Code's **Hot Reloading** auto-loads the new Skill.

## Usage

### Natural Language

```
Scan this project for security issues
```
```
Check for leaked secrets
```
```
Run a security audit on the src directory
```

### Slash Command

```
/code-security
```

### Scan Modes

| Mode | Trigger | Ruleset |
|------|---------|---------|
| Full Scan | "security scan" | `--config auto` |
| OWASP Audit | "OWASP scan" | `p/security-audit` |
| Secret Detection | "scan for leaked keys" | `p/secrets` |
| Python | "scan Python code" | `p/python` + `p/bandit` |
| JS/TS | "check JS security" | `p/javascript` + `p/typescript` |
| Go | "Go security check" | `p/golang` |

## Report Example

```
Scan Summary
├── Tool: Semgrep v1.152.0
├── Ruleset: auto
├── Files Scanned: 127
└── Issues Found: 5

High (Must Fix)
├── src/auth.py:42  SQL injection — use parameterized queries
└── config/db.js:15 Hardcoded DB password — move to env vars

Medium (Should Fix)
├── utils/http.py:88  SSL cert not verified — enable verify=True
└── api/upload.js:23  No file size limit — add size restriction

Low
└── tests/mock.py:5  Weak password in test — test env only
```

## Semgrep vs Claude Code Security

| Dimension | Semgrep (This Skill) | Claude Code Security |
|-----------|---------------------|---------------------|
| Approach | Rule pattern matching | AI code understanding |
| Speed | Fast | Slower |
| False Positives | Medium | Low (multi-stage verification) |
| Detection | Known vulnerability patterns | Can find novel vulnerabilities |
| Price | Free & open source | Enterprise/Team only |
| Availability | Available now | Limited preview |

## Background

On Feb 20, 2026, Anthropic launched Claude Code Security, finding 500+ zero-day vulnerabilities during testing. CrowdStrike dropped 8%, Okta dropped 9.2%.

But Claude Code Security is currently Enterprise/Team only. This Skill is the free alternative — Semgrep-based security scanning integrated into Claude Code, triggered by natural language.

## License

MIT

## Provenance

This component was originally imported from [KimYx0207/SkillSemgrep](https://github.com/KimYx0207/SkillSemgrep). That repository is retained as provenance only; install the current snapshot from the [Kim Service component directory](https://github.com/KimYx0207/Kim_Service/tree/main/skills/semgrep-skill).
