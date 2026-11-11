// Run with: node verify.mjs
// This is a source / DOM-stub check, not a browser, layout, or screen-reader test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
const checks = [];
function check(name, fn, kind = 'source') {
  try { fn(); checks.push({ name, kind, status: 'passed' }); }
  catch (error) { checks.push({ name, kind, status: 'failed', detail: error.message }); }
}

function boot({ storageDenied = false, savedTheme = null, prefersDark = false } = {}) {
  const timers = [];
  const stored = new Map(savedTheme ? [['store-signup-demo-theme', savedTheme]] : []);
  const nodes = new Map();
  let doc;
  class Node {
    constructor(tag = 'div', id = '', attributes = '') {
      this.tagName = tag.toUpperCase(); this.id = id; this.children = []; this.dataset = {};
      this.attributes = new Map(); this.events = new Map(); this.value = ''; this.className = '';
      this.hidden = /\bhidden\b/.test(attributes); this.disabled = /\bdisabled\b/.test(attributes);
      this.checked = /\bchecked\b/.test(attributes); this._text = '';
      for (const [, key, value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) this.attributes.set(key, value);
    }
    get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._text; }
    set textContent(value) { this.children = []; this._text = String(value); }
    get validity() {
      // A limited stand-in for native email typeMismatch. Native browser validation is not verified.
      return { typeMismatch: this.attributes.get('type') === 'email' && this.value !== '' && !/^[^\s@]+@[^\s@]+$/.test(this.value.trim()) };
    }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    toggleAttribute(name, enabled) { if (enabled) this.setAttribute(name, ''); else this.removeAttribute(name); }
    addEventListener(type, callback) { const list = this.events.get(type) || []; list.push(callback); this.events.set(type, list); }
    fire(type) { const event = { target: this, preventDefault() {} }; for (const fn of this.events.get(type) || []) fn(event); }
    click() { if (!this.disabled) this.fire('click'); }
    focus() { doc.activeElement = this; }
    append(...children) { for (const child of children) this.children.push(...(child.fragment ? child.children : [child])); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
  }
  for (const [, tag, attrs, id] of html.matchAll(/<([a-z][\w:-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
    const node = new Node(tag, id, attrs);
    const match = html.match(new RegExp('id="' + id + '"[^>]*>([^<]*)'));
    node.textContent = match ? match[1] : '';
    nodes.set(id, node);
  }
  const radioTags = [...html.matchAll(/<input\b([^>]*name="outcome"[^>]*)>/g)];
  const radios = radioTags.map(([, attrs]) => { const n = new Node('input', '', attrs); n.value = n.getAttribute('value'); return n; });
  const arrow = new Node('svg');
  const spinner = new Node('span', '', 'hidden');
  nodes.get('submit-button').querySelector = (selector) => selector === '.submit-arrow' ? arrow : spinner;
  const form = nodes.get('signup-form');
  form.querySelector = (selector) => selector.endsWith(':checked') ? radios.find((radio) => radio.checked) : radios.find((radio) => radio.value === 'success');
  form.reset = () => { nodes.get('name').value = ''; nodes.get('email').value = ''; radios.forEach((radio) => { radio.checked = radio.value === 'success'; }); };
  form.requestSubmit = () => form.fire('submit');
  doc = {
    documentElement: new Node('html'), activeElement: null,
    getElementById(id) { assert(nodes.has(id), 'Missing HTML element: ' + id); return nodes.get(id); },
    createElement(tag) { return new Node(tag); },
    createDocumentFragment() { const node = new Node(); node.fragment = true; return node; },
  };
  const media = { matches: prefersDark, addEventListener(type, fn) { this.callback = fn; } };
  const storage = {
    getItem(key) { if (storageDenied) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { if (storageDenied) throw new Error('Storage blocked'); stored.set(key, value); },
  };
  vm.runInNewContext(source, {
    document: doc,
    localStorage: storage,
    window: { matchMedia: () => media, setTimeout: (fn, delay) => { assert.equal(delay, 900); timers.push(fn); } },
  }, { filename: 'app.js' });
  return {
    nodes, radios, timers, doc, stored, arrow, spinner, media,
    $(id) { return nodes.get(id); },
    submit() { form.fire('submit'); },
    flush() { assert.equal(timers.length, 1); timers.shift()(); },
    outcome(value) { radios.forEach((radio) => { radio.checked = radio.value === value; }); },
    values(name = '林予安', email = 'lin.yuan@example.com') { nodes.get('name').value = name; nodes.get('email').value = email; },
  };
}

check('JavaScript parses', () => { new vm.Script(source); });
check('HTML IDs are unique and required accessibility references exist', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, references] of html.matchAll(/aria-(?:describedby|labelledby)="([^"]+)"/g)) {
    references.split(/\s+/).forEach((id) => assert(ids.includes(id), id));
  }
  for (const id of ['name', 'email']) assert(html.includes('for="' + id + '"'));
  assert(html.includes('role="status" aria-live="polite" aria-atomic="true"'));
  assert(!/tabindex="[1-9]/.test(html));
  assert(css.includes(':focus-visible'));
});
check('Only existing local dependencies and anchors are referenced', () => {
  for (const [, target] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (target.startsWith('#')) assert(html.includes('id="' + target.slice(1) + '"'));
    else { assert(!/^(?:https?:|\/\/|data:)/.test(target)); assert(fs.existsSync(path.join(root, target))); }
  }
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(source));
  assert(!/@import|url\(/.test(css));
});
check('Original Chinese example and long English action are retained', () => {
  assert(html.includes('示例用户A'));
  assert(html.includes('待确认'));
  assert(html.includes('Confirm this appointment and keep my details'));
});
check('Responsive rules, flexible form sizing, wrapping, and reduced motion are present (source only)', () => {
  assert(css.includes('@media (max-width: 800px)'));
  assert(css.includes('@media (max-width: 520px)'));
  assert(css.includes('grid-template-columns: minmax(0, 1fr)'));
  assert(css.includes('white-space: normal; overflow-wrap: anywhere'));
  assert(css.includes('@media (prefers-reduced-motion: reduce)'));
  assert(html.includes('width=device-width, initial-scale=1'));
});
check('Exported design variables match the CSS', () => {
  const extract = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]));
  const base = extract(css.match(/:root \{([\s\S]*?)\n\}/)[1]);
  const dark = extract(css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1]);
  assert.deepEqual({ ...tokens.shared, ...tokens.themes.light }, base);
  assert.deepEqual(tokens.themes.dark, dark);
});

