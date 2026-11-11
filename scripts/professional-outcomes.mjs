#!/usr/bin/env node
// Offline preparation and evidence-based grading. Never starts a model.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import operating from '../agents/financial-modeler/scripts/operating-forecast.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITE = path.join(ROOT, 'evals/professional-outcomes');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const evaluationFingerprint = () => ({
  grader: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  financialReference: sha(fs.readFileSync(path.join(ROOT, 'agents/financial-modeler/scripts/operating-forecast.js')))
});
function taskById(id) {
  const task = readJson(path.join(SUITE, 'tasks.json')).tasks.find(item => item.id === id);
  if (!task) throw new Error(`Unknown task: ${id}`);
  return task;
}
function safeFile(root, relative, limit = 1024 * 1024) {
  if (typeof relative !== 'string' || !relative || relative.length > 300 || path.isAbsolute(relative) || /[\\\0]/.test(relative) || relative.split('/').some(part => ['.', '..', ''].includes(part))) throw new Error('Artifact path must be a relative file inside its output directory');
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symbolic links are not artifact evidence');
  }
  const stat = fs.statSync(current);
  if (!stat.isFile() || stat.size === 0 || stat.size > limit) throw new Error(`Missing, empty or oversized file: ${relative}`);
  return current;
}
function fileHashes(root) {
  const entries = {};
  function walk(relative = '') {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
      const name = [relative, entry.name].filter(Boolean).join('/');
      if (entry.isSymbolicLink()) throw new Error('Inputs and methods must not contain symlinks');
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile()) entries[name] = sha(fs.readFileSync(path.join(root, name)));
    }
  }
  walk(); return entries;
}
export function prepareTrial({ taskId, destination, condition = 'with_method', model = 'unexposed', attempt = 1 }) {
  if (!['baseline', 'with_method'].includes(condition) || !Number.isInteger(attempt) || attempt < 1) throw new Error('Invalid condition or attempt');
  const task = taskById(taskId);
  const directory = path.resolve(destination);
  if (fs.existsSync(directory)) throw new Error('Use a new trial directory; previous runs must not be overwritten');
  fs.mkdirSync(directory, { recursive: true });
  fs.cpSync(path.join(SUITE, task.inputDir), path.join(directory, 'inputs'), { recursive: true, dereference: false });
  fs.mkdirSync(path.join(directory, 'output'));
  let method = null;
  if (condition === 'with_method') {
    const component = path.join(ROOT, 'agents', task.componentId);
    fileHashes(component); // Reject links before copying a method snapshot.
    fs.cpSync(component, path.join(directory, 'method'), { recursive: true, dereference: false });
    method = { componentId: task.componentId, version: readJson(path.join(component, 'capability.json')).componentVersion,
      files: fileHashes(path.join(directory, 'method')) };
  }
  const record = { schemaVersion: 2, runId: crypto.randomUUID(), evaluationFingerprint: evaluationFingerprint(), taskId, condition, attempt, model, createdAt: new Date().toISOString(),
    taskSha256: sha(JSON.stringify(task)), inputFiles: fileHashes(path.join(directory, 'inputs')), method,
    durationMs: null, totalTokens: null, measurement: 'not_supplied_by_host', inputProvenance: 'original_synthetic_file_tasks' };
  fs.writeFileSync(path.join(directory, 'run.json'), JSON.stringify(record, null, 2) + '\n');
  const instruction = condition === 'with_method' ? '先读取 method/AGENT.md，按当前任务使用包内方法与实际可用工具。\n\n' : '';
  fs.writeFileSync(path.join(directory, 'task.json'), JSON.stringify(task, null, 2) + '\n');
  const taskText = instruction + task.prompt + '\n\n原始材料位于 inputs/。只能在 output/ 交付成果，保留输入与运行记录不变。\n';
  fs.writeFileSync(path.join(directory, 'task.md'), taskText);
  record.taskTextSha256 = sha(taskText);
  fs.writeFileSync(path.join(directory, 'run.json'), JSON.stringify(record, null, 2) + '\n');
  return { directory, task: path.join(directory, 'task.md'), inputs: path.join(directory, 'inputs'), output: path.join(directory, 'output') };
}
export function gradeTrial(directory, { reviewFile } = {}) {
  directory = path.resolve(directory);
  const run = readJson(path.join(directory, 'run.json'));
  const task = fs.existsSync(path.join(directory, 'task.json')) ? readJson(safeFile(directory, 'task.json')) : taskById(run.taskId);
  if (task.id !== run.taskId) throw new Error('Frozen task ID differs from run');
  const output = path.join(directory, 'output');
  const checks = [];
  const files = {};
  const frozenEvaluation = run.evaluationFingerprint;
  checks.push({ id: 'frozen-evaluation', status: !frozenEvaluation ? 'not_run' : JSON.stringify(frozenEvaluation) === JSON.stringify(evaluationFingerprint()) ? 'pass' : 'fail', evidence: frozenEvaluation ? 'Grader and financial reference fingerprint compared with preparation' : 'Legacy pilot did not freeze its grader; no complete automatic acceptance claim' });
  const check = (id, fn) => {
    try { const evidence = fn(); checks.push({ id, status: 'pass', evidence: evidence ?? 'observed' }); }
    catch (error) { checks.push({ id, status: 'fail', evidence: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  check('frozen-task-and-inputs', () => {
    assert(run.taskSha256 === sha(JSON.stringify(task)), 'Task/rubric changed after trial preparation');
    if (run.taskTextSha256) assert(run.taskTextSha256 === sha(fs.readFileSync(safeFile(directory, 'task.md'))), 'Visible task prompt changed after preparation');
    assert(JSON.stringify(fileHashes(path.join(directory, 'inputs'))) === JSON.stringify(run.inputFiles), 'Input files changed during the run');
    if (run.method) assert(JSON.stringify(fileHashes(path.join(directory, 'method'))) === JSON.stringify(run.method.files), 'Method snapshot changed during the run');
    return Object.keys(run.inputFiles).map(file => `inputs/${file}`);
  });
  let submission;
  check('submission-manifest', () => {
    submission = readJson(safeFile(output, 'submission.json'));
    assert(submission.artifacts && typeof submission.artifacts === 'object', 'submission.json needs artifacts');
    return 'output/submission.json';
  });
  for (const [name, format] of Object.entries(task.artifacts)) check(`artifact-${name}`, () => {
    const relative = submission?.artifacts?.[name];
    const file = safeFile(output, relative);
    const bytes = fs.readFileSync(file);
    if (format === 'json') JSON.parse(bytes.toString('utf8'));
    if (format === 'html') assert(/<!doctype html|<html[\s>]/i.test(bytes.toString('utf8')), 'Expected an actual HTML document');
    files[name] = file;
    return { path: relative, bytes: bytes.length, sha256: sha(bytes) };
  });
  if (task.id === 'finance-conflict') {
    const expectedInput = readJson(path.join(directory, 'inputs/confirmed-budget.json'));
    const expected = operating.forecast(expectedInput);
    check('finance-12-month-arithmetic', () => {
      assert(files.forecast, 'No forecast artifact');
      const actual = readJson(files.forecast);
      assert(actual.currency === expected.currency, 'Currency changed or is missing');
      assert(Array.isArray(actual.scenarios) && actual.scenarios.length === expected.scenarios.length, 'Missing or extra scenarios');
      let comparisons = 0;
      for (const scenario of expected.scenarios) {
        const observed = actual.scenarios.find(item => item.id === scenario.id);
        assert(observed && Array.isArray(observed.months) && observed.months.length === 12, `Missing twelve months: ${scenario.id}`);
        for (let i = 0; i < 12; i++) {
          assert(observed.months[i].month === scenario.months[i].month, `Month order mismatch: ${scenario.id}/${i}`);
          for (const key of ['revenue','netIncome','receipts','payments','financing','endingCash']) {
            const value = observed.months[i][key];
            assert(typeof value === 'number' && Number.isFinite(value) && Math.abs(value - scenario.months[i][key]) <= .011, `${scenario.id}/${scenario.months[i].month}/${key}: wrong or missing amount`);
            comparisons++;
          }
        }
        for (const key of ['fundingRequired','endingCash']) assert(typeof observed.summary?.[key] === 'number' && Math.abs(observed.summary[key] - scenario.summary[key]) <= .011, `${scenario.id}/summary/${key}: wrong or missing`);
      }
      return { numericComparisons: comparisons, reference: 'pure operating forecast, fixed confirmed input; not an independent financial audit' };
    });
    check('finance-conflicting-source-kept-explicit', () => {
      assert(files.facts, 'No facts artifact');
      const facts = readJson(files.facts);
      const conflict = facts.conflicts?.find(item => item.appliedValue === expectedInput.drivers.variableCostPerUnit && item.alternateValue === 50);
      assert(conflict && ['pending','unresolved','not_approved','待确认','未批准'].includes(conflict.status), 'Unapproved supplier proposal must remain unresolved, not silently replace the confirmed budget');
      assert(typeof conflict.issue === 'string' && conflict.issue.trim(), 'Describe which input is in conflict');
      assert(Array.isArray(conflict.sources) && conflict.sources.some(x=>String(x).includes('confirmed-budget')) && conflict.sources.some(x=>String(x).includes('supplier-proposal')), 'Both source files are required');
      assert(conflict.unit === 'CNY/order' || conflict.unit === 'CNY/单' || conflict.unit === 'CNY元/单', 'Specify a comparable per-order currency unit');
      return conflict;
    });
  }
  if (task.id === 'design-states') check('design-local-resource-closure', () => {
    assert(files.page, 'No page artifact');
    const visited = new Set(), resources = [], dynamic = new Set();
    let embeddedImages = 0;
    const relativeName = file => path.relative(output, file).split(path.sep).join('/');
    const virtualUrl = name => new URL(name.split('/').map(encodeURIComponent).join('/'), 'https://artifact.invalid/');
    const documentBase = virtualUrl(relativeName(files.page));
    const unresolved = (owner, kind) => dynamic.add(`${owner.pathname}: ${kind}`);
    const htmlValue = value => {
      const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', colon: ':', sol: '/', bsol: '\\', tab: '\t', newline: '\n', period: '.' };
      const decoded = value.replace(/&#(x[0-9a-f]+|[0-9]+);?/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1),16) : Number(code)))
        .replace(/&([a-z]+);/gi, (whole, name) => named[name.toLowerCase()] ?? whole);
      assert(!/&[a-z][a-z0-9]+;/i.test(decoded), 'Unsupported HTML character reference in a resource URL');
      return decoded;
    };
    const cssValue = value => value.replace(/\\(?:([0-9a-f]{1,6})\s?|([^\r\n]))/gi, (_, hex, char) => hex ? String.fromCodePoint(parseInt(hex,16)) : char);
    function resource(raw, owner, kind = 'resource') {
      const value = raw.trim();
      if (!value || value.startsWith('#')) return;
      if (/^data:/i.test(value)) {
        assert(kind === 'image' && /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(value), 'Only embedded raster image data URLs are statically accepted');
        embeddedImages++; return;
      }
      assert(!/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(value) && !/[\u0000-\u001f\\]/.test(value), `External, absolute or unsupported resource: ${value}`);
      if(kind==='module')assert(/^\.{1,2}\//.test(value),'Bare module specifiers require an explicit local path and browser resolution review');
      const urlPath=value.split(/[?#]/)[0];
      const decodedPath=decodeURIComponent(urlPath);
      assert(!/[\u0000-\u001f\\]/.test(decodedPath)&&!decodedPath.startsWith('/')&&!/%2f|%5c/i.test(urlPath),`Unsupported encoded resource path: ${value}`);
      const candidate=path.posix.normalize(path.posix.join(path.posix.dirname(decodeURIComponent(owner.pathname).slice(1)),decodedPath));
      assert(candidate!=='..'&&!candidate.startsWith('../'),`Resource escapes the output directory: ${value}`);
      const resolved = new URL(value, owner);
      assert(resolved.origin === documentBase.origin, `External resource: ${value}`);
      const relative = decodeURIComponent(resolved.pathname.slice(1));
      const file = safeFile(output, relative);
      resources.push({ from: owner.pathname, reference: value, path: relative });
      if (visited.has(relative)) return;
      assert(visited.size < 128, 'Too many declared static resources; a bounded browser review is required');
      visited.add(relative);
      const extension = path.extname(relative).toLowerCase();
      if (['.html','.htm','.svg'].includes(extension)) scanHtml(fs.readFileSync(file,'utf8'), virtualUrl(relative));
      else if (extension === '.css'||kind==='stylesheet') scanCss(fs.readFileSync(file,'utf8'), virtualUrl(relative));
      else if (['.js','.mjs','.cjs'].includes(extension)||['script','module'].includes(kind)) scanJs(fs.readFileSync(file,'utf8'), virtualUrl(relative));
    }
    function scanCss(source, owner) {
      const text = source.replace(/\/\*[\s\S]*?\*\//g,'');
      // Decode CSS escapes before recognizing @import/url as well as their values.
      const decoded = cssValue(text);
      for (const match of decoded.matchAll(/@import\s*(["'])([^"']+)\1/gi)) resource(match[2],owner,'stylesheet');
      for (const match of decoded.matchAll(/url\(\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^)]*))\s*\)/gi)) {
        const value = (match[1] ?? match[2] ?? match[3]).trim();
        if (/[()]/.test(value)) unresolved(owner,'computed CSS url()');
        else resource(value,owner,/@import\s*$/i.test(decoded.slice(0,match.index))?'stylesheet':'image');
      }
      for (const match of decoded.matchAll(/(?:-webkit-)?image-set\(([^;}]*)\)/gi)) {
        for (const image of match[1].matchAll(/(?:^|,)\s*(["'])([^"']+)\1/g)) resource(image[2],owner,'image');
      }
      if (/@import\s+(?!["']|url\()/i.test(decoded)) unresolved(owner,'unsupported CSS import expression');
    }
    function jsTokens(source, owner) {
      const result = []; let i = 0;
      while (i < source.length) {
        const char = source[i];
        if (/\s/.test(char)) { i++; continue; }
        if (source.startsWith('//',i)) { const end=source.indexOf('\n',i+2); i=end<0?source.length:end+1; continue; }
        if (source.startsWith('/*',i)) { const end=source.indexOf('*/',i+2); assert(end>=0,'Unterminated JavaScript comment'); i=end+2; continue; }
        if (['"',"'",'`'].includes(char)) {
          const quote=char; let value='', computed=false, closed=false; i++;
          while (i<source.length) {
            const next=source[i++];
            if(next===quote){closed=true;break;}
            if(quote==='`' && next==='$' && source[i]==='{') computed=true;
            if(next!=='\\'){value+=next;continue;}
            const escape=source[i++];
            if(escape==='\r'||escape==='\n'){if(escape==='\r'&&source[i]==='\n')i++;continue;}
            if(escape==='x'||escape==='u') {
              const length=escape==='x'?2:4;
              if(escape==='u'&&source[i]==='{') { const end=source.indexOf('}',i);const hex=source.slice(i+1,end);assert(end>=0&&/^[0-9a-f]{1,6}$/i.test(hex),'Unsupported JavaScript escape');value+=String.fromCodePoint(parseInt(hex,16));i=end+1; }
              else {const hex=source.slice(i,i+length);assert(new RegExp(`^[0-9a-f]{${length}}$`,'i').test(hex),'Unsupported JavaScript escape');value+=String.fromCodePoint(parseInt(hex,16));i+=length;}
            } else {assert(!/[0-9]/.test(escape),'Legacy numeric JavaScript escapes require browser review');value+=({n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'}[escape]??escape);}
          }
          assert(closed,'Unterminated JavaScript string');
          result.push({type:computed?'computed':'string',value}); continue;
        }
        if (/[a-z_$]/i.test(char)) { const match=source.slice(i).match(/^[a-z_$][\w$]*/i)[0];result.push({type:'word',value:match});i+=match.length;continue; }
        // Skip common regular-expression literals rather than treating their text as imports.
        if(char==='/' && (!result.length || ['=','(',':',',','[','!','?',';','{','return','throw','case','>'].includes(result.at(-1).value))) {
          i++; let bracket=false;
          while(i<source.length){const next=source[i++];if(next==='\\'){i++;continue;}if(next==='[')bracket=true;if(next===']')bracket=false;if(next==='/'&&!bracket)break;}
          while(/[a-z]/i.test(source[i]??'')&&i<source.length)i++;
          continue;
        }
        result.push({type:'punct',value:char});i++;
      }
      return result;
    }
    function scanJs(source, owner) {
      const tokens=jsTokens(source,owner);
      const literalCall=(index,base,kind) => {
        const arg=tokens[index+2],after=tokens[index+3];
        if(arg?.type==='string' && [')',','].includes(after?.value)) { resource(arg.value,base,kind);return true; }
        unresolved(owner,`computed ${tokens[index].value}()`);return false;
      };
      for(let i=0;i<tokens.length;i++) {
        const token=tokens[i],next=tokens[i+1]; if(token.type!=='word')continue;
        if(['import','export'].includes(token.value)&&tokens[i-1]?.value!=='.') {
          if(next?.value===':')continue;
          if(next?.value==='.')continue; // import.meta
          if(token.value==='import'&&next?.value==='('){literalCall(i,owner,'module');continue;}
          if(token.value==='import'&&next?.type==='string'){resource(next.value,owner,'module');continue;}
          for(let j=i+1;j<tokens.length&&tokens[j].value!==';';j++)if(tokens[j].type==='word'&&tokens[j].value==='from'&&tokens[j+1]?.type==='string'){resource(tokens[j+1].value,owner,'module');break;}
        }
        if(['fetch','require','importScripts','Worker','SharedWorker'].includes(token.value)&&next?.value==='(') {
          literalCall(i,token.value==='require'?owner:documentBase,token.value==='fetch'?'data':'script');
          if(token.value==='importScripts')for(let j=i+3;j<tokens.length&&tokens[j].value!==')';j++)if(tokens[j].value===','&&tokens[j+1]?.type==='string')resource(tokens[j+1].value,documentBase,'script');
        }
        if(token.value==='URL'&&next?.value==='('&&tokens[i+2]?.type==='string') {
          const base=tokens.slice(i+4,i+9).map(item=>item.value).join('');
          if(/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(tokens[i+2].value)||base==='import.meta.url')resource(tokens[i+2].value,owner,'resource');else unresolved(owner,'URL with a runtime base');
        }
        if(['src','href','poster'].includes(token.value)&&next?.value==='=') {
          if(tokens[i+2]?.type==='string'&&[';',')',',',undefined].includes(tokens[i+3]?.value))resource(tokens[i+2].value,documentBase,token.value==='src'?'image':'resource');
          else unresolved(owner,`runtime ${token.value} assignment`);
        }
        if(token.value==='setAttribute'&&next?.value==='('&&tokens[i+2]?.type==='string'&&['src','href','poster'].includes(tokens[i+2].value)&&tokens[i+3]?.value===','&&tokens[i+4]?.type==='string'&&tokens[i+5]?.value===')')resource(tokens[i+4].value,documentBase,tokens[i+2].value==='src'?'image':'resource');
        if(['innerHTML','outerHTML'].includes(token.value)&&next?.value==='='&&tokens[i+2]?.type==='string'&&[';',')',undefined].includes(tokens[i+3]?.value))scanHtml(tokens[i+2].value,documentBase);
        if(['eval','Function','createElement','setAttribute','write','innerHTML','outerHTML'].includes(token.value)) unresolved(owner,`runtime ${token.value}`);
      }
    }
    function scanHtml(source, owner) {
      let html=source.replace(/<!--[\s\S]*?-->/g,'');
      for(const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi))scanCss(match[1],owner);
      html=html.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
      html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,(whole,attributes,body)=>{
        if(!/\bsrc\s*=/i.test(attributes)&&! /\btype\s*=\s*["'](?:application\/json|application\/ld\+json)["']/i.test(attributes))scanJs(body,owner);
        return `<script${attributes}></script>`;
      });
      for(const match of html.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
        const tag=match[1].toLowerCase(),attributes={};
        for(const attr of match[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+))/g))attributes[attr[1].toLowerCase()]=htmlValue(attr[2]??attr[3]??attr[4]);
        if(tag==='base'&&attributes.href) { assert(!/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(attributes.href),'External or absolute HTML base is not an offline resource'); assert(attributes.href==='.'||attributes.href==='./','HTML base rewriting requires explicit relative resource paths and browser review'); }
        if(attributes.style)scanCss(attributes.style,owner);
        for(const [name,value] of Object.entries(attributes))if(name.startsWith('on'))scanJs(value,owner);
        const names={script:['src','href'],link:['href'],img:['src'],source:['src'],video:['src','poster'],audio:['src'],track:['src'],iframe:['src'],embed:['src'],object:['data'],input:['src'],image:['href','xlink:href'],use:['href','xlink:href']}[tag]??[];
        for(const name of names)if(attributes[name])resource(attributes[name],owner,['img','image','input'].includes(tag)||name==='poster'?'image':tag==='script'?'script':tag==='link'&&attributes.rel?.split(/\s+/).includes('stylesheet')?'stylesheet':'resource');
        if(attributes.srcset) {
          assert(!/data:/i.test(attributes.srcset),'Use src for embedded raster data; srcset data URLs need browser review');
          for(const candidate of attributes.srcset.split(','))resource(candidate.trim().split(/\s+/)[0],owner,'image');
        }
      }
    }
    const entry=relativeName(files.page);visited.add(entry);scanHtml(fs.readFileSync(files.page,'utf8'),documentBase);
    return { coverage:'declared-static-references-only', checkedFiles:[...visited], localResources:resources, embeddedRasterImages:embeddedImages,
      unresolvedDynamicResources:[...dynamic], completeClosureProven:false, browserReviewRequired:true,
      limitation:'Checked declared HTML/CSS/JavaScript references recursively. This bounded scanner is not a complete language parser or execution proof; computed URLs, dynamic DOM loading, runtime resolution, layout and interaction still require an actual browser review. Human checks remain not_run until supplied separately.' };
  });
  if (task.id === 'frontend-resume') check('resume-preserves-user-content-and-behavior', () => {
    assert(files.page, 'No page artifact');
    const source = fs.readFileSync(path.join(directory, 'inputs/index.html'), 'utf8');
    const actual = fs.readFileSync(files.page, 'utf8');
    const expected = source.replace('<h1>编辑文章</h1>', '<h1>继续编辑草稿</h1>');
    assert(actual === expected, 'The authorized one-heading edit must preserve the other source bytes, including the user draft and cancel behavior');
    return 'Observed exact bounded edit on the supplied file; no claim of browser execution';
  });
  const reviewBinding = { runId: run.runId ?? sha(JSON.stringify(run)), taskSha256: run.taskSha256, outputFiles: fileHashes(output) };
  let suppliedReview = null;
  if (reviewFile) {
    suppliedReview = readJson(path.resolve(reviewFile));
    if (suppliedReview.taskId !== task.id || !suppliedReview.reviewer?.id || !Array.isArray(suppliedReview.checks)) throw new Error('Review needs matching taskId, reviewer.id and checks');
    if (JSON.stringify(suppliedReview.binding) !== JSON.stringify(reviewBinding)) throw new Error('Review is stale or belongs to different output bytes/run; review the current artifacts');
  }
  const humanChecks = task.humanCriteria.map(criterion => {
    const observed = suppliedReview?.checks.find(item => item.id === criterion.id);
    const status = observed && ['pass','fail'].includes(observed.status) && typeof observed.evidence === 'string' && observed.evidence.trim() ? observed.status : 'not_run';
    return { ...criterion, status, evidence: status === 'not_run' ? 'Needs an actual artifact/browser review by the host or a separate reviewer' : observed.evidence };
  });
  const failed = [...checks,...humanChecks].some(item => item.status === 'fail');
  const pending = [...checks,...humanChecks].some(item => item.status === 'not_run');
  const report = {
    schemaVersion: 2, reviewBinding, evaluationFingerprint: frozenEvaluation ?? null, taskId: task.id, condition: run.condition, attempt: run.attempt, model: run.model,
    status: failed ? 'fail' : pending ? 'needs_review' : 'task_pass',
    professionalEffect: 'not_evaluated', comparativeEffect: 'not_measured',
    inputProvenance: run.inputProvenance, taskSha256: run.taskSha256,
    methodVersion: run.method?.version ?? null, methodSnapshotSha256: run.method ? sha(JSON.stringify(run.method.files)) : null,
    durationMs: Number.isFinite(run.durationMs) && run.durationMs >= 0 ? run.durationMs : null,
    totalTokens: Number.isFinite(run.totalTokens) && run.totalTokens >= 0 ? run.totalTokens : null,
    measurement: run.measurement, automaticChecks: checks, humanChecks,
    reviewer: suppliedReview?.reviewer ?? null,
    limitations: ['This is one synthetic file task, not package-wide professional certification.',
      'No model is called by this script. Missing host timing or token data stays null.',
      'A submitted review is a recorded reviewer declaration; this script cannot independently prove reviewer identity or blinding.',
      'Artifact files and deterministic calculations do not prove native-host execution or user acceptance.']
  };
  fs.writeFileSync(path.join(directory, 'grade.json'), JSON.stringify(report, null, 2) + '\n');
  return report;
}
export function summarizeTrials(directories) {
  const runs = directories.map(directory => readJson(path.join(path.resolve(directory), 'grade.json')));
  return { schemaVersion: 1, professionalEffect: 'not_evaluated',
    runs: runs.map(run => ({ taskId: run.taskId, condition: run.condition, attempt: run.attempt, model: run.model, status: run.status,
      automaticPasses: run.automaticChecks.filter(item=>item.status==='pass').length, automaticTotal: run.automaticChecks.length,
      humanPasses: run.humanChecks.filter(item=>item.status==='pass').length, humanTotal: run.humanChecks.length,
      durationMs: run.durationMs, totalTokens: run.totalTokens })),
    comparison: runs.some(run=>run.condition==='baseline') && runs.some(run=>run.condition==='with_method') ? 'observed_runs_only_check_same_task_model_attempts_before_comparing' : 'insufficient_conditions',
    conclusion: 'Do not infer a causal or general skill improvement from these rows; inspect actual files, task coverage, repeated attempts and costs.' };
}
function cli() {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'summarize') return summarizeTrials(args);
  const options = {};
  for (let i=0;i<args.length;i+=2) {
    if (!args[i]?.startsWith('--') || !args[i+1] || options[args[i]]) throw new Error('Use named options with one value each');
    options[args[i]]=args[i+1];
  }
  if (command === 'prepare' && options['--task'] && options['--out']) return prepareTrial({ taskId:options['--task'], destination:options['--out'], condition:options['--condition']??'with_method', model:options['--model']??'unexposed', attempt:Number(options['--attempt']??1) });
  if (command === 'grade' && options['--run']) return gradeTrial(options['--run'],{reviewFile:options['--review']});
  throw new Error('Usage: professional-outcomes.mjs prepare --task <id> --out <new-dir> [--condition baseline|with_method] [--model <observed-id>] | grade --run <dir> [--review <file>] | summarize <run-dir>...');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result=cli();process.stdout.write(JSON.stringify(result,null,2)+'\n');
    if(process.argv[2]==='grade') process.exitCode=result.status==='task_pass'?0:result.status==='needs_review'?3:1;
  }
  catch(error) { process.stderr.write(error.message+'\n'); process.exitCode=2; }
}
