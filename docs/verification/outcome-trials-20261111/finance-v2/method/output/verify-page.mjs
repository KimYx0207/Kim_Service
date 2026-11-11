import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
process.chdir(path.resolve(import.meta.dirname, '..'));
const out = path.resolve('output');
fs.mkdirSync(path.join(out, 'ui-downloads'), {recursive: true});
fs.mkdirSync(path.join(out, 'browser-tmp'), {recursive: true});
const budget = JSON.parse(fs.readFileSync('inputs/confirmed-budget.json', 'utf8'));
const forecast = JSON.parse(fs.readFileSync('output/forecast.json', 'utf8'));
const alternate = JSON.parse(fs.readFileSync('output/sensitivity.json', 'utf8'));
let context;
const checks = [];
const report = {status: 'not_completed', engine: 'Chromium via Playwright', checks, source: 'method/examples/operating-forecast/index.html', externalNetworkUsed: false, attemptNotes: ['首次直接ESM导入playwright未解析到运行时模块；随后改用createRequire按已配置模块路径加载。', 'Playwright默认浏览器缓存不存在；发现系统已安装/usr/bin/chromium，改用该现有浏览器。']};
try {
  context = await chromium.launchPersistentContext(path.join(out, 'browser-profile'), {
    executablePath: '/usr/bin/chromium', headless: true, acceptDownloads: true, viewport: {width: 1440, height: 1200},
    args: ['--no-sandbox'], env: {...process.env, TMPDIR: path.join(out, 'browser-tmp')}
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto('file://' + path.resolve('method/examples/operating-forecast/index.html'), {waitUntil: 'load'});
  await page.locator('.advanced > summary').click();
  await page.locator('#json-input').fill(JSON.stringify(budget));
  await page.locator('#apply-json').click();
  assert.equal(await page.locator('#scenario-cards article').count(), 3);
  assert.equal(await page.locator('#monthly-rows tr').count(), 12);
  assert.equal(await page.locator('#input-error').isVisible(), false);
  checks.push('实际打开包内页面并通过完整假设控件应用本题预算；显示3种情景及12个月');
  const fmt = x => new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 2, minimumFractionDigits: 2}).format(x);
  for (const scenario of forecast.scenarios) {
    await page.locator('#scenario-select').selectOption(scenario.id);
    const table = await page.locator('#monthly-rows tr').allTextContents();
    for (let i=0; i<12; i++) {
      const cells = await page.locator('#monthly-rows tr').nth(i).locator('th,td').allTextContents();
      assert.deepEqual(cells, [scenario.months[i].month, ...['revenue','netIncome','receipts','payments','financing','endingCash'].map(k => fmt(scenario.months[i][k]))]);
    }
  }
  checks.push('逐情景比对页面36行、每行6个金额与主预测一致');
  await page.locator('#scenario-select').selectOption('base');
  await page.screenshot({path: path.join(out, 'forecast-page.png'), fullPage: true});
  async function download(selector, file) {
    const pending = page.waitForEvent('download');
    await page.locator(selector).click();
    const item = await pending;
    const target = path.join(out, 'ui-downloads', file);
    await item.saveAs(target);
    assert.equal(await item.failure(), null);
    return fs.readFileSync(target, 'utf8');
  }
  const exported = JSON.parse(await download('#download-result', 'forecast-result.json'));
  assert.deepEqual(exported, forecast);
  const inputExported = JSON.parse(await download('#download-input', 'forecast-input.json'));
  assert.deepEqual(inputExported, budget);
  const csv = await download('#download-csv', 'forecast-months.csv');
  assert.equal(csv, fs.readFileSync('output/forecast-months.csv', 'utf8'));
  assert.equal(csv.trim().split(/\r?\n/).length, 37);
  checks.push('实际点击下载输入JSON、结果JSON、CSV；下载内容与输入/主预测/CSV一致');
  await page.locator('#variableCostPerUnit').fill('50');
  const changed = JSON.parse(await download('#download-result', 'pending-quote-result.json'));
  assert.deepEqual(changed.scenarios.find(s => s.id === 'base').months, alternate.scenarios[0].months);
  assert.deepEqual(changed.scenarios.find(s => s.id === 'base').summary, alternate.scenarios[0].summary);
  checks.push('实际改页面成本45→50，基准重算与独立存档的单因素敏感性一致');
  await page.locator('#variableCostPerUnit').fill('45');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  report.status = 'passed';
  report.pageErrors = errors;
} catch(error) {
  report.status = 'failed';
  report.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  fs.writeFileSync(path.join(out, 'page-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  fs.rmSync(path.join(out, 'browser-profile'), {recursive: true, force: true});
  fs.rmSync(path.join(out, 'browser-tmp'), {recursive: true, force: true});
}
