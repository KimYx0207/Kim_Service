import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareTrial, gradeTrial, summarizeTrials } from './professional-outcomes.mjs';
import operating from '../agents/financial-modeler/scripts/operating-forecast.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function trial(t,id='finance-conflict'){
  const base=fs.mkdtempSync(path.join(root,'.outcome-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const dir=path.join(base,'trial');prepareTrial({taskId:id,destination:dir,condition:'baseline',model:'deterministic-test-fixture-not-a-model'});return dir;
}
function completeFinance(dir){
  const input=JSON.parse(fs.readFileSync(path.join(dir,'inputs/confirmed-budget.json'),'utf8'));
  const write=(name,value)=>fs.writeFileSync(path.join(dir,'output',name),typeof value==='string'?value:JSON.stringify(value));
  write('forecast.json',operating.forecast(input));write('decision.md','Synthetic test fixture; real judgment remains unreviewed.');
  write('facts.json',{conflicts:[{issue:'variable-cost',sources:['confirmed-budget.json','supplier-proposal.md'],status:'unresolved',appliedValue:45,alternateValue:50,unit:'CNY/order'}]});
  write('submission.json',{artifacts:{forecast:'forecast.json',decision:'decision.md',facts:'facts.json'},professionalEffect:'claimed-pass-is-not-evidence'});
}
test('real files and correct arithmetic still require actual qualitative review',t=>{
  const dir=trial(t);completeFinance(dir);const report=gradeTrial(dir);
  assert.ok(report.automaticChecks.every(check=>check.status==='pass'));assert.equal(report.status,'needs_review');
  assert.equal(report.professionalEffect,'not_evaluated');assert.equal(report.durationMs,null);assert.equal(report.totalTokens,null);
  assert.ok(report.humanChecks.every(check=>check.status==='not_run'));
});
test('wrong cash cannot pass because the artifact exists or reports its own success',t=>{
  const dir=trial(t);completeFinance(dir);const file=path.join(dir,'output/forecast.json');const value=JSON.parse(fs.readFileSync(file,'utf8'));value.scenarios[0].months[1].endingCash+=100;fs.writeFileSync(file,JSON.stringify(value));
  const report=gradeTrial(dir);assert.equal(report.status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='finance-12-month-arithmetic').status,'fail');
});
test('a missing artifact or an escaping artifact reference is rejected',t=>{
  const dir=trial(t);completeFinance(dir);fs.writeFileSync(path.join(dir,'output/submission.json'),JSON.stringify({artifacts:{forecast:'../inputs/confirmed-budget.json',decision:'missing.md',facts:'facts.json'}}));
  const report=gradeTrial(dir);assert.equal(report.status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='artifact-forecast').status,'fail');assert.equal(report.automaticChecks.find(x=>x.id==='artifact-decision').status,'fail');
});
test('input changes do not silently change the reference answer for an existing run',t=>{
  const dir=trial(t);completeFinance(dir);fs.appendFileSync(path.join(dir,'inputs/supplier-proposal.md'),'changed');
  const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'fail');
});
test('with-method trials freeze the actual package and detect later snapshot edits',t=>{
  const base=fs.mkdtempSync(path.join(root,'.outcome-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));const dir=path.join(base,'trial');
  prepareTrial({taskId:'finance-conflict',destination:dir,condition:'with_method',model:'test-fixture'});completeFinance(dir);
  const run=JSON.parse(fs.readFileSync(path.join(dir,'run.json'),'utf8'));assert.equal(run.method.componentId,'financial-modeler');assert.ok(run.method.files['AGENT.md']);
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'pass');
  fs.appendFileSync(path.join(dir,'method/AGENT.md'),'changed during run');assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='frozen-task-and-inputs').status,'fail');
});
test('design external dependencies are not an offline deliverable and layout is never auto-passed',t=>{
  const dir=trial(t,'design-states');const out=path.join(dir,'output');
  fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html><script src="https://example.test/code.js"></script></html>');
  fs.writeFileSync(path.join(out,'tokens.json'),'{}');fs.writeFileSync(path.join(out,'handoff.md'),'Synthetic fixture');
  fs.writeFileSync(path.join(out,'submission.json'),JSON.stringify({artifacts:{page:'index.html',tokens:'tokens.json',handoff:'handoff.md'}}));
  const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(x=>x.id==='design-local-resource-closure').status,'fail');assert.ok(report.humanChecks.every(x=>x.status==='not_run'));
});
test('resuming a heading edit preserves the user draft and existing cancel code',t=>{
  const dir=trial(t,'frontend-resume');const source=fs.readFileSync(path.join(dir,'inputs/index.html'),'utf8');const out=path.join(dir,'output');
  fs.writeFileSync(path.join(out,'index.html'),source.replace('<h1>编辑文章</h1>','<h1>继续编辑草稿</h1>'));fs.writeFileSync(path.join(out,'handoff.md'),'Changed heading only.');fs.writeFileSync(path.join(out,'submission.json'),JSON.stringify({artifacts:{page:'index.html',handoff:'handoff.md'}}));
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='resume-preserves-user-content-and-behavior').status,'pass');
  fs.writeFileSync(path.join(out,'index.html'),source.replace('用户已修改：请保留这段正文。',''));
  assert.equal(gradeTrial(dir).automaticChecks.find(x=>x.id==='resume-preserves-user-content-and-behavior').status,'fail');
});

