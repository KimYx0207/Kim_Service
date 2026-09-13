[English](./README_EN.md) | [中文](./README.md)

# Agent Teams Orchestration Playbook

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/KimYx0207/agent-teams-playbook?style=social)](https://github.com/KimYx0207/Kim_Service)
[![GitHub forks](https://img.shields.io/github/forks/KimYx0207/agent-teams-playbook?style=social)](https://github.com/KimYx0207/Kim_Service)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/KimYx0207/Kim_Service)
[![Version](https://img.shields.io/badge/version-4.8.0-green.svg)](https://github.com/KimYx0207/Kim_Service)
[![Runtime](https://img.shields.io/badge/runtimes-Claude%20Code%20%7C%20Codex-blue.svg)](https://github.com/KimYx0207/Kim_Service)

**A cross-runtime Skill for executable multi-agent orchestration on Claude Code and Codex**

</div>

---

## Overview

`agent-teams-playbook` is a cross-runtime Skill for generating executable multi-agent orchestration strategies with runtime-native contracts for Claude Code and Codex.

> **Core Concept**: "Swarm" is the generic industry term; Claude Code's official concept is **Agent Teams**. Each teammate is an independent Claude Code instance with its own context window. Agent Teams = "parallel external brains + summarized compression", **not** "single brain expansion".

The core philosophy is "adaptive decision-making" rather than "hardcoded configuration", designed for real-world uncertainty:

- Skill/tool availability changes
- Multi-session or multi-window context forks
- Quality, speed, and cost objective conflicts

## Trigger Methods

**Natural Language Triggers:**
- agent teams, agent swarm, multi-agent, agent collaboration, agent orchestration, parallel agents
- multi-agent collaboration, swarm orchestration, agent team

**Skill Command:**
- `/agent-teams-playbook [task description]`

## Installation

### Option 1: CLI Installation (Recommended)

```bash
git clone https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service/skills/agent-teams-playbook
chmod +x scripts/install.sh
./scripts/install.sh
```

### Option 2: Manual Installation

```bash
mkdir -p ~/.claude/skills/agent-teams-playbook
cp SKILL.md ~/.claude/skills/agent-teams-playbook/
cp README_EN.md ~/.claude/skills/agent-teams-playbook/README.md
```

### Verify Installation

```bash
# Use Skill command
/agent-teams-playbook my task description

# Or use natural language
Help me build an Agent team to complete this task...
```

## Core Design Principles

1. Goals first, then organization — clarify the task before assembling a team
2. Team size depends on task complexity, parallel Agents recommended <=5
3. Stop on a local capability match: reuse an existing Agent, Skill, Tool, Command, or MCP provider; search externally only for a proven gap; degrade only for a real host/permission/owner failure
4. Model assignment: use runtime model selection only when the active host supports it
5. Never assume external tools are available — verify before execution
6. Critical milestones must have quality gates and rollback points
7. Cost is a constraint, not a fixed commitment
8. Skill Discovery is purely dynamic — scan available Skills from system-reminder, never hardcode

## Required Skill Dependencies

| Skill | Purpose | Stage |
|-------|---------|-------|
| **planning-with-files** | Manus-style file planning: task_plan.md, findings.md, progress.md | Stage 0 when persistent planning is needed |
| **find-skills** | External reusable Skill discovery after local multi-provider search proves a gap | Stage 1 (gap only) |

## 5 Orchestration Scenarios

| # | Scenario | When to Use | Strategy |
|---|----------|------------|----------|
| 1 | Prompt Enhancement | Simple tasks, 1-2 steps | Optimize single agent prompt, no splitting |
| 2 | Direct Provider Reuse | Task solvable by one existing Agent / Skill / Tool | Bind the matched provider directly; no external search or team required |
| 3 | Plan + Review | Medium/complex tasks (**default**) | Plan → user confirms → parallel execution → review |
| 4 | Lead-Member | Clear team division needed | Leader coordinates, Members execute in parallel |
| 5 | Composite Orchestration | Complex tasks, no fixed pattern | Dynamically combine above scenarios |

## 6-Stage Workflow

```
Stage 0: Planning Setup → Stage 1: Task Analysis + Capability Discovery → Stage 2: Team Assembly → Stage 3: Parallel Execution → Stage 4: Quality Gate → Stage 5: Delivery
```

> **Note**: Stage 0 planning and Stage 1 local capability discovery precede team assembly. `find-skills` is conditional: run it only when local Agents, Skills, Tools, Commands, and MCP providers cannot cover the need. A successful native Agent dispatch after an uninstalled search result is not a fallback.

## Collaboration Modes

| Mode | Communication | Use Case | Claude Code | Codex |
|------|--------------|----------|-------------|-------|
| Subagent | One-way: child → coordinator | Parallel independent tasks | Current host `Agent` / `Task` | Top-level `spawn_agent(task_name, message, fork_turns)` |
| Agent Team | Bidirectional when a team bus exists | Complex collaborative tasks | `TeamCreate` + `Agent` / `Task(team_name)` only when exposed | Multiple concurrent top-level `spawn_agent` calls + main-thread synthesis |

## Agent → Skill Delegation Patterns

| Pattern | Flow | Best For |
|---------|------|----------|
| Direct Call | Coordinator → `Skill` → result | Single-step Skill tasks |
| Delegated Call | Coordinator → `Task(prompt)` → subagent → `Skill` → report | Parallel Skills, long-running |
| Team Member Call | `TeamCreate` → assign → member → `Skill` → `SendMessage` | Complex coordinated tasks |

## Repository Structure

```text
agent-teams-playbook/
├── SKILL.md                               # Shared Claude Code / Codex package
├── README.md                              # Chinese documentation
├── README_EN.md                           # English documentation
├── scripts/install.sh                     # Standalone installer
├── tests/runtime-contracts.test.mjs       # Runtime contract regressions
├── CHANGELOG.md
├── NOTICE
└── LICENSE
```

## Compatibility

- **Claude Code**: use the host's current `Agent` / `Task` and `Skill` surfaces. Use `TeamCreate` / `SendMessage` only when the host exposes them. Never pass Codex-only fields.
- **Claude Code Agent input**: always provide the schema-required `prompt`; add `subagent_type`, `description`/`name`, and scope fields as accepted by the current host schema.
- **Codex**: use only the top-level `spawn_agent(task_name, message, fork_turns)` contract. Do not pass `agent_type` / `fork_context`, and do not fall back to a legacy namespaced spawn API.
- **OpenClaw / Cursor**: probe the current workspace/background-agent surface before claiming live parallel execution.

### Context Mode (Optional)

Default: no `context: fork`. The 6-stage workflow runs in the main session. Add `context: fork` to SKILL.md frontmatter for isolated execution.

## Non-Goals

This Skill will NOT:
- Force fixed team structures
- Force single Skill dependencies
- Promise fixed speed/cost multipliers
- Claim capabilities beyond Claude Code's actual limits

---

**Version**: V4.8.0 | **Last Updated**: 2026-07-10 | **Maintainer**: KimYx0207
