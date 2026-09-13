import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const componentRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(componentRoot, 'SKILL.md'), 'utf8');
const readme = readFileSync(join(componentRoot, 'README.md'), 'utf8');
const readmeCn = readFileSync(join(componentRoot, 'README_CN.md'), 'utf8');
const changelog = readFileSync(join(componentRoot, 'CHANGELOG.md'), 'utf8');
const contract = JSON.parse(readFileSync(join(componentRoot, 'capability.json'), 'utf8'));
const capabilities = new Map(contract.capabilities.map((item) => [item.id, item]));

function indexOfRequired(text) {
  const index = skill.indexOf(text);
  assert.notEqual(index, -1, `missing required policy text: ${text}`);
  return index;
}

test('canonical name matches the directory and capability contract', () => {
  const frontmatterName = skill.match(/^---\r?\nname:\s*([^\r\n]+)/)?.[1];
  assert.equal(frontmatterName, 'find-skill');
  assert.equal(contract.id, 'find-skill');
  assert.equal(contract.componentType, 'skill');
  assert.equal(contract.entrypoint, 'SKILL.md');
  for (const componentDoc of [skill, readme, readmeCn]) {
    assert.ok(!componentDoc.includes('@find-skills'), 'legacy package identifier must not remain in install commands');
  }
  assert.equal(contract.componentVersion, '0.0.0+imported.cf7635e');
  assert.match(changelog, /revision `cf7635e3755c47b472bfb6dfd854680b5662ee26`/);
});

test('discovery is local-first and does not install by default', () => {
  const localStep = indexOfRequired('Search installed and repository-local skills first.');
  const externalStep = indexOfRequired('Use external search only when local results are insufficient and network access is allowed.');
  assert.ok(localStep < externalStep, 'local discovery must precede external search');
  assert.match(skill, /A request to find, search for, or recommend a skill does not authorize installation\./);
  assert.match(skill, /Do not install by default\./);
});

test('search failures are not reported as proof of nonexistence', () => {
  assert.match(skill, /search failure, not evidence that a skill does not exist/);
  assert.match(skill, /Only say "no matching skill was found" after the relevant search completed successfully\./);
  assert.deepEqual(
    capabilities.get('skill-search').output.properties.externalSearchStatus.enum,
    ['not-requested', 'completed', 'unavailable', 'failed'],
  );
});

test('external search is sanitized and cannot leak prompts or local paths', () => {
  assert.match(skill, /2-5 generic English keywords/);
  for (const privateValue of [
    'private prompt text',
    'secrets',
    'repository or user names',
    'absolute paths',
    'filenames',
    'internal URLs',
  ]) {
    assert.ok(skill.includes(privateValue), `missing privacy guard for ${privateValue}`);
  }
  assert.match(skill, /Keep the original prompt and all private paths or identifiers local\./);
});

test('project and user installs have separate human gates and no silent fallback', () => {
  const project = capabilities.get('skill-install-project');
  const user = capabilities.get('skill-install-user');
  assert.equal(project.humanGate.required, true);
  assert.equal(user.humanGate.required, true);
  assert.ok(project.permissions.includes('filesystem:write-project-skills'));
  assert.ok(user.permissions.includes('filesystem:write-user-skills'));
  assert.match(skill, /require explicit approval of the exact skill, target agent, scope, and command\./);
  assert.match(skill, /Never silently retry a failed project install as a user install, or vice versa\./);

  const projectCommand = skill.match(/# Project install[^\n]*\n([^\n]+)/)?.[1] ?? '';
  const userCommand = skill.match(/# User install[^\n]*\n([^\n]+)/)?.[1] ?? '';
  assert.ok(projectCommand.includes('npx skills add'));
  assert.ok(!projectCommand.includes(' -g'));
  assert.ok(projectCommand.includes(' -a '));
  assert.ok(userCommand.includes(' -g'));
  assert.ok(userCommand.includes(' -a '));

  const installCommands = skill
    .split(/\r?\n/)
    .filter((line) => line.trimStart().startsWith('powershell -Command "npx skills add'));
  assert.ok(installCommands.length >= 2);
  assert.ok(installCommands.every((line) => !line.includes(' -y') && !line.includes(' --yes')));
  assert.ok(installCommands.every((line) => line.includes(' -a ') || line.includes(' --agent ')));
  for (const componentDoc of [readme, readmeCn]) {
    const commands = componentDoc.split(/\r?\n/).filter((line) => line.includes('npx skills add'));
    assert.ok(commands.every((line) => !line.includes(' -y') && !line.includes(' --yes')));
    assert.ok(commands.every((line) => line.includes(' -a ') || line.includes(' --agent ')));
  }
});

test('capability ids satisfy the repository schema id grammar', () => {
  assert.deepEqual(
    [...capabilities.keys()],
    ['skill-search', 'skill-install-project', 'skill-install-user'],
  );
  for (const id of capabilities.keys()) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});
