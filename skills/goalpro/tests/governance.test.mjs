import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
const examples = fs.readFileSync(path.join(root, 'references/examples.md'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'references/source-rules.md'), 'utf8');
const sections = new Map(examples.split(/(?=^## )/m).slice(1).map((section) => [
  section.split('\n')[0].slice(3), section
]));
const intentFields = [
  'User-stated intent', 'AI-inferred potential intent', 'Value judgments requiring confirmation'
];

function section(name) {
  const result = sections.get(name);
  assert.ok(result, `missing example ${name}`);
  return result;
}

function assertBalancedFences(text, label) {
  let open = 0;
  for (const line of text.split('\n')) {
    const match = /^(\s*)(`{3,})(.*)$/.exec(line);
    if (!match) continue;
    if (!open) open = match[2].length;
    else if (match[2].length >= open && !match[3].trim()) open = 0;
  }
  assert.equal(open, 0, `${label} has an unclosed code fence`);
}

test('finite examples do not implicitly append a Loop', () => {
  for (const name of ['模糊开发请求', '战略研究请求', '大改或重构请求',
    '聊天窗口直接输出', '文件加聊天双输出', '模糊产品请求（一次性交付）', 'Codex `/goal` 示例']) {
    const example = section(name);
    assert.doesNotMatch(example, /^Loop Prompt:|^交付后 Loop Prompt：|^Loop mission:/m, name);
  }
});

test('concrete Goal examples separate stated intent from inference and value choices', () => {
  const goals = [...examples.matchAll(/^Goal:\n([\s\S]*?)(?=^```)/gm)];
  assert.ok(goals.length >= 5, 'exercise real examples rather than an empty scan');
  for (const [index, match] of goals.entries()) {
    for (const field of intentFields) {
      const value = new RegExp(`^${field}:\\n([^\\n]+)`, 'm').exec(match[1]);
      assert.ok(value?.[1].trim(), `Goal example ${index + 1} lacks ${field}`);
    }
  }
  assert.doesNotMatch(examples, /^Intent:/m, 'legacy single intent templates must be migrated');
});

test('explicit post-delivery requests retain evidence-bound Loop examples', () => {
  for (const name of ['平台自动化产品请求完整案例', '长期目标：代理证据与重审']) {
    const example = section(name);
    assert.match(example, /继续.*复盘|持续复盘/, name);
    for (const field of ['Loop Prompt', '时间参数', 'Loop state', 'Previous result to inspect',
      'Review evidence', 'Loop guardrails', 'Continuation protocol']) {
      assert.ok(example.includes(`${field}:`), `${name} lacks ${field}`);
    }
    assert.match(example, /Next LOOP packet/);
    assert.match(example, /Pause/);
  }
});

test('long-term proxy case exposes gaps and can pause the goal itself', () => {
  const example = section('长期目标：代理证据与重审');
  for (const field of ['Goal / Plan / Output', 'Direct evidence', 'Proxy evidence',
    'Proxy target', 'Coverage gap', 'Confidence', 'Counterevidence', 'Revalidation trigger']) {
    assert.ok(example.includes(`${field}:`), `missing ${field}`);
  }
  assert.match(example, /Direct evidence:.*尚未提供/);
  assert.match(example, /Confidence: low/);
  assert.match(example, /先暂停旧投入结论/);
  assert.match(example, /不继续按旧计划循环/);
  assert.match(example, /不由此获得授权/);
});

test('runtime and source rules carry the same governance boundaries', () => {
  for (const [name, text] of [['SKILL.md', skill], ['source-rules.md', rules]]) {
    for (const field of [...intentFields, 'Goal / Plan / Output', 'Direct evidence',
      'Proxy evidence', 'Proxy target', 'Coverage gap', 'Confidence', 'Counterevidence',
      'Revalidation trigger']) assert.ok(text.includes(field), `${name} lacks ${field}`);
    assert.doesNotMatch(text, /默认输出两段|新版默认生成两段|默认交付永远/);
  }
});

test('examples and runtime retain balanced Markdown fences', () => {
  for (const [name, text] of [['examples.md', examples], ['SKILL.md', skill],
    ['source-rules.md', rules]]) assertBalancedFences(text, name);
});
