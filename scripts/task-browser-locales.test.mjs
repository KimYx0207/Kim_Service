import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildStartPageData, renderStartPage } from './start-page.mjs';
import { createTaskBrowser } from '../src/application/task-browser/model.mjs';
import { parseTaskDraft, serializeTaskDraft } from '../src/data/task-drafts.mjs';

const root = path.resolve(import.meta.dirname, '..');
const data = buildStartPageData(root);
const en = createTaskBrowser(data.ui, { locale: 'en' });
const zh = createTaskBrowser(data.ui);
const chinese = /[\u3400-\u9fff]/u;

test('the catalog has reviewed English titles and summaries without changing original declarations', () => {
  for (const capability of data.capabilities) {
    const translation = data.ui.capabilityTranslations[capability.id];
    assert.ok(translation, 'Missing English task: ' + capability.id);
    assert.equal(translation.sourceSummary, capability.summary, 'English source changed: ' + capability.id);
    assert.ok(translation.title.trim() && translation.summary.trim(), capability.id);
    assert.doesNotMatch(en.titleOf(capability), chinese);
    assert.doesNotMatch(en.summaryOf(capability), chinese);
    for (const schema of [capability.input, capability.output]) {
      for (const field of en.fields(schema, { capability })) {
        assert.equal(typeof field.label, 'string');
        assert.ok(field.label.trim(), capability.id + '.' + field.key);
        assert.doesNotMatch(field.label + field.description, chinese);
        assert.equal(field.required, (schema.required || []).includes(field.key));
      }
    }
  }
  const canonicalFinance = data.capabilities.find(item => item.id === 'financial-modeler-deliver');
  assert.match(canonicalFinance.summary, chinese, 'Original package text remains available as evidence');
});

test('the two walkthrough detail translations cover all authored fields and decision boundaries', () => {
  for (const id of ['financial-modeler-deliver', 'design-system-designer-deliver']) {
    const capability = data.capabilities.find(item => item.id === id);
    const detail = en.detailOf(capability);
    assert.ok(detail, 'Review the detail translation after a source-contract change: ' + id);
    for (const key of ['useWhen', 'doNotUseWhen']) {
      assert.equal(detail[key].length, capability[key].length, id + '.' + key);
      for (const value of detail[key]) assert.doesNotMatch(value, chinese);
    }
    assert.equal(detail.humanGate.length, capability.humanGate.when.length);
    for (const schema of [capability.input, capability.output]) {
      for (const field of Object.keys(schema.properties || {})) {
        assert.ok(detail.fields[field], id + '.' + field);
        assert.doesNotMatch(detail.fields[field], chinese);
      }
    }
    assert.equal(en.detailOf({ ...capability, contractSha256: 'changed-contract' }), null,
      'Changed source terms fall back to their original wording until reviewed');
  }
});

test('English users can search tasks by familiar words and exact capability id', () => {
  for (const capability of data.capabilities) {
    assert.ok(en.filterCapabilities(data.capabilities, capability.id).some(item => item.id === capability.id));
  }
  for (const [query, id] of [
    ['forecast', 'financial-modeler-deliver'], ['design system', 'design-system-designer-deliver'],
    ['resume', 'resume-editor-assist'], ['cash', 'financial-modeler-deliver'],
    ['经营预测', 'financial-modeler-deliver']
  ]) assert.ok(en.filterCapabilities(data.capabilities, query).some(item => item.id === id), query);
});

test('English requests retain exact entrypoints, required keys, host prefixes and execution limits', () => {
  for (const capability of data.capabilities) {
    const request = en.buildRequest(capability, { goal: 'Use the supplied facts', materials: 'inputs.json', host: 'meta-kim' });
    assert.ok(request.startsWith('/meta-theory '));
    assert.ok(request.includes(capability.componentPath + '/' + capability.entrypoint));
    assert.ok(request.includes(capability.id));
    assert.ok(request.includes('My goal: Use the supplied facts'));
    assert.ok(request.includes('inputs.json'));
    assert.ok(request.includes('do not assume the package is installed'));
    assert.ok(request.includes('what was not executed and what remains'));
    assert.ok(request.includes('external publication, payment, or broader access'));
    for (const key of [...capability.input.required, ...capability.output.required]) assert.ok(request.includes(key));
    assert.doesNotMatch(request, chinese, capability.id);
  }
});

test('language changes translate only known generated templates and preserve complete user drafts', () => {
  const capability = data.capabilities.find(item => item.id === 'financial-modeler-deliver');
  const draft = { goal: 'Keep the actual assumptions', materials: 'inputs.json', host: 'meta-kim',
    componentVersion: capability.componentVersion, manual: false, previousRequest: '' };
  draft.request = zh.buildRequest(capability, draft);
  const translated = en.requestForDraft(capability, draft);
  assert.equal(translated.manual, false);
  assert.equal(translated.request, en.buildRequest(capability, draft));
  assert.equal(zh.requestForDraft(capability, { ...draft, request: translated.request }).request, draft.request);
  for (const manual of [true, false]) {
    const edited = { ...draft, request: 'Keep this exact addition: 中文 + English <text>', manual };
    assert.deepEqual(en.requestForDraft(capability, edited), { request: edited.request, manual: true });
    assert.deepEqual(parseTaskDraft(serializeTaskDraft(capability.id, edited), capability.id), edited);
  }
  assert.deepEqual(en.requestForDraft(capability, { ...draft, request: '', manual: true }),
    { request: '', manual: true });
});

test('UI messages, templates and sample links use explicit supported locales', () => {
  assert.equal(zh.locale, 'zh-CN');
  assert.equal(createTaskBrowser(data.ui, { locale: '__proto__' }).locale, 'zh-CN');
  const sourceKeys = Object.keys(data.ui.locales['zh-CN'].messages).sort();
  assert.deepEqual(Object.keys(data.ui.locales.en.messages).sort(), sourceKeys);
  for (const value of Object.values(data.ui.locales.en.messages)) assert.doesNotMatch(value, chinese);
  const template = fs.readFileSync(path.join(root, 'src/presentation/task-browser/page.html'), 'utf8');
  for (const [, key] of template.matchAll(/data-i18n(?:-aria|-placeholder)?="([^"]+)"/gu)) {
    assert.ok(data.ui.locales.en.messages[key], key);
  }
  assert.ok(template.includes('id="language"') && template.includes('id="detail-language"'));
  for (const sample of data.showcases) {
    const copy = en.showcaseOf(sample);
    assert.doesNotMatch([copy.title, copy.description, ...copy.inputs, ...copy.outputs].join(' '), chinese);
    assert.equal(copy.entrypoint, sample.entrypoint);
    assert.ok(en.sampleUrl(sample.entrypoint).endsWith('?lang=en'));
    assert.ok(en.sampleUrl(sample.entrypoint, 'file:').startsWith('../'));
    assert.equal(zh.sampleUrl(sample.entrypoint), './' + sample.entrypoint);
  }
  const html = renderStartPage(root);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+(?:stylesheet|preload)|@import|\bfetch\s*\(/iu);
});

test('host labels follow the selected language without leaking Chinese into English controls', () => {
  for (const host of en.hosts) assert.doesNotMatch(host.label, chinese, host.id);
  assert.equal(en.hosts.find(host => host.id === 'doubao').label, 'Doubao Work');
  assert.match(zh.hosts.find(host => host.id === 'doubao').label, /豆包工作/u);
});
