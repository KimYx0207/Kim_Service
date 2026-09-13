---
name: find-skill
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. Also triggers when user mentions searching for tools, workflows, or wants to extend agent capabilities with specialized knowledge packages.
---

# find-skill

Helps users discover and install agent skills from the open skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## Safety and Authorization

- Discovery and installation are separate actions. A request to find, search for, or recommend a skill does not authorize installation.
- Search installed and repository-local skills first. Use external search only when local results are insufficient and network access is allowed.
- Before external search, reduce the request to 2-5 generic English keywords. Never send or quote private prompt text, secrets, repository or user names, absolute paths, filenames, internal URLs, or other local identifiers.
- A command error, timeout, blocked network request, unavailable CLI, or empty/unparseable output is a search failure, not evidence that a skill does not exist. Only say "no matching skill was found" after the relevant search completed successfully.
- Do not install by default. Project and user installation each require explicit approval of the exact skill, target agent, scope, and command. Never silently retry a failed project install as a user install, or vice versa.

## ⚠️ Windows Compatibility

**On Windows, you MUST use PowerShell to run skills commands!**

The default Bash/Git Bash environment on Windows does NOT work with `npx skills` - commands will return empty output.

**Always use this format on Windows:**
```bash
powershell -Command "npx skills find '[query]'"
# Project install (only after explicit project-scope approval)
powershell -Command "npx skills add [package] -a [agent]"
# User install (only after explicit user-scope approval)
powershell -Command "npx skills add [package] -g -a [agent]"
powershell -Command "npx skills list -g"
```

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands (Windows format):**

```bash
# Search for skills
powershell -Command "npx skills find '[query]'"

# Install a skill into the project (after explicit approval)
powershell -Command "npx skills add [package] -a [agent]"

# Install a skill for the user (after separate explicit approval)
powershell -Command "npx skills add [package] -g -a [agent]"

# List installed skills
powershell -Command "npx skills list -g"

# Check for updates
powershell -Command "npx skills check"

# Update all skills
powershell -Command "npx skills update"
```

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists
4. Whether an installed or repository-local skill already satisfies the request

### Step 2: Search for Skills

Check the host's registered skills and readable project skill directories first. If no sufficient local match is found and network access is allowed, derive 2-5 generic English keywords and run the find command. Keep the original prompt and all private paths or identifiers local.

**On Windows (REQUIRED):**
```bash
powershell -Command "npx skills find '[query]'"
```

**On macOS/Linux:**
```bash
npx skills find [query]
```

Example searches (Windows format):

| User asks... | Run this command... |
| ------------ | ------------------- |
| "how do I make my React app faster?" | `powershell -Command "npx skills find 'react performance'"` |
| "can you help me with PR reviews?" | `powershell -Command "npx skills find 'pr review'"` |
| "I need to create a changelog" | `powershell -Command "npx skills find 'changelog'"` |
| "数据分析" | `powershell -Command "npx skills find 'data analysis'"` |

> **Note:** Search only supports English keywords! See Chinese keyword reference below.

If the command fails, times out, is blocked, or returns output that cannot be parsed, report the search as unavailable or failed. Do not report that the skill does not exist.

### Step 3: Present Options to the User

When you find relevant skills, present them to the user with:

1. The skill name and what it does
2. Separately labeled project and user install commands they can review (Windows format!)
3. A link to learn more at skills.sh

Example response:

```
I found a skill that might help! The "vercel-react-best-practices" skill provides
React and Next.js performance optimization guidelines from Vercel Engineering.

Project install (review only; requires explicit project-scope approval):
powershell -Command "npx skills add vercel-labs/agent-skills@vercel-react-best-practices -a codex"

User install (review only; requires separate user-scope approval):
powershell -Command "npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -a codex"

Learn more: https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
```

### Step 4: Offer to Install

If the user wants to proceed, show the exact selected skill, target agent, scope, and command. Install only after the user explicitly approves that exact project or user scope.

**On Windows — project scope (REQUIRED):**
```bash
powershell -Command "npx skills add <owner/repo@skill> -a <agent>"
```

**On Windows — user scope (requires separate approval):**
```bash
powershell -Command "npx skills add <owner/repo@skill> -g -a <agent>"
```

**On macOS/Linux:** use the same `npx skills add` arguments in the current shell, always naming the approved target with `-a <agent>`; omit `-g` for project scope and include `-g` for user scope.

Do not add `-y`, `--yes`, `--all`, or any unapproved skill or agent. Verify the result in the approved scope. If installation fails, report the failure; never silently fall back to the other scope.

## Common Skill Categories

| Category        | Example Queries                          |
| --------------- | ---------------------------------------- |
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing         | testing, jest, playwright, e2e           |
| DevOps          | deploy, docker, kubernetes, ci-cd        |
| Documentation   | docs, readme, changelog, api-docs        |
| Code Quality    | review, lint, refactor, best-practices   |
| Design          | ui, ux, design-system, accessibility     |
| Productivity    | workflow, automation, git                |
| Data Analysis   | data analysis, pandas, jupyter           |

## Chinese to English Keyword Reference

**Important: Search only supports English keywords!**

| Chinese (中文) | English Keywords |
| ------------- | ---------------- |
| 数据分析 | data analysis |
| 做PPT | ppt, presentation |
| 写文章 | writing |
| 代码审查 | code review |
| 部署上线 | deploy, deployment |
| 写测试 | testing |
| 做视频 | video, remotion |
| 图片生成 | image generation, dalle |
| API文档 | api docs, openapi |

## Tips for Effective Searches

1. **Use specific keywords**: "react testing" is better than just "testing"
2. **Try alternative terms**: If "deploy" doesn't work, try "deployment" or "ci-cd"
3. **Check popular sources**: Many skills come from `vercel-labs/agent-skills` or `ComposioHQ/awesome-claude-skills`
4. **Use English keywords**: Chinese search will return empty results

## When No Skills Are Found

If the relevant local and external searches completed successfully and no relevant skills were found:

1. Acknowledge that no existing skill was found
2. Offer to help with the task directly using your general capabilities
3. Suggest the user could create their own skill with `npx skills init`

If a search source failed or was unavailable, state what could not be checked instead of claiming that no skill exists.

Example:

```
I searched for skills related to "xyz" but didn't find any matches.
I can still help you with this task directly! Would you like me to proceed?

If this is something you do often, you could create your own skill:
powershell -Command "npx skills init my-xyz-skill"
```

## Troubleshooting

### Q: Search returns empty on Windows?
A: Make sure you're using `powershell -Command "npx skills find '...'"` format, not direct `npx skills find`.

### Q: Chinese search returns nothing?
A: Search only supports English keywords. Translate your query to English first.

### Q: How to verify installation?
A: Run `powershell -Command "npx skills list"` for project scope or `powershell -Command "npx skills list -g"` for user scope.

### Q: How to update this skill?
A: After explicit approval for the intended scope, run `powershell -Command "npx skills update find-skill"` for project scope or add `-g` for user scope.

## Identifier Compatibility

The canonical identifier is `find-skill`, matching the Kim Service directory and catalog ID. Older imported snapshots used `find-skills`; callers and update commands using that legacy identifier must migrate to `find-skill`.

---

**Original skill by Vercel Labs:** https://github.com/vercel-labs/skills
**Windows fix and enhancements by:** https://github.com/KimYx0207/findskill
