import test from 'node:test';import assert from 'node:assert/strict';
import {annualEnergyEconomics}from '../scripts/economics.mjs';
const input={generationKwh:10000,selfConsumedKwh:6000,exportedKwh:4000,buyRate:0.8,exportRate:0.3,capex:20000,annualOpex:1000};
test('self-use and export income use different nonoverlapping energy',()=>{assert.deepEqual(annualEnergyEconomics(input),{avoidedPurchase:4800,exportIncome:1200,annualNet:5000,simplePaybackYears:4,unallocatedKwh:0});});
test('double-counted generation fails; nonpositive net income has no finite payback',()=>{
 assert.throws(()=>annualEnergyEconomics({...input,selfConsumedKwh:10000}));
 assert.equal(annualEnergyEconomics({...input,annualOpex:7000}).simplePaybackYears,null);
});
