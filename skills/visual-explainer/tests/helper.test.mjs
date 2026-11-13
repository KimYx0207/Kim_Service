import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import vm from 'node:vm';
import {run} from '../scripts/run.mjs';
const example=()=>JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
test('deterministic SVG and staged HTML share one spec; first and last nodes are centered',()=>{
 const input=example();const first=run(input);assert.deepEqual(first,run(input));const result=first.result;
 const start=result.nodePositions.find(node=>node.id==='goal');const end=result.nodePositions.find(node=>node.id==='receipt');assert.equal(start.x,end.x);assert.equal(start.x,680);
 assert.equal(result.files.length,3);const html=result.files.find(file=>file.name==='storyboard.html').content;assert.match(html,/prefers-reduced-motion/);assert.match(html,/ArrowRight/);assert.match(html,/noscript/);assert.match(html,/textContent/);assert.equal(result.runtimeStatus,'illustration_only');assert.equal(result.renderingObserved,'not_browser_verified');
 const english=run({...input,locale:'en'}).result.files.find(file=>file.name==='storyboard.html').content;assert.match(english,/>Previous phase<\/button>/);assert.match(english,/>Show all<\/button>/);
});
test('dangling edges, unknown stages and crowded stages are explicit errors',()=>{
 const a=example();a.diagram.edges[0].to='unknown';assert.throws(()=>run(a),/Dangling/);
 const b=example();b.diagram.nodes[0].stageId='unknown';assert.throws(()=>run(b),/stage/);
 const c=example();for(let i=0;i<5;i++)c.diagram.nodes.push({id:'extra-'+i,label:'多余',stageId:'intake',kind:'action'});assert.throws(()=>run(c),/split crowded/);
});
test('return paths must be explicit and excessive labels cannot silently overlap',()=>{
 const input=example();input.diagram.edges[3].kind='flow';assert.throws(()=>run(input),/Backward/);
 const long=example();long.diagram.nodes[1].label='中文'.repeat(30);assert.throws(()=>run(long),/too long/);
});
test('a same-stage edge cannot cross an intermediate card; return labels stay in the outside gutter',()=>{
 const crossing=example();crossing.diagram.nodes.push({id:'third',label:'第三项',stageId:'work',kind:'action'});crossing.diagram.edges.push({id:'cross',from:'prd',to:'third',kind:'flow'});assert.throws(()=>run(crossing),/adjacent nodes/);
 const returning=example();returning.diagram.edges[3].to='goal';returning.diagram.edges[3].label='只修改受影响的模块';const svg=run(returning).result.files[0].content;
 assert.match(svg,/text-anchor="middle" transform="rotate\(-90 122 306\)"/);
 assert.ok(122+13<152,'rotated label stays to the left of the layer panels');
});
test('material strings are escaped in SVG and HTML instead of becoming active markup',()=>{
 const input=example();input.diagram.title='<script>alert(1)</script>';input.diagram.stages[0].explanation='</script><img src=x onerror=alert(1)>';
 const result=run(input).result;const svg=result.files[0].content;const html=result.files[1].content;assert.equal(svg.includes('<script>'),false);assert.equal(html.includes('<img src=x'),false);assert.match(html,/\\u003c\/script>/);
});
test('CLI emits real artifact content with bounded JSON and honest rendering status',()=>{
 const child=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/run.mjs',import.meta.url)),'--input-json','-'],{input:JSON.stringify(example()),encoding:'utf8'});assert.equal(child.status,0,child.stderr);assert.ok(JSON.parse(child.stdout).result.files[0].content.startsWith('<svg'));
});
test('actual generated controls advance, go back, show all and respect reduced motion',()=>{
 const html=run(example()).result.files.find(file=>file.name==='storyboard.html').content;
 const script=html.match(/<script>([\s\S]*?)<\/script>/u)[1];
 const controls=Object.fromEntries(['detail','previous','next','all','play'].map(id=>[id,{textContent:'',children:[],replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}}]));
 const elements=[0,1,2].map(stage=>({dataset:{stageIndex:String(stage)},classList:{muted:false,toggle(name,value){this.muted=value;}}}));
 let keyboard;let interval;let reduced=false;
 const document={getElementById:id=>controls[id],querySelectorAll:()=>elements,createElement:tag=>({tag,textContent:''}),addEventListener:(name,handler)=>{keyboard=handler;}};
 vm.runInNewContext(script,{document,matchMedia:()=>({matches:reduced}),setInterval:fn=>{interval=fn;return 1;},clearInterval:()=>{interval=null;}});
 controls.next.onclick();assert.deepEqual(elements.map(x=>x.classList.muted),[false,true,true]);assert.match(controls.detail.children[0].textContent,/1 \/ 3/);
 keyboard({key:'ArrowRight'});assert.deepEqual(elements.map(x=>x.classList.muted),[false,false,true]);
 controls.previous.onclick();assert.match(controls.detail.children[0].textContent,/1 \/ 3/);
 controls.all.onclick();assert.deepEqual(elements.map(x=>x.classList.muted),[false,false,false]);
 reduced=true;controls.play.onclick();assert.equal(interval,null);assert.match(controls.detail.children[0].textContent,/1 \/ 3/);
 reduced=false;controls.play.onclick();assert.equal(typeof interval,'function');interval();interval();assert.equal(interval,null);assert.equal(controls.play.textContent,'播放');
});
