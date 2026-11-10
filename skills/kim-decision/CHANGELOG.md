# Changelog

## 0.1.0 - 2026-11-11

- 为全部 1 项现有能力补充具体诊断、决策、逐字段验收、所需证据与不可抵消的阻断项。
- 保留成熟工作流与脚本，增加原创专业说明、完整交付示例、真实失败边界与一手来源记录；明确作者案例不是业务实测。
- 入口链接专业方法并准确说明原生/Meta 加载边界；不把结构、字段或篇幅当专业效果。
- 将14天、数据即强证据和机械模型数量改为预算、适用范围与反证驱动的判断。

## Kim Service V1.0 - 2026-07-15

- Imported `KimYx0207/Kim_Decision` revision `fbbe41cb6155ffd605c65b5af3f876ec25cfc0ea` as a self-contained Kim Service component.
- Future consolidated versions, tags, and Releases are published from the Kim Service repository.

### Added

- Added public project-info sections to the English and Chinese READMEs, including the GitHub repository, local development path, runtime targets, skill package paths, trigger names, license, and changelog entry.
- Added explicit changelog links near the contact/support sections so users can find release notes from the README.
- Added a core-problem gate so KIM locks the actual decision or artifact before expanding the frame.
- Added Fast / Standard / Regulated path scaling to keep simple decisions lightweight and reserve full evidence handling for higher-risk work.
- Added clarification and research boundaries for smallest blocking questions, current external facts, official-source preference, and explicit local-only skips.
- Added writeback suggestion guidance for reusable skill improvements.
- Added execution-plan references for KIM/老金 across Codex, Claude, and Chinese docs.
- Added distillation references for abstracting expert methods without turning them into persona prompts.
- Added Master Lens / 高手镜头 references that turn famous expert patterns into backend pressure tests instead of visible persona modes.
- Added the Sharp Core / 锋利内核 model to reduce generic answers and force a memorable decision kernel.

### Changed

- Renamed the skill metadata name from `laojin` to `kim-decision` while keeping `laojin`, `KIM`, `Kim`, `老金`, and `问问老金` as trigger aliases.
- Strengthened gates and verification so current/changing claims are searched or labeled before they drive a decision.
- Updated Chinese skill docs to describe the core-problem gate, path scaling, clarification ladder, and external research boundary.
- Reworked default output guidance so the full reasoning frame runs internally instead of appearing as a filled form.
- Updated examples to show natural working-note output, test assumptions, hard gaps, pass signals, and kill conditions.
- Added a readable report shape with verdict cards, concrete scenes, 24-hour execution cards, and decision rulers.
- Added raw `<br>` spacers between major report blocks for Codex rendering where Markdown blank lines collapse visually.
- Adjusted spacing rules so connected reasoning stays in compact paragraphs while only major blocks get visible breathing room.
- Updated output templates and README examples to avoid default indentation, nested lists, and sentence-by-sentence paragraph breaks.
- Strengthened final verification around natural format, hard gaps, execution signals, and non-generic recommendations.
- Updated README examples and file trees to document the new execution and distillation protocol files.
