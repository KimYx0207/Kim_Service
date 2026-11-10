# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**Give AI agents professional methods, working knowledge and clear delivery criteria.**

Kim Service is a professional capability library maintained by Lao Jin (KimYx0207). Each Agent, Skill, Hook or Tool addresses a specific task with an entry point, method, input/output contract, examples and validation. Use a package independently or let [Meta_Kim](https://github.com/KimYx0207/Meta_Kim) discover and bind it.

**Meta_Kim coordinates the whole job; Kim Service supplies the methods for each part.** A frontend package covers recovery after a failed action; an inventory package identifies when a shortage occurs; a cost package makes its calculations reproducible.

## Start with the job

> “I have an idea for a registration product. Compare system options first, then detail the user flow, failure states, frontend/backend contracts and acceptance. Preserve suitable technology already in the project.”

Open the [Chinese task browser](docs/start.html), find a capability and inspect its inputs and deliverable. After downloading the full repository, open `docs/start.html` directly for offline browsing; the GitHub file page shows source. Browsing does not install or run components.

| Job | Start here |
| --- | --- |
| Turn a rough idea into system choices and a module PRD | [Product Architect](agents/product-architect/) |
| Connect user motivation, interaction states and recovery | [Interaction Designer](agents/interaction-designer/) |
| Implement usable interfaces with the current frontend stack | [Frontend Engineer](agents/frontend-engineer/) |
| Design data, APIs, transactions, authorization and migration | [Backend and Data Engineer](agents/backend-data-engineer/) |
| Check actual deliverables and verification evidence | [Delivery Verifier](agents/delivery-verifier/) |
| Content, teaching, operations, analysis and other work | [Professional role directory](agents/README.md) |

## Inside a professional package

| File | Purpose |
| --- | --- |
| `AGENT.md` / `SKILL.md` / `README.md` | Entry point, applicability, procedure and boundaries |
| `capability.json` | Discoverable capability, inputs, outputs, permissions and side effects |
| `method.json` (all professional Agents and Skills) | Domain steps and tool needs; `expertise` binds diagnosis, decisions and existing input/output fields |
| `references/` when needed | Actual professional material, selected through `knowledgeAssets` with applicability and provenance |
| `example.json` / examples in `AGENT.md` | Complete package examples separated from real execution evidence |
| Agent `evals/professional-cases.json` | Authored positive and failure examples with review reasoning; not model results |
| Package `tests/` and `scripts/` | Validation or narrowly scoped deterministic helpers |
| `PROVENANCE.md` and `LICENSE` | Sources, adaptation limits and licensing |

Packages cover software, product, research, media, commerce, procurement, education and career work. This iteration adds business finance, sales operations, user research, data quality, application security, inventory, manufacturing quality, systems engineering, hiring, carbon accounting, healthcare operations and agricultural water analysis. Composable Skills cover experiments, metric definitions, SOPs, requirements traceability, construction information and game playtests. The [generated capability index](generated/capabilities.json) is the current inventory; each package states its actual scope.

Each package explains domain concepts, diagnosis, conditional choices, a complete deliverable and concrete rejection cases. Inventory must account for shortages before period-end; cost analysis must align periods; a security scan cannot establish overall safety. Existing useful methods and tools remain. [Research decisions](docs/research/professional-expansion-2026-11-11.md) document adopted principles and limitations.

Selected Agent resources reach the actual Meta_Kim worker context with complete-byte checks. Skill entries explicitly link their methods and resources. Every output check states its acceptance and rejection conditions, verification method, required evidence and blocking behavior. A critical failure cannot be averaged away, and a worker's self-report does not establish independent acceptance.

Authored examples remain `not_evaluated`. Structural validation checks contracts and files; actual professional effectiveness needs current task artifacts and review. See the [verification record](docs/verification/dsh-professional-quality-2026-11-11.md) for checks, independent task trials and untested scope.

## How it works with Meta_Kim

<p align="center">
  <img src="docs/images/intent-to-delivery.svg" alt="Meta_Kim and Kim Service responsibilities from intent to delivery" width="1000">
</p>

*Architecture illustration. Meta_Kim owns decisions, coordination and continuity; Kim Service supplies professional methods and capabilities.*

First establish the system and technology baseline, then detail modules, interfaces, state and acceptance. Both are views of one PRD. Modules map to real delivery tasks, while the caller decides concurrency from dependencies, resources and permissions. Kim Service does not introduce a separate scheduler, permission authority or final acceptance store.

## Use and update

1. Choose a package from the task browser or index and read its entry point and required material.
2. Supply the current goal, project facts, acceptance criteria and relevant upstream artifacts. For independent use, have your client read that component directory; Meta_Kim integration verifies and binds the source.
3. Let the host supply actual tools and authorized scope. Missing tools yield useful materials and explicit gaps, never invented writes, deployments or acceptance.

The installation source is the **selected directory in Kim_Service**. The catalog's `source` and `revision` describe historical provenance; they are not instructions to clone obsolete standalone repositories. Check the source and version of an existing capability before reusing or upgrading one entry.

Released baseline: [V1.10](https://github.com/KimYx0207/Kim_Service/releases/tag/V1.10). [Unreleased](CHANGELOG.md#unreleased) and component changelogs record these source changes and package versions; no new collection Release is implied.

**Codex, Claude Code, Cursor, Gemini CLI and ZCode paths, tools and Hooks belong to their hosts or the Meta_Kim adapter.** The ZCode content update path is in the [Beta guide](docs/zcode-beta.md).

### Use with DSh (DeepSeek Harness)

Build native Skills from this repository, then install through Meta_Kim:

```sh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh
meta-kim dsh install --service-package /path/to/kim-service-dsh
meta-kim dsh check
dsh --profile meta-kim
```

Choose an output directory that does not yet exist. DSh requires Node >=24.9.0; this adapter is reviewed against `0.2.2-rc.1`. Complete methods, resources, validation scripts and licenses remain included; long Markdown is read in lossless parts. Actual subagents inherit the current host preset and load professional roles as Skills. See [DSh usage](docs/dsh.md) for updates, project scope and boundaries. Native configuration, Skill loading, MCP connectivity and model task quality have separate evidence.

## Maintain and explore

[Agents](agents/) · [Skills](skills/) · [Hooks](hooks/) · [Tools](tools/) · [Catalog](catalog.json) · [Generated capability index](generated/capabilities.json)

After editing package sources, regenerate the existing catalog rather than maintaining a second manual inventory:

```bash
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
```

Further reading: [delivery guide](docs/task-agent-delivery.md) · [package contract](docs/agent-pack-contract.md) · [expert-material authoring guide](docs/expert-package-authoring.md) · [previous role audit](docs/expertise-coverage-2026-11-10.md) · [changelog](CHANGELOG.md).

## Contact and support

<p align="center">
  <img src="docs/images/contact-qr.png" alt="Contact Lao Jin" width="720">
</p>

<table align="center">
  <tr>
    <th align="center">WeChat Pay</th>
    <th align="center">Alipay</th>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/wechat-pay.jpg" alt="WeChat Pay QR code" width="260"></td>
    <td align="center"><img src="docs/images/alipay.jpg" alt="Alipay QR code" width="260"></td>
  </tr>
</table>

If these open-source projects help you, please consider starring, sharing, or buying Lao Jin a coffee.

## Open-source note

Repository-level content uses the [MIT License](LICENSE). Each package retains its own license and provenance; consult its `LICENSE`, `PROVENANCE` or equivalent source records.
