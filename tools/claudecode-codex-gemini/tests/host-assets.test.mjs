import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('all ten upstream command assets are present', async () => {
  const commandRoot = path.join(root, 'host', 'claude', 'commands');
  const names = (await readdir(commandRoot)).filter((name) => name.endsWith('.md')).sort();
  assert.deepEqual(names, [
    'kim-api.md', 'kim-code.md', 'kim-crud.md', 'kim-form.md', 'kim-help.md',
    'kim-plan.md', 'kim-review.md', 'kim-setup.md', 'kim-team.md', 'kim-ui2code.md'
  ]);
  for (const name of names) assert.match(await readFile(path.join(commandRoot, name), 'utf8'), /^---\n/);
});

test('orchestrator Skill definition and four prompts are present', async () => {
  const skill = path.join(root, 'host', 'claude', 'skills', 'kim-orchestrator');
  await access(path.join(skill, 'SKILL.md'));
  await access(path.join(skill, 'skill.yaml'));
  const prompts = (await readdir(path.join(skill, 'prompts'))).filter((name) => name.endsWith('.md')).sort();
  assert.deepEqual(prompts, ['health-check.md', 'phase1-analyze.md', 'phase2-code.md', 'phase3-review.md']);
  const yaml = await readFile(path.join(skill, 'skill.yaml'), 'utf8');
  assert.match(yaml, /提供10种命令/);
  assert.match(yaml, /kim-ui2code/);
  assert.match(yaml, /cli\.mjs mcp codex/);
  assert.match(yaml, /cli\.mjs mcp gemini/);
  assert.doesNotMatch(yaml, /scripts\/orchestrate\.sh|提供9种命令/);
});

test('unsafe upstream auto-write settings and unrelated application trees are excluded', async () => {
  for (const relative of ['host/claude/settings.json', 'src', 'examples', 'tests/auth']) {
    await assert.rejects(() => access(path.join(root, relative)));
  }
  const provenance = await readFile(path.join(root, 'PROVENANCE.md'), 'utf8');
  assert.match(provenance, /FastAPI\/JWT/);
  assert.match(provenance, /PreToolUse/);
  assert.match(provenance, /orchestrate\.sh/);
});

test('MIT is authoritative while the historical conflict remains documented', async () => {
  const license = await readFile(path.join(root, 'LICENSE'), 'utf8');
  const resolution = await readFile(path.join(root, 'LICENSE-RESOLUTION.md'), 'utf8');
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const provenance = await readFile(path.join(root, 'PROVENANCE.md'), 'utf8');
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.match(license, /^MIT License/);
  assert.equal(packageJson.license, 'MIT');
  assert.match(resolution, /selected the MIT License as the single authoritative/);
  assert.match(resolution, /CC BY-NC 4\.0/);
  assert.match(resolution, /historical provenance/);
  assert.match(readme, /licensed under the \[MIT License\]\(LICENSE\)/);
  assert.doesNotMatch(readme, /LICENSE-GAP|hard release blocker/);
  assert.match(provenance, /historical\s+conflict/);
  assert.match(provenance, /selected MIT as the single[\s\S]*authoritative license/);
  await assert.rejects(() => access(path.join(root, 'LICENSE-GAP.md')));
});

test('every host command carries the project-write gate and no stale unsafe runtime guidance', async () => {
  const commandRoot = path.join(root, 'host', 'claude', 'commands');
  const commandFiles = (await readdir(commandRoot)).filter((name) => name.endsWith('.md'));
  const commandText = [];
  for (const name of commandFiles) {
    const text = await readFile(path.join(commandRoot, name), 'utf8');
    assert.match(text, /Kim Service 执行门/);
    assert.match(text, /项目写入/);
    commandText.push(text);
  }
  const skillRoot = path.join(root, 'host', 'claude', 'skills', 'kim-orchestrator');
  const health = await readFile(path.join(skillRoot, 'prompts', 'health-check.md'), 'utf8');
  const skill = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
  const phasePrompts = await Promise.all([
    'phase1-analyze.md', 'phase2-code.md', 'phase3-review.md'
  ].map((name) => readFile(path.join(skillRoot, 'prompts', name), 'utf8')));
  const all = `${commandText.join('\n')}\n${health}\n${skill}\n${phasePrompts.join('\n')}`;
  assert.doesNotMatch(all, /mcp-config\.json|\.mcp-context|mcp-servers\//);
  assert.doesNotMatch(all, /echo[^\n]*>|shell\s*:\s*true|--yolo/);
  assert.doesNotMatch(all, /HTTP_PROXY:\s*\$|HTTPS_PROXY:\s*\$/);
  assert.doesNotMatch(all, /conversationId|reviewMode/);
  assert.doesNotMatch(all, /orchestrate\.sh|\$TASK/);
});
