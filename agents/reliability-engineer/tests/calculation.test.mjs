import test from 'node:test';import assert from 'node:assert/strict';import{evaluateCanary}from'../scripts/evaluate-canary.mjs';
const policy={minRequests:100,maxErrorRate:0.01};
test('observed regression stops only the candidate route',()=>{assert.deepEqual(evaluateCanary({...policy,requests:200,errors:6}),{decision:'rollback_candidate',reason:'error_rate_exceeded',errorRate:0.03});});
test('ordinary rate checks need enough samples; independently observed critical failures can stop immediately',()=>{
 assert.equal(evaluateCanary({...policy,requests:0,errors:0}).decision,'observe');
 assert.equal(evaluateCanary({...policy,requests:100,errors:0,observationAvailable:false}).decision,'observe');
 assert.equal(evaluateCanary({...policy,requests:5,errors:2}).decision,'observe');
 assert.equal(evaluateCanary({...policy,requests:1,errors:1}).decision,'observe');
 assert.equal(evaluateCanary({...policy,requests:1,errors:1,criticalFailure:true}).decision,'rollback_candidate');
 assert.equal(evaluateCanary({...policy,requests:100,errors:0}).decision,'eligible_for_next_stage');
 assert.throws(()=>evaluateCanary({...policy,requests:10,errors:11}));
});
