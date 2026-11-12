/** Diagram copy only; component and host facts stay in their existing sources. */
export const layerCopy = {
  'zh-CN': {
    title: '方法、应用、数据和展示分开维护',
    sub: '任务浏览器生成请求，再交给你选择的客户端执行',
    source: ['组件与配置的权威来源', ['各组件的 capability.json / method.json', '专业资料与案例；config/ 管理展示选项']],
    data: ['数据层', ['读取并生成能力目录', '载入任务与配置数据', '不另写一套方法定义']],
    application: ['应用层', ['搜索、筛选、组合方法', '生成完整任务请求', '不在这里调用模型']],
    presentation: ['展示层', ['任务浏览器呈现说明、材料要求和请求', '选择宿主、复制请求，保留清楚的下一步']],
    host: ['当前 AI 客户端执行', ['宿主负责模型、工具、账户和权限', '方法包沿用同一份；本地 helper 核对实际产物']],
    phases: ['从组件和配置读取事实，不维护第二份清单', '数据层提供目录；应用层筛选和生成请求', '页面呈现结果，使用者复制完整请求', '所选客户端按真实能力执行和检查'],
    steady: '共享方法 → 目录数据 → 任务请求 → 当前客户端',
    foot: ['客户端选项表达请求意图；不会在网页中启动或切换真实模型。', '更换宿主时，连接信息仍由宿主配置。'],
  },
  en: {
    title: 'Separate methods, application, data and UI',
    sub: 'The task browser prepares a request for the client you choose',
    source: ['Authoritative components and configuration', ['Each component’s capability.json / method.json', 'References and examples; config/ owns display options']],
    data: ['Data layer', ['Build the catalog', 'Read tasks and config', 'Use source definitions']],
    application: ['Application layer', ['Find methods', 'Build a task request', 'No model calls here']],
    presentation: ['Presentation layer', ['Show methods, required materials and the request', 'Choose a host, copy the request, see the next step']],
    host: ['Your current AI client executes', ['The host owns model, tools, account and permissions', 'Reuse method sources; local helpers check real artifacts']],
    phases: ['Read component and configuration sources once', 'Data feeds the catalog; application prepares requests', 'The page presents a complete request to copy', 'The chosen client performs and verifies the work'],
    steady: 'Shared methods → catalog data → request → your client',
    foot: ['A host choice changes request text; it does not launch or switch a model.', 'Connection settings stay with the chosen host.'],
  },
};
