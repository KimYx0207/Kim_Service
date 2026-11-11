import test from 'node:test';
import assert from 'node:assert/strict';
import { valueFcff } from '../scripts/model.mjs';
test('FCFF discounts future terminal value and bridges enterprise to equity', () => {
 const result=valueFcff({cashFlows:[100,110],discountRate:0.1,terminalGrowth:0.02,debt:300,cash:50});
 assert.ok(Math.abs(result.terminalValue-1402.5)<1e-9);
 assert.ok(Math.abs(result.enterpriseValue-1340.90909090909)<1e-9);
 assert.ok(Math.abs(result.equityValue-1090.90909090909)<1e-9);
});
test('terminal growth conditions and nonfinite inputs cannot produce a valuation', () => {
 for(const growth of [0.1,0.12,Infinity]) assert.throws(()=>valueFcff({cashFlows:[100],discountRate:0.1,terminalGrowth:growth,debt:0,cash:0}));
 assert.throws(()=>valueFcff({cashFlows:[NaN],discountRate:0.1,terminalGrowth:0.02,debt:0,cash:0}));
});

test('downside cash flows and one-factor discount-rate sensitivity are independently reproducible', () => {
 const common={terminalGrowth:0.02,debt:300,cash:50};
 const downside=valueFcff({...common,cashFlows:[80,80],discountRate:0.1});
 const sensitivity=valueFcff({...common,cashFlows:[100,110],discountRate:0.12});
 assert.ok(Math.abs(downside.enterpriseValue-981.8181818181818)<1e-9);
 assert.ok(Math.abs(downside.equityValue-731.8181818181818)<1e-9);
 assert.ok(Math.abs(sensitivity.enterpriseValue-1071.4285714285713)<1e-9);
 assert.ok(Math.abs(sensitivity.equityValue-821.4285714285713)<1e-9);
});
