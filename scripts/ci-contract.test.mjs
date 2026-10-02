import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const workflow = readFileSync(resolve(root, '.github/workflows/validate.yml'), 'utf8');

test('all PR changes, including SKILL.md, trigger offline repository validation', () => {
  assert.match(workflow, /^on:\n  pull_request:/m);
  assert.doesNotMatch(workflow, /^\s*(paths|paths-ignore|branches-ignore):/m);
  assert.match(workflow, /os: \[ubuntu-latest, windows-latest, macos-latest\]/);
  for (const command of [
    'node scripts/catalog-automation.mjs check',
    'node scripts/check-repository.mjs',
    'node --test scripts/*.test.mjs',
    'node scripts/check-components.mjs',
  ]) assert.ok(workflow.includes(`run: ${command}`), `missing gate: ${command}`);
});

test('validation CI is read-only and cannot publish or invoke secret-backed models', () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|write-all|contents: write|id-token: write/);
  assert.doesNotMatch(workflow, /(?:gh release|git push|npm publish|--release|run-acceptance\.sh|run-baseline\.sh)/);
  for (const match of workflow.matchAll(/uses: (\S+)/g)) {
    assert.match(match[1], /^actions\/[a-z-]+@[0-9a-f]{40}$/, 'actions must use immutable revisions');
  }
});
