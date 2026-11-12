# Kim Service

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README_EN.md">English</a>
</p>

**Give your AI the methods for a professional task. Get results you can open, change, and check.**

You may know what you want without knowing which numbers a forecast must reconcile, which states a page needs, or how to compare the full cost of supplier quotes. Kim Service brings the methods, materials, steps, examples, and acceptance criteria together, giving you and your AI a concrete basis for the work.

**V1.13** includes **48 specialist Agents, 21 Skills, 1 Hook, and 1 Tool**: 71 components with **86 searchable task capabilities**. Choose one for the job in front of you, or combine several methods within a project.

**[Open the online task browser](https://kimyx0207.github.io/Kim_Service/?lang=en)** · **[Download V1.13 source and packages](https://github.com/KimYx0207/Kim_Service/releases/tag/V1.13)**

## How it helps you do the work thoroughly

Professional work often gets stuck between the request and the result: inconsistent source data, a conclusion without evidence, a form that only handles valid input, or files that someone else cannot open. Kim Service puts these easily missed steps into each method package, taking the work from checking materials to checking the handoff.

Financial modeling starts with periods, currency, and units, then connects sales volume, prices, costs, and collections to profit and cash. Design-system work organizes colors and typography into reusable design values while addressing focus, errors, loading, long text, and theme changes. Each package also explains when a result needs rework, what evidence to inspect, and which useful parts can proceed when some materials are missing.

### What the four kinds of component do

- **Agents handle a complete professional task.** Each of the 48 roles has a defined scope, inputs and outputs, reference material, decision steps, positive and negative examples, and quality checks. Financial modeling receives business data; design-system work receives screens, brand choices, and interaction requirements. Their methods lead to different, concrete deliverables.
- **Skills support a particular step.** The 21 reusable skills cover requirements tracing, API contracts, database migration, accessibility, financial scenarios, experiments, retrieval evaluation, and learning assessment. They also include workflows for teamwork, memory, skill discovery, Xiaohongshu, and sticker production. Select the ones the current job needs.
- **The Hook helps clarify the request.** In a supported, configured client, HookPrompt adds context about the goal, scope, output, and checks to substantive task prompts. It preserves decisions already made in the conversation so the AI can continue in the intended direction.
- **The Tool connects execution capabilities.** The multi-CLI package can expose locally installed Codex and Gemini through MCP to a compatible client for coding or review, with project-level workflow entries. The current client still controls the working directory and permitted file operations.

Together, the specialist Agent supplies the professional method, Skills support particular steps, the Hook helps express the request, and tools perform the operations. Load the parts relevant to the task. Instructions, references, examples, and check scripts stay with the source, so a result can be traced to the materials and checks behind it.

<p align="center">
  <img src="docs/images/animated-service-capabilities.en.svg" alt="Animated capability map: a cash-forecast goal leads to a financial-modeling Agent, relevant Skills, optional Hook and Tool configuration, and a request containing the goal, materials, method, and checks" width="900">
</p>

**Start with the deliverable, then choose the combination this task needs.** For one operating forecast, ask the AI to read the financial-modeling method directly. Add the relevant Skill when you need more detailed stress scenarios. The Hook helps with recurring request preparation; the Tool connects available execution tools. Choose what to install and load based on the task and client. You can start with just the method you need.

<a id="capability-directory"></a>

## Work you can start here

**For a product, website, or application,** start with user research and the smallest useful scope, then move into interaction, brand and design systems, frontend and backend work, mobile apps, applied AI, or data pipelines. Existing products can use the same entry point for test automation, security review, and reliability improvements. Outputs include plans, interfaces, code, screens, and check records that another person can continue from.

**For a store, sales operation, or new business,** bring SKU sales, customer questions, supplier quotes, stock, and cost data. Establish a comparable basis, explain changes, then prepare product copy, customer replies, purchasing comparisons, replenishment plans, sales forecasts, or pricing calculations. A supplier comparison, for example, accounts for minimum quantities, landed costs, and delivery evidence, and shows how missing terms affect the choice.

**For business finance and investment research,** reconcile records, explain budget differences, forecast cash, model project value and stress scenarios, organize research, or examine assumptions in a quantitative backtest. Deliverables include calculations tied to inputs, scenario comparisons, critical assumptions, and unresolved questions for the responsible decision-maker. The forecast below is a complete starting point.

**For content, marketing, and everyday collaboration,** move from an audience and topic into articles, narration, storyboards, headlines, covers, and media production, or turn scattered progress into emails, reports, and operating procedures. Career, hiring, and teaching tasks also have methods: role-specific resumes and interview practice, structured hiring criteria, lesson plans, explanations, exercises, and learning assessment all lead to defined, usable outputs.

**For physical operations and engineering projects,** work through manufacturing quality, system requirements and interfaces, construction information, energy projects, emissions accounting, field-water planning, or nonclinical healthcare service processes. The methods make scope, sources, units, exceptions, and on-site checks explicit, producing analysis, verification plans, or pilot proposals while retaining the items that need local evidence and professional judgment.

The 86 capabilities describe the available task entries. Start with the result you need, search for it in the browser, and check the required materials. You do not need to memorize role names.

<a id="task-browser"></a>

## From your first visit to a completed task

### Put the repository and materials within your AI's reach

Open the online browser and choose English or Chinese. It helps you select a task, describe the requirements, and assemble a request. File processing, calculations, and code changes happen in the AI client where you paste that request.

Download and extract the source from the link above, or run:

```sh
git clone https://github.com/KimYx0207/Kim_Service.git
cd Kim_Service
```

Open this folder in a client that can read project files, such as Codex, Claude Code, Cursor, or Gemini CLI. If your working project is elsewhere, tell the AI the full path to Kim_Service and give it access to the task materials too. In a chat interface that only accepts uploads, supply the chosen entry point, its referenced materials, and your task files.

You can open `docs/start.html` directly in a browser to select tasks offline. Both interactive examples also have local `index.html` files that open without setting up a server. Use the appropriate Node.js, Python, and client tools when the work calls for running calculation or development scripts.

### Example one: will growing profit leave enough cash next year?

Start with the synthetic data, then replace it with your own business inputs. This example connects task selection, materials, execution, delivery checks, and the next revision.

<p align="center">
  <img src="docs/images/animated-service-delivery.en.svg" alt="Animated forecast workflow: search, inspect materials and examples, choose a method, calculate in the AI client, open and verify files, then keep the result for the next revision; changed collection assumptions return to calculation" width="900">
</p>

**Step 1: turn a question into a task choice.** Start with “Profit appears to be growing next year. Will we have enough cash?” Search the task browser for “financial-modeler” and open financial modeling. The browser searches task descriptions, inputs, outputs, and existing aliases. Compare each card's required inputs and promised outputs to see whether it fits your question.

<p align="center">
  <img src="docs/images/task-browser.en.png?v=V1.13" alt="The actual first-step interface: search Kim Service by task, compare capability cards, and open financial-modeling details" width="900">
</p>

**Step 2: inspect the example and check your materials.** Task details list the required inputs, outputs, method entry point, and examples. For the first attempt, use `agents/financial-modeler/examples/operating-forecast/sample-data.js`. It declares sales volume, prices, costs, opening balances, collection assumptions, and equipment spending. Amounts are in CNY, and all data is synthetic. For your business, replace it with actual statements and assumptions, stating the periods, currency, and missing items. The materials field describes where files are; give the AI actual access to those files too.

**Step 3: choose the method and give the request to your AI.** Select your current AI client. Set the goal to “Compare base, upside, and downside scenarios for the next 12 months, identify cash-pressure months, and deliver editable inputs, a monthly table, and an explanation.” Add the material locations. The page assembles the entry point, inputs, and output requirements into an editable request. Review it, copy it, and paste it into the client where you opened the repository. Direct reading works for a single task. For repeated use, install the entry through DSH, ZCode, or the supported mechanism described below for your client.

<p align="center">
  <img src="docs/images/task-request.en.png?v=V1.13" alt="Prepared financial-modeling task in English, including the goal, synthetic sample materials, AI client, and editable request" width="900">
</p>

**Step 4: let the AI follow the method and run the calculations.** It now reads the materials, aligns the data, connects income and cash, and compares scenarios. You can append this to the complete request to make execution and outputs explicit:

```text
Read agents/financial-modeler/AGENT.md, its referenced method.json, and the materials needed for this task.
Use the synthetic data in agents/financial-modeler/examples/operating-forecast/sample-data.js for a 12-month operating forecast.
Check periods, currency, and units. Explain the difference between profit and cash, and compare base, upside, and downside scenarios.
Run the calculations available in this environment. Deliver editable inputs, result JSON, monthly CSV, and an explanation.
List the check results, where each file can be opened, and unfinished items. Record missing data as explicit assumptions.
```

**Step 5: open the result and check it yourself.** The interactive example below is supplied with the repository to demonstrate this kind of deliverable. Open it online, or open `agents/financial-modeler/examples/operating-forecast/index.html` locally. Change a price, sales volume, or collection assumption; inspect the scenarios and monthly cash curve; then download the inputs, result JSON, and monthly CSV.

<p align="center">
  <img src="docs/images/operating-forecast-example.en.png?v=V1.13" alt="12-month operating forecast in English, showing editable assumptions, three scenarios, and monthly cash balances" width="900">
</p>

**[Try the operating forecast](https://kimyx0207.github.io/Kim_Service/agents/financial-modeler/examples/operating-forecast/index.html?lang=en)**

For an actual delivery, first reconcile the inputs with the source materials. Spot-check one month's opening cash plus receipts minus payments against closing cash, including equipment spending and collection timing. Check which assumptions differ across scenarios. Open the JSON, CSV, and notes from the delivery folder so another person can use them. This example covers operating profit and cash; valuation or a complete three-statement model needs additional work for that task.

When a check fails, identify the affected step. Fix a path or format when a file cannot open; revisit inputs and formulas when cash does not reconcile; list the relevant assumptions when data is missing. Ask the AI to repair the affected result and repeat the same check. Work supported by sufficient evidence can continue.

**Step 6: retain the result and continue the iteration.** Keep inputs, outputs, explanations, and check records in this project's delivery folder. Record agreed assumptions, unresolved items, and the next step. You can then say: “Keep the other assumptions. Change same-month collection from 65% to 45%, recalculate all three scenarios, explain which months change, and preserve the previous version.” The loop in the diagram represents this revision: change an input, return to calculation, and verify the affected results. Later work uses the same method and actual files.

### Example two: make a booking page consistent and ready for further development

Describe the task: “Unify this booking console's buttons, form, and list. Support light and dark themes and larger text, handle errors and recovery, preserve the existing fields, and pilot the changes on this page.”

Give the AI the current screen, brand colors, real copy, target devices, and technical constraints. For a first attempt, use the sample under `agents/design-system-designer/examples/service-console/`. Ask it to read the design-system role's `AGENT.md` and referenced methods, organize shared color, typography, and spacing rules, define component states, then implement and check them in this page.

<p align="center">
  <img src="docs/images/design-system-example.en.png?v=V1.13" alt="Editable booking design system in English, with theme and density controls, a booking form, and sample records" width="900">
</p>

**[Try the booking console](https://kimyx0207.github.io/Kim_Service/agents/design-system-designer/examples/service-console/index.html?lang=en)**

You can also open `agents/design-system-designer/examples/service-console/index.html` locally. Change the theme, brand color, text size, and density to see the page respond together. Leave a field empty, enter an invalid value, and try a simulated submission failure and recovery. The sample records are synthetic, so you can repeat the exercise.

The expected delivery is editable page source, exportable design values in JSON, descriptions of normal and error states, and a migration plan for the existing page. Walk through the form with the keyboard; check whether errors are clear, failed submissions retain input, and long text works at phone width. Also check language and theme switching. A later request can focus on “the compact layout feels cramped on a phone,” carrying forward the agreed rules.

### Continue when the request is only half written

Each task keeps its own draft. Resume after a refresh; before changing devices, download the draft and import it into the same task elsewhere. Form changes preserve a manually edited request. Choose “Regenerate from the form” when you want to rebuild it, with “Restore previous version” available afterward. If browser storage is unavailable or full, download the draft to preserve the current edit.

## Use it directly, or let Meta_Kim organize the project

**For one clear task, use Kim Service directly.** Edit a resume, compare quotes, or complete the forecast or design pilot above: choose a method, provide materials, let the current AI client work, and inspect the delivery. The specialist Agent, relevant Skills, and available tools support that task.

**For several connected tasks, combine it with Meta_Kim.** Turning the booking console into a product involves understanding users and scope, agreeing on a design, building frontend and backend behavior, testing the delivery, and continuing in later sessions. Meta_Kim organizes those steps, assigns work that can run in parallel, retains decisions and progress, and reviews handoffs. Kim Service supplies the professional methods and references for each step; the AI client performs the operations.

<p align="center">
  <img src="docs/images/animated-service-collaboration.en.svg" alt="Animated booking-product coordination: Meta drafts the system and module PRD, details each module, runs independent page and interface work in parallel, pauses only an interface affected by a new field, then joins and verifies the result" width="900">
</p>

**Follow one booking project through the diagram.** Two design passes develop the same PRD. The first defines modules such as booking, time slots, and records, along with their shared contracts. The second details each module's inputs, page states, interfaces, and acceptance checks. Meta discovers available methods during research and selects the combination during design: design-system and frontend methods for the page, backend and data methods for the interface. Execution then passes the selected methods and concrete work to the current client's execution capabilities.

Set shared dependencies first, then run independent work in parallel. If a new booking field needs clarification during implementation, the affected interface waits while styles and unrelated error messages continue. Once the field is defined, resume from completed work. Join the page and interface, complete an actual booking, inspect failure cases, and save the decisions, outputs, and next step. The diagram shows that split, local wait, and rejoin.

Service supplies readable professional methods, input guidance, and check criteria. Meta manages task order, method selection, and handoffs. The client performs actual tool calls and concurrent work. After a search match, the workflow still checks whether the method fits the scope, the inputs are accessible, and the needed tools are available before starting the relevant operations.

**First, tell Meta_Kim which Service source to use.** If Meta_Kim's installer has registered a managed Service source, it can use that installation. When you download the two repositories yourself, bind them explicitly; placing them beside each other does not connect them automatically. In the root of the project you actually work on, create or edit `.meta-kim/local.overrides.json`, keep existing fields, and add:

```json
{
  "dependencyRoots": {
    "kim-service": "/absolute/path/Kim_Service"
  }
}
```

Replace the value with your full Kim_Service path; `C:/work/Kim_Service` works as a Windows-style example. If `dependencyRoots` already exists, add only its `kim-service` entry without overwriting other settings.

Alternatively, set `META_KIM_KIM_SERVICE_ROOT` in the same terminal that launches your AI client: use `export META_KIM_KIM_SERVICE_ROOT="/absolute/path/Kim_Service"` on macOS/Linux, or `$env:META_KIM_KIM_SERVICE_ROOT="C:/work/Kim_Service"` in PowerShell. The environment variable takes precedence over project settings. Fix an invalid path directly; the resolver will not silently switch to another copy.

Then open the client in the project already configured for Meta_Kim, select **Meta_Kim** in the task browser, copy the request prefixed with `/meta-theory`, and identify the task materials. Ask it to confirm the discovered Service path and selected method before starting. Check how the parts connect: does the design meet the requirements, does the implementation follow the design, and do the tests cover the user journey? Installing a method package does not add browser, file, or external-system permissions that the client does not have.

Use [Meta_Kim](https://github.com/KimYx0207/Meta_Kim#readme) when you need that overall workflow. The complete methods and examples here also support a single independent task.

## Keep company work continuous across conversations and people

A company with one operator still needs a working record that a future colleague can continue. The host attaches the goal, sources, adopted version and decisions to one **Work**, a long-lived business matter. Many conversations and runs can refer to it; Service supplies the professional methods. The host's existing permissions determine access to company assets, personal preferences and sensitive decisions.

<p align="center">
  <img src="docs/images/animated-service-work-context.en.svg" alt="Animated company Work, delivery receipt, adoption and experience flow" width="900">
</p>

| Existing method | Concrete addition |
| --- | --- |
| [agent-teams-playbook](skills/agent-teams-playbook/) | Optional WorkContext connects assignments, sources and versions; handoffs include scope, adopted output, next action and receiving receipt |
| [sop-runbook](skills/sop-runbook/) | Separate production, verification, adoption and effect in existing runbook outputs; human choices name exact versions and reasons or unknown |
| [memory-3layer](skills/memory-3layer/) | Retain success, failure, rejection, applicability, expiry and actual reuse feedback as company-internal candidates for review |
| [delivery-verifier](agents/delivery-verifier/) | Optional work_handoff reads actual files and checks versions/hashes, Work/context/run, adoption observations and receiving consistency |

For example, this run creates course draft v2 and its technical checks pass, while the owner continues using the previously adopted v1. Both versions remain distinct in the handoff. The original valid decision remains referenced without asking the human to approve it again. A sent notice is not a receiving receipt; receiving is not business completion. Without effect evidence, keep unknown. Reasons for rejecting the new draft can also become experience candidates.

Run the complete synthetic local example from the repository root:

```sh
node agents/delivery-verifier/scripts/demo-work-handoff.mjs
```

It includes that valid case, failed/rejected/unknown observations, a stale-context receipt and substituted adoption version. It creates real temporary files and invokes the read-only verifier, demonstrating only the stated local consistency behavior. Real identities, adoption provenance, production hosts and business effects remain unverified. See the [delivery API](agents/delivery-verifier/docs/delivery-api.md) for the complete fields and boundaries.

Standalone tasks without WorkContext retain their existing entry points. Service adds no business database, scheduler, organizational permissions or approval system. Private company experience stays internal; public methods need deidentification, generalization and focused validation under existing publication authority. Automatic applicability retrieval, scheduled curation and outbound messaging depend on the host's actual capabilities.

## Connect the methods to your client

**Professional methods do not require one model vendor.** The task and host configuration determine the client, model and available tools separately. Claude Code, Codex, Gemini CLI, ZCode, MiniMax Code and other clients that can read the resources can use the same methods within their actual capabilities. The task browser reads its client list from `config/task-browser.json`; choose the existing-Agent option to keep your current environment.

| Item | Configuration and behavior |
| --- | --- |
| Task-browser client options | Generate request text; selecting a name does not launch a client, connect an account or switch a real model |
| Specialist execution and independent review | Use host tools and model settings; responsibilities are not fixed to a branded CLI, and retries depend on progress, evidence and the task budget |
| Team-method installation | Explicit `--target`, then `AGENT_TEAMS_INSTALL_TARGET`; with neither, show usage without writing a default Claude directory |
| Another client’s Skills directory | `--target custom --skills-dir /absolute/host/skills` installs a portable method package only; the host supplies the path and native loading needs verification in that client |
| Memory host and model provenance | `MEMORY_HOST` or payload `runtime / host / client` identifies the host; model is separate, and no host declaration remains `manual` |

For example, a Claude Code host with a MiniMax model label keeps both fields separately. A model name alone never determines the client. Self-reported model values remain unverified and do not prove a real model call. The host supplies account connections, model access and tool schemas. Optional multi-CLI tools pass parameters only through implemented adapters; omitting a model retains that CLI’s configuration.

### Project-based AI clients

With Codex, Claude Code, Cursor, Gemini CLI, and similar clients, open the repository or provide the selected package as described above. Identify the role, the relevant materials, and the output location so the work stays easy to review. Frequently used Skills can also be enabled through the client's supported skill installation mechanism, keeping their full resource directories.

HookPrompt and the multi-CLI tool are optional integrations. When you need them, ask the AI to read `hooks/hookprompt/README.md` or `tools/claudecode-codex-gemini/README.md`, configure the current client, and check actual loading. Your first professional task can use the direct repository-reading workflow above.

<a id="dsh"></a>

### DSH (DeepSeek Harness)

In DSH, specialist Agent methods and Skills are discovered as native Skills, retaining their complete methods, knowledge, examples, scripts, and licenses. The current adapter targets DSH **0.2.2-rc.1** and requires **Node.js 24.9.0+**. Prepare DSH's own model and tool configuration first. If the client is not installed, run:

```sh
npm install --global @deepseek-ai/dsh@0.2.2-rc.1
```

**Prepare the Service package.** Download `Kim_Service-DSH-V1.13.zip` from the release linked above, extract it, and identify the directory containing `dsh-package.json`. Alternatively, build it from the Kim_Service repository. Replace the output below with your own full path; the directory must not exist yet:

```sh
node scripts/build-dsh-package.mjs --output "/absolute/path/kim-service-dsh"
node scripts/build-dsh-package.mjs --output "/absolute/path/kim-service-dsh" --check
```

**Install into DSH and check it.** Meta_Kim's installer manages this integration. If you already have the Meta_Kim source, enter that folder; otherwise, download it first. This example installs at user scope for use across projects:

```sh
git clone https://github.com/KimYx0207/Meta_Kim.git
cd Meta_Kim
npm install
node bin/meta-kim.mjs dsh install --service-package "/absolute/path/kim-service-dsh"
node bin/meta-kim.mjs dsh check
dsh --profile meta-kim
```

In the DSH session, enter `/kim-service` to inspect the loaded directory, then choose an entry such as `/kim-financial-modeler`. Confirm that it can read the full method before providing the task materials. Long resources are read through their bundled part indexes; calculations execute the complete original scripts.

**For one project only,** prepare the Meta_Kim source, then run this project-scoped installation and check from its directory:

```sh
node bin/meta-kim.mjs dsh install --scope project --project-root "/absolute/path/my-project" --service-package "/absolute/path/kim-service-dsh"
node bin/meta-kim.mjs dsh check --scope project --project-root "/absolute/path/my-project"
```

Use the Git root if the project has a repository, or the project directory if it does not. Then change to that project directory and execute the startup command printed by the installer. Project mode uses `dsh --profile web --patch ...`, with the exact patch path supplied in that output. Pass the same `--scope project --project-root "/absolute/path/my-project"` to subsequent checks, updates, and removal. If you already use a custom DSH_HOME, pass the matching `--dsh-home` during installation and continue using that DSH_HOME.

**Update or remove.** Download a new package or build into a new directory, then run `node bin/meta-kim.mjs dsh update --service-package "/absolute/path/new-package"` from Meta_Kim, followed by `node bin/meta-kim.mjs dsh check`. To remove the integration, run `node bin/meta-kim.mjs dsh uninstall`. Updates and removal preserve and report user modifications for review. File integrity and actual host loading are checked separately.

<a id="zcode"></a>

### ZCode

Download **`Kim-ZCode-V1.13.zip`** from the release linked above and extract the whole package into a permanent location. Select the directory containing `marketplace.json` and keep all its plugin and resource folders. The V1.13 Kim plugin version is **1.13.0**.

Open a project in ZCode, then go to **Settings → Plugins → Create → Add marketplace** and choose that local directory. Install and enable `kim-service-local` from the personal source; add `meta-kim-local` if you also want Meta_Kim's task coordination. Inspect the installed roles and Skills in the plugin details, find a role such as `kim-service-local:financial-modeler` in the subagent list, and start with your goal and materials.

The CLI provides the same add, install, and list checks:

```sh
zcode plugins validate "/absolute/path/kim-zcode"
zcode plugins marketplace add "/absolute/path/kim-zcode" --scope user
zcode plugins install kim-service-local@kim-local-reviewed -s user
zcode plugins list --json
```

To add Meta_Kim, run `zcode plugins install meta-kim-local@kim-local-reviewed -s user`. Kim's complete role resources and Skills stay with the plugin. This content package supplies Agents and Skills; HookPrompt, MCP, and command bridges use their separately supported client integrations.

For an update, preserve personal changes and replace the original marketplace directory with the new published package. Refresh the source, check for updates among installed plugins, and verify the resulting versions. Disable or remove plugins from the same management interface, where you can inspect their location and loaded state.

## Application, data and presentation boundaries

<p align="center">
  <img src="docs/images/animated-service-layers.en.svg" alt="Component sources feed catalog data, application requests and the presentation layer before the chosen client executes" width="900">
</p>

**Component definitions are the method source; the page presents those facts.** Edit professional content, request behavior or client options at its responsible source, then rebuild the catalog and page.

| Layer and responsibility | Existing location | Purpose |
| --- | --- | --- |
| Method sources | Each component’s `capability.json`, `method.json`, references and `evals/` | Scope, inputs, outputs, procedures, examples and acceptance checks |
| Data | `src/data/capability-catalog.mjs`, `src/data/task-browser.mjs` | Read and validate catalog and task configuration |
| Application | `src/application/task-browser/model.mjs` | Search, filter and combine capabilities; build complete requests to copy |
| Presentation | `src/presentation/task-browser/` | Chinese and English UI, status feedback, request editing and copy interaction |
| Display and host options | `config/task-browser.json` | Own host labels, request prefixes, field names, search terms and page settings |
| Generated outputs | `catalog.json`, `generated/capabilities.json`, `docs/start.html` | Rebuild from sources instead of maintaining another list |

A new displayed client needs a configuration entry; a new native tool call needs an implemented and verified adapter. Method packages, optional local helpers and host permissions retain separate responsibilities. The business host owns Work master records, external messages and scheduled knowledge processing. `scripts/build-readme-animations.mjs` and localized copy generate the diagrams; `--check` verifies consistency, and reduced motion keeps complete steps and explanations readable.

## Update the source and continue your work

For a Git checkout, run this in Kim_Service:

```sh
git pull --ff-only
```

Reopen the online entry point or local `docs/start.html`. If you download ZIP files, extract the new version into a new directory, then bring across your materials and changes. Export unfinished drafts first if needed. When a package version changes, review the goal, inputs, and preserved request before regenerating it.

Methods and examples provide a working basis. For your own task, retain the actual outputs, calculation or operation records, completed checks, and remaining work so the next iteration starts from a clear point. The source directories `agents/`, `skills/`, `hooks/`, and `tools/` contain the four component types. Use the browser above to search the complete task collection without opening each directory.

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

## Open source

Repository-level content uses the [MIT License](LICENSE). Each package retains its own license and provenance; see its `LICENSE`, `PROVENANCE`, or equivalent source records.
