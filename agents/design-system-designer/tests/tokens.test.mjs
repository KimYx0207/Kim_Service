import test from 'node:test';
import assert from 'node:assert/strict';
import tools from '../examples/service-console/tokens.js';
import config from '../examples/service-console/config.js';
test('both themes resolve their actual colors and the button chooses readable text after editing',()=>{
  for(const theme of Object.keys(config.tokens.themes))for(const name of Object.keys(config.tokens.themes[theme]))assert.match(tools.resolve(config.tokens,`themes.${theme}.${name}`),/^#[0-9a-f]{6}$/i);
  for(const color of ['#176b50','#ffff00','#000000','#ffffff','#886688']) assert.ok(tools.contrast(color,tools.actionText(color))>=4.5);
});
test('broken references, cycles and injected color values are rejected rather than exported as usable colors',()=>{
  const cycle=structuredClone(config.tokens);cycle.palette.action='{themes.light.action}';assert.throws(()=>tools.resolve(cycle,'themes.light.action'),/循环/);
  const missing=structuredClone(config.tokens);missing.themes.light.action='{palette.absent}';assert.throws(()=>tools.resolve(missing,'themes.light.action'),/缺少/);
  assert.throws(()=>tools.actionText('url(https://example.test)'));
});
