"""Real browser acceptance of the built site and its declared sample outputs."""
import functools
import http.server
import json
import os
import pathlib
import threading
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[2]
ARTIFACTS = ROOT / 'browser-artifacts'


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


class BrowserAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ARTIFACTS.mkdir(exist_ok=True)
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

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 1000})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('response', lambda response: self.errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)

    def tearDown(self):
        self.page.screenshot(path=str(ARTIFACTS / f'{self.id().split(".")[-1]}.png'), full_page=True)
        self.context.close()
        self.assertEqual(self.errors, [])

    def assert_page_fits(self):
        self.assertTrue(self.page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Page overflow; tables may scroll inside their own region')

    def test_catalog_goal_draft_keyboard_and_clipboard_failure(self):
        # A deliberate browser-denial fixture, not a claim about host permissions.
        self.context.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new DOMException('Denied','NotAllowedError')}}});")
        self.page.goto(self.url)
        expect(self.page.locator('#showcase-cards article')).to_have_count(2)
        self.page.locator('#search').fill('经营预测')
        trigger = self.page.locator('[data-capability="financial-modeler-deliver"] button.details-button')
        trigger.click()
        expect(self.page.locator('#detail-title')).to_be_focused()
        self.page.locator('#request-goal').fill('为门店做未来12个月现金预测')
        self.page.locator('#request-materials').fill('sales.csv；币种CNY；保留原始数据')
        self.page.locator('#request-host').select_option('meta-kim')
        self.page.get_by_role('button', name='复制请求', exact=True).click()
        expect(self.page.locator('.copy-status')).to_contain_text('已选中文本')
        expect(self.page.get_by_label('可编辑的使用请求')).to_be_visible()
        text = self.page.get_by_label('可编辑的使用请求').input_value()
        self.assertIn('sales.csv', text)
        self.assertIn('/meta-theory', text)
        editor = self.page.get_by_label('可编辑的使用请求')
        editor.fill('保留这段手工补充与授权范围')
        self.page.locator('#request-materials').fill('更新材料.csv')
        expect(editor).to_have_value('保留这段手工补充与授权范围')
        self.page.get_by_role('button', name='按表单重新生成').click()
        self.assertIn('更新材料.csv', editor.input_value())
        self.page.get_by_role('button', name='恢复上一版').click()
        expect(editor).to_have_value('保留这段手工补充与授权范围')
        self.page.keyboard.press('Escape')
        expect(self.page.locator('#detail')).not_to_be_visible()
        expect(trigger).to_be_focused()
        trigger.click()
        expect(self.page.locator('#request-goal')).to_have_value('为门店做未来12个月现金预测')
        self.page.keyboard.press('Escape')
        self.page.locator('#search').fill('no_such_result_8097')
        expect(self.page.locator('#empty')).to_be_visible()
        self.page.get_by_role('button', name='查看全部能力').click()
        expect(self.page.locator('#empty')).not_to_be_visible()
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()

    def test_industry_role_navigation_keeps_exact_contract_and_draft_on_language_change(self):
        self.page.goto(self.url)
        expect(self.page.locator('#agent-role')).to_be_disabled()
        self.page.locator('#agent-group').select_option('financial-services')
        self.page.locator('#agent-role').select_option('insurance-claims-analyst')
        expect(self.page.locator('#cards article')).to_have_count(1)
        expect(self.page.locator('#cards article')).to_have_attribute('data-capability', 'insurance-claims-analyst-deliver')
        expect(self.page.locator('#cards .classification')).to_contain_text('金融保险')
        self.page.locator('#language').select_option('en')
        expect(self.page.locator('#agent-group')).to_have_value('financial-services')
        expect(self.page.locator('#agent-role')).to_have_value('insurance-claims-analyst')
        expect(self.page.locator('#cards h3')).to_have_text('Insurance claims analyst')
        self.page.locator('#cards .details-button').click()
        editor = self.page.get_by_label('Editable task request', exact=True)
        self.assertIn('agents/insurance-claims-analyst/AGENT.md', editor.input_value())
        self.assertIn('insurance-claims-analyst-deliver', editor.input_value())
        # Missing policy/loss data remain missing; selecting the role is not a claim evaluation.
        self.page.locator('#request-materials').fill('No policy or loss documents supplied; do not invent a claim decision.')
        self.page.locator('#detail-language').select_option('zh-CN')
        expect(self.page.locator('#request-materials')).to_have_value('No policy or loss documents supplied; do not invent a claim decision.')
        self.page.keyboard.press('Escape')
        self.page.locator('#agent-group').select_option('software')
        expect(self.page.locator('#agent-role')).to_have_value('')
        self.page.locator('#agent-role').select_option('reliability-engineer')
        expect(self.page.locator('#cards article')).to_have_count(1)
        self.page.locator('#cards .details-button').click()
        self.page.locator('#request-materials').fill('真实仓库材料：hooks/evidence-receipt/scripts/hook.mjs；git commit 79251f2；未提供客户影响时间。')
        self.assertIn('agents/reliability-engineer/AGENT.md', self.page.get_by_label('可编辑的使用请求', exact=True).input_value())
        with self.page.expect_download() as download:
            self.page.get_by_role('button', name='下载草稿', exact=True).click()
        saved = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(saved['capabilityId'], 'reliability-engineer-deliver')
        self.assertIn('79251f2', saved['draft']['materials'])
        self.assertEqual(saved['requestMode'], 'generated')
        self.assertIs(saved['draft']['manual'], False)
        self.page.keyboard.press('Escape')
        self.page.locator('#types button[data-type="skill"]').click()
        expect(self.page.locator('#agent-group')).to_have_value('')
        expect(self.page.locator('#agent-role')).to_be_disabled()
        self.page.locator('#types button[data-type="all"]').click()
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()

    def test_design_validation_recovery_theme_and_download(self):
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.page.goto(self.url + '/agents/design-system-designer/examples/service-console/index.html')
        self.assert_page_fits()
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#name-error')).to_be_visible()
        expect(self.page.locator('#guest-name')).to_be_focused()
        self.page.locator('#guest-name').fill('示例顾客')
        self.page.locator('#guest-email').fill('user@example.test')
        self.page.locator('#simulate-error').check()
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#form-status')).to_contain_text('暂时不可用')
        expect(self.page.locator('#guest-name')).to_have_value('示例顾客')
        self.page.locator('#simulate-error').uncheck()
        before = self.page.locator('#booking-rows tr').count()
        self.page.locator('#submit-booking').click()
        expect(self.page.locator('#booking-rows tr')).to_have_count(before + 1)
        self.page.locator('#theme').select_option('dark')
        with self.page.expect_download() as download:
            self.page.locator('#download-tokens').click()
        tokens = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertIn('palette', tokens)
        self.assert_page_fits()

    def test_drafts_survive_reload_export_import_and_intentionally_empty_text(self):
        self.page.goto(self.url + '/#capability=financial-modeler-deliver')
        self.page.locator('#request-goal').fill('恢复上一轮的经营预测')
        self.page.locator('#request-materials').fill('营业额.csv；原授权仍然有效')
        self.page.locator('#request-host').select_option('meta-kim')
        self.page.locator('.request-editor summary').click()
        editor = self.page.get_by_label('可编辑的使用请求')
        editor.fill('保留手工修改，只继续未完成部分')
        self.page.get_by_role('button', name='按表单重新生成').click()
        self.page.reload()
        expect(self.page.locator('#request-goal')).to_have_value('恢复上一轮的经营预测')
        expect(self.page.locator('#request-host')).to_have_value('meta-kim')
        self.page.locator('.request-editor summary').click()
        self.page.get_by_role('button', name='恢复上一版').click()
        expect(editor).to_have_value('保留手工修改，只继续未完成部分')
        with self.page.expect_download() as downloaded:
            self.page.get_by_role('button', name='下载草稿').click()
        saved = pathlib.Path(downloaded.value.path()).read_bytes()
        self.page.get_by_role('button', name='清空草稿', exact=True).click()
        expect(self.page.locator('#request-goal')).to_have_value('')
        self.page.locator('#import-draft').set_input_files({'name': 'draft.json', 'mimeType': 'application/json', 'buffer': saved})
        expect(self.page.locator('#request-goal')).to_have_value('恢复上一轮的经营预测')
        self.page.locator('.request-editor summary').click()
        expect(editor).to_have_value('保留手工修改，只继续未完成部分')
        editor.fill('')
        self.page.reload()
        self.page.locator('.request-editor summary').click()
        expect(editor).to_have_value('')
        self.page.get_by_role('button', name='按表单重新生成').click()
        self.page.get_by_role('button', name='恢复上一版').click()
        expect(editor).to_have_value('')
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()

    def test_storage_denial_and_bad_import_keep_current_draft_available(self):
        self.context.add_init_script("Storage.prototype.setItem = function(){ throw new DOMException('Full','QuotaExceededError'); };")
        self.page.goto(self.url + '/#capability=financial-modeler-deliver')
        self.page.locator('#request-goal').fill('存储失败后仍可继续')
        expect(self.page.locator('.draft-status')).to_contain_text('暂时无法保存')
        self.page.locator('.request-editor summary').click()
        editor = self.page.get_by_label('可编辑的使用请求')
        editor.fill('最新内容保留在内存，允许下载')
        self.page.locator('#import-draft').set_input_files({'name': 'bad.json', 'mimeType': 'application/json', 'buffer': b'{broken'})
        expect(self.page.locator('.copy-status')).to_contain_text('当前草稿已保留')
        expect(editor).to_have_value('最新内容保留在内存，允许下载')
        with self.page.expect_download() as downloaded:
            self.page.get_by_role('button', name='下载草稿').click()
        saved = json.loads(pathlib.Path(downloaded.value.path()).read_text())
        self.assertEqual(saved['draft']['request'], '最新内容保留在内存，允许下载')
        self.page.keyboard.press('Escape')
        self.page.locator('[data-capability="financial-modeler-deliver"] button.details-button').click()
        expect(editor).to_have_value('最新内容保留在内存，允许下载')

    def test_changed_capability_or_host_restores_text_for_review(self):
        saved = {'schemaVersion': 1, 'capabilityId': 'financial-modeler-deliver', 'draft': {
            'goal': '已有目标', 'materials': '原始资料', 'host': 'retired-host',
            'request': '以前生成的完整请求', 'manual': False, 'componentVersion': '0.0.1'}}
        self.context.add_init_script('localStorage.setItem("kim-service.task-draft:financial-modeler-deliver", ' + json.dumps(json.dumps(saved, ensure_ascii=False)) + ');')
        self.page.goto(self.url + '/#capability=financial-modeler-deliver')
        expect(self.page.locator('#request-host')).to_have_value('existing')
        expect(self.page.locator('.draft-status')).to_contain_text('已从 v0.0.1 更新')
        expect(self.page.locator('.draft-status')).to_contain_text('原来的使用环境')
        self.page.locator('#request-goal').fill('补充目标')
        self.page.locator('.request-editor summary').click()
        editor = self.page.get_by_label('可编辑的使用请求')
        expect(editor).to_have_value('以前生成的完整请求')
        self.page.get_by_role('button', name='按表单重新生成').click()
        self.assertIn('补充目标', editor.input_value())
        expect(self.page.locator('.draft-status')).not_to_contain_text('v0.0.1')

    def test_operating_forecast_recalculation_invalid_input_and_exports(self):
        self.page.goto(self.url + '/agents/financial-modeler/examples/operating-forecast/index.html')
        expect(self.page.locator('#monthly-rows tr')).to_have_count(12)
        self.page.locator('#openingCash').fill('123456')
        with self.page.expect_download() as download:
            self.page.locator('#download-input').click()
        inputs = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(inputs['openingCash'], 123456)
        with self.page.expect_download() as download:
            self.page.locator('#download-result').click()
        result = json.loads(pathlib.Path(download.value.path()).read_text())
        self.assertEqual(len(result['scenarios'][0]['months']), 12)
        self.page.locator('#openingCash').fill('')
        expect(self.page.locator('#input-error')).to_be_visible()
        expect(self.page.locator('#results')).not_to_be_visible()
        self.page.locator('#reset').click()
        expect(self.page.locator('#results')).to_be_visible()
        with self.page.expect_download() as download:
            self.page.locator('#download-csv').click()
        self.assertGreater(len(pathlib.Path(download.value.path()).read_text().splitlines()), 12)
        self.page.set_viewport_size({'width': 375, 'height': 812})
        self.assert_page_fits()


if __name__ == '__main__':
    unittest.main(verbosity=2)
