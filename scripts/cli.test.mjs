import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { executeInstall, loadCatalogData, planInstall } from '../bin/kim-service.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('curated domain packs partition all catalog components without duplicates or gaps', () => {
  const { catalog, packs, components } = loadCatalogData();
  assert.equal(packs.length, 6);
  const seen = new Set();
  for (const pack of packs) {
    assert.ok(pack.id && pack.title['zh-CN'] && pack.title.en);
    assert.ok(pack.featured.length >= 3, `${pack.id} needs featured flagship components`);
    for (const featuredId of pack.featured) {
      assert.ok(pack.components.includes(featuredId), `${pack.id} featured ${featuredId} must belong to pack`);
    }
    for (const id of pack.components) {
      assert.equal(seen.has(id), false, `duplicate component across packs: ${id}`);
      seen.add(id);
    }
  }
  const catalogIds = new Set(catalog.components.map(item => item.id));
  assert.deepEqual([...seen].sort(), [...catalogIds].sort());
  assert.equal(components.filter(item => item.featured).length >= 30, true);
});

test('CLI installs featured packs and individual skills/agents natively across Claude, Codex, Cursor, and Antigravity', t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kim-service-cli-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));

  const projectDir = path.join(temp, 'workspace');
  const userHome = path.join(temp, 'home');
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(userHome, { recursive: true });

  const dry = planInstall({
    selectors: ['creator-growth'],
    target: 'antigravity',
    scope: 'global',
    featuredOnly: true,
    userHome,
    env: {}
  });
  assert.equal(dry.count, 7);
  assert.equal(fs.existsSync(path.join(userHome, '.gemini', 'config', 'skills')), false);

  const agyInstalled = executeInstall({
    selectors: ['topic-planner', 'kim-sticker-pack'],
    target: 'antigravity',
    scope: 'global',
    userHome,
    env: {}
  });
  assert.equal(agyInstalled.applied, true);
  assert.equal(fs.existsSync(path.join(userHome, '.gemini', 'config', 'skills', 'topic-planner', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(userHome, '.gemini', 'config', 'skills', 'topic-planner', 'method.json')), true);
  assert.equal(fs.existsSync(path.join(userHome, '.gemini', 'config', 'skills', 'kim-sticker-pack', 'SKILL.md')), true);

  const claudeInstalled = executeInstall({
    selectors: ['financial-modeler', 'api-contract-review'],
    target: 'claude',
    scope: 'project',
    projectDir,
    userHome,
    env: {}
  });
  assert.equal(claudeInstalled.applied, true);
  const claudeAgentMd = fs.readFileSync(path.join(projectDir, '.claude', 'agents', 'financial-modeler.md'), 'utf8');
  assert.match(claudeAgentMd, /\.\.\/kim-service\/financial-modeler\/references\//);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'kim-service', 'financial-modeler', 'method.json')), true);
  assert.equal(fs.existsSync(path.join(projectDir, '.claude', 'skills', 'api-contract-review', 'SKILL.md')), true);

  const codexInstalled = executeInstall({
    selectors: ['frontend-engineer', 'database-migration'],
    target: 'codex',
    scope: 'project',
    projectDir,
    userHome,
    env: {}
  });
  assert.equal(codexInstalled.applied, true);
  const codexToml = fs.readFileSync(path.join(projectDir, '.codex', 'agents', 'frontend-engineer.toml'), 'utf8');
  assert.match(codexToml, /name = "frontend-engineer"/);
  assert.match(codexToml, /\.codex\/kim-service\/frontend-engineer\/AGENT\.md/);
  assert.equal(fs.existsSync(path.join(projectDir, '.agents', 'skills', 'database-migration', 'SKILL.md')), true);

  const cliList = spawnSync(process.execPath, [path.join(ROOT, 'bin/kim-service.mjs'), 'packs', '--json'], { encoding: 'utf8' });
  assert.equal(cliList.status, 0, cliList.stderr);
  assert.equal(JSON.parse(cliList.stdout).length, 6);
});
