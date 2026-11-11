'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'method/scripts/operating-forecast.js'));
const inputPath = path.join(root, 'inputs/confirmed-budget.json');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const expected = engine.forecast(input);
const artifactDir = path.join(__dirname, 'ui-validation');
fs.mkdirSync(artifactDir, {recursive:true});
const format = n => new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const report = {schemaVersion:1,status:'not_completed',checks:[],pageErrors:[],notPerformed:['real_business_acceptance','professional_effect_evaluation']};
(async()=>{
  let browser;
  try {
    browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
    const page = await browser.newPage({viewport:{width:1440,height:1050},acceptDownloads:true});
    page.on('pageerror', e=>report.pageErrors.push(e.message));
    await page.goto(pathToFileURL(path.join(root,'method/examples/operating-forecast/index.html')).href);
    await page.locator('#scenario-cards article').first().waitFor();
    report.checks.push('Opened actual bundled local forecast page in Chromium.');
    await page.locator('details.advanced summary').click();
    await page.locator('#import-json').setInputFiles(inputPath);
    await page.waitForFunction(()=>document.getElementById('period').textContent.startsWith('2027-01'));
    assert.equal(await page.locator('#variableCostPerUnit').inputValue(), '45');
    assert.equal(await page.locator('#scenario-cards article').count(),3);
    report.checks.push('Imported the actual confirmed budget and displayed all three scenarios with cost45.');
    for(const scenario of expected.scenarios){
      await page.locator('#scenario-select').selectOption(scenario.id);
      const rows = await page.locator('#monthly-rows tr').allTextContents();
      assert.equal(rows.length,12);
      for(let i=0;i<12;i++){
        const cells = await page.locator('#monthly-rows tr').nth(i).locator('th,td').allTextContents();
        assert.deepEqual(cells,[scenario.months[i].month,...['revenue','netIncome','receipts','payments','financing','endingCash'].map(k=>format(scenario.months[i][k]))]);
      }
    }
    report.checks.push('Verified all seven displayed cells in each of 36 month rows against the generated calculation.');
    await page.locator('#scenario-select').selectOption('base');
    await page.screenshot({path:path.join(artifactDir,'confirmed-budget-page.png'),fullPage:true});
    await page.locator('#variableCostPerUnit').fill('50');
    const alternate = structuredClone(input);alternate.drivers.variableCostPerUnit=50;
    const altResult = engine.forecast(alternate);
    const cardProfit = await page.locator('#scenario-cards article').first().locator('.major').textContent();
    assert.equal(cardProfit,format(altResult.scenarios[0].summary.totalNetIncome));
    report.checks.push('Changed cost from45 to50 in the page; base profit recomputed to11232.00.');
    await page.locator('#variableCostPerUnit').fill('45');
    assert.equal(await page.locator('#scenario-cards article').first().locator('.major').textContent(),format(expected.scenarios[0].summary.totalNetIncome));
    report.checks.push('Restored confirmed cost45 before exporting.');
    const downloads = [
      ['#download-input','forecast-input.json'],
      ['#download-result','forecast-result.json'],
      ['#download-csv','forecast-months.csv']
    ];
    for(const [button,file] of downloads){
      const promise = page.waitForEvent('download');
      await page.locator(button).click();
      const download = await promise;
      await download.saveAs(path.join(artifactDir,file));
      assert.equal(await download.failure(),null);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(artifactDir,'forecast-input.json'),'utf8')),input);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(artifactDir,'forecast-result.json'),'utf8')),expected);
    const csv = fs.readFileSync(path.join(artifactDir,'forecast-months.csv'),'utf8');
    assert.equal(csv.replace(/^\uFEFF/,'').trim().split(/\r?\n/).length,37);
    assert.equal(csv.replace(/^\uFEFF/,''),engine.toCsv(expected));
    report.checks.push('Actually downloaded inputJSON,resultJSON,monthlyCSV; input and result match calculation, CSV has36 data rows plus header and exact expected content.');
    assert.equal(report.pageErrors.length,0);
    report.status='passed';
    report.screenshot='ui-validation/confirmed-budget-page.png';
    report.downloads=downloads.map(x=>'ui-validation/'+x[1]);
  } catch(e) {
    report.status='failed';
    report.error=e.stack;
    process.exitCode=1;
  } finally {
    if(browser)await browser.close();
    fs.writeFileSync(path.join(__dirname,'page-verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
  }
})();