function completeDesign(dir, artifacts) {
  const out=path.join(dir,'output');
  const content={
    'index.html':'<!doctype html><html><body>Local synthetic page</body></html>',
    'tokens.json':'{}','handoff.md':'Synthetic static-reference fixture; no browser review claimed.',...artifacts
  };
  for(const [name,value] of Object.entries(content)){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,value);}
  fs.writeFileSync(path.join(out,'submission.json'),JSON.stringify({artifacts:{page:'index.html',tokens:'tokens.json',handoff:'handoff.md'}}));
}
const resourceCheck=report=>report.automaticChecks.find(item=>item.id==='design-local-resource-closure');
test('design follows nested CSS imports and catches missing images, encoded external URLs and escapes',t=>{
  const cases=[
    ['@import "https://example.invalid/remote.css";',/External/],
    ['.hero{background:url(missing.png)}',/ENOENT|Missing/],
    ['@import url("https://example.invalid/remote.css");',/External/],
    ['.hero{background:url(\\68 ttps\\3a \/\/example.invalid/image.png)}',/External/],
    ['@import "../../outside.css";',/escapes/],
    ['@import "%2e%2e/%2e%2e/outside.css";',/escapes/]
  ];
  for(const [badCss,error] of cases){
    const dir=trial(t,'design-states');completeDesign(dir,{
      'index.html':'<!doctype html><html><link rel="stylesheet" href="styles.css"></html>',
      'styles.css':'@import "nested/theme.css";', 'nested/theme.css':badCss,
      // An inside-root namesake must not hide a URL which escapes in a file browser.
      'outside.css':'body{color:black}'
    });
    const report=gradeTrial(dir),check=resourceCheck(report);assert.equal(check.status,'fail',badCss);assert.match(check.evidence,error);assert.ok(report.humanChecks.every(item=>item.status==='not_run'));
  }
});
test('design follows JS modules, re-exports, literal dynamic imports and module-relative URL assets',t=>{
  const cases=[
    ["import './missing.js';",/ENOENT|Missing/],
    ["export {x} from 'https://example.invalid/export.js';",/External/],
    ["import('https://example.invalid/dynamic.js');",/External/],
    ["const image=new URL('./missing.png', import.meta.url);",/ENOENT|Missing/],
    ["const image=new URL('https://example.invalid/image.png', runtimeBase);",/External/],
    ["image.setAttribute('src', 'https://example.invalid/image.png');",/External/],
    ["panel.innerHTML='<img src=\"https://example.invalid/image.png\">';",/External/],
    ["import('../../escape.js');",/escapes/],
    ["import('\\u0068ttps://example.invalid/escaped.js');",/External/]
  ];
  for(const [nested,error] of cases){
    const dir=trial(t,'design-states');completeDesign(dir,{
      'index.html':'<!doctype html><html><script type="module" src="app.mjs"></script></html>',
      'app.mjs':"export {x} from './modules/feature.mjs';",'modules/feature.mjs':nested
    });
    const check=resourceCheck(gradeTrial(dir));assert.equal(check.status,'fail',nested);assert.match(check.evidence,error);
  }
});
test('closed declared static references recurse through cycles without claiming dynamic or browser proof',t=>{
  const dir=trial(t,'design-states');completeDesign(dir,{
    'index.html':'<!doctype html><html><link rel="stylesheet" href="styles.css"><script type="module" src="app.mjs"></script><img src="data:image/png;base64,aW1hZ2U="></html>',
    'styles.css':'@import "nested/theme.css"; .hero{background:url("image.png")}',
    'nested/theme.css':'@import "../styles.css";', 'image.png':Buffer.from('synthetic-image-bytes'),
    'app.mjs':"import './modules/feature.mjs'; const text=\"import 'https://not-a-resource.invalid'\"; import(chosenModule); document.createElement('img');",
    'modules/feature.mjs':"export {value} from '../app.mjs';"
  });
  const report=gradeTrial(dir),check=resourceCheck(report);assert.equal(check.status,'pass',check.evidence);
  assert.ok(check.evidence.checkedFiles.includes('nested/theme.css'));assert.ok(check.evidence.checkedFiles.includes('modules/feature.mjs'));
  assert.equal(check.evidence.embeddedRasterImages,1);assert.equal(check.evidence.completeClosureProven,false);assert.equal(check.evidence.browserReviewRequired,true);
  assert.ok(check.evidence.unresolvedDynamicResources.some(item=>item.includes('computed import')));assert.equal(report.status,'needs_review');assert.ok(report.humanChecks.every(item=>item.status==='not_run'));
});
test('inline CSS, unquoted HTML references and entity-escaped external resources are checked',t=>{
  for(const html of [
    '<!doctype html><html><style>@import "https://example.invalid/x.css";</style></html>',
    '<!doctype html><html><script src=https://example.invalid/x.js></script></html>',
    '<!doctype html><html><img src="https&#58;//example.invalid/a.png"></html>',
    '<!doctype html><html><div style="background:url(missing.png)">x</div></html>'
  ]){const dir=trial(t,'design-states');completeDesign(dir,{'index.html':html});assert.equal(resourceCheck(gradeTrial(dir)).status,'fail');}
});
function reviewFor(dir, report=gradeTrial(dir)) {
  const file=path.join(dir,'independent-review.json');
  fs.writeFileSync(file,JSON.stringify({taskId:report.taskId,binding:report.reviewBinding,reviewer:{id:'deterministic-review-fixture-not-a-human',blinded:false},checks:report.humanChecks.map(item=>({id:item.id,status:'pass',evidence:'Synthetic test-only review record; verifies binding mechanics, not real output quality.'}))}));
  return file;
}
test('reviewBinding accepts the same bytes but rejects cross-run reuse of identical artifacts',t=>{
  const first=trial(t),second=trial(t);completeFinance(first);completeFinance(second);
  const review=reviewFor(first);assert.equal(gradeTrial(first,{reviewFile:review}).status,'task_pass');
  assert.throws(()=>gradeTrial(second,{reviewFile:review}),/stale|different output bytes\/run/);
});
test('reviewBinding becomes invalid after an artifact or its submission mapping changes',t=>{
  for(const mutate of [
    dir=>fs.appendFileSync(path.join(dir,'output/decision.md'),' Changed after review.'),
    dir=>{const file=path.join(dir,'output/submission.json');const value=JSON.parse(fs.readFileSync(file,'utf8'));value.note='changed mapping record';fs.writeFileSync(file,JSON.stringify(value));}
  ]){const dir=trial(t);completeFinance(dir);const review=reviewFor(dir);mutate(dir);assert.throws(()=>gradeTrial(dir,{reviewFile:review}),/stale|different output bytes\/run/);}
});
test('evaluationFingerprint mismatch fails, while missing legacy fingerprints remain not_run',t=>{
  for(const field of ['grader','financialReference']){
    const dir=trial(t);completeFinance(dir);const file=path.join(dir,'run.json');const run=JSON.parse(fs.readFileSync(file,'utf8'));run.evaluationFingerprint[field]='0'.repeat(64);fs.writeFileSync(file,JSON.stringify(run));
    const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(item=>item.id==='frozen-evaluation').status,'fail');assert.equal(report.status,'fail');
  }
  const dir=trial(t);completeFinance(dir);const file=path.join(dir,'run.json');const run=JSON.parse(fs.readFileSync(file,'utf8'));delete run.evaluationFingerprint;fs.writeFileSync(file,JSON.stringify(run));
  const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(item=>item.id==='frozen-evaluation').status,'not_run');assert.equal(report.status,'needs_review');
});
test('visible task.md and frozen task.json changes fail their recorded task fingerprints',t=>{
  for(const filename of ['task.md','task.json']){
    const dir=trial(t);completeFinance(dir);const file=path.join(dir,filename);
    if(filename==='task.md')fs.appendFileSync(file,'\nChanged task instructions after preparation.');
    else {const value=JSON.parse(fs.readFileSync(file,'utf8'));value.prompt+=' Changed rubric prompt.';fs.writeFileSync(file,JSON.stringify(value));}
    const report=gradeTrial(dir);assert.equal(report.automaticChecks.find(item=>item.id==='frozen-task-and-inputs').status,'fail');assert.equal(report.status,'fail');
  }
});