check('Startup enables the form after attaching handlers', () => {
  const app = boot();
  assert.equal(app.$('submit-button').disabled, false);
  assert.equal(app.$('entry-fields').disabled, false);
  assert.equal(app.$('sample-button').disabled, false);
  assert.equal(app.doc.documentElement.dataset.theme, 'light');
}, 'DOM stub');
check('Empty fields show associated errors and focus the first invalid field', () => {
  const app = boot(); app.submit();
  assert.equal(app.$('name-error').hidden, false);
  assert.equal(app.$('email-error').hidden, false);
  assert.equal(app.doc.activeElement.id, 'name');
  assert.equal(app.timers.length, 0);
}, 'DOM stub');
check('Invalid email preserves entered values; correction clears the field error', () => {
  const app = boot(); app.values('陈知夏', 'not-an-email'); app.submit();
  assert.equal(app.$('name').value, '陈知夏'); assert.equal(app.$('email').value, 'not-an-email');
  assert.equal(app.doc.activeElement.id, 'email'); assert.equal(app.timers.length, 0);
  app.$('email').value = 'chen.zhixia@example.com'; app.$('email').fire('input');
  assert.equal(app.$('email-error').hidden, true);
}, 'DOM stub');
check('Loading locks controls and rejects repeated submit events', () => {
  const app = boot(); app.values(); app.submit(); app.submit(); app.submit();
  assert.equal(app.timers.length, 1);
  assert.equal(app.$('submit-button').disabled, true);
  assert.equal(app.$('entry-fields').disabled, true);
  assert.equal(app.$('sample-button').disabled, true);
  assert.equal(app.$('signup-form').getAttribute('aria-busy'), 'true');
  assert.equal(app.spinner.hidden, false);
  assert.equal(app.arrow.getAttribute('hidden'), '');
  assert.equal(app.$('participant-count').textContent, '1');
}, 'DOM stub');
check('Simulated failure retains inputs and does not change the roster', () => {
  const app = boot(); app.values('周念初', 'zhou.nianchu@example.com'); app.outcome('failure'); app.submit(); app.flush();
  assert.equal(app.$('name').value, '周念初'); assert.equal(app.$('email').value, 'zhou.nianchu@example.com');
  assert.equal(app.$('participant-count').textContent, '1');
  assert.equal(app.$('feedback').dataset.tone, 'error'); assert.equal(app.$('retry-button').hidden, false);
  assert.equal(app.$('submit-button').disabled, false); assert.equal(app.doc.activeElement.id, 'feedback');
}, 'DOM stub');
check('Retry succeeds once, inserts the Chinese name, updates count, and resets the form', () => {
  const app = boot(); app.values(); app.outcome('failure'); app.submit(); app.flush();
  app.$('retry-button').click(); assert.equal(app.timers.length, 1); app.flush();
  assert.equal(app.$('participant-count').textContent, '2');
  assert.equal(app.$('participant-list').children.length, 2);
  assert(app.$('participant-list').children[0].textContent.includes('林予安'));
  assert(app.$('participant-list').children[1].textContent.includes('示例用户A'));
  assert.equal(app.$('feedback').dataset.tone, 'success');
  assert.equal(app.$('view-list-link').hidden, false);
  assert.equal(app.$('name').value, ''); assert.equal(app.$('email').value, '');
  assert.equal(app.doc.activeElement.id, 'name');
}, 'DOM stub');
check('Repeated successful entries retain earlier records and put the newest first', () => {
  const app = boot();
  app.$('sample-button').click(); app.submit(); app.flush();
  app.$('sample-button').click(); app.submit(); app.flush();
  assert.equal(app.$('participant-count').textContent, '3');
  const items = app.$('participant-list').children;
  assert(items[0].textContent.includes('陈知夏')); assert(items[1].textContent.includes('林予安'));
  assert.equal(app.stored.size, 0);
}, 'DOM stub');
check('User text is inserted as text and does not create HTML elements', () => {
  const app = boot(); const value = '<img src=x onerror=alert(1)>';
  app.values(value); app.submit(); app.flush();
  const heading = app.$('participant-list').children[0].children[1].children[0].children[0];
  assert.equal(heading.tagName, 'H3'); assert.equal(heading.textContent, value); assert.equal(heading.children.length, 0);
  assert(!/\.innerHTML|insertAdjacentHTML/.test(source));
}, 'DOM stub');
check('Theme toggle changes theme and aria-pressed, persisting only the preference', () => {
  const app = boot(); app.values(); app.$('theme-toggle').click();
  assert.equal(app.doc.documentElement.dataset.theme, 'dark');
  assert.equal(app.$('theme-toggle').getAttribute('aria-pressed'), 'true');
  assert.deepEqual([...app.stored.entries()], [['store-signup-demo-theme', 'dark']]);
  assert.equal(app.$('name').value, '林予安');
  app.$('theme-toggle').click(); assert.equal(app.doc.documentElement.dataset.theme, 'light');
}, 'DOM stub');
check('System preference works until overridden; storage denial does not block the form', () => {
  const app = boot({ prefersDark: true }); assert.equal(app.doc.documentElement.dataset.theme, 'dark');
  app.media.callback({ matches: false }); assert.equal(app.doc.documentElement.dataset.theme, 'light');
  app.$('theme-toggle').click(); app.media.callback({ matches: false }); assert.equal(app.doc.documentElement.dataset.theme, 'dark');
  const blocked = boot({ storageDenied: true }); blocked.$('theme-toggle').click(); blocked.values(); blocked.submit(); blocked.flush();
  assert.equal(blocked.$('participant-count').textContent, '2');
}, 'DOM stub');

