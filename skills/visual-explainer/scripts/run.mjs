import { createHelper, hash, unique, requireValue as assert } from './runtime.mjs';

const xml = text => String(text).replace(/[&<>"']/gu, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' })[char]);
function lines(text, max) { const chars = [...text]; const result = []; for (let i = 0; i < chars.length; i += max) result.push(chars.slice(i, i + max).join('')); return result.length ? result : ['']; }
export const run = createHelper(import.meta.url, 'visual-explainer', (input, policy) => {
  const { diagram } = input;
  const labels=policy.labels[input.locale ?? 'zh-CN'];
  const viewerMinimumWidth=Math.ceil(policy.width*policy.minimumReadableNodeTextPx/policy.nodeFontSize);
  assert(diagram.stages.length <= policy.maxStages && diagram.nodes.length <= policy.maxNodes && diagram.edges.length <= policy.maxEdges, 'Diagram budget exceeded');
  const stages = unique(diagram.stages, 'stages'); const nodes = unique(diagram.nodes, 'nodes'); unique(diagram.edges, 'edges');
  for (const stage of stages.values()) assert([...stage.title].length <= policy.maxStageTitleCharacters, 'Stage title is too long; put detail in its explanation');
  for (const node of nodes.values()) assert(stages.has(node.stageId), 'Node references an unknown stage');
  const stageIndex = new Map(diagram.stages.map((stage, index) => [stage.id, index]));
  const returns = diagram.edges.filter(edge => edge.kind === 'return'); assert(returns.length <= policy.maxReturnEdges, 'Too many return paths for this readable layout');
  for (const edge of diagram.edges) {
    assert([...(edge.label ?? '')].length <= policy.maxEdgeLabelCharacters, 'Edge label is too long; move detail to the stage explanation');
    assert(nodes.has(edge.from) && nodes.has(edge.to), 'Dangling diagram edge');
    assert(edge.from !== edge.to, 'Self loops need a separate explicit stage');
    const a = stageIndex.get(nodes.get(edge.from).stageId); const b = stageIndex.get(nodes.get(edge.to).stageId);
    assert(edge.kind === 'return' ? b < a : b >= a, 'Backward edges must be explicitly marked return');
    assert(edge.kind === 'return' || b <= a + 1, 'This layered layout supports adjacent forward stages; split long forward paths explicitly');
    if (a === b) {
      const row = diagram.nodes.filter(node => node.stageId === nodes.get(edge.from).stageId);
      assert(Math.abs(row.findIndex(node=>node.id===edge.from)-row.findIndex(node=>node.id===edge.to))===1,
        'Same-stage edges must join adjacent nodes; split this path into explicit stages');
    }
  }
  const width = policy.width; const margin = policy.leftGutter; const contentWidth = width - margin * 2;
  const rowHeight = policy.rowHeight; const height = 130 + diagram.stages.length * rowHeight;
  const positions = new Map();
  diagram.stages.forEach((stage, index) => {
    const row = diagram.nodes.filter(node => node.stageId === stage.id);
    assert(row.length >= 1 && row.length <= policy.maxNodesPerStage, 'Each stage must have 1..maxNodesPerStage nodes; split crowded stages');
    const cell = contentWidth / row.length;
    row.forEach((node, column) => positions.set(node.id, { x: margin + cell * (column + .5), y: 146 + index * rowHeight, w: Math.min(policy.nodeWidth, cell - policy.nodeGap), h: policy.nodeHeight, stage: index }));
  });
  const palette = { ...policy.palette, ...(input.palette ?? {}) };
  const font = 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
  const textNode = (text,x,y,attrs='') => `<text x="${x}" y="${y}" ${attrs}>${xml(text)}</text>`;
  const stageMarkup = diagram.stages.map((stage,index)=> `<g data-stage-index="${index}" class="stage"><rect x="${margin-28}" y="${70+index*rowHeight}" width="${contentWidth+56}" height="${rowHeight-26}" rx="14" fill="${index%2 ? palette.panelAlt : palette.panel}" stroke="${palette.border}"/>${textNode(`${index+1} · ${stage.title}`,margin-12,94+index*rowHeight,'font-weight="650" font-size="18"')}</g>`).join('');
  const edgeMarkup = diagram.edges.map(edge => {
    const from = positions.get(edge.from); const to = positions.get(edge.to); let d; let lx; let ly;
    const headerEnd=margin-12+[...`${to.stage+1} · ${diagram.stages[to.stage].title}`].length*18;
    const underHeader=to.y-to.h/2-8;
    if (edge.kind === 'return') { const gutter = margin - 50 - returns.indexOf(edge)*18; const topGap=underHeader-returns.indexOf(edge)*2; const bottomGap=from.y+from.h/2+14; d=`M ${from.x} ${from.y+from.h/2} V ${bottomGap} H ${gutter} V ${topGap} H ${to.x} V ${to.y-to.h/2-5}`; lx=gutter+5; ly=(from.y+to.y)/2; }
    else if (from.stage === to.stage) { const direction = to.x > from.x ? 1 : -1; d=`M ${from.x+direction*from.w/2} ${from.y} H ${to.x-direction*(to.w/2+5)}`; lx=(from.x+to.x)/2; ly=from.y-9; }
    else { const y = from.y+rowHeight*.5; const bend=to.x<=headerEnd+12?`H ${headerEnd+20} V ${underHeader} H ${to.x}`:`H ${to.x}`; d=`M ${from.x} ${from.y+from.h/2} V ${y} ${bend} V ${to.y-to.h/2-5}`; lx=(from.x+to.x)/2; ly=y-6; }
    const color = edge.kind === 'return' ? palette.return : edge.kind === 'decision' ? palette.decision : palette.line;
    const labelX=edge.kind==='return'?lx-13:lx;
    const labelAttributes=edge.kind==='return'?`text-anchor="middle" transform="rotate(-90 ${labelX} ${ly})"`:'';
    return `<g data-stage-index="${Math.max(from.stage,to.stage)}" class="edge"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#${edge.kind})"/>${textNode(edge.label ?? '',labelX,ly,`font-size="13" fill="${color}" ${labelAttributes}`)}</g>`;
  }).join('');
  const nodeMarkup = diagram.nodes.map(node => {
    const p = positions.get(node.id); const labelLines = lines(node.label, Math.max(6, Math.floor(p.w / policy.characterWidth)));
    assert(labelLines.length <= policy.maxLabelLines, `Node ${node.id} label is too long for its readable card`);
    const shape = node.kind === 'decision' ? `<path d="M ${p.x} ${p.y-p.h/2-8} L ${p.x+p.w/2} ${p.y} L ${p.x} ${p.y+p.h/2+8} L ${p.x-p.w/2} ${p.y} Z" fill="${palette.card}" stroke="${palette.decision}"/>` : `<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" rx="10" fill="${palette.card}" stroke="${palette.border}"/>`;
    return `<g data-stage-index="${p.stage}" class="node"><title>${xml(node.id+': '+node.label)}</title>${shape}${labelLines.map((line,index)=>textNode(line,p.x,p.y+(index-(labelLines.length-1)/2)*20+6,`text-anchor="middle" font-size="${policy.nodeFontSize}"`)).join('')}</g>`;
  }).join('');
  const markers = ['flow','return','decision'].map(kind => `<marker id="${kind}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 Z" fill="${kind==='return'?palette.return:kind==='decision'?palette.decision:palette.line}"/></marker>`).join('');
  const titleMarkup=lines(diagram.title,policy.titleLineCharacters).map((line,index)=>textNode(line,width/2,30+index*30,'text-anchor="middle" font-size="27" font-weight="700"')).join('');
  const captionMarkup=lines(input.caption ?? labels.caption,policy.captionLineCharacters).map((line,index)=>textNode(line,width/2,height-34+index*18,'text-anchor="middle" font-size="15"')).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" style="background:${palette.background};font-family:${font};fill:${palette.text}"><title id="title">${xml(diagram.title)}</title><desc id="desc">${xml(diagram.stages.map(stage=>stage.title+'：'+stage.explanation).join('；'))}</desc><rect width="100%" height="100%" fill="${palette.background}"/><defs>${markers}</defs>${titleMarkup}${stageMarkup}${edgeMarkup}${nodeMarkup}${captionMarkup}</svg>`;
  const steps = JSON.stringify(diagram.stages.map(stage => ({ title: stage.title, explanation: stage.explanation }))).replaceAll('<','\\u003c');
  const html = `<!doctype html><html lang="${input.locale ?? 'zh-CN'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xml(diagram.title)}</title><style>*,*::before,*::after{box-sizing:border-box}body{overflow-wrap:anywhere;margin:0;padding:20px;font-family:${font};color:${palette.text};background:${palette.background}}main{width:100%;min-width:0;max-width:1400px;margin:auto}nav{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}button{font:inherit;padding:10px 18px;border:1px solid ${palette.border};border-radius:8px;background:${palette.card};cursor:pointer}button:focus-visible{outline:3px solid ${palette.decision}}.diagram-viewer{width:100%;max-width:100%;overflow-x:auto;overflow-y:hidden;border-radius:12px}.diagram-viewer:focus-visible{outline:3px solid ${palette.decision}}.diagram-viewer svg{display:block;width:100%;min-width:${viewerMinimumWidth}px;height:auto}.pan-hint{font-size:14px;text-align:center;margin:12px auto}.stage,.node,.edge{transition:opacity .3s}.muted{opacity:.14}#detail{min-height:4em;max-width:900px;margin:16px auto;text-align:center}#detail h2{margin:8px}p{line-height:1.7}@media(prefers-reduced-motion:reduce){.stage,.node,.edge{transition:none}}</style><main><nav aria-label="${xml(labels.controls)}"><button id="previous">${xml(labels.previous)}</button><button id="play">${xml(labels.play)}</button><button id="next">${xml(labels.next)}</button><button id="all">${xml(labels.all)}</button></nav><section id="detail" aria-live="polite"><h2>${xml(labels.full)}</h2><p>${xml(labels.hint)}</p></section><p id="diagram-hint" class="pan-hint">${xml(labels.panHint)}</p><div id="diagram-viewer" class="diagram-viewer" role="region" tabindex="0" aria-label="${xml(labels.diagramRegion)}" aria-describedby="diagram-hint">${svg}</div><p>${xml((diagram.sources??[]).map(source=>source.label+'：'+source.ref).join('；'))}</p><noscript>${xml(labels.noScript)}</noscript></main><script>const steps=${steps};const labels=${JSON.stringify(labels).replaceAll('<','\\u003c')};let at=-1,timer=null;const detail=document.getElementById('detail');const play=document.getElementById('play');const viewer=document.getElementById('diagram-viewer');function centerDiagram(){if(viewer)viewer.scrollLeft=Math.max(0,(viewer.scrollWidth-viewer.clientWidth)/2)}centerDiagram();globalThis.addEventListener?.('resize',()=>{if(at<0)centerDiagram()});function stop(){clearInterval(timer);timer=null;play.textContent=labels.play}function show(index){at=index;document.querySelectorAll('[data-stage-index]').forEach(el=>el.classList.toggle('muted',index>=0&&Number(el.dataset.stageIndex)>index));detail.replaceChildren();const h=document.createElement('h2'),p=document.createElement('p');h.textContent=index<0?labels.full:(index+1)+' / '+steps.length+' · '+steps[index].title;p.textContent=index<0?labels.hint:steps[index].explanation;detail.append(h,p);if(index<0)centerDiagram()}function next(){show(at<steps.length-1?at+1:0)}document.getElementById('next').onclick=()=>{stop();next()};document.getElementById('previous').onclick=()=>{stop();show(at<=0?0:at-1)};document.getElementById('all').onclick=()=>{stop();show(-1)};play.onclick=()=>{if(timer){stop();return}next();if(!matchMedia('(prefers-reduced-motion: reduce)').matches){play.textContent=labels.pause;timer=setInterval(()=>{if(at===steps.length-1){stop();return}next()},${policy.stepDurationMs})}};document.addEventListener('keydown',event=>{if(event.target?.closest?.('.diagram-viewer'))return;if(event.key==='ArrowRight'){stop();next()}else if(event.key==='ArrowLeft'){stop();show(at<=0?0:at-1)}});</script></html>`;
  const textAlternative = diagram.stages.map((stage,index)=>`${index+1}. ${stage.title}\n${stage.explanation}\n${diagram.nodes.filter(node=>node.stageId===stage.id).map(node=>'- '+node.label).join('\n')}`).join('\n\n');
  return { result: { diagramSha256: hash(diagram), layout: 'layered', nodePositions: [...positions].map(([id,position])=>({id,...position})),
    files: [{ name:'diagram.svg',mediaType:'image/svg+xml',content:svg,sha256:hash(svg) },{ name:'storyboard.html',mediaType:'text/html',content:html,sha256:hash(html) },{ name:'alternative.txt',mediaType:'text/plain',content:textAlternative,sha256:hash(textAlternative) }],
    sourceSpec: diagram, semanticAccuracy: 'requires_source_review', renderingObserved: 'not_browser_verified', runtimeStatus: 'illustration_only' } };
});