test('summaries retain recorded grades but never reuse acceptance after artifact changes',t=>{
  const dir=trial(t);completeFinance(dir);const review=reviewFor(dir);
  gradeTrial(dir,{reviewFile:review});
  assert.equal(summarizeTrials([dir]).runs[0].status,'task_pass');
  const gradePath=path.join(dir,'grade.json'),recorded=fs.readFileSync(gradePath,'utf8');
  const file=path.join(dir,'output/forecast.json'),forecast=JSON.parse(fs.readFileSync(file,'utf8'));
  forecast.scenarios[0].months[1].endingCash+=100;fs.writeFileSync(file,JSON.stringify(forecast));
  const summary=summarizeTrials([dir]).runs[0];
  assert.equal(summary.status,'needs_regrade');assert.equal(summary.recordedStatus,'task_pass');
  assert.equal(summary.freshness,'changed');assert.equal(summary.automaticPasses,null);
  assert.equal(fs.readFileSync(gradePath,'utf8'),recorded,'Summarizing must not rewrite historical evidence');
  assert.equal(gradeTrial(dir).status,'fail');
  assert.equal(summarizeTrials([dir]).runs[0].status,'fail');
});

test('summary freshness covers task, inputs, method, model metadata and added supporting files',t=>{
  const changes=[
    dir=>fs.appendFileSync(path.join(dir,'task.md'),'Changed task'),
    dir=>fs.appendFileSync(path.join(dir,'inputs/supplier-proposal.md'),'Changed input'),
    dir=>fs.appendFileSync(path.join(dir,'method/AGENT.md'),'Changed method'),
    dir=>{const file=path.join(dir,'run.json'),run=JSON.parse(fs.readFileSync(file,'utf8'));run.model='different-model';fs.writeFileSync(file,JSON.stringify(run));},
    dir=>fs.writeFileSync(path.join(dir,'output/new-context.md'),'New supporting artifact')
  ];
  for(const change of changes){
    const base=fs.mkdtempSync(path.join(root,'.outcome-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
    const dir=path.join(base,'trial');prepareTrial({taskId:'finance-conflict',destination:dir,condition:'with_method',model:'test-fixture'});completeFinance(dir);
    gradeTrial(dir,{reviewFile:reviewFor(dir)});change(dir);
    assert.equal(summarizeTrials([dir]).runs[0].status,'needs_regrade');
  }
});

test('missing old snapshots and unreadable current evidence remain reviewable history',t=>{
  const dir=trial(t);completeFinance(dir);gradeTrial(dir,{reviewFile:reviewFor(dir)});
  const file=path.join(dir,'grade.json'),grade=JSON.parse(fs.readFileSync(file,'utf8'));
  delete grade.acceptanceSnapshotSha256;fs.writeFileSync(file,JSON.stringify(grade));
  const before=fs.readFileSync(file,'utf8'),legacy=summarizeTrials([dir]).runs[0];
  assert.equal(legacy.status,'needs_regrade');assert.equal(legacy.freshness,'unverifiable');
  assert.equal(fs.readFileSync(file,'utf8'),before);
  gradeTrial(dir,{reviewFile:reviewFor(dir)});fs.rmSync(path.join(dir,'inputs'),{recursive:true});
  const missing=summarizeTrials([dir]).runs[0];
  assert.equal(missing.status,'needs_regrade');assert.equal(missing.freshness,'unavailable');
});

test('prototype-named supporting files participate in artifact review and summary freshness',t=>{
  const dir=trial(t);completeFinance(dir);
  const support=path.join(dir,'output','__proto__');fs.writeFileSync(support,'Supporting evidence before review');
  const report=gradeTrial(dir);
  assert.ok(Object.hasOwn(report.reviewBinding.outputFiles,'__proto__'));
  gradeTrial(dir,{reviewFile:reviewFor(dir,report)});
  assert.equal(summarizeTrials([dir]).runs[0].status,'task_pass');
  fs.writeFileSync(support,'Changed supporting evidence after review');
  const summary=summarizeTrials([dir]).runs[0];
  assert.equal(summary.status,'needs_regrade');assert.equal(summary.freshness,'changed');
  assert.equal(summary.recordedStatus,'task_pass');
});
