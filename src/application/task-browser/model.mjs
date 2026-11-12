/** Pure application model. Vocabulary, translations and host choices are injected. */
export function createTaskBrowser(config, { locale: requestedLocale = config.defaultLocale || 'zh-CN' } = {}) {
  const locale = requestedLocale === 'en' ? 'en' : 'zh-CN';
  const english = locale === 'en';
  const language = config.locales?.[locale] || {};
  const TYPE_NAMES = language.typeNames || config.typeNames;
  const SYNONYMS = config.synonyms;
  const FIELD_NAMES = language.fieldNames || config.fieldNames;
  const COMMON_FIELDS = new Set(config.commonFields);
  const hosts = config.hosts.map(host => ({ ...host, label: language.hostLabels?.[host.id] || host.label }));
  const suggestions = language.suggestions || config.suggestions;
  const text = (key, values = {}) => (language.messages?.[key] || key)
    .replace(/\{([a-zA-Z0-9_]+)\}/gu, (_, name) => String(values[name] ?? ''));
  const humanize = value => String(value).replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/gu, '$1 $2').replace(/[_-]+/gu, ' ')
    .replace(/^./u, character => character.toUpperCase());
  const hasChinese = value => /[\u3400-\u9fff]/u.test(value);
  function translationOf(capability) {
    const translation = config.capabilityTranslations?.[capability.id];
    return english && translation?.sourceSummary === capability.summary ? translation : null;
  }
  function detailOf(capability) {
    const detail = translationOf(capability)?.detail;
    return detail?.sourceContractSha256 === capability.contractSha256 ? detail : null;
  }
  function summaryOf(capability) {
    if (!english) return capability.summary;
    return translationOf(capability)?.summary || (!hasChinese(capability.summary)
      ? capability.summary : 'Read the original package specification for this task.');
  }
  function fields(schema, { capability = null, original = false } = {}) {
    const required = new Set(schema.required || []);
    const names = [...required, ...Object.keys(schema.properties || {}).filter(key => !required.has(key))];
    const detail = capability && !original ? detailOf(capability) : null;
    return names.map(key => {
      const sourceDescription = schema.properties?.[key]?.description || '';
      const description = !english || original ? sourceDescription
        : detail?.fields?.[key] || (hasChinese(sourceDescription) ? '' : sourceDescription);
      const label = original ? config.fieldNames[key] || key
        : FIELD_NAMES[key] || (english ? humanize(key) : key);
      return { key, required: required.has(key), description, label };
    });
  }

  function briefLabel(field) {
    if (field.description) {
      const lead = field.description.split(/[：:；;。]/)[0];
      const limit = english ? 70 : 36;
      return lead.length <= limit ? lead : lead.slice(0, limit - 2) + '…';
    }
    return field.label;
  }

  function titleOf(capability) {
    if (english) return translationOf(capability)?.title || humanize(capability.id);
    const summary = capability.summary.trim();
    const colon = summary.search(/[：（]/);
    if (colon > 3 && colon < 22) return summary.slice(0, colon);
    const sentence = summary.split(/[。\n]/)[0];
    return sentence.length > 56 ? sentence.slice(0, 54) + '…' : sentence;
  }

  function searchableText(capability) {
    return [capability.id, capability.componentId, capability.summary, summaryOf(capability), titleOf(capability),
      ...(capability.useWhen || []), ...(detailOf(capability)?.useWhen || []),
      ...fields(capability.input, { capability }).flatMap(field => [field.key, field.label, field.description]),
      ...fields(capability.output, { capability }).flatMap(field => [field.key, field.label, field.description])]
      .join(' ').normalize('NFKC').toLowerCase();
  }

  function queryTerms(query) {
    return query.normalize('NFKC').toLowerCase().trim().split(/[\s，,、；;]+/u).filter(Boolean).map(token => {
      const exact = SYNONYMS.find(group => group.includes(token));
      if (exact) return exact;
      // These are explicit aliases, not model-based recommendations.
      const stripped = token.replace(/^(?:我想|我需要|我要|帮我|请帮我|请)?(?:做一个|做一套|做|写|改|找)?/u, '');
      return SYNONYMS.find(items => items.includes(stripped)) || [token];
    });
  }

  function filterCapabilities(capabilities, query = '', type = 'all') {
    const terms = queryTerms(query);
    return capabilities.filter(capability => {
      if (type !== 'all' && capability.componentType !== type) return false;
      const value = searchableText(capability);
      return terms.every(alternatives => alternatives.some(word => {
        if (/^[a-z0-9][a-z0-9 -]*$/u.test(word)) {
          // Match whole English words while retaining searchable hyphenated IDs.
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp('(?:^|[^a-z0-9])' + escaped + '(?:$|[^a-z0-9])', 'u').test(value);
        }
        return value.includes(word);
      }));
    });
  }

  function buildRequest(capability, { goal = '', materials = '', host = 'existing' } = {}) {
    const entry = `${capability.componentPath}/${capability.entrypoint}`;
    const inputs = fields(capability.input, { capability }).filter(field => field.required);
    const outputs = fields(capability.output, { capability });
    const fieldName = field => `${field.description || field.label}${english ? ' (' : '（'}${field.key}${english ? ')' : '）'}`;
    const lines = [
      text('request.repositoryIntro'), '', text('request.readFirst', { entry }),
      ...(capability.readme && capability.readme !== entry ? [text('request.readme', { readme: capability.readme })] : []),
      text('request.capability', { id: capability.id }), text('request.version', { version: capability.componentVersion }), '',
      text('request.declaration', { summary: summaryOf(capability) }), '',
      text('request.goal', { goal: goal.trim() || text('request.goalPlaceholder') }), '',
      text('request.materials'), ...(materials.trim() ? [materials.trim(), ''] : []),
      ...inputs.map(field => `- ${fieldName(field)}${english ? ': ' : '：'}${text('request.requiredUnknown')}`),
      ...(inputs.length ? [] : [text('request.emptyMaterials')]), '',
      text('request.deliver'),
      ...(outputs.length ? outputs.map(field => `- ${field.description || field.label}${english ? ' (' : '（'}${field.key}${english ? ', ' : '，'}${text(field.required ? 'request.outputRequired' : 'request.outputOptional')}${english ? ')' : '）'}`) : [text('request.outputUnspecified')]),
      '', text('request.toolsAndScope'), text('request.unexecuted'), text('request.permissions')
    ];
    const selected = hosts.find(item => item.id === host) || hosts[0];
    return (selected.prefix || '') + lines.join('\n');
  }

  function requestForDraft(capability, draft) {
    if (draft.manual) return { request: draft.request, manual: true };
    const request = buildRequest(capability, draft);
    if (!draft.request || draft.request === request) return { request, manual: false };
    const otherLanguage = createTaskBrowser(config, { locale: english ? 'zh-CN' : 'en' });
    if (draft.request === otherLanguage.buildRequest(capability, draft)) return { request, manual: false };
    // Imported or older text may contain additions even without the manual flag.
    // Only a byte-identical authored template is safe to regenerate on a language change.
    return { request: draft.request, manual: true };
  }

  function sourceUrl(relative, protocol = 'https:') {
    const encoded = relative.split('/').map(encodeURIComponent).join('/');
    return protocol === 'file:' ? '../' + encoded : config.repository.url + '/blob/' + encodeURIComponent(config.repository.ref) + '/' + encoded;
  }
  function sampleUrl(relative, protocol = 'https:') {
    const encoded = relative.split('/').map(encodeURIComponent).join('/');
    return (protocol === 'file:' ? '../' : './') + encoded + (english ? '?lang=en' : '');
  }
  function showcaseOf(sample) {
    const translated = language.showcases?.[sample.id];
    return translated ? { ...sample, title: translated.title, description: translated.description,
      inputs: translated.inputs, outputs: translated.outputs } : sample;
  }
  return Object.freeze({ locale, text, hosts, suggestions, detailOf, summaryOf, showcaseOf,
    filterCapabilities, buildRequest, requestForDraft, fields, titleOf, briefLabel, sourceUrl, sampleUrl,
    commonFields: COMMON_FIELDS, typeNames: TYPE_NAMES });
}
