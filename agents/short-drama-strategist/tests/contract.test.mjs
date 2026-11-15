import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizePilot } from '../scripts/pilot-economics.mjs';
const read = path => JSON.parse(fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const contract = read('capability.json');
const method = read('method.json');
const example = read('example.json');
const cases = read('evals/professional-cases.json');

test('copied package carries its source-bound method and distinct authored review boundaries', () => {
  assert.equal(contract.id, method.roleId);
  assert.equal(method.runtimeStatus, 'needs_probe');
  assert.equal(method.automaticInvocation, false);
  assert.equal(method.coordinationOwner, 'caller');
  assert.equal(method.finalAcceptance, 'caller_only');
  assert.deepEqual(contract.capabilities[0].sideEffects, []);
  assert.equal(method.expertise.evaluation.professionalEffect, 'not_evaluated');
  for (const asset of method.knowledgeAssets) assert.ok(fs.statSync(new URL('../' + asset.path, import.meta.url)).isFile());
  assert.equal(cases.inputProvenance, 'synthetic');
  assert.equal(cases.evaluationStatus, 'not_evaluated');
  assert.equal(cases.cases.filter(c => c.category === 'worked_example').length, 3);
  const negatives = new Set(cases.cases.filter(c => c.expectedAssessment === 'reject_example').map(c => c.id));
  for (const id of ['recommendation-not-approval','nc-license-commercial-shortcut','paid-retry-and-wrong-denominator','translation-file-is-not-quality','views-not-payback']) assert.ok(negatives.has(id));
});

test('complete synthetic handoff preserves undecided route and unexecuted outcomes', () => {
  const cap = contract.capabilities[0];
  for (const direction of ['input','output']) for (const field of cap[direction].required) assert.ok(Object.hasOwn(example[direction], field), direction + '.' + field);
  assert.equal(example.output.routeOptions.length, 3);
  assert.equal(example.output.decision.selectedRoute, null);
  assert.equal(example.output.decision.selectionStatus, 'pending');
  assert.equal(example.output.decision.selectionEvidenceRef, null);
  assert.equal(example.output.status, 'partial');
  assert.equal(example.output.nativeRuntimeVerified, false);
  assert.ok(example.output.criterionResults.every(c => c.status === 'not_run'));
});

const sample = {
  currency: 'USD', evidenceKind: 'illustrative', costsComplete: true,
  charges: [
    {chargeId:'generated-a',currency:'USD',amount:2.4},
    {chargeId:'generated-b',currency:'USD',amount:2.4},
    {chargeId:'generated-c',currency:'USD',amount:2.4},
    {chargeId:'human-edit',currency:'USD',amount:1.8}
  ], acceptedSeconds: 30, netRevenue: 15, budgetCap: 9
};

test('discarded paid attempts stay in numerator while only accepted footage sets unit cost', () => {
  const result = summarizePilot(sample);
  assert.equal(result.knownCost, 9);
  assert.equal(result.costPerAcceptedMinute, 18);
  assert.equal(result.netContribution, 6);
  assert.equal(result.budgetRemaining, 0);
  assert.equal(result.stopNewCharges, true);
  assert.equal(result.evidenceKind, 'illustrative');
});

test('delivery retry must not be counted twice as the same paid generation', () => {
  assert.throws(() => summarizePilot({...sample, charges:[...sample.charges, sample.charges[0]]}), /duplicate chargeId/);
  // A real new paid generation has a new receipt ID, and must increase costs.
  const result = summarizePilot({...sample, charges:[...sample.charges, {chargeId:'new-generation',currency:'USD',amount:2.4}]});
  assert.equal(result.knownCost, 11.4);
  assert.equal(result.budgetRemaining, -2.4);
  assert.equal(result.stopNewCharges, true);
});

test('unknown receipts and incomplete cost scope never turn into a profit claim', () => {
  assert.equal(summarizePilot({...sample, netRevenue:null}).netContribution, null);
  const result = summarizePilot({...sample, costsComplete:false});
  assert.equal(result.costBasis, 'known_costs_only');
  assert.equal(result.netContribution, null);
  assert.equal(result.costPerAcceptedMinute, 18);
});

test('no accepted footage gives no meaningful unit cost, not zero-cost success', () => {
  const result = summarizePilot({...sample, acceptedSeconds:0, budgetCap:null});
  assert.equal(result.costPerAcceptedMinute, null);
  assert.equal(result.knownCost, 9);
  assert.equal(result.stopNewCharges, null);
});

test('costing rejects mixed currencies and invalid values before comparing strategies', () => {
  assert.throws(() => summarizePilot({...sample, charges:[{chargeId:'x',currency:'CNY',amount:9}]}), /mixed currencies/);
  for (const value of [-1, Infinity, NaN]) assert.throws(() => summarizePilot({...sample, acceptedSeconds:value}), /finite and nonnegative/);
  assert.throws(() => summarizePilot({...sample, netRevenue:NaN}), /finite/);
});

test('refunds greater than receipts preserve a negative net-revenue window', () => {
  const result = summarizePilot({...sample, netRevenue:-3});
  assert.equal(result.netRevenue, -3);
  assert.equal(result.netContribution, -12);
});

test('finite large values survive unit conversion while nonfinite derived results are rejected', () => {
  const large = {...sample, charges:[{chargeId:'large',currency:'USD',amount:1e307}], acceptedSeconds:60, netRevenue:null, budgetCap:null};
  assert.equal(summarizePilot(large).costPerAcceptedMinute, 1e307);
  assert.throws(() => summarizePilot({...large, acceptedSeconds:Number.MIN_VALUE}), /derived economic value/);
  assert.throws(() => summarizePilot({...large, charges:[{chargeId:'large',currency:'USD',amount:1e308}], netRevenue:-1e308}), /derived economic value/);
});
