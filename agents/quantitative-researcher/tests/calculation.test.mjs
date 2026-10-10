import assert from 'node:assert/strict';
import { calculate } from '../scripts/calculate.mjs';
import test from 'node:test';
const series = (returns, costRate=.001) => ({costRate, periods:returns.map((returnRate,i)=>({time:`2026-01-0${i+1}T16:00:00.000Z`,signalAvailableAt:`2026-01-0${i+1}T09:00:00.000Z`,executedAt:`2026-01-0${i+1}T10:00:00.000Z`,returnRate,turnover:1,benchmarkReturn:0}))});
test('actually calculates net equity and drawdown including costs',()=>{
 const out=calculate(series([.01,-.02,.03]));
 assert.ok(Math.abs(out.periods[0].equity-1.009)<1e-12);
 assert.ok(Math.abs(out.totalReturn-(1.009*.979*1.029-1))<1e-12);
 assert.ok(Math.abs(out.maxDrawdown-.021)<1e-12);
 assert.equal(out.tradingAuthorized,false);
 assert.equal(out.scope,'supplied_return_arithmetic_only');
 assert.ok(out.unverified.includes('signal generation'));
});
test('initial loss contributes to drawdown and zero is valid',()=>{
 assert.ok(Math.abs(calculate(series([-.2],0)).maxDrawdown-.2)<1e-12);
 assert.equal(calculate(series([0],0)).totalReturn,0);
});
test('rejects absent cost and absent benchmark instead of assuming zero',()=>{
 const a=series([.01]);delete a.costRate;assert.throws(()=>calculate(a));
 const b=series([.01]);delete b.periods[0].benchmarkReturn;assert.throws(()=>calculate(b));
});
test('rejects lookahead, duplicate time, invalid dates, negative fees and insolvency',()=>{
 const a=series([.01]);a.periods[0].signalAvailableAt=a.periods[0].executedAt;assert.throws(()=>calculate(a),/lookahead/);
 const b=series([.01,.02]);b.periods[1].time=b.periods[0].time;assert.throws(()=>calculate(b));
 const c=series([.01]);c.periods[0].time='2026-02-30T16:00:00.000Z';assert.throws(()=>calculate(c));
 assert.throws(()=>calculate(series([.01],-.1)));
 assert.throws(()=>calculate(series([-1],.01)));
});
test('higher turnover cost cannot improve supplied-series result',()=>{
 const a=series([.1,.1]);const b=series([.1,.1]);b.periods.forEach(p=>p.turnover=2);
 assert.ok(calculate(b).totalReturn < calculate(a).totalReturn);
});

const { spawnSync } = await import('node:child_process');
const { fileURLToPath } = await import('node:url');
const script = fileURLToPath(new URL('../scripts/calculate.mjs', import.meta.url));
const run = input => spawnSync(process.execPath, [script, '--input-json','-'], {input, encoding:'utf8',shell:false});
test('real CLI emits arithmetic receipt and rejects duplicate keys and noncanonical JSON',()=>{
 const valid=run(JSON.stringify(series([.01,-.02,.03]))+'\n');assert.ifError(valid.error);assert.equal(valid.status,0);
 assert.equal(JSON.parse(valid.stdout).periods.length,3);
 for(const raw of ['{"costRate":0,"costRate":0,"periods":[]}', '{"costRate": 0,"periods":[]}', '{']){
  const bad=run(raw);assert.ifError(bad.error);assert.equal(bad.status,2);assert.equal(JSON.parse(bad.stdout).status,'invalid_input');
 }
});

test('rejects backward or overlapping execution periods',()=>{
 const a=series([.01,.02]);a.periods[1].signalAvailableAt='2026-01-01T08:00:00.000Z';a.periods[1].executedAt='2026-01-01T09:00:00.000Z';
 assert.throws(()=>calculate(a),/overlapping_execution_period/);
});
test('rejects invalid UTF8 and preserves Chinese labels split across chunks',async()=>{
 const invalid=run(Buffer.concat([Buffer.from('{"label":"'),Buffer.from([0xff]),Buffer.from('","costRate":0,"periods":[]}')]));
 assert.equal(invalid.status,2);
 const {spawn}=await import('node:child_process');
 const {createHash}=await import('node:crypto');
 const obj={...series([.01]),label:'中文样例'};
 const raw=Buffer.from(JSON.stringify(obj));const cut=raw.indexOf(Buffer.from('中'))+1;
 const child=spawn(process.execPath,[script,'--input-json','-'],{stdio:['pipe','pipe','pipe'],shell:false});
 let stdout='';child.stdout.on('data',chunk=>stdout+=chunk);
 const completed=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});
 child.stdin.write(raw.subarray(0,cut));
 await new Promise(resolve=>setTimeout(resolve,25));child.stdin.end(raw.subarray(cut));
 assert.equal(await completed,0);
 assert.equal(JSON.parse(stdout).inputSha256,createHash('sha256').update(raw).digest('hex'));
});
