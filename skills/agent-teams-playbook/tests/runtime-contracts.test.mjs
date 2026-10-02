import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const skill = read('SKILL.md');
const contract = JSON.parse(read('capability.json'));
const profiles = JSON.parse(read('tests/fixtures/codex-host-profiles.json'));

// A test-only bounded projection of known schemas, not an execution adapter.
function accepts(profile, call) {
  if (profile.tool === null) {
    return call.tool === null && call.arguments === null &&
      call.mode === 'sequential' && call.parallel === false;
  }
  if (call.tool !== profile.tool || !call.arguments || Array.isArray(call.arguments)) return false;
  const args = call.arguments;
  if (profile.required.some((key) => !(key in args))) return false;
  if (Object.entries(args).some(([key, value]) =>
    !(key in profile.properties) ||
    (Array.isArray(value) ? 'array' : typeof value) !== profile.properties[key])) return false;
  // Upstream V1 describes message OR items although neither is JSON-required.
  if (profile.id === 'codex-v1' && !('message' in args || 'items' in args)) return false;
  if ('task_name' in args && !/^[a-z0-9_]+$/.test(args.task_name)) return false;
  if ('fork_turns' in args && !/^(none|all|[1-9]\d*)$/.test(args.fork_turns)) return false;
  return true;
}

function documentedExample(id) {
  const marker = `<!-- contract: ${id} -->\n\`\`\`json\n`;
  const start = skill.indexOf(marker);
  assert.notEqual(start, -1, `missing documented example: ${id}`);
  const body = skill.slice(start + marker.length).split('\n```')[0];
  return JSON.parse(body);
}

test('frontmatter uses specification fields and capability.json version', () => {
  const match = skill.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'frontmatter is required');
  const frontmatter = match[1];
  const topLevel = [...frontmatter.matchAll(/^([a-z-]+):/gm)].map((item) => item[1]);
  assert.deepEqual(topLevel, ['name', 'metadata', 'description']);
  assert.match(frontmatter, new RegExp(`^name: ${contract.id}$`, 'm'));
  const version = frontmatter.match(/^metadata:\n  version: "([^"]+)"$/m)?.[1];
  assert.equal(version, contract.componentVersion);
  const description = frontmatter.split('description: |\n')[1]?.trim();
  assert.ok(description && description.length <= 1024, 'description must fit Agent Skills specification');
});

