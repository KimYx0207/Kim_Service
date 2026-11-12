"""Verify the English examples preserve the behavior and numbers of the originals."""
import functools
import http.server
import json
import os
import pathlib
import re
import threading
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / 'browser-artifacts' / 'locales'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class SampleLocales(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT / '.site')))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=5)

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1050})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)

    def tearDown(self):
        self.page.screenshot(path=str(ARTIFACTS / f'{self.id().split(".")[-1]}.png'), full_page=True)
        self.context.close()
        self.assertEqual(self.errors, [])

    def assert_english(self):
        expect(self.page.locator('html')).to_have_attribute('lang', 'en')
        # The language switch intentionally retains the native name of Chinese.
        visible = self.page.locator('body').inner_text().replace('中文', '')
        self.assertFalse(re.search(r'[\u3400-\u9fff]', visible), 'Untranslated built-in UI or sample copy in the English page')

    def assert_page_fits(self):
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'The page must fit; the table can scroll inside its region')

    def download_json(self, selector):
        with self.page.expect_download() as downloaded:
            self.page.locator(selector).click()
        return json.loads(pathlib.Path(downloaded.value.path()).read_text())

    def switch_language(self, language):
        self.page.evaluate("window.sampleLocalePageIdentity = 'keep-this-page'")
        self.page.locator(f'[data-language="{language}"]').click()
        expect(self.page.locator('html')).to_have_attribute('lang', language)
        self.assertEqual(self.page.evaluate('window.sampleLocalePageIdentity'), 'keep-this-page', 'Switching language must not reload the page')
        expect(self.page.locator('[data-language][aria-current="true"]')).to_have_count(1)
        expect(self.page.locator(f'[data-language="{language}"]')).to_have_attribute('aria-current', 'true')

    def test_english_booking_validation_retry_and_design_export(self):
        self.page.goto(self.url + '/agents/design-system-designer/examples/service-console/index.html?lang=en')
        self.assert_english()
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#name-error')).to_have_text('Enter a sample name.')
        expect(self.page.locator('#guest-name')).to_be_focused()
        self.page.locator('#guest-name').fill('Sample visitor D')
        self.page.locator('#guest-email').fill('demo-d@example.test')
        self.page.locator('#guest-note').fill('Keep this note while changing language.')
        self.page.locator('#time-slot').select_option('15:00 — 15:30')
        self.page.locator('#service').select_option('作品领取')
        self.page.locator('#theme').select_option('dark')
        self.page.locator('#density').select_option('compact')
        self.page.locator('#font-size').select_option('18')
        self.page.locator('#accent').fill('#c95c35')
        tokens = self.download_json('#download-tokens')
        self.page.locator('#simulate-error').check()
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#form-status')).to_contain_text('temporarily unavailable')
        self.switch_language('zh-CN')
        expect(self.page.locator('#form-status')).to_have_attribute('data-state', 'error')
        expect(self.page.locator('#form-status')).to_contain_text('输入已保留')
        expect(self.page.locator('#guest-name')).to_have_value('Sample visitor D')
        expect(self.page.locator('#guest-email')).to_have_value('demo-d@example.test')
        expect(self.page.locator('#guest-note')).to_have_value('Keep this note while changing language.')
        expect(self.page.locator('#time-slot')).to_have_value('15:00 — 15:30')
        expect(self.page.locator('#service')).to_have_value('作品领取')
        expect(self.page.locator('#theme')).to_have_value('dark')
        expect(self.page.locator('#density')).to_have_value('compact')
        expect(self.page.locator('#font-size')).to_have_value('18')
        self.assertEqual(self.download_json('#download-tokens'), tokens)
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#booking-count')).to_have_text('4')
        self.page.locator('#booking-rows tr').first.get_by_role('button', name='Sample visitor D: 标记到店').click()
        self.switch_language('en')
        expect(self.page.locator('#booking-count')).to_have_text('4')
        expect(self.page.locator('#booking-rows tr').first).to_contain_text('Arrived')
        expect(self.page.locator('#form-status')).to_contain_text('Sample visitor D is now Arrived')
        expect(self.page.locator('#guest-note')).to_have_value('Keep this note while changing language.')
        self.assertEqual(self.download_json('#download-tokens'), tokens)
        self.assertEqual(tokens['palette']['action'], '#c95c35')
        self.assert_english()
        # A user may type text that is also a built-in sample label. It is still their text.
        self.page.locator('#guest-name').fill('示例用户 A')
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#booking-count')).to_have_text('5')
        self.switch_language('zh-CN')
        self.switch_language('en')
        expect(self.page.locator('#booking-rows tr').first.locator('strong')).to_have_text('示例用户 A')
        self.assertEqual(self.page.evaluate("['constructor','toString','__proto__'].map(value => KimServiceConsoleLocale.business(value))"), ['constructor', 'toString', '__proto__'])
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()

    def test_forecast_language_keeps_numbers_currency_and_user_text(self):
        path = '/agents/financial-modeler/examples/operating-forecast/index.html'
        self.page.goto(self.url + path)
        original = self.download_json('#download-result')
        self.page.goto(self.url + path + '?lang=en')
        self.assert_english()
        english = self.download_json('#download-result')
        self.assertEqual(english['currency'], 'CNY')
        for old, translated in zip(original['scenarios'], english['scenarios']):
            self.assertEqual(old['months'], translated['months'])
            self.assertEqual(old['summary'], translated['summary'])
        self.page.locator('#openingCash').fill('25000')
        edited = self.download_json('#download-result')
        self.assertAlmostEqual(edited['scenarios'][0]['months'][0]['endingCash'] - english['scenarios'][0]['months'][0]['endingCash'], 13000)
        saved_inputs = self.download_json('#download-input')
        self.page.locator('#scenario-select').select_option('downside')
        self.page.locator('.advanced summary').click()
        unfinished_json = '{"title": "Unfinished input; do not apply it'
        self.page.locator('#json-input').fill(unfinished_json)
        self.switch_language('zh-CN')
        expect(self.page.locator('#json-input')).to_have_value(unfinished_json)
        expect(self.page.locator('#openingCash')).to_have_value('25000')
        expect(self.page.locator('#scenario-select')).to_have_value('downside')
        self.assertEqual(self.download_json('#download-input'), saved_inputs)
        after_switch = self.download_json('#download-result')
        self.assertEqual(after_switch['currency'], edited['currency'])
        self.assertEqual(after_switch['scenarios'], edited['scenarios'])
        self.page.locator('#apply-json').click()
        expect(self.page.locator('#results')).not_to_be_visible()
        self.switch_language('en')
        expect(self.page.locator('#json-input')).to_have_value(unfinished_json)
        expect(self.page.locator('#results')).not_to_be_visible()
        expect(self.page.locator('#input-status')).to_contain_text('full input was not applied')
        self.page.locator('#json-input').fill(json.dumps(saved_inputs))
        self.page.locator('#apply-json').click()
        expect(self.page.locator('#results')).to_be_visible()
        self.page.locator('#openingCash').fill('')
        expect(self.page.locator('#input-error')).to_contain_text('must be a finite number')
        expect(self.page.locator('#results')).not_to_be_visible()
        self.switch_language('zh-CN')
        expect(self.page.locator('#openingCash')).to_have_value('')
        expect(self.page.locator('#results')).not_to_be_visible()
        expect(self.page.locator('#input-error')).to_contain_text('必须是')
        self.switch_language('en')
        expect(self.page.locator('#input-error')).to_contain_text('must be a finite number')
        expect(self.page.locator('#results')).not_to_be_visible()
        self.page.locator('#reset').click()
        expect(self.page.locator('#monthly-rows tr')).to_have_count(12)
        self.assert_english()
        inputs = json.loads(self.page.locator('#json-input').input_value())
        inputs['title'] = '我的业务原文'
        inputs['assumptions'] = ['保留用户材料，不替换为英文示例。', 'constructor', 'toString', '__proto__']
        inputs['scenarios'][0]['label'] = '基准'
        inputs['scenarios'][1]['label'] = 'constructor'
        inputs['scenarios'][2]['label'] = '__proto__'
        inputs['exampleData'] = False
        self.page.locator('#json-input').fill(json.dumps(inputs, ensure_ascii=False))
        self.page.locator('#apply-json').click()
        user_result = self.download_json('#download-result')
        self.assertEqual(user_result['title'], inputs['title'])
        self.assertEqual(user_result['assumptions'], inputs['assumptions'])
        self.switch_language('zh-CN')
        self.switch_language('en')
        self.assertEqual(self.download_json('#download-input'), inputs)
        after_switch = self.download_json('#download-result')
        self.assertEqual(after_switch['title'], inputs['title'])
        self.assertEqual(after_switch['assumptions'], inputs['assumptions'])
        self.assertEqual(after_switch['scenarios'], user_result['scenarios'])
        expect(self.page.locator('#scenario-cards h3').first).to_have_text('基准')
        expect(self.page.locator('.sample-badge')).to_have_text('Your inputs · Review the assumptions')
        self.assertEqual(self.page.evaluate("['constructor','toString','__proto__'].map(value => KimForecastLocale.original(value))"), ['constructor', 'toString', '__proto__'])
        self.assertEqual(self.page.evaluate("['constructor','toString','__proto__'].map(value => KimForecastLocale.error(value))"), ['constructor', 'toString', '__proto__'])
        with self.page.expect_download() as downloaded:
            self.page.locator('#download-csv').click()
        self.assertGreater(len(pathlib.Path(downloaded.value.path()).read_text().splitlines()), 12)
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()


if __name__ == '__main__':
    unittest.main(verbosity=2)
