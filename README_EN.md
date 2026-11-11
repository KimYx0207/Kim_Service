# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**Give an AI agent the method, working knowledge and delivery standard for the job.**

Kim Service is a professional capability library maintained by Lao Jin (KimYx0207). Each Agent and Skill addresses a concrete task with professional methods, source material, complete examples and output criteria. Ask your client to read a package directly, or use [Meta_Kim](https://github.com/KimYx0207/Meta_Kim) to discover and coordinate it.

**48 professional Agents and 21 Skills**, plus a Hook and a Tool. Current release: **[V1.11](https://github.com/KimYx0207/Kim_Service/releases/tag/V1.11)**.

## Find the job you want to do

| Field | Tasks and starting points |
| --- | --- |
| **Software development** | [Frontend](agents/frontend-engineer/), [Backend and data](agents/backend-data-engineer/), [Mobile apps](agents/mobile-app-engineer/), [Data pipelines](agents/data-pipeline-engineer/), [Test automation](agents/test-automation-engineer/), [Reliability](agents/reliability-engineer/) |
| **AI applications** | [Applied AI engineering](agents/applied-ai-engineer/), [Retrieval evaluation](skills/retrieval-evaluation/) |
| **Product and design** | [Architecture and PRDs](agents/product-architect/), [Interaction design](agents/interaction-designer/), [Design systems](agents/design-system-designer/), [Brand visuals](agents/brand-visual-designer/), [Accessibility](skills/accessibility-audit/) |
| **Finance and business** | [Financial modeling](agents/financial-modeler/), [Accounting reconciliation](agents/accounting-reconciliation-analyst/), [Investment research](agents/investment-research-analyst/), [Business finance](agents/business-finance-analyst/), [Pricing and costs](agents/pricing-cost-analyst/) |
| **Commerce and sales** | [Order operations](agents/commerce-operations-designer/), [Product listings](agents/product-listing-writer/), [Sales operations](agents/sales-operations-analyst/), [Store analysis](agents/store-performance-analyst/) |
| **Content and marketing** | [Topics](agents/topic-planner/), [Scripts](agents/script-writer/), [Headlines and covers](agents/headline-cover-optimizer/), [Media production](agents/media-production-engineer/) |
| **Education and people** | [Lesson planning](agents/lesson-planner/), [Learning assessment](skills/learning-assessment-design/), [Hiring](agents/hiring-process-designer/) |
| **Industry and energy** | [Manufacturing quality](agents/manufacturing-quality-analyst/), [Supply chains](agents/supply-chain-planner/), [Systems engineering](agents/systems-engineering-analyst/), [Energy projects](agents/energy-project-analyst/), [Sustainability](agents/sustainability-analyst/) |
| **More sectors** | [Healthcare operations](agents/healthcare-operations-analyst/), [Agronomy](agents/agronomy-planner/), [Construction information](skills/construction-information-review/), [Game playtests](skills/game-design-playtest/) |

Browse the [role directory](agents/README.md), [Chinese task browser](docs/start.html) or [capability index](generated/capabilities.json). After downloading the repository, `docs/start.html` works offline in a browser.

## What should the result look like?

| Job | A deliverable you can inspect |
| --- | --- |
| Build a registration product | System choices, module PRD, interaction states, API contracts and a demonstration path |
| Release an API | Requests and errors, authorization behavior, tests, rollout observations and rollback steps |
| Make a financial plan | Currency and period, reproducible formulas, scenarios and sensitivity analysis |
| Build a design system | Design tokens, component states, keyboard behavior and accessibility checks |
| Manage stock and orders | Inventory over time, shortage points, order exceptions and recovery actions |

Each package identifies inputs, steps, decisions and acceptance checks. Ordinary information gaps can produce a draft with stated assumptions. Missing facts that change money, permissions, publication or a professional conclusion are resolved before the affected action.

## Use in three steps

1. Choose a package and ask your AI client to read its `AGENT.md` or `SKILL.md`.
2. Supply your goal, current project or business material and the result you want.
3. Review the result against the package's delivery criteria. Meta_Kim passes the selected methods and material to the worker with the task.

For example:

> “Read `agents/financial-modeler/` and turn this sales, cost and collection data into a 12-month operating model. Show the assumptions, compare base/upside/downside scenarios and identify cash shortfalls.”

The source is the selected component directory in this repository. Codex, Claude Code, Cursor, Gemini CLI and ZCode paths and calls are handled by the client or Meta_Kim's adapter. Update the repository with `git pull --ff-only`, then update the package in your client.

### DSH — DeepSeek Harness

DSH needs Node.js 24.9.0+; the adapter is checked against `0.2.2-rc.1`. Build the native Skills, then install through Meta_Kim:

```sh
node scripts/build-dsh-package.mjs --output /path/to/kim-service-dsh
node /path/to/Meta_Kim/bin/meta-kim.mjs dsh install --service-package /path/to/kim-service-dsh
node /path/to/Meta_Kim/bin/meta-kim.mjs dsh check
dsh --profile meta-kim
```

Replace `/path/to/Meta_Kim` with your Meta_Kim checkout; a globally installed CLI can use `meta-kim` directly. Choose an output directory that does not yet exist. See the [DSH guide](docs/dsh.md) for updates and project installation, or the [ZCode package guide](docs/zcode-beta.md).

## Work with Meta_Kim

<p align="center">
  <img src="docs/images/intent-to-delivery.svg" alt="Meta_Kim coordinates the whole job while Kim Service supplies specialist methods and material" width="760">
</p>

**Meta_Kim owns research, decisions, coordination and continuity; Kim Service provides professional methods.** Establish the system approach, detail the modules, then load the relevant material for each worker and follow the actual dependencies.

## Inside a professional package

| Content | Purpose |
| --- | --- |
| `AGENT.md` / `SKILL.md` | Entry point, intended tasks and working method |
| `capability.json` / `method.json` | Inputs, outputs, procedure and individual output checks |
| `references/` | Professional knowledge and sources, loaded when needed |
| Worked examples and failure cases | Show acceptable results and problems to correct |
| `scripts/` / `tests/` | Calculations, validation or reproducible component checks |
| `PROVENANCE.md` / `LICENSE` | Attribution and licensing |

Checks cover file contracts, deterministic helpers, installation/loading and actual task performance separately. Examples explain the standard; current deliverables establish practical quality. See the [industry coverage and sources](docs/research/industry-coverage-2026-11-11.md) and [verification record](docs/verification/dsh-professional-quality-2026-11-11.md).

## Maintain and contribute

After editing components, regenerate the directory and run the checks:

```bash
node scripts/catalog-automation.mjs build
node scripts/start-page.mjs build
node scripts/check-repository.mjs
node --test scripts/*.test.mjs
```

[Agents](agents/) · [Skills](skills/) · [Hooks](hooks/) · [Tools](tools/) · [Package contract](docs/agent-pack-contract.md) · [Authoring guide](docs/expert-package-authoring.md) · [Changelog](CHANGELOG.md)

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
