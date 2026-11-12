"""Browser checks for the task browser's authored English UI and draft continuity."""
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
ARTIFACTS = ROOT / 'browser-artifacts' / 'task-browser-locales'
HAN = re.compile(r'[\u3400-\u9fff]')
FINANCE = 'financial-modeler-deliver'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class TaskBrowserLocaleAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(parents=True, exist_ok=True)
        cls.server = http.server.ThreadingHTTPServer(
            ('127.0.0.1', 0),
            functools.partial(QuietHandler, directory=str(ROOT / '.site')))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.errors.append(
            f'{response.status} {response.url}') if response.status >= 400 else None)

    def tearDown(self):
        self.page.screenshot(path=str(ARTIFACTS / f'{self.id().split(".")[-1]}.png'))
        self.context.close()
        self.assertEqual(self.errors, [])

    def open_finance(self, language='en'):
        self.page.goto(self.url + f'/?lang={language}#capability={FINANCE}')
        expect(self.page.locator('#detail')).to_be_visible()

    def open_editor(self, language='en'):
        label = 'View or edit the full request' if language == 'en' else '查看或编辑完整请求'
        editor = self.page.locator('.request-editor')
        if editor.get_attribute('open') is None:
            editor.locator('summary').click()
        return self.page.get_by_label('Editable task request' if language == 'en' else '可编辑的使用请求', exact=True)

    def switch_detail_language(self, language):
        self.page.locator('#detail-language').select_option(language)
        expect(self.page.locator('html')).to_have_attribute('lang', language)
        self.assertIn(f'lang={language}', self.page.url)
        self.assertIn(f'#capability={FINANCE}', self.page.url)
        expect(self.page.locator('#detail')).to_be_visible()

    def test_all_cards_and_walkthrough_details_are_english(self):
        self.page.goto(self.url + '/?lang=en')
        count = self.page.locator('#capability-data').evaluate(
            '(element) => JSON.parse(element.textContent).capabilityCount')
        expect(self.page.locator('#cards .card')).to_have_count(count)
        self.assertNotRegex(self.page.locator('#cards').inner_text(), HAN)
        self.assertNotRegex(self.page.locator('#showcase-cards').inner_text(), HAN)
        for link in self.page.locator('#showcase-cards a.primary').all():
            self.assertIn('?lang=en', link.get_attribute('href'))
        for capability, title in [
                (FINANCE, 'Build a financial forecast'),
                ('design-system-designer-deliver', 'Create a consistent design system')]:
            self.page.locator('#search').fill(capability)
            self.page.locator(f'[data-capability="{capability}"] .details-button').click()
            expect(self.page.locator('#detail-title')).to_have_text(title)
            self.page.get_by_text('Full requirements and boundaries', exact=True).click()
            self.assertNotRegex(self.page.locator('#detail-content').inner_text(), HAN)
            self.page.keyboard.press('Escape')
        self.page.locator('#search').fill('store-performance-analyst-assist')
        self.page.locator('[data-capability="store-performance-analyst-assist"] .details-button').click()
        self.assertNotRegex(self.page.locator('#detail-content').inner_text(), HAN)
        self.page.get_by_text('Original package specification', exact=True).click()
        self.assertRegex(self.page.locator('#detail-content').inner_text(), HAN,
                         'The original specialist terms remain available without being rewritten')
        self.page.keyboard.press('Escape')
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))

    def test_english_copy_and_manual_draft_survive_reload_and_language_switch(self):
        # A local clipboard fixture exercises the UI callback without changing a desktop clipboard.
        self.context.add_init_script(
            "Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text)=>{window.copiedRequest=text}}});")
        self.open_finance()
        self.page.locator('#request-goal').fill('Explain the next 12 months of cash')
        self.page.locator('#request-materials').fill('inputs.json; keep the original currency')
        self.page.locator('#request-host').select_option('meta-kim')
        self.page.get_by_role('button', name='Copy request', exact=True).click()
        expect(self.page.locator('.copy-status')).to_contain_text('Copied.')
        copied = self.page.evaluate('window.copiedRequest')
        self.assertTrue(copied.startswith('/meta-theory '))
        self.assertIn('inputs.json', copied)
        self.assertNotRegex(copied, HAN)
        editor = self.open_editor()
        manual = 'Keep my exact requirement: 使用真实材料, no external publication.'
        editor.fill(manual)
        self.page.reload()
        expect(self.page.get_by_label('Editable task request', exact=True)).to_have_value(manual)
        self.switch_detail_language('zh-CN')
        expect(self.page.get_by_label('可编辑的使用请求', exact=True)).to_have_value(manual)
        expect(self.page.locator('#request-goal')).to_have_value('Explain the next 12 months of cash')
        self.switch_detail_language('en')
        expect(self.page.get_by_label('Editable task request', exact=True)).to_have_value(manual)
        with self.page.expect_download() as download:
            self.page.get_by_role('button', name='Download draft', exact=True).click()
        saved = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(saved['capabilityId'], FINANCE)
        self.assertEqual(saved['draft']['request'], manual)
        self.page.get_by_role('button', name='Clear draft', exact=True).click()
        self.page.locator('#import-draft').set_input_files({
            'name': 'restored.json', 'mimeType': 'application/json',
            'buffer': json.dumps(saved).encode()})
        expect(self.page.get_by_label('Editable task request', exact=True)).to_have_value(manual)

    def test_switching_language_preserves_memory_when_browser_storage_is_denied(self):
        self.context.add_init_script(
            "Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};")
        self.open_finance()
        self.page.locator('#request-goal').fill('A draft that cannot be saved yet')
        editor = self.open_editor()
        editor.fill('Preserve this complete manual request in memory.')
        expect(self.page.locator('.draft-status')).to_contain_text('cannot save right now')
        self.switch_detail_language('zh-CN')
        expect(self.page.get_by_label('可编辑的使用请求', exact=True)).to_have_value(
            'Preserve this complete manual request in memory.')
        self.switch_detail_language('en')
        expect(self.page.get_by_label('Editable task request', exact=True)).to_have_value(
            'Preserve this complete manual request in memory.')
        with self.page.expect_download() as download:
            self.page.get_by_role('button', name='Download draft', exact=True).click()
        saved = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(saved['draft']['goal'], 'A draft that cannot be saved yet')

    def test_import_and_copy_failures_explain_recovery_in_english(self):
        self.context.add_init_script(
            "Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError')}}});")
        self.open_finance()
        self.page.get_by_role('button', name='Copy request', exact=True).click()
        expect(self.page.locator('.copy-status')).to_contain_text('text is selected')
        editor = self.page.get_by_label('Editable task request', exact=True)
        expect(editor).to_be_visible()
        editor.fill('Keep this draft while a bad import is rejected.')
        self.page.locator('#import-draft').set_input_files(
            {'name': 'broken.json', 'mimeType': 'application/json', 'buffer': b'{'})
        expect(self.page.locator('.copy-status')).to_contain_text('not valid JSON')
        expect(editor).to_have_value('Keep this draft while a bad import is rejected.')
        self.assertNotRegex(self.page.locator('.copy-status').inner_text(), HAN)
        self.page.locator('#import-draft').set_input_files({
            'name': 'wrong-task.json', 'mimeType': 'application/json',
            'buffer': json.dumps({'schemaVersion': 1, 'capabilityId': 'other-task', 'draft': {}}).encode()})
        expect(self.page.locator('.copy-status')).to_contain_text('format or task does not match')
        expect(editor).to_have_value('Keep this draft while a bad import is rejected.')
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))


if __name__ == '__main__':
    unittest.main()
