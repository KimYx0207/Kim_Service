import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = name => fs.readFileSync(path.join(root, name), 'utf8');
const read = name => JSON.parse(text(name));
const contract = read('capability.json');
const method = read('method.json');
const cap = contract.capabilities[0];

test('standalone professional package binds actual resources without granting execution', () => {
  assert.equal(contract.id, path.basename(root));
  assert.equal(method.roleId, contract.id);
  assert.equal(method.runtimeStatus, 'needs_probe');
  assert.equal(method.automaticInvocation, false);
  assert.equal(method.coordinationOwner, 'caller');
  assert.equal(method.finalAcceptance, 'caller_only');
  assert.deepEqual(cap.permissions, ['filesystem:read-user-materials']);
  assert.deepEqual(cap.sideEffects, []);
  assert.equal(Object.hasOwn(cap, 'invocation'), false);
  assert.ok(text('AGENT.md').includes('name: ' + contract.id));
  const documentedVersion = text('CHANGELOG.md').match(/^## (\d+\.\d+\.\d+)/m)?.[1];
  assert.equal(documentedVersion, contract.componentVersion);
  for (const file of ['AGENT.md', 'README.md', 'LICENSE', 'NOTICE', 'PROVENANCE.md']) assert.ok(text(file).trim());
  for (const asset of method.knowledgeAssets) {
    assert.equal(fs.lstatSync(path.join(root, asset.path)).isSymbolicLink(), false);
    assert.ok(Buffer.byteLength(text(asset.path)) <= 12288, asset.path);
    for (const ref of asset.sourceRefs) assert.ok(text('PROVENANCE.md').includes('| ' + ref + ' |'), ref);
  }
});

test('every declared output has review evidence and cases stay authored rather than evaluated', () => {
  const guide = method.expertise.contractGuidance.find(g => g.capabilityId === cap.id);
  const checks = new Map(guide.outputChecks.map(c => [c.field, c]));
  for (const field of cap.output.required) {
    const check = checks.get(field);
    assert.ok(check?.id && check.criterion && check.rejectWhen && check.evidenceRequired.length, field);
    assert.ok(['source_check', 'domain_review', 'deterministic_recompute', 'artifact_inspection'].includes(check.verificationMethod));
  }
  const examples = read('evals/professional-cases.json');
  assert.equal(examples.inputProvenance, 'synthetic');
  assert.equal(examples.evaluationStatus, 'not_evaluated');
  assert.equal(method.expertise.evaluation.professionalEffect, 'not_evaluated');
  const diagnostics = new Set(method.expertise.diagnosticSequence.map(x => x.id));
  const decisions = new Set(method.expertise.decisionRules.map(x => x.id));
  for (const item of examples.cases) {
    for (const key of cap.input.required) assert.ok(Object.hasOwn(item.input, key));
    for (const key of Object.keys(item.candidateOutputExcerpt)) assert.ok(Object.hasOwn(cap.output.properties, key));
    for (const ref of item.diagnosticRefs) assert.ok(diagnostics.has(ref), ref);
    for (const ref of item.decisionRuleRefs) assert.ok(decisions.has(ref), ref);
  }
  assert.ok(examples.cases.some(x => x.expectedAssessment === 'acceptable_example'));
  assert.ok(examples.cases.some(x => x.expectedAssessment === 'reject_example'));
  // Shape only: no keyword grading or assertion that a candidate is professionally correct.
  assert.equal(cap.output.properties.routes.minItems, 0);
  assert.equal(cap.output.properties.routes.maxItems, undefined);
});

test('complete worked delivery preserves unknowns and current-task evidence boundaries', () => {
  const example = read('example.json');
  assert.equal(example.inputProvenance, 'synthetic');
  assert.equal(example.evaluationStatus, 'not_evaluated');
  for (const direction of ['input', 'output']) {
    for (const key of cap[direction].required) assert.ok(Object.hasOwn(example[direction], key), key);
  }
  assert.equal(example.output.status, 'partial');
  assert.equal(example.output.nativeRuntimeVerified, false);
  assert.equal(example.output.recommendation.selectedByUser, false);
  assert.equal(example.output.economics.attributedNewCustomerCAC, null);
  assert.equal(example.output.economics.lifetimeValue, null);
  assert.ok(example.output.evidenceLedger.every(x => x.currentTaskExternalRead === false));
  assert.ok(example.output.validationPlan.every(x => x.executionStatus === 'not_run'));
});

test('synthetic ledger reconciles contribution, uncollected cash and returned inventory', () => {
  const example = read('example.json');
  const d = example.input.metrics;
  const e = example.output.economics;
  const recovery = d.restockableReturnedUnits * d.goodsCostPerUnit;
  const nonGoodsCashCosts = d.outboundFulfillment + d.returnHandling + d.platformPaymentFees + d.variableService + d.acquisitionSpend;
  const netRevenue = d.grossRevenue - d.refunds;
  assert.equal(recovery, 120);
  assert.equal(e.netGoodsCost, d.goodsCashPaid - recovery);
  assert.equal(e.netRevenue, netRevenue);
  assert.equal(e.contributionAfterListedCosts, netRevenue - (d.goodsCashPaid - recovery) - nonGoodsCashCosts);
  assert.equal(e.currentCashChange, d.actualSettledReceipts - d.goodsCashPaid - nonGoodsCashCosts);
  assert.equal(e.receivableNotCash, netRevenue - d.actualSettledReceipts);
  assert.equal(e.contributionAfterListedCosts - e.currentCashChange, e.receivableNotCash + recovery);
  assert.equal(e.contributionIfRecoveryUnverified, e.contributionAfterListedCosts - recovery);
  assert.equal(example.output.fulfillmentGuardrails.remainingTwoDayCapacity, d.twoDayFulfillmentCapacity - d.existingCommittedOrders);
  assert.equal(example.output.fulfillmentGuardrails.planningUpperBound, Math.min(d.suppliedAvailableQuantity, d.twoDayFulfillmentCapacity - d.existingCommittedOrders));
  // This recomputes authored arithmetic only. It never executes a merchant workflow.
});
