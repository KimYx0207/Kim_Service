# Method research provenance

This component contains original, adapted method prose. Reference projects are research inputs, not dependencies, executable instructions, copied code or invocation evidence.

- [grilling](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/productivity/grilling/SKILL.md): dependent decisions, concrete recommended answers, evidence investigation and recomputing the next decision frontier. Adaptation keeps interaction and approval with the caller; ordinary reversible implementation does not require an interview.
- [domain-modeling](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/domain-modeling/SKILL.md): clarify overloaded terms and concrete counterexamples, reuse the glossary, and record consequential tradeoffs only when an ADR is useful.
- [to-spec](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-spec/SKILL.md) and [to-tickets](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-tickets/SKILL.md): synthesize settled choices without interviewing again, then propose narrow demonstrable slices with actual blocking dependencies. Issue publication and labels are not imported.
- Owner-provided `game-design-doc` version 2.0, `brainstorm-template.md` and `formal-design-template.md`, inspected 2026-10-23: connect user motivation to actions, feedback, rules and outcomes; separate exploration from settled design and identify required resources. No template text is copied. Fixed personas, game mechanics, removing all open questions, and prohibiting engineering parameters are not generalized.

The pinned upstream `mattpocock/skills` revision is MIT licensed. This component remains under its own included MIT LICENSE. Method research and contract tests do not prove model execution or successful user delivery.

## Knowledge assembly revision 0.3.0

Inspected 2026-11-10. The local knowledge asset is original method prose and synthetic examples, not a copy of these templates. Source identifiers below are used by method.json; their presence records provenance, not a claim that a worker fetched a URL in its current task.

| sourceRef | Source and revision | Adopted | Not adopted |
| --- | --- | --- | --- |
| domain-modeling | [Existing domain-modeling source](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/domain-modeling/SKILL.md) | Reuse established terms and expose conflicting examples | Renaming the user's domain or replacing settled decisions |
| spec-kit-plan | [GitHub spec-kit plan](https://github.com/github/spec-kit/blob/08252af8c5fb1c68135768fde2049d6578fa46c3/templates/plan-template.md) | Explicit technical context, versions and constrained architecture choices | A second constitution, fixed directory tree, branch authority or CLI installation |
| spec-kit-spec | [GitHub spec-kit specification](https://github.com/github/spec-kit/blob/08252af8c5fb1c68135768fde2049d6578fa46c3/templates/spec-template.md) | Observable user scenarios, edge cases and outcome criteria before task splitting | Invented targets or declaring every story independently deployable regardless of actual dependencies |
| spec-kit-tasks | [GitHub spec-kit tasks](https://github.com/github/spec-kit/blob/08252af8c5fb1c68135768fde2049d6578fa46c3/templates/tasks-template.md) | Concrete artifacts, user-result slices and explicit dependency reasons | Static parallel markers, universal foundations that block every task, optional tests regardless of risk, automatic commits or deployment |
| anthropic-skills | [Anthropic skill-creator](https://github.com/anthropics/skills/blob/2c5958ecac7cee2b583967a2c4981d0f4a75c579/skills/skill-creator/SKILL.md) | Bounded local reference loading; evaluate outputs with discriminating cases and preserve qualitative review | Unrequested paid/model runs, installing the upstream workflow, self-scored assertions as professional-quality proof |

Two software-design layers remain inside the caller's existing productDesign. The local helper checks structure and references only; source authentication, actual decisions, current digest, scheduling and acceptance remain with the caller. A valid candidate is neither an approved PRD nor a proven implementation.
