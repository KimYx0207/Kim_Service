/** Pure application model. Vocabulary, repository and host choices are injected. */
export function createTaskBrowser(config) {
  const TYPE_NAMES=config.typeNames, SYNONYMS=config.synonyms, FIELD_NAMES=config.fieldNames;
  const COMMON_FIELDS=new Set(config.commonFields);
  function fields(schema) {
    const required = new Set(schema.required || []);
    const names = [...required, ...Object.keys(schema.properties || {}).filter((key) => !required.has(key))];
    return names.map((key) => ({ key, required: required.has(key), description: schema.properties?.[key]?.description || '', label: FIELD_NAMES[key] || key }));
  }

  function briefLabel(field) {
    if (field.description) {
      const lead = field.description.split(/[：:；;。]/)[0];
      return lead.length <= 36 ? lead : lead.slice(0, 34) + '…';
    }
    return field.label;
  }

  function titleOf(capability) {
    const summary = capability.summary.trim();
    const colon = summary.search(/[：（]/);
    if (colon > 3 && colon < 22) return summary.slice(0, colon);
    const sentence = summary.split(/[。\n]/)[0];
    return sentence.length > 56 ? sentence.slice(0, 54) + '…' : sentence;
  }

  function searchableText(capability) {
    return [capability.id, capability.componentId, capability.summary, ...(capability.useWhen || []),
      ...fields(capability.input).flatMap((field) => [field.key, field.label, field.description]),
      ...fields(capability.output).flatMap((field) => [field.key, field.label, field.description])]
      .join(' ').normalize('NFKC').toLowerCase();
  }

  function queryTerms(query) {
    return query.normalize('NFKC').toLowerCase().trim().split(/[\s，,、；;]+/u).filter(Boolean).map((token) => {
      const exact = SYNONYMS.find((group) => group.includes(token));
      if (exact) return exact;
      // Permit common short requests (e.g. “我想做表情包”), without claiming semantic search.
      const stripped = token.replace(/^(?:我想|我需要|我要|帮我|请帮我|请)?(?:做一个|做一套|做|写|改|找)?/u, '');
      const group = SYNONYMS.find((items) => items.includes(stripped));
      return group || [token];
    });
  }

  function filterCapabilities(capabilities, query = '', type = 'all') {
    const terms = queryTerms(query);
    return capabilities.filter((capability) => {
      if (type !== 'all' && capability.componentType !== type) return false;
      const text = searchableText(capability);
      return terms.every((alternatives) => alternatives.some((word) => {
        if (/^[a-z0-9][a-z0-9 -]*$/u.test(word)) {
          // English aliases are words, not substrings: media != immediate,
          // store != restore, cover != discover. Hyphenated IDs remain searchable.
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'u').test(text);
        }
        return text.includes(word);
      }));
    });
  }

  function buildRequest(capability, { goal = '', materials = '', host = 'existing' } = {}) {
    const entry = `${capability.componentPath}/${capability.entrypoint}`;
    const inputs = fields(capability.input).filter((field) => field.required);
    const outputs = fields(capability.output);
    const lines = [
      '请在已克隆的 Kim_Service 仓库上下文中处理以下任务。下面的相对路径都以 Kim_Service 仓库根目录为基准；若当前目录不是仓库根目录，请先定位仓库，不要猜测已经安装。',
      '', `先阅读：${entry}`, ...(capability.readme && capability.readme !== entry ? [`使用说明：${capability.readme}`] : []),
      `目标能力：${capability.id}`, `包版本：${capability.componentVersion}`, '',
      `这项能力的声明：${capability.summary}`, '', `我的目标：${goal.trim() || '【填写这次要完成的事】'}`, '', '我提供的材料：', ...(materials.trim() ? [materials.trim(), ''] : []),
      ...inputs.map((field) => `- ${field.description || field.label}（${field.key}）：【填写；不清楚的标为待确认】`),
      ...(inputs.length ? [] : ['- 【填写任务材料；按入口说明补充】']),
      '', '请按入口要求与本次材料交付：',
      ...(outputs.length ? outputs.map((field) => `- ${field.description || field.label}（${field.key}${field.required ? '，合同要求' : '，按需提供'}）`) : ['- 按入口说明交付，包合同没有逐项列出输出字段。']),
      '', '先核对本次已具备的工具、材料和授权；只补问阻塞任务的缺项。普通已授权工作继续执行。',
      '缺少工具或证据时明确标记未执行和剩余工作。不要把读取入口、示例或静态检查写成已安装、已原生加载、已实际执行或已通过最终验收。',
      '需要新增安装、外部发布、付费或扩大访问范围时，按包内规则和本次授权处理。'
    ];
    const selected = config.hosts.find((item) => item.id === host) || config.hosts[0];
    return (selected.prefix || '') + lines.join('\n');
  }


  function sourceUrl(relative, protocol = 'https:') {
    const encoded=relative.split('/').map(encodeURIComponent).join('/');
    return protocol === 'file:' ? '../' + encoded : config.repository.url + '/blob/' + encodeURIComponent(config.repository.ref) + '/' + encoded;
  }
  function sampleUrl(relative, protocol = 'https:') {
    const encoded=relative.split('/').map(encodeURIComponent).join('/');
    return (protocol === 'file:' ? '../' : './') + encoded;
  }
  return Object.freeze({filterCapabilities,buildRequest,fields,titleOf,briefLabel,sourceUrl,sampleUrl,commonFields:COMMON_FIELDS,typeNames:TYPE_NAMES});
}
