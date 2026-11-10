# Local Capability And Multimodal Tooling

This reference is required whenever a candidate skill may output images, video, audio, slide previews, rendered documents, dashboards, browser artifacts, or any other non-text final artifact.

Do not design a multimodal skill from prompt taste alone. First identify the current host's available tools, MCP servers, local scripts, templates, and existing project assets. The skill must then choose the best available route and write structured prompts or briefs that match that route.

## Capability Inventory

Before writing the candidate `SKILL.md`, record:

- Host and surface: Codex, Claude Code, ChatGPT, desktop app, browser, CLI, or another host.
- Available native tools: image generation, image editing, browser, document, spreadsheet, presentation, PDF, or rendering tools exposed in the current session.
- Available MCP or plugin tools: for example image generation, moodboard, canvas insertion, browser control, local render widgets, deployment, or analytics widgets.
- Existing local scripts/assets/templates that already generate or validate the artifact.
- Cost or approval boundary: which tools require explicit user permission because they may incur cost, publish, deploy, or mutate external state.
- Output evidence route: file path, visible widget, screenshot, hosted URL, validator output, or native choice confirmation.
- Fallback order for creative raster image skills: Image2 / host-native image generation -> best MCP/plugin route -> local script/render route -> static structure preview. Exact data plots, editable documents/spreadsheets and native UI have their own primary tools; they do not enter this image fallback ladder.
- Downgrade proof: before using an image MCP, record that Image2 / host-native image generation is unavailable, failed, or was explicitly bypassed by the user.

If this inventory is missing, a multimodal candidate is `evidence-blocked`.

## Multimodal Brief Contract

Any visual, audio, video, slide, dashboard, or document-generation skill must include a structured brief before the final prompt. A one-paragraph style prompt is not enough.

Minimum fields:

- Task: what artifact is being generated.
- Audience and use moment.
- Native medium and aspect/format.
- Source materials and what must be real.
- Generated elements and what must not be simulated.
- Composition / layout / hierarchy.
- Text handling: exact text, size hierarchy, placement, legibility, and fallback if text rendering fails.
- Style references abstracted as principles, not copied.
- Tool route and model/tool constraints.
- Negative constraints.
- Acceptance test: what must be visible or measurable in the output.
- Fallback trigger and next route.

For image skills, include at least:

- Subject / scene.
- Camera / framing / perspective.
- Lighting / material / color.
- Main object occupancy and whitespace control.
- Typography or no-text rule.
- Platform-specific small-preview test when relevant.
- Batch consistency rules when more than one image is produced.

## Route Selection Rule

First classify the requested artifact and its accuracy/editability needs. Use plotting tools for exact quantitative figures, document/spreadsheet tools for editable files, and code/vector tools for native UI or precise diagrams. Preserve source data and semantics; these are primary routes, not failed image-generation fallbacks.

When the user expects a creative raster image:

1. For creative raster image output, use Image2 / host-native image generation first when the host exposes it and the user has permitted generation.
2. If Image2 / host-native generation is unavailable, fails, or the user explicitly bypasses it, record that proof before using the best available MCP/plugin generation route.
3. If generation fails only in text rendering, use a generated image layer plus editable text overlay, and mark it as fallback.
4. In this raster route, SVG/HTML/static structure previews are not a substitute for the requested image. Outside this route, vector diagrams, native UI and exact charts may be the correct final artifact from the outset.

Do not run fallback scripts after a native or MCP generation route has already produced the complete artifact, unless the user asks for an editable structure preview.

## Quality Failure Modes

Hard failures:

- The skill asks for images but never checks Image2 / host-native generation before MCP/plugin tools.
- The skill calls an image MCP without proving Image2 / host-native generation is unavailable, failed, or explicitly bypassed.
- The skill provides generic aesthetic adjectives instead of a structured multimodal brief.
- The skill claims image/video/document completion without file, widget, screenshot, or host-visible evidence.
- The skill uses a static SVG/card fallback as if it were a generated or user-real artifact.
- The skill copies a third-party prompt template instead of abstracting its reusable prompt fields.
- The skill batch-generates pages before the cover/first frame/key artifact passes the acceptance test when that first artifact controls the direction.

## Local Tool Discovery Prompt

Use this shape inside a run log or design board:

```text
Local capability inventory:
- Host:
- Native generation/editing tools available:
- MCP/plugin tools available:
- Existing local scripts/assets:
- Cost/approval boundary:
- Primary route:
- Fallback route:
- Image2 / host-native downgrade proof required before MCP:
- Evidence required before ready:
```
