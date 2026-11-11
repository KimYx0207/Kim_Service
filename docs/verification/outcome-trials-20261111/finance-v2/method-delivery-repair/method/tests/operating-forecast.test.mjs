import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import operating from '../scripts/operating-forecast.js';

const input = () => ({schemaVersion:1,exampleData:true,title:'Arithmetic fixture',currency:'CNY',startMonth:'2027-01',openingCash:1000,openingReceivables:200,openingPayables:80,
  drivers:{initialUnits:10,monthlyGrowth:0,unitPrice:100,variableCostPerUnit:40,fixedCostPerMonth:300,depreciationPerMonth:20,taxRate:.2,collectionShare:.6,paymentShare:.5,capexByMonth:[500,...Array(11).fill(0)],financingByMonth:[100,...Array(11).fill(0)]},
  scenarios:[{id:'base',label:'基准',unitsMultiplier:1,priceMultiplier:1,costMultiplier:1,growthDelta:0}],assumptions:['Synthetic arithmetic fixture.']});
test('profit, first-month balances, delayed cash and year-end bridge reconcile independently',()=>{
  const source=input(),before=structuredClone(source);const result=operating.forecast(source).scenarios[0];
  const first=result.months[0];
  assert.equal(first.revenue,1000);assert.equal(first.pretaxProfit,280);assert.equal(first.tax,56);assert.equal(first.netIncome,224);
  assert.equal(first.receipts,800);assert.equal(first.supplierPayments,280);assert.equal(first.payments,1136);assert.equal(first.endingCash,764);
  assert.equal(first.receivables,400);assert.equal(first.payables,200);
  assert.equal(result.months[1].endingCash,1008);assert.equal(result.summary.endingCash,3448);assert.equal(result.summary.totalNetIncome,2688);
  assert.equal(result.summary.totalRevenue,12000);assert.deepEqual(source,before);
});
test('negative cash remains a visible gap; no automatic financing or absolute-value repair',()=>{
  const source=input();source.openingCash=0;source.drivers.financingByMonth.fill(0);
  const result=operating.forecast(source).scenarios[0];
  assert.equal(result.months[0].endingCash,-336);assert.equal(result.summary.fundingRequired,336);assert.equal(result.summary.firstGapMonth,'2027-01');
  assert.equal(result.months[0].financing,0);
});
test('malformed, ambiguous and out-of-range inputs cannot return a forecast',()=>{
  const mutations=[x=>x.drivers.taxRate=-.1,x=>x.drivers.collectionShare=1.1,x=>x.drivers.capexByMonth.pop(),x=>x.openingCash='1000',x=>x.currency='CNY/USD',x=>x.scenarios.push({...x.scenarios[0]}),x=>x.drivers.unknownCost=10,x=>x.drivers.monthlyGrowth=Infinity];
  for(const change of mutations){const source=input();change(source);assert.throws(()=>operating.forecast(source),error=>error.code==='invalid_input');}
});
test('CSV protects user-supplied labels from spreadsheet formulas and preserves negative numbers',()=>{
  const source=input();source.scenarios[0].label='=HYPERLINK("x")';source.openingCash=0;
  const csv=operating.toCsv(operating.forecast(source));assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));assert.ok(csv.includes('"-236"'));assert.equal(csv.split('\r\n').filter(Boolean).length,13);
});
test('explicit CLI accepts stdin and rejects invalid input without emitting a result',()=>{
  const cli=fileURLToPath(new URL('../scripts/forecast-cli.mjs',import.meta.url));
  const good=spawnSync(process.execPath,[cli,'--input-json','-'],{input:JSON.stringify(input()),encoding:'utf8'});
  assert.equal(good.status,0,good.stderr);assert.equal(JSON.parse(good.stdout).scenarios[0].summary.endingCash,3448);
  const bad=spawnSync(process.execPath,[cli,'--input-json','-'],{input:'{"openingCash":null}',encoding:'utf8'});
  assert.equal(bad.status,2);assert.equal(bad.stdout,'');assert.equal(JSON.parse(bad.stderr).status,'invalid_input');
});
