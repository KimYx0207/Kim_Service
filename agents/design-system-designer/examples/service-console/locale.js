/* User-facing copy is kept separate from design tokens and booking behavior. */
(function (root) {
  const messages = {
    'zh-CN': {
      title:'小店预约台 · 可编辑设计系统样板', skip:'跳到主要内容', product:'Kim Service · 设计系统成品样板', demo:'合成数据 / 本地交互演示', sidebar:'样板说明', navigation:'页面区块', bookingNav:'新增预约', listNav:'预约名单', designNav:'设计设置', sideTitle:'一个任务，两种展示', sideBody:'报名表和管理表格共用语义颜色、间距与状态。修改设计变量，两个区域一起变化。', eyebrow:'工作日 / 示例空间', heading:'把今天安排得从容一点', intro:'新预约、到店时间和联系信息，都放在一个清楚的地方。', local:'本地交互示例', designHeading:'改一处，整页保持一致', designBody:'试试主题、品牌色和信息密度，再把 tokens 下载带走。', theme:'主题', density:'密度', accent:'品牌色', fontSize:'文字大小', download:'下载 tokens', bookingHeading:'新增一位预约者', bookingBody:'试试填写、提交，以及失败后保留输入的过程。', name:'姓名', email:'联系邮箱', required:'必填', optional:'选填', namePlaceholder:'例如：示例用户 A', nameHelp:'使用示例信息体验，新增记录留在当前页面。', slot:'到店时间', service:'预约项目', note:'备注', notePlaceholder:'例如：第一次来，希望了解完整流程。', simulate:'下一次提交模拟服务暂时不可用', submit:'确认预约 · Confirm this appointment', listHeading:'今天的预约', listBody:'查看预约状态，点击按钮切换为已到店。', count:'位预约者', reset:'重置演示', tableRegion:'可滚动的预约名单', caption:'所有联系人都是示例。新增记录仅存在于当前页面。', personColumn:'预约者 / 项目', timeColumn:'时间', statusColumn:'状态', actionColumn:'操作', noteHeading:'把状态也一起设计好', noteBody:'失败时保留输入，加载时防止重复提交。键盘焦点清楚可见，长按钮文字会自然换行。', handoff:'怎样把这个样板用到自己的项目？', handoff1:'在 config.js 中修改业务示例、默认主题、颜色和间距；页面和下载共用同一份配置。', handoff2:'在 app.js 中把本地演示提交接到你的预约接口，保留加载、报错和恢复输入的体验。', handoff3:'换成项目的真实内容，检查手机、键盘操作和浅深主题。', footer:'可编辑的原创演示页面。下载设计配置，或把源码接进你的项目。', light:'浅色', dark:'深色', comfortable:'舒适', compact:'紧凑', standard:'标准', large:'大字', waiting:'待到店', arrived:'已到店', arriveAction:'标记到店', waitAction:'恢复待到店', designStatus:'已应用{theme}主题；主按钮文字对比度 {ratio}:1。下载的是当前完整配置。', changed:'{name} 已更新为{state}，仅影响本页演示。', nameError:'请填写示例姓名。', emailError:'请填写格式完整的示例邮箱，例如 demo@example.test。', missing:'还有必填信息需要补齐，已保留你的输入。', loading:'正在确认…', loadingStatus:'正在进行本地状态演示，不会发送实际预约。', failed:'演示服务暂时不可用。输入已保留，再次点击即可重试。', added:'已在本地示例中添加 {name}。没有发送邮件或连接真实系统。', restored:'已恢复 {count} 条合成预约数据。'
    },
    en: {
      title:'Small Studio Bookings · Editable Design System', skip:'Skip to main content', product:'Kim Service · Design system example', demo:'Sample data / Local interaction', sidebar:'About this example', navigation:'Page sections', bookingNav:'New booking', listNav:'Appointments', designNav:'Design settings', sideTitle:'One task, one consistent system', sideBody:'The form and appointment list share colors, spacing and states. Change a design setting and both update together.', eyebrow:'WORKDAY / SAMPLE STUDIO', heading:'Make room for a calmer day', intro:'Keep new bookings, arrival times and contact details in one clear place.', local:'Interactive local example', designHeading:'Change once. Keep every part in sync.', designBody:'Try a theme, brand color and layout density. Then download your design tokens.', theme:'Theme', density:'Density', accent:'Brand color', fontSize:'Text size', download:'Download tokens', bookingHeading:'Add a visitor', bookingBody:'Try the form, submit a booking and recover from a simulated error.', name:'Name', email:'Contact email', required:'Required', optional:'Optional', namePlaceholder:'For example: Sample visitor A', nameHelp:'Use sample details. New records stay on this page.', slot:'Arrival time', service:'Appointment type', note:'Notes', notePlaceholder:'For example: First visit. Please walk me through the process.', simulate:'Simulate a temporary service failure on the next submission', submit:'Confirm this appointment', listHeading:'Today’s appointments', listBody:'Check each booking and mark visitors as arrived.', count:'visitors', reset:'Reset example', tableRegion:'Scrollable appointment list', caption:'All contacts are examples. New records exist only on this page.', personColumn:'Visitor / Appointment', timeColumn:'Time', statusColumn:'Status', actionColumn:'Action', noteHeading:'Design the states, too', noteBody:'Keep input after an error and prevent duplicate submissions while loading. Keyboard focus stays visible and long labels wrap naturally.', handoff:'How can I use this in my own project?', handoff1:'Edit the sample business data, default theme, colors and spacing in config.js. The page and download use the same configuration.', handoff2:'Connect the local submission in app.js to your booking API. Keep the loading, error and input recovery behavior.', handoff3:'Add your real content, then check mobile screens, keyboard use and both themes.', footer:'An original, editable example. Download the design settings or use the source in your project.', light:'Light', dark:'Dark', comfortable:'Comfortable', compact:'Compact', standard:'Standard', large:'Large', waiting:'Expected', arrived:'Arrived', arriveAction:'Mark arrived', waitAction:'Mark expected', designStatus:'{theme} theme applied. Primary button text contrast: {ratio}:1. The download contains the current full configuration.', changed:'{name} is now {state}. Only this local example has changed.', nameError:'Enter a sample name.', emailError:'Enter a complete sample email, such as demo@example.test.', missing:'Complete the required fields. Your input has been kept.', loading:'Confirming…', loadingStatus:'Running the local interaction example. No appointment is sent.', failed:'The demo service is temporarily unavailable. Your input is saved on this page; click again to retry.', added:'Added {name} to this local example. No email was sent or business system contacted.', restored:'Restored {count} sample appointments.'
    }
  };
  const business = {
    '小店预约台':'Small Studio Bookings', '把每一次到店安排好':'A clear plan for every visit', '小':'S',
    '手作体验':'Craft workshop', '产品咨询':'Product consultation', '作品领取':'Collect a finished piece',
    '产品咨询 · Product introduction and first visit':'Product introduction and first visit',
    '示例用户 A':'Sample visitor A', '示例用户 B':'Sample visitor B', '示例用户 C':'Sample visitor C'
  };
  function resolveLanguage(value) { return value === 'en' ? 'en' : 'zh-CN'; }
  function createLocale(value) {
    let language=resolveLanguage(value);
    const t=(key, params={})=> {
      if (!Object.hasOwn(messages[language],key)) throw new Error('Unknown UI message: '+key);
      return messages[language][key].replace(/\{(\w+)\}/g,(_,name)=>String(params[name] ?? '{'+name+'}'));
    };
    function apply(document) {
      document.documentElement.lang=language; document.title=t('title');
      for(const node of document.querySelectorAll('[data-i18n]')) node.textContent=t(node.dataset.i18n);
      for(const attr of ['placeholder','aria-label']) for(const node of document.querySelectorAll('[data-i18n-'+attr+']')) node.setAttribute(attr,t(node.getAttribute('data-i18n-'+attr)));
      for(const link of document.querySelectorAll('[data-language]')) {
        const url=new URL(root.location.href); url.searchParams.set('lang',link.dataset.language); link.href=url.href;
        if(link.dataset.language===language) link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      }
    }
    return {get language(){return language;},setLanguage:value=>{language=resolveLanguage(value);},t,apply,
      business:value=>language==='en'&&Object.hasOwn(business,value)?business[value]:value};
  }
  if (typeof module==='object' && module.exports) module.exports={messages,resolveLanguage,createLocale};
  else root.KimServiceConsoleLocale=createLocale(new URLSearchParams(root.location.search).get('lang'));
})(typeof globalThis==='object'?globalThis:this);