test('all known profiles have actual documented, schema-checked examples', () => {
  assert.deepEqual(profiles.map((profile) => profile.id),
    ['codex-v1', 'codex-v2', 'codex-v2-limited', 'no-capability']);
  for (const profile of profiles) {
    assert.match(profile.source, /openai\/codex\/blob\/[0-9a-f]{40}\//);
    assert.match(profile.evidence, /static.*not live-host/);
    const example = documentedExample(profile.id);
    assert.deepEqual(example, profile.example, `${profile.id} documentation drifted`);
    assert.ok(accepts(profile, example), `${profile.id} rejects its example`);
  }
});

test('V1 and V2 reject mixed arguments, invalid types, and missing V2 fields', () => {
  const [v1, v2] = profiles;
  assert.equal(accepts(v1, v2.example), false);
  assert.equal(accepts(v2, v1.example), false);
  assert.equal(accepts(v1, { tool: v1.tool, arguments: { message: 'x', fork_context: 'none' } }), false);
  assert.equal(accepts(v2, { tool: v2.tool, arguments: { message: 'x' } }), false);
  assert.equal(accepts(v2, { tool: v2.tool, arguments: { task_name: 'x', message: 'x', fork_context: false } }), false);
  for (const fork_turns of ['0', '-1', 'recent', 3, true]) {
    assert.equal(accepts(v2, { ...v2.example, arguments: { ...v2.example.arguments, fork_turns } }), false);
  }
});

test('feature-limited schema rejects hidden fields while full profiles allow them', () => {
  const [v1, v2, limited] = profiles;
  for (const field of ['agent_type', 'model', 'reasoning_effort']) {
    for (const profile of [v1, v2]) {
      assert.ok(accepts(profile, { ...profile.example, arguments: { ...profile.example.arguments, [field]: 'example' } }));
    }
    assert.equal(accepts(limited, { ...limited.example, arguments: { ...limited.example.arguments, [field]: 'example' } }), false);
  }
});

test('no-capability fixture cannot claim dispatch or parallel execution', () => {
  const none = profiles.at(-1);
  assert.equal(accepts(none, { ...none.example, parallel: true }), false);
  assert.equal(accepts(none, profiles[1].example), false);
  assert.match(skill, /当前宿主 schema 优先/);
  assert.match(skill, /主线程分阶段执行/);
  assert.match(skill, /静态协议，不承诺真实宿主已实测/);
  assert.match(skill, /Router、跨组件状态机和最终验收仍由 Meta_Kim 负责/);
  assert.doesNotMatch(skill, /不要传 `agent_type` \/ `fork_context`/);
  assert.doesNotMatch(skill, /不要回退到旧的 namespaced spawn API/);
});

test('capability discovery stops on an existing provider instead of forcing fallback', () => {
  assert.match(skill, /能力解析链（命中即停止/);
  assert.match(skill, /已有专业 provider 覆盖子任务，就绑定该 provider 并停止搜索/);
  assert.match(skill, /只有本地所有相关 provider 都无法覆盖/);
  for (const stale of ['Skill完整回退链', '这3步必须全部执行完', '不允许跳过find-skills搜索', 'Skill 回退链', '不超过5个']) {
    assert.ok(!skill.includes(stale), `obsolete requirement: ${stale}`);
  }
});

test('Claude Code keeps its own Agent Task and optional team surfaces', () => {
  assert.match(skill, /Claude Code 使用宿主当前暴露的 `Agent` \/ `Task`/);
  assert.match(skill, /至少携带必填 `prompt`/);
  assert.match(skill, /`TeamCreate` \/ `SendMessage` 时才承诺共享团队语义/);
  assert.match(skill, /不要把 Codex 参数复制到 Claude Code/);
  assert.match(skill, /不要为了获得 Skill 工具而把已有专业 owner 换成 `general-purpose`/u);
});

test('both language READMEs state actual host, dependency, and verification boundaries', () => {
  for (const path of ['README.md', 'README_EN.md']) {
    const text = read(path);
    for (const token of ['Claude Code', 'Codex', 'OpenClaw', 'Cursor', 'planning-with-files', 'find-skills',
      'codex-v1', 'codex-v2', 'fork_context', 'fork_turns', 'metadata.version', 'capability.json',
      'Meta_Kim', 'tests/test_installer.py', 'tests/runtime-contracts.test.mjs', '.agent-teams-playbook.backup.',
      'CODEX_SKILLS_DIR', 'OPENCLAW_SKILLS_DIR', 'CURSOR_SKILLS_DIR']) {
      assert.ok(text.includes(token), `${path} lacks ${token}`);
    }
    assert.doesNotMatch(text, /Required Skill Dependencies|不超过5个|recommended <=5|use only the top-level/);
  }
  assert.match(read('README.md'), /推荐 Skills 依赖/);
  assert.match(read('README.md'), /都不等于真实模型或宿主/);
  assert.match(read('README_EN.md'), /Recommended Skill Dependencies/);
  assert.match(read('README_EN.md'), /Neither is live-model or live-host/);
});

test('installer targets and version match the flat package contract', () => {
  const installer = read('scripts/install.sh');
  assert.ok(installer.includes(`VERSION="V${contract.componentVersion}"`));
  assert.match(installer, /GITHUB_REPO="KimYx0207\/Kim_Service"/);
  assert.match(installer, /GITHUB_COMPONENT_PATH="skills\/agent-teams-playbook"/);
  for (const target of ['CLAUDE', 'CODEX', 'OPENCLAW', 'CURSOR']) {
    assert.ok(installer.includes(`\${${target}_SKILLS_DIR%/}/\${SKILL_NAME}`));
  }
  assert.match(installer, /local source_dir="\$\{repo_dir\}"/);
  assert.ok(contract.capabilities[0].validation.includes('tests/test_installer.py'));
});
