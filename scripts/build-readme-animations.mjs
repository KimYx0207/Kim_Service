#!/usr/bin/env node
/** Build self-contained, localized SVG explanations used directly in the README. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
if (process.argv.slice(2).some((value) => value !== '--check')) throw new Error('Usage: node scripts/build-readme-animations.mjs [--check]');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'generated/capabilities.json'), 'utf8'));
const counts = Object.fromEntries(['agent', 'skill', 'hook', 'tool'].map(type => [type,
  String(catalog.components.filter(component => component.componentType === type).length)]));
const C = { ink: '#17263f', muted: '#566782', blue: '#2968e8', teal: '#0d9488', purple: '#7c56d8', orange: '#ce7b24', line: '#dbe4f0' };
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const copy = {
  'zh-CN': {
    cap: { title: '围绕一个任务，选一组方法', sub: '能力思维导图 · 按需要组合，不必一次全用', goal: '未来 12 个月，现金够不够？', goalSub: '先说清想得到的结果，再选择专业方法',
      cards: [ ['Agent', counts.agent, '完成专业任务', '例如：财务建模'], ['Skill', counts.skill, '做好关键步骤', '例如：情景比较'], ['Hook', counts.hook, '整理工作要求', '按需配置后生效'], ['Tool', counts.tool, '连接执行工具', '使用客户端的工具'] ],
      phases: ['从目标检索，先看角色需要什么材料', '阅读案例，再补上需要的专业步骤', 'Hook 和工具按实际需要配置', '把目标、材料、方法组成这次请求'],
      foot: '这次带给 AI 的完整请求', footLines: ['目标与材料 · 所选方法 · 交付文件 · 检查要求'] },
    delivery: { title: '从经营资料，到可复算的结果', sub: '经营预测流程示意 · 亮线展示这一轮走到哪里',
      cards: [ ['说清目标，搜索任务', ['想知道明年现金够不够', '在任务浏览器搜索“经营预测”']], ['核对材料与示例', ['看财务建模的输入、输出和完整案例', '准备报表、销量、成本与回款假设']], ['选用方法，交给 AI', ['让 AI 读完整方法，复制这次请求', '常用方法按客户端需要安装']], ['按专业方法计算', ['先统一期间、币种、单位', '连接收入、成本、回款，比较三种情景']], ['打开文件，复算验收', ['抽查：期初现金＋流入－流出', '确认情景差异与文件能否实际打开']], ['保留成果，继续下一轮', ['输入 JSON · 结果 JSON · 月度 CSV', '保存已确认的假设、待核项和下一步']] ],
      phases: ['1 / 用要得到的结果搜索任务', '2 / 看懂示例，补齐本次需要的材料', '3 / 选用方法，让当前 AI 客户端执行', '4 / 先核口径，再计算三种情景', '5 / 实际打开和复算，查清异常原因', '6 / 留下可继续的结果，修改时有依据'],
      iterate: '把当月回款从 65% 改成 45%？', iterateSub: '改输入 → 重算相关结果 → 再检查', note: '示例假设；实际处理发生在 AI 客户端中' },
    collaboration: { title: 'Meta 安排工作，Service 提供方法', sub: '同一份 PRD 分两轮展开，再按依赖安排任务',
      goal: ['目标与验收要求', '把预约页做成可继续开发的产品'], plan: ['第一轮 PRD：系统与模块大纲', '定范围、模块边界和共同约定'], detail: ['第二轮 PRD：逐模块详细设计', '明确页面状态、接口字段和验收方法'],
      a: ['页面与交互', '使用设计、前端等方法', '实现已确定的页面状态'], b: ['接口与数据', '使用后端、数据等方法', '实现已确定的数据约定'],
      a2: ['独立部分继续', '样式、错误提示照常完成'], b2: ['新增字段待确认', '受影响的接口暂时等待'], b3: ['字段确认，接续', '保留已完成的部分'],
      join: ['条件补齐后汇合，检查完整体验', '把页面与接口接起来，按真实用户路径验收'],
      phases: ['先定系统范围、模块和共同约定', '逐模块写清要做什么、怎样验收', '前提具备，独立分支开始并行', '中途补充字段，只等待受影响分支', '字段明确后接续，其他成果保留', '汇合验证完整体验，保存下一步'],
      foot: '实际执行与并发能力，由当前 AI 客户端提供' }
  },
  en: {
    cap: { title: 'Choose methods around the task', sub: 'Capability map · combine only the parts you need', goal: 'Will cash last through the next 12 months?', goalSub: 'Describe the result, then choose the professional method',
      cards: [ ['Agent', counts.agent, 'Complete the task', 'Financial modeling'], ['Skill', counts.skill, 'Support one step', 'Scenario analysis'], ['Hook', counts.hook, 'Clarify the request', 'Configure when useful'], ['Tool', counts.tool, 'Connect tools', 'Use the current client'] ],
      phases: ['Search by goal; inspect the inputs the role needs', 'Read an example and choose relevant Skills', 'Configure Hooks and tools when useful', 'Combine the goal, materials, and method'],
      foot: 'A complete request for this task', footLines: ['Goal + materials · method · files · acceptance checks'] },
    delivery: { title: 'From business data to usable results', sub: 'Forecast workflow · the bright path shows the current step',
      cards: [ ['Describe the goal and search', ['Will cash last through the next year?', 'Search the task browser for a forecast']], ['Check the inputs and example', ['Read the role’s inputs, outputs, and example', 'Bring statements, sales, costs, collections']], ['Select a method and use your AI', ['Load the full method; paste your request', 'Install a reusable entry when useful']], ['Calculate with the method', ['Align periods, currency, and units first', 'Connect profit and cash; compare scenarios']], ['Open files and verify results', ['Check: opening cash + receipts − payments', 'Inspect scenario changes and actual files']], ['Keep results for the next revision', ['Input JSON · result JSON · monthly CSV', 'Save decisions, unresolved items, next steps']] ],
      phases: ['1 / Search for the result you want', '2 / Inspect the example and prepare the inputs', '3 / Give the method to your current AI client', '4 / Reconcile inputs, then calculate scenarios', '5 / Open and recalculate; investigate any gaps', '6 / Preserve a result you can continue from'],
      iterate: 'Change collections: 65% → 45%?', iterateSub: 'Edit inputs → recalculate → check again', note: 'Example assumptions; the AI client performs the work' },
    collaboration: { title: 'Meta plans. Service supplies methods.', sub: 'One PRD, two passes; dependencies determine the order',
      goal: ['Goal and acceptance criteria', 'Turn a booking page into a working product'], plan: ['PRD pass 1: system and modules', 'Set the scope, boundaries, and shared contracts'], detail: ['PRD pass 2: each module in detail', 'Define page states, interface fields, and checks'],
      a: ['Page + interaction', 'Design + frontend', 'Agreed page states'], b: ['Interface + data', 'Backend + data', 'Agreed data contracts'],
      a2: ['Work continues', 'Styles and error messages'], b2: ['New field pending', 'Affected interface waits'], b3: ['Field agreed', 'Resume remaining work'],
      join: ['Check the complete user journey', 'Resolve the gap, then connect page and interface'],
      phases: ['Agree on system scope and shared contracts', 'Detail each module and its acceptance checks', 'Start independent branches when ready', 'A new field pauses only the affected branch', 'Resolve the field; resume from completed work', 'Verify the joined result and save the next step'],
      foot: 'The current AI client provides execution and concurrency' }
  }
};

function keyframes(index, count) {
  const a = index * 100 / count, b = (index + 1) * 100 / count;
  return `@keyframes phase${index}{0%,${a.toFixed(3)}%{opacity:0}${(a + 1.6).toFixed(3)}%,${(b - 1.6).toFixed(3)}%{opacity:1}${b.toFixed(3)}%,100%{opacity:0}}`;
}
function styles(count, duration) {
  return `<style>
    text{font-family:Arial,"Noto Sans CJK SC","Microsoft YaHei",sans-serif;fill:${C.ink}}
    .title{font-size:40px;font-weight:700;letter-spacing:-.5px}.sub{font-size:26px;fill:${C.muted}}
    .label{font-size:36px;font-weight:700}.body{font-size:32px}.note{font-size:28px;fill:${C.muted}}
    .tiny{font-size:22px;fill:${C.muted}}.center{text-anchor:middle}
    .route{fill:none;stroke:${C.line};stroke-width:4;stroke-linecap:round;stroke-linejoin:round}
    .focus{fill:none;stroke-width:4;opacity:0}.trail{fill:none;stroke-width:5;stroke-linecap:round;stroke-dasharray:16 11;opacity:0}
    .phase-copy,.moving-dot{opacity:0}.steady{opacity:0}.phase{animation-duration:${duration}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .after{opacity:0;animation-duration:${duration}s;animation-iteration-count:infinite}.before{animation-duration:${duration}s;animation-iteration-count:infinite}.grow{transform-box:fill-box;transform-origin:left center;transform:scaleX(0);animation-duration:${duration}s;animation-iteration-count:infinite}
    ${Array.from({length:count},(_,i)=>{
      const start=i*100/count,finish=Math.min(94,(i+1)*100/count-2);
      return `@keyframes done${i}{0%,${start+4}%{opacity:0}${finish}%,97%{opacity:1}100%{opacity:0}}@keyframes pending${i}{0%,${start+4}%{opacity:1}${finish}%,97%{opacity:0}100%{opacity:1}}@keyframes fill${i}{0%,${start+2}%{transform:scaleX(0)}${finish}%,97%{transform:scaleX(1)}100%{transform:scaleX(0)}}.after.d${i}{animation-name:done${i}}.before.d${i}{animation-name:pending${i}}.grow.d${i}{animation-name:fill${i}}`;
    }).join('\n')}
    ${Array.from({length:count},(_,i)=>keyframes(i,count)+`.p${i}{animation-name:phase${i}}.trail.p${i}{animation-name:phase${i},stream;animation-duration:${duration}s,1.4s}`).join('\n')}
    @keyframes stream{to{stroke-dashoffset:-54}}
    @keyframes field-wait{0%,69%{opacity:1}70%,98%{opacity:0}100%{opacity:1}}
    @keyframes field-ready{0%,71%{opacity:0}72%,97%{opacity:1}98%,100%{opacity:0}}
    .swap.before{animation-name:field-wait}.swap.after{animation-name:field-ready}
    @media(prefers-reduced-motion:reduce){.phase,.after,.before,.grow{animation:none}.focus{opacity:.28}.trail{display:none}.phase-copy{display:none}.steady,.after{opacity:1}.before,.moving-dot{display:none}.grow{transform:scaleX(1)}}
    @media print{.phase,.after,.before,.grow{animation:none}.focus{opacity:.28}.trail,.phase-copy,.before,.moving-dot{display:none}.steady,.after{opacity:1}.grow{transform:scaleX(1)}}
  </style>`;
}
function text(x,y,value,cls='body',fill) {
  return `<text x="${x}" y="${y}" class="${cls}"${fill ? ` style="fill:${fill}"`:''}>${esc(value)}</text>`;
}
function lines(x,y,values,cls='body',gap=39) { return values.map((value,i)=>text(x,y+i*gap,value,cls)).join(''); }
function panel(x,y,w,h,color=C.blue,phase=0,fill='#fff') {
  return `<rect x="${x}" y="${y+3}" width="${w}" height="${h}" rx="22" fill="#e8eef7" opacity=".7"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="${fill}" stroke="${C.line}" stroke-width="2"/><rect class="focus phase p${phase}" x="${x}" y="${y}" width="${w}" height="${h}" rx="22" stroke="${color}"/>`;
}
function route(d,phase,color=C.blue) { return `<path class="route" d="${d}"/><path class="trail phase p${phase}" d="${d}" stroke="${color}"/><circle class="moving-dot phase p${phase}" r="6" fill="${color}"><animateMotion path="${d}" dur="2.7s" repeatCount="indefinite"/></circle>`; }
function arrow(x,y,color=C.blue) { return `<path d="M${x-7} ${y-9} L${x} ${y} L${x+7} ${y-9}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`; }
function phaseBar(y,phaseTexts,steady) {
  return `<rect x="48" y="${y}" width="864" height="69" rx="18" fill="#eaf0fb"/>${text(480,y+44,steady,'note center steady')}${phaseTexts.map((t,i)=>text(480,y+44,t,`note center phase-copy phase p${i}`)).join('')}`;
}
function svg(lang,topic,height,title,sub,body,count=5,duration=24) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-labelledby="title desc" lang="${lang}">\n<title id="title">${esc(title)}</title><desc id="desc">${esc(sub)}. ${lang==='en'?'Main steps and connections stay visible. Animation explains order and state changes; reduced motion displays the complete result.':'主要步骤与连接始终显示；动画解释顺序与状态变化，减少动态效果时显示完整结果。'}</desc>\n${styles(count,duration)}\n<rect width="960" height="${height}" rx="28" fill="#f5f8fc"/>${text(48,54,`KIM SERVICE  /  ${topic}`,'tiny')}${text(48,111,title,'title')}${text(48,157,sub,'sub')}\n${body}\n</svg>\n`;
}
function capabilities(lang) {
  const t=copy[lang].cap;
  let out=panel(64,205,832,122,C.blue,0,'#edf3ff')+text(480,253,t.goal,'body center')+text(480,298,t.goalSub,'sub center');
  out+=route('M480 327 V365 H262 V410',0)+route('M480 327 V365 H698 V410',1,C.purple)+route('M480 327 V641 H262 V680',2,C.teal)+route('M480 327 V641 H698 V680',2,C.orange);
  const colors=[C.blue,C.purple,C.teal,C.orange];
  t.cards.forEach((c,i)=>{
    const x=i%2?500:64,y=i<2?410:680,p=i<2?i:2;
    out+=panel(x,y,396,214,colors[i],p)+`<rect x="${x+24}" y="${y+23}" width="7" height="40" rx="3" fill="${colors[i]}"/>`;
    out+=text(x+45,y+56,c[0],'label')+`<rect x="${x+300}" y="${y+23}" width="72" height="43" rx="21" fill="#edf2fa"/>`+text(x+336,y+54,c[1],'body center');
    out+=lines(x+24,y+115,[c[2],c[3]],'body',43);
  });
  out+=route('M262 894 V921 H480 V942',3,C.teal)+route('M698 894 V921 H480',3,C.teal);
  out+=panel(64,946,832,128,C.teal,3,'#edf8f6')+text(480,993,t.foot,'label center')+text(480,1041,t.footLines[0],'note center');
  out+=phaseBar(1114,t.phases,lang==='en'?'Select only the methods and materials this task needs':'只选择本次任务需要的方法与材料');
  return svg(lang,'01',1215,t.title,t.sub,out,4,20);
}
function delivery(lang) {
  const t=copy[lang].delivery;
  const positions=[[204,176],[424,176],[644,176],[864,176],[1084,176],[1304,230]];
  let out='';
  positions.forEach(([y,h],i)=>{
    const col=[C.blue,C.teal,C.purple,C.blue,C.teal,C.purple][i];
    out+=panel(64,y,832,h,col,i)+`<circle cx="99" cy="${y+40}" r="22" fill="${col}"/><g class="before d${i}">`+text(99,y+50,String(i+1),'note center','#fff')+`</g><g class="after d${i}"><circle cx="99" cy="${y+40}" r="22" fill="${C.teal}"/><path d="M88 ${y+39} L96 ${y+47} L110 ${y+32}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`+text(136,y+51,t.cards[i][0],'label');
    if(i===5){
      const fileTitles=lang==='en'?['Input JSON','Result JSON','Monthly CSV']:['输入 JSON','结果 JSON','月度 CSV'];
      fileTitles.forEach((name,k)=>{
        const x=90+k*266;
        out+=`<rect x="${x}" y="${y+80}" width="248" height="94" rx="14" fill="#f5f8fc" stroke="${C.line}"/>`+text(x+124,y+121,name,'note center');
        out+=`<g class="after d5"><path d="M${x+24} ${y+142} H${x+222} M${x+24} ${y+156} H${x+178}" stroke="${col}" stroke-width="5" stroke-linecap="round"/></g>`;
      });
      out+=text(480,y+211,t.cards[i][1][1],'note center');
    }else out+=lines(90,y+106,t.cards[i][1],'body',43);
    out+=`<rect x="90" y="${y+h-9}" width="780" height="4" rx="2" fill="#e7edf6"/><rect class="grow d${i}" x="90" y="${y+h-9}" width="780" height="4" rx="2" fill="${col}"/>`;
    if(i<positions.length-1){const a=y+h,b=positions[i+1][0];out+=route(`M480 ${a} V${b-10}`,i+1,col)+arrow(480,b-5,col);}
  });
  out+=route('M896 1656 H929 V952 H908',5,C.orange)+`<path d="M917 945 L908 952 L917 959" fill="none" stroke="${C.orange}" stroke-width="3" stroke-linecap="round"/>`;
  out+=panel(64,1580,832,139,C.orange,5,'#fff7ed')+text(480,1634,t.iterate,'label center')+text(480,1685,t.iterateSub,'body center');
  out+=phaseBar(1760,t.phases,lang==='en'?'Prepare inputs → calculate → open → check and continue':'备齐材料 → 计算 → 打开成果 → 复查并接续')+text(480,1870,t.note,'tiny center');
  return svg(lang,'02',1904,t.title,t.sub,out,6,30);
}
function collaboration(lang) {
  const t=copy[lang].collaboration;
  let out=panel(64,205,832,120,C.blue,0,'#edf3ff')+text(480,254,t.goal[0],'label center')+text(480,297,t.goal[1],'body center');
  out+=route('M480 325 V367',0)+arrow(480,374);
  out+=panel(64,380,832,120,C.purple,0)+text(480,428,t.plan[0],'label center')+text(480,473,t.plan[1],'body center');
  out+=route('M480 500 V542',1,C.purple)+arrow(480,549,C.purple);
  out+=panel(64,555,832,120,C.purple,1)+text(480,603,t.detail[0],'label center')+text(480,648,t.detail[1],'body center');
  out+=route('M480 675 V716 H262 V753',2)+route('M480 675 V716 H698 V753',2,C.teal)+arrow(262,759)+arrow(698,759,C.teal);
  [[t.a,64,C.blue],[t.b,500,C.teal]].forEach(([v,x,col])=>{out+=panel(x,765,396,177,col,2)+text(x+24,814,v[0],'label')+lines(x+24,862,v.slice(1),'body',39);});
  out+=route('M262 942 V989',3)+route('M698 942 V989',3,C.orange)+arrow(262,995)+arrow(698,995,C.orange);
  out+=panel(64,1001,396,125,C.blue,3,'#edf3ff')+text(88,1047,t.a2[0],'label')+text(88,1093,t.a2[1],'note');
  out+=panel(500,1001,396,125,C.orange,3,'#fff7ed');
  out+=`<g class="before swap">`+text(524,1047,t.b2[0],'label')+text(524,1093,t.b2[1],'note')+`</g><g class="after swap"><rect x="500" y="1001" width="396" height="125" rx="22" fill="#edf8f6" stroke="${C.teal}" stroke-width="2"/>`+text(524,1047,t.b3[0],'label')+text(524,1093,t.b3[1],'note')+`</g>`;
  out+=route('M262 1126 V1170 H480 V1214',4)+route('M698 1126 V1170 H480',4,C.teal)+arrow(480,1220,C.teal);
  out+=panel(64,1227,832,132,C.teal,5,'#edf8f6')+text(480,1278,t.join[0],'label center')+text(480,1325,t.join[1],'body center');
  out+=phaseBar(1399,t.phases,lang==='en'?'Dependencies → parallel work → local wait → verify':'确定依赖 → 并行推进 → 局部等待 → 汇合验收')+text(480,1509,t.foot,'tiny center');
  return svg(lang,'03',1543,t.title,t.sub,out,6,30);
}

const generated=[];
for (const lang of Object.keys(copy)) {
  for (const [name,build] of Object.entries({ capabilities, delivery, collaboration })) {
    const relative=`docs/images/animated-service-${name}.${lang}.svg`;
    const content=build(lang), target=path.join(root,relative);
    if(check) {
      if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==content) throw new Error(`Rebuild README animation: ${relative}`);
    } else fs.writeFileSync(target,content);
    generated.push({file:relative,bytes:Buffer.byteLength(content)});
  }
}
console.log(JSON.stringify({mode:check?'check':'build',files:generated},null,2));
