import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRouteEconomics } from '../scripts/route-economics.mjs';
const usd = amount => ({ amount, currency: 'USD' });
const scenario = () => ({
  unit: 'paid_account_month', currency: 'USD', period: '30-day synthetic scenario',
  netRevenue: usd(30),
  variableCosts: [{name:'cloud',...usd(8)},{name:'payment',...usd(2)},{name:'support',...usd(2)}],
  founderHours: 0.1, hourlyValue: usd(30), fixedCosts: usd(300), capacity: 50,
  costCoverage: 'complete_for_scenario', unknowns: []
});
test('SaaS scenario keeps cash, time and capacity distinct', () => {
  const r = calculateRouteEconomics(scenario());
  assert.equal(r.cashContribution,18); assert.equal(r.contributionAfterTime,15);
  assert.equal(r.cashBreakEvenUnits,17); assert.equal(r.timeBreakEvenUnits,20);
  assert.equal(r.timeCoverageWithinCapacity,true); assert.equal(r.calculationOnly,true);
  assert.equal(r.professionalEffect,'not_evaluated'); assert.equal(r.nativeRuntimeVerified,false);
});
test('AI cost stress crosses capacity despite positive contribution', () => {
  const s=scenario();s.variableCosts[0].amount=20;
  const r=calculateRouteEconomics(s);
  assert.equal(r.contributionAfterTime,3);assert.equal(r.timeBreakEvenUnits,100);
  assert.equal(r.timeCoverageWithinCapacity,false);
});
test('service project is not silently treated as an account month', () => {
  const s=scenario();Object.assign(s,{unit:'paid_project',netRevenue:usd(1200),variableCosts:[{name:'tools',...usd(60)},{name:'contractor',...usd(120)},{name:'settlement',...usd(40)}],founderHours:12,capacity:4});
  const r=calculateRouteEconomics(s);
  assert.equal(r.unit,'paid_project');assert.equal(r.cashContribution,980);assert.equal(r.contributionAfterTime,620);assert.equal(r.timeBreakEvenUnits,1);
});
test('known unknown costs prevent a manufactured profitable result', () => {
  const s=scenario();s.unknowns=['local support and refund cost not yet known'];
  const r=calculateRouteEconomics(s);
  assert.equal(r.status,'needs_inputs');assert.equal('cashContribution' in r,false);
  delete s.capacity;s.unknowns=[];assert.ok(calculateRouteEconomics(s).missing.includes('capacity'));
});
test('nonpositive contribution cannot cover a positive fixed cost at finite volume', () => {
  const s=scenario();s.variableCosts=[{name:'delivery',...usd(30)}];
  const r=calculateRouteEconomics(s);
  assert.equal(r.cashBreakEvenUnits,null);assert.equal(r.timeBreakEvenUnits,null);
  assert.equal(r.cashCoverageWithinCapacity,false);assert.equal(r.timeCoverageWithinCapacity,false);
});
test('zero fixed costs do not make negative unit contribution viable', () => {
  const s=scenario();s.fixedCosts=usd(0);s.variableCosts=[{name:'delivery',...usd(32)}];
  const negativeCash=calculateRouteEconomics(s);
  assert.equal(negativeCash.cashBreakEvenUnits,null);assert.equal(negativeCash.timeBreakEvenUnits,null);
  assert.equal(negativeCash.cashCoverageWithinCapacity,false);assert.equal(negativeCash.timeCoverageWithinCapacity,false);
  s.variableCosts[0].amount=28;
  const negativeAfterTime=calculateRouteEconomics(s);
  assert.equal(negativeAfterTime.cashBreakEvenUnits,0);assert.equal(negativeAfterTime.cashCoverageWithinCapacity,true);
  assert.equal(negativeAfterTime.timeBreakEvenUnits,null);assert.equal(negativeAfterTime.timeCoverageWithinCapacity,false);
  s.variableCosts[0].amount=30;s.founderHours=0;
  const zeroCostsAndContribution=calculateRouteEconomics(s);
  assert.equal(zeroCostsAndContribution.cashBreakEvenUnits,0);assert.equal(zeroCostsAndContribution.timeBreakEvenUnits,0);
  assert.equal(zeroCostsAndContribution.cashCoverageWithinCapacity,true);assert.equal(zeroCostsAndContribution.timeCoverageWithinCapacity,true);
});
test('mixed currencies and invalid money never get silently added', () => {
  const s=scenario();s.variableCosts[0].currency='EUR';
  assert.throws(()=>calculateRouteEconomics(s),/currency mismatch/);
  s.variableCosts[0]= {name:'cloud',...usd(-1)};assert.throws(()=>calculateRouteEconomics(s),/nonnegative/);
  s.variableCosts[0]= {name:'cloud',...usd(Infinity)};assert.throws(()=>calculateRouteEconomics(s),/finite/);
});
test('declared period and explicit complete scenario costs are required', () => {
  const s=scenario();delete s.period;assert.ok(calculateRouteEconomics(s).missing.includes('period'));
  const x=scenario();x.costCoverage='incomplete';assert.equal(calculateRouteEconomics(x).status,'needs_inputs');
});
