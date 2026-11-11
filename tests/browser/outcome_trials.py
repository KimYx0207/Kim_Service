"""Observe the preserved, unmodified trial outputs in an actual offline browser.
These checks record behavior; they do not declare a skill generally superior.
"""
import json
import pathlib
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
TRIALS = ROOT / 'docs/verification/outcome-trials-20261111/observed-artifacts'
ARTIFACTS = ROOT / 'browser-artifacts'
ARTIFACTS.mkdir(exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    for name in ['design-baseline', 'design-method']:
        record = {'trial': name, 'checks': [], 'status': 'not_run'}
        context = browser.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto((TRIALS / name / 'output/index.html').as_uri())
            expect(page.locator('#submit-button')).to_be_enabled()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), '390px page overflow'
            record['checks'].append('390px layout fits')
            # Real keyboard action: focus the first form field and traverse to email.
            page.locator('#name').focus()
            page.keyboard.type('示例顾客')
            page.keyboard.press('Tab')
            expect(page.locator('#email')).to_be_focused()
            page.keyboard.type('demo@example.test')
            record['checks'].append('keyboard name to email traversal')
            page.locator('#name').fill('')
            page.locator('#submit-button').click()
            expect(page.locator('#name-error')).to_be_visible()
            page.locator('#name').fill('示例顾客')
            if name.endswith('baseline'):
                page.locator('input[name="outcome"][value="failure"]').check()
            else:
                page.locator('#simulate-failure').check()
            page.locator('#submit-button').click()
            expect(page.locator('#submit-button')).to_be_disabled()
            expect(page.locator('#feedback')).to_have_attribute('data-tone' if name.endswith('baseline') else 'data-state', 'error')
            expect(page.locator('#name')).to_have_value('示例顾客')
            expect(page.locator('#email')).to_have_value('demo@example.test')
            record['checks'].append('required field, loading guard, failure retains inputs')
            if name.endswith('baseline'):
                page.locator('#retry-button').click()
                expect(page.locator('#participant-count')).to_have_text('2')
            else:
                page.locator('#submit-button').click()
                expect(page.locator('#entry-count')).to_contain_text('2')
            record['checks'].append('retry succeeds and updates list')
            page.locator('#theme-toggle').click()
            expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
            page.screenshot(path=str(ARTIFACTS / f'{name}-390.png'), full_page=True)
            page.set_viewport_size({'width': 1440, 'height': 1000})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Desktop page overflow'
            page.screenshot(path=str(ARTIFACTS / f'{name}-1440.png'), full_page=True)
            assert not errors, str(errors)
            record['checks'].append('dark theme and desktop layout, no script error')
            record['status'] = 'pass'
        except Exception as error:
            record['status'] = 'fail'
            record['error'] = str(error)
            page.screenshot(path=str(ARTIFACTS / f'{name}-failure.png'), full_page=True)
        finally:
            results.append(record)
            context.close()
    for name in ['frontend-baseline', 'frontend-method']:
        record = {'trial': name, 'status': 'not_run'}
        context = browser.new_context()
        page = context.new_page()
        try:
            page.goto((TRIALS / name / 'output/index.html').as_uri())
            expect(page.locator('h1')).to_have_text('继续编辑草稿')
            record['status'] = 'pass'
            record['checks'] = ['actual browser heading display; byte preservation checked separately']
        except Exception as error:
            record['status'] = 'fail'
            record['error'] = str(error)
        finally:
            results.append(record)
            context.close()
    browser.close()
(ARTIFACTS / 'outcome-trials.json').write_text(json.dumps({'scope': 'actual browser observation of preserved pilot outputs', 'results': results, 'generalProfessionalEffect': 'not_evaluated'}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(results, ensure_ascii=False, indent=2))
# A failed observed pilot is evidence, not a reason to rewrite a model output.
# Product acceptance remains a separate required test; report outcomes honestly.
