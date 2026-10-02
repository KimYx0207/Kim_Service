#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const authority = read('references/skill-contract.md');
const entrance = read('SKILL.md');
const humanFlow = read('references/human-decision-first-workflow.md');
const imageFlow = read('references/image-generation-workflow.md');

test('pending decisions never grant generation or unattended batch permission', () => {
  for (const text of [authority, humanFlow]) {
    assert.match(text, /`blocked_pending_human_decision`[^\n]*不属于执行许可/);
    assert.doesNotMatch(text, /允许继续执行的决策状态[^\n]*blocked_pending_human_decision/);
  }
  assert.match(authority, /首轮生成请求只授权 1 张[^\n]*不授权批量内页/);
  assert.match(authority, /新窗口、子线程或无人值守不会扩大授权范围/);
  assert.match(entrance, /缺本步关键决策或批量许可[^\n]*停在 partial 或 blocked/);
  assert.doesNotMatch(entrance, /只有宿主拒绝[^\n]*才允许 `blocked`/);
  assert.match(entrance, /MVP 获认可不自动授权批量内页/);
  assert.doesNotMatch(entrance, /MVP 被用户确认后，即视为完整图文包的生产许可/);
});

test('fallback exceptions have one authority and require actual evidence', () => {
  for (const exception of ['生成能力不可用或失败', '生成文字或排版失败', '用户要求可编辑文字']) {
    assert.ok(authority.includes('**' + exception + '**'), exception);
  }
  assert.match(authority, /本轮实际生成图片存在中文错字、不可读或排版失败/);
  assert.match(authority, /所需新视觉素材仍按生成优先级选择/);
  assert.match(authority, /本地排版 PNG 标为“排版产物”，不冒充原生生图/);
  assert.match(entrance, /本地排版导出的 PNG 按权威图片路线合同验收与标注/);
  assert.doesNotMatch(authority, /SVG、HTML、静态图只能是结构预览/);
  for (const text of [entrance, humanFlow, imageFlow]) {
    assert.match(text, /skill-contract\.md/);
    assert.doesNotMatch(text, /任一可用时[^\n]*禁止[^\n]*本地排版/);
    assert.doesNotMatch(text, /只有[^\n]*都不可用[^\n]*才允许/);
  }
});

// These checks detect contradictory prompt contracts, not live model or image results.
