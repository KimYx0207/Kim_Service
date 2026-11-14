import test from 'node:test';
import assert from 'node:assert/strict';
import { assessValueStage } from '../scripts/assess-value-stage.mjs';
import fs from 'node:fs';

test('internal and open-source projects can validate value without a payer', () => {
  for (const type of ['internal', 'open-source']) {
    const r = assessValueStage({ valueTypes: [type], stage: 'validation', evidence: { outcome: true, adoption: true, cost: true } });
    assert.equal(r.status, 'ready-for-next-test'); assert.deepEqual(r.commercialGaps, []);
    assert.ok(!r.requiredEvidence.includes('payer'));
  }
});
test('a mixed open-source and paid project can explore while paid promises remain unverified', () => {
  const r = assessValueStage({ valueTypes: ['paid', 'open-source'], stage: 'exploration', evidence: { outcome: true } });
  assert.equal(r.status, 'ready-for-next-test'); assert.ok(r.commercialGaps.includes('payer'));
  assert.equal(r.commercialEvidenceSupplied, false); assert.equal(r.executionAuthorized, false);
});
test('scaling a paid offer needs revenue and operating evidence; a quality score cannot replace them', () => {
  const r = assessValueStage({ valueTypes: ['paid'], stage: 'scale', evidence: { outcome: true, adoption: true, cost: true, quality: true } });
  assert.equal(r.status, 'evidence-required'); assert.ok(r.gaps.includes('payer'));
  assert.ok(r.gaps.includes('repeatability'));
});

test('a documented one-time paid delivery is evaluated without inventing repeat purchase', () => {
  const r = assessValueStage({ valueTypes: ['paid'], stage: 'delivery', recurrence: 'one-time', recurrenceReason: 'One-time equipment installation with a bounded warranty',
    evidence: { outcome: true, adoption: true, cost: true, acceptance: true, owner: true, revenueModel: true, payer: true, urgency: true, dealSize: true, deliveryCost: true } });
  assert.equal(r.status, 'ready-for-next-test'); assert.ok(!r.requiredEvidence.includes('repeatPurchase'));
});
test('unknown type/stage and non-boolean evidence are rejected rather than treated as user consent', () => {
  assert.throws(() => assessValueStage({ valueTypes: ['free'], stage: 'scale', evidence: {} }), /valueTypes/);
  assert.throws(() => assessValueStage({ valueTypes: ['paid'], stage: 'approved', evidence: {} }), /stage/);
  assert.throws(() => assessValueStage({ valueTypes: ['internal'], stage: 'validation', evidence: { outcome: 'yes' } }), /boolean/);
});

test('both language routes remove the old universal payer veto', () => {
  const english = fs.readFileSync(new URL('../references/business.md', import.meta.url), 'utf8');
  const chinese = fs.readFileSync(new URL('../docs/zh-CN/references/business.md', import.meta.url), 'utf8');
  for (const content of [english, chinese]) {
    assert.ok(content.includes('valueTypes') && content.includes('stage'));
    assert.ok(content.includes('open-source') && content.includes('internal'));
  }
  assert.ok(!english.includes('Questions 1-3 unanswered → output downgrades to "do not proceed"'));
  assert.ok(!chinese.includes('问题 1-3 答不出 → 输出降级为"不建议推进"'));
});

test('entrypoints and gate references preserve value-stage applicability instead of restoring a payer veto', () => {
  for (const file of ['SKILL.md', 'docs/zh-CN/SKILL.md', 'references/gates.md', 'docs/zh-CN/references/gates.md']) {
    const content = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    assert.ok(content.includes('valueTypes') && content.includes('stage'), file);
    assert.ok(!/questions 1-3 unanswered.*do not proceed/i.test(content), file);
    assert.ok(!/问题 1-3 答不出.*不建议推进/.test(content), file);
  }
});
