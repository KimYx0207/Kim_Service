# find-skill (Windows Compatible Fork)

[English](./README.md) | [中文](./README_CN.md)

> 🔗 **Current package**: [KimYx0207/Kim_Service · skills/find-skill](https://github.com/KimYx0207/Kim_Service/tree/main/skills/find-skill)

---

## Quick Links

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/Kim_Service?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

</div>

---

## About

A Windows-compatible fork of [vercel-labs/skills find-skills](https://github.com/vercel-labs/skills) that fixes the empty output issue in Claude Code on Windows.

## The Problem

On Windows, Claude Code uses a Bash/Git Bash environment that doesn't properly handle `npx skills` commands - they return empty output silently.

```bash
# ❌ Returns nothing on Windows in Claude Code
npx skills find "react"
```

## The Solution

This fork modifies the SKILL.md to instruct Claude Code to use PowerShell for running skills commands:

```bash
# ✅ Works on Windows
powershell -Command "npx skills find 'react'"
```

## Installation

### Direct install from Kim Service (recommended)

```bash
powershell -Command "npx skills add KimYx0207/Kim_Service@find-skill -a codex"
```

This example installs into the current project for Codex. Replace `codex` with the exact approved agent when needed. A user-level install requires separate approval and adds `-g`; do not add `-y`.

Kim Service is the maintained publication source for this package. The former standalone repository is retained only as provenance for the imported snapshot.

### Manual install

```bash
git clone --depth 1 https://github.com/KimYx0207/Kim_Service.git
New-Item -ItemType Directory -Path "$env:USERPROFILE\.agents\skills\find-skill" -Force
Copy-Item "Kim_Service\skills\find-skill\SKILL.md" "$env:USERPROFILE\.agents\skills\find-skill\SKILL.md" -Force
```

### Restart Claude Code

Close and reopen Claude Code.

### Verify

Say to Claude Code: "find a skill for data analysis"

If you see search results, installation is successful.

## Usage Examples

After installation, ask Claude Code:

- "帮我搜索一个 react 的 skill" → triggers Windows-compatible search
- "find a skill for code review"
- "搜索 skill data analysis"

## File Structure

```
findskill/
├── SKILL.md            # Merged skill (all-in-one, Windows compatible)
├── README.md           # English documentation (this file)
├── README_CN.md        # Chinese documentation
└── LICENSE             # MIT License
```

## Key Features

1. **Windows Compatibility** - Uses PowerShell instead of Bash for all commands
2. **Bilingual Support** - Instructions in both English and Chinese
3. **Chinese Keyword Reference** - Built-in translation table for search queries
4. **Troubleshooting Section** - Common issues and solutions

## Known Limitations

1. **Search only supports English keywords** - Chinese queries need to be translated by AI
2. **Trigger is semantic** - AI may or may not trigger `find-skill` depending on how you phrase it. Adding "skill" to your request makes it more reliable.
3. **Windows optimized** - macOS/Linux users should use the original version

## Credits

- Original skill: [vercel-labs/skills](https://github.com/vercel-labs/skills)
- Legacy source snapshot: [KimYx0207/findskill](https://github.com/KimYx0207/findskill) (provenance only)
- Windows fix & enhancements: [@KimYx0207](https://github.com/KimYx0207)

## License

MIT (same as original)
