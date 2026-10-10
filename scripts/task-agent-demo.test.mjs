import assert from 'node:assert/strict';
import test from 'node:test';
import { runTaskAgentDemo } from './task-agent-demo.mjs';
test('quantitative local CLI produces an artifact independently checked by verifier and rejects tampering',()=>{
 const out=runTaskAgentDemo();
 if(process.platform==='win32'){assert.equal(out.status,'not_run');return;}
 assert.equal(out.status,'completed');assert.equal(out.verifiedCriteria,4);assert.notEqual(out.tamperedStatus,'completed');
 assert.equal(out.nativeAgentVerified,false);assert.equal(out.paidModelCalls,0);assert.equal(out.networkCalls,0);
});
