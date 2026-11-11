/* Dependency-free checks: source, token math, model behavior and a DOM substitute.
 * This does not run a browser, calculate layout, or emulate assistive technology.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildCss, cssName, resolveTheme } from './sync-tokens.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { validate, createModel } = require('./registration.js');
const source = name => fs.readFileSync(path.join(folder, name), 'utf8');
const html = source('index.html');
const css = source('styles.css');
const app = source('app.js');
const results = [];
function test(name, run) {
  try { run(); results.push({ name, status: 'pass' }); }
  catch (error) { results.push({ name, status: 'fail', detail: error.message }); }
}

test('Typed tokens: both themes resolve; generated CSS is current', () => {
  assert.equal(source('tokens.css'), buildCss());
  for (const theme of ['light', 'dark']) {
    const { all, values } = resolveTheme(theme);
    assert.equal(Object.keys(all).length, Object.keys(values).length);
    for (const [name, token] of Object.entries(all)) {
      assert.ok(token.$type, name);
      if (name.startsWith('component.')) assert.match(token.$value, /^\{semantic\./, name);
    }
  }
});

test('Every CSS token reference resolves in both themes', () => {
  const used = [...css.matchAll(/var\((--ds-[a-z0-9-]+)/g)].map(match => match[1]);
  for (const theme of ['light', 'dark']) {
    const available = new Set(Object.keys(resolveTheme(theme).all).filter(name => !name.startsWith('primitive.')).map(cssName));
    for (const variable of used) assert.ok(available.has(variable), `${theme}: ${variable}`);
  }
});

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).slice(0, 3).map(part => parseInt(part, 16) / 255);
  const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
const contrastResults = [];
test('Token color contrast: text ≥ 4.5:1; focus and input border ≥ 3:1', () => {
  for (const theme of ['light', 'dark']) {
    const colors = resolveTheme(theme).values;
    const color = name => colors['semantic.color.' + name];
    const pairs = [
      ['text','canvas',4.5], ['text','surface',4.5], ['muted','surface',4.5], ['muted','canvas',4.5],
      ['muted','subtle',4.5], ['placeholder','surface',4.5], ['action-text','action',4.5],
      ['action-text','action-hover',4.5], ['action-text','action-active',4.5],
      ['action','surface',4.5], ['action','action-soft',4.5], ['action','avatar',4.5],
      ['success-text','success-surface',4.5], ['muted','success-surface',4.5],
      ['danger-text','danger-surface',4.5], ['danger-text','surface',4.5],
      ['disabled-text','disabled-background',4.5],
      ['focus','surface',3], ['focus','canvas',3], ['focus','success-surface',3],
      ['control-border','surface',3], ['danger-border','surface',3]
    ];
    for (const [foreground, background, minimum] of pairs) {
      const ratio = contrast(color(foreground), color(background));
      contrastResults.push({ theme, foreground, background, ratio: Number(ratio.toFixed(2)), minimum });
      assert.ok(ratio >= minimum, `${theme} ${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
  }
});

test('Local dependencies, accessible field relationships and original content', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate HTML ID');
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    const destination = match[1];
    if (destination.startsWith('#')) assert.ok(ids.includes(destination.slice(1)), destination);
    else {
      assert.doesNotMatch(destination, /^(?:https?:|\/\/|data:)/);
      assert.ok(fs.existsSync(path.join(folder, destination)), destination);
    }
  }
  for (const match of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) {
    for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), id);
  }
  for (const name of ['name','email']) {
    assert.ok(html.includes(`label for="${name}"`));
    assert.match(html, new RegExp(`id="${name}"[^>]+required[^>]+aria-describedby="${name}-hint ${name}-error"`));
  }
  assert.ok(html.includes('示例用户A'));
  assert.ok(html.includes('Confirm this appointment and keep my details'));
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert.doesNotMatch(app + source('registration.js'), /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\s*[.(]/);
  assert.doesNotMatch(app, /\b(?:innerHTML|insertAdjacentHTML|eval)\b/);
});

test('Responsive and keyboard source safeguards are present (not a rendering test)', () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /white-space: normal; overflow-wrap: anywhere/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /forced-colors: active/);
  assert.doesNotMatch(html, /tabindex="[1-9]/);
  assert.match(html, /<form id="registration-form" novalidate/);
  assert.match(html, /id="submit-button" type="submit"/);
});

test('Validation handles empty, malformed, Chinese, Japanese and long values', () => {
  assert.deepEqual(Object.keys(validate({ name:'  ', email:'' }).errors), ['name','email']);
  for (const email of ['invalid', 'a@@example.test', 'a b@example.test', 'a@example..test']) {
    assert.equal(validate({ name:'王小明', email }).valid, false, email);
  }
  for (const name of ['王小明','山田太郎','欧阳司徒慕容长中文姓名演示'.repeat(3),'陈 <script>alert(1)</script>']) {
    assert.equal(validate({ name, email:'very.long.registration.address@example.test' }).valid, true, name);
  }
  assert.equal(validate({ name:'王'.repeat(101), email:'a@example.test' }).valid, false);
  assert.deepEqual(validate({ name:' 王小明 ', email:' ming@example.test ' }).values, { name:'王小明',email:'ming@example.test' });
});

test('Model blocks concurrent submits and commits an operation only once', () => {
  const model = createModel();
  const first = model.begin({ name:'王小明', email:'ming@example.test' });
  assert.equal(first.kind, 'loading');
  assert.equal(model.begin({ name:'李小雨', email:'yu@example.test' }).kind, 'busy');
  assert.equal(model.snapshot().entries.length, 1);
  assert.equal(model.finish(first.id + 1).kind, 'stale');
  assert.equal(model.snapshot().busy, true);
  assert.equal(model.finish(first.id).kind, 'success');
  assert.equal(model.finish(first.id).kind, 'stale');
  assert.equal(model.snapshot().entries.length, 2);
  assert.equal(model.snapshot().entries[1].name, '示例用户A');
});

test('Failed model operation preserves data and list; next attempt succeeds', () => {
  const model = createModel();
  const values = { name:'王小明', email:'ming@example.test' };
  const request = model.begin(values, { fail:true });
  assert.deepEqual(model.finish(request.id), { kind:'error', values });
  assert.equal(model.snapshot().entries.length, 1);
  const retry = model.begin(values);
  assert.equal(model.finish(retry.id).kind, 'success');
  assert.equal(model.snapshot().entries.length, 2);
  assert.equal(model.snapshot().entries[0].email, values.email);
});

// Minimal DOM substitute checks actual app callbacks, not native event dispatch,
// computed styles, browser validation, focus navigation, or screen-reader output.
function appHarness({ dark = false } = {}) {
  const timers = [];
  const elements = new Map();
  const doc = { activeElement: null, documentElement: { dataset: {} } };
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.attributes = {}; this.dataset = {};
      this.children = []; this.listeners = {}; this.textContent = ''; this.value = '';
      this.checked = false; this.disabled = false; this.hidden = false; this.readOnly = false;
      this.className = ''; this.classList = { toggle: () => {} };
    }
    set id(value) { this._id = value; elements.set(value, this); }
    get id() { return this._id; }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
    emit(type) { const event = { preventDefault() {} }; for (const handler of this.listeners[type] || []) handler(event); }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children = children.flatMap(child => child.fragment ? child.children : child); }
    focus() { doc.activeElement = this; }
    scrollIntoView() { this.scrolled = true; }
    reset() { for (const name of ['name','email']) elements.get(name).value = ''; }
  }
  for (const match of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const element = new Element(match[1]); element.id = match[3];
    for (const attr of match[2].matchAll(/([a-z][a-z0-9-]*)="([^"]*)"/gi)) element.setAttribute(attr[1], attr[2]);
    element.hidden = /\bhidden\b/.test(match[2]); element.disabled = /\bdisabled\b/.test(match[2]);
  }
  elements.get('submit-label').textContent = 'Confirm this appointment and keep my details';
  doc.getElementById = id => elements.get(id) || null;
  doc.createElement = tag => new Element(tag);
  doc.createTextNode = text => ({ textContent:text });
  doc.createDocumentFragment = () => { const element = new Element(); element.fragment = true; return element; };
  const context = {
    document: doc,
    window: { matchMedia: () => ({ matches: dark }), setTimeout: fn => { timers.push(fn); return timers.length; } },
    Registration: require('./registration.js')
  };
  vm.runInNewContext(app, context, { filename: 'app.js' });
  return { get:id => elements.get(id), doc, timers, submit:() => elements.get('registration-form').emit('submit'), finish:() => timers.shift()() };
}

test('App callbacks: blank submit focuses the first error without scheduling work', () => {
  const h = appHarness();
  h.submit();
  assert.equal(h.get('name').getAttribute('aria-invalid'), 'true');
  assert.equal(h.get('email').getAttribute('aria-invalid'), 'true');
  assert.equal(h.doc.activeElement, h.get('name'));
  assert.equal(h.get('error-summary').hidden, false);
  assert.equal(h.timers.length, 0);
});

test('App callbacks: failed submit retains exact input; next submit updates once', () => {
  const h = appHarness();
  const name = '  欧阳小明  ', email = '  demo@example.test  ';
  h.get('name').value = name; h.get('email').value = email;
  h.get('simulate-failure').checked = true;
  h.submit(); h.submit();
  assert.equal(h.timers.length, 1);
  assert.equal(h.get('submit-button').disabled, true);
  assert.equal(h.get('name').readOnly, true);
  assert.equal(h.get('simulate-failure').disabled, true);
  assert.equal(h.get('simulate-failure').checked, false);
  h.finish();
  assert.equal(h.get('name').value, name); assert.equal(h.get('email').value, email);
  assert.equal(h.get('submit-button').disabled, false);
  assert.equal(h.get('feedback').dataset.state, 'error');
  assert.equal(h.doc.activeElement, h.get('error-summary'));
  assert.equal(h.get('attendee-list').children.length, 0, 'DOM substitute has no parsed initial children');
  h.submit(); h.submit(); h.finish();
  assert.equal(h.get('attendee-list').children.length, 2);
  assert.equal(h.get('entry-count').textContent, '2 条');
  assert.equal(h.get('feedback').dataset.state, 'success');
  assert.equal(h.get('name').value, ''); assert.equal(h.get('email').value, '');
  assert.equal(h.doc.activeElement, h.get('name'));
  assert.equal(h.get('view-record').hidden, false);
  h.get('view-record').emit('click');
  assert.equal(h.doc.activeElement.id, 'entry-2');
});

test('App callbacks: HTML-like names stay plain text; long names are not truncated', () => {
  const h = appHarness();
  const name = '<img src=x onerror=alert(1)>王小明';
  h.get('name').value = name; h.get('email').value = 'demo@example.test';
  h.submit(); h.finish();
  const row = h.get('attendee-list').children[0];
  assert.equal(row.children[1].children[0].textContent, name);
  assert.equal(row.children[1].children[0].children.length, 0);
});

test('App callbacks: theme follows initial preference and toggle updates its name', () => {
  const h = appHarness({ dark:true });
  assert.equal(h.doc.documentElement.dataset.theme, 'dark');
  assert.equal(h.get('theme-toggle').getAttribute('aria-label'), '切换为浅色主题');
  h.get('theme-toggle').emit('click');
  assert.equal(h.doc.documentElement.dataset.theme, 'light');
  assert.equal(h.get('theme-toggle').getAttribute('aria-label'), '切换为深色主题');
});

const report = {
  checkedAt: new Date().toISOString(),
  environment: `Node ${process.version}`,
  scope: 'Source checks, deterministic state logic, actual app callbacks with a minimal DOM substitute, token contrast math. No browser executed.',
  results,
  contrast: contrastResults,
  notVerified: ['Real browser layout at 390px or desktop','Real keyboard Tab and Enter/Space dispatch','200% / 400% browser zoom and text resizing','Screen-reader announcements','Platform fonts and cross-browser rendering'],
  totals: { pass:results.filter(item => item.status === 'pass').length, fail:results.filter(item => item.status === 'fail').length }
};
fs.writeFileSync(path.join(folder, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
for (const result of results) console.log(`${result.status.toUpperCase()}: ${result.name}${result.detail ? '\n  ' + result.detail : ''}`);
console.log(`Result: ${report.totals.pass} passed, ${report.totals.fail} failed. Browser checks: not performed.`);
process.exitCode = report.totals.fail ? 1 : 0;