const contrast = [];
function luminance(hex) {
  const values = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return values.reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
}
for (const [theme, colors] of Object.entries(tokens.themes)) {
  for (const [foreground, background, minimum] of [
    ['text', 'surface', 4.5], ['muted', 'surface', 4.5], ['muted', 'canvas', 4.5], ['muted', 'surface-subtle', 4.5],
    ['accent', 'accent-soft', 4.5], ['on-accent', 'accent', 4.5], ['danger', 'danger-soft', 4.5], ['warning', 'warning-soft', 4.5],
    ['input-border', 'surface', 3], ['focus', 'surface', 3],
  ]) {
    const values = [luminance(colors['--color-' + foreground]), luminance(colors['--color-' + background])].sort((a, b) => a - b);
    const ratio = (values[1] + 0.05) / (values[0] + 0.05);
    contrast.push({ theme, foreground, background, ratio: Number(ratio.toFixed(2)), minimum, status: ratio >= minimum ? 'passed' : 'failed' });
  }
}
check('20 declared foreground/background contrast pairs meet their stated thresholds', () => assert(contrast.every((pair) => pair.status === 'passed')), 'color calculation');

const report = {
  checkedAt: new Date().toISOString(),
  mode: 'Local source checks, Node VM with a minimal DOM stub, and numerical color calculations. No browser was launched.',
  checks,
  contrast,
  actualBrowser: {
    status: 'not run',
    reason: 'The current local Chromium environment was already reported blocked by socket permissions. This trial did not retry the blocked launch.',
    unverified: ['Actual layout at 390px', 'Visual rendering in light and dark themes', 'Real keyboard traversal', 'Native email validation behavior', 'Screen-reader announcements', 'Browser zoom, forced colors, and reduced-motion rendering'],
  },
};
fs.writeFileSync(path.join(root, 'checks.json'), JSON.stringify(report, null, 2) + '\n');
for (const result of checks) console.log(result.status.toUpperCase() + ' [' + result.kind + '] ' + result.name + (result.detail ? ': ' + result.detail : ''));
console.log(`Result: ${checks.filter((c) => c.status === 'passed').length}/${checks.length} checks passed; browser checks not run.`);
if (checks.some((c) => c.status === 'failed')) process.exitCode = 1;
