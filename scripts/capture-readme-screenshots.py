"""Capture the built product UI for README illustrations using real browser actions."""

import functools
import hashlib
import http.server
import json
import os
import pathlib
import re
import subprocess
import threading
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT / '.site'
ARTIFACTS = ROOT / 'browser-artifacts' / 'readme'
DESKTOP = {'width': 1440, 'height': 1050}
DETAIL = {'width': 1280, 'height': 1000}
DEMO_GOAL = '演示：用合成数据做未来 12 个月经营预测'
DEMO_MATERIALS = (
    '使用仓库内 operating-forecast/sample-data.js 的合成示例；'
    '沿用原币种与期间，交付结果 JSON 和月表 CSV。'
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def source_commit():
    commit = os.environ.get('GITHUB_SHA', '').strip()
    if not commit:
        commit = subprocess.check_output(
            ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True,
        ).strip()
    if not re.fullmatch(r'[0-9a-fA-F]{40}', commit):
        raise ValueError('A full source commit is required for screenshot provenance')
    return commit.lower()


def save_provenance(receipt):
    (ARTIFACTS / 'provenance.json').write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf-8',
    )


def prepare_catalog(page):
    expect(page.locator('#showcase-cards article').first).to_be_visible()
    expect(page.locator('#cards .card').first).to_be_visible()
    expect(page.locator('#search')).to_have_value('')


def prepare_financial_task(page):
    page.locator('#search').fill('经营预测')
    page.locator(
        '[data-capability="financial-modeler-deliver"] button.details-button',
    ).click()
    expect(page.locator('#detail')).to_be_visible()
    page.locator('#request-goal').fill(DEMO_GOAL)
    page.locator('#request-materials').fill(DEMO_MATERIALS)
    page.locator('#request-host').select_option('meta-kim')
    expect(page.locator('#request-host')).to_have_value('meta-kim')
    request = page.get_by_label('可编辑的使用请求').input_value()
    if not request.startswith('/meta-theory ') or DEMO_GOAL not in request or DEMO_MATERIALS not in request:
        raise RuntimeError('The generated request must reflect the visible demo inputs')
    page.locator('.request-box').scroll_into_view_if_needed()


def prepare_design_system(page):
    expect(page.locator('#design-controls')).to_be_visible()
    expect(page.locator('#guest-name')).to_have_value('')
    expect(page.locator('#guest-email')).to_have_value('')


def prepare_forecast(page):
    expect(page.locator('#monthly-rows tr')).to_have_count(12)
    expect(page.locator('#results')).to_be_visible()
    expect(page.locator('#input-error')).not_to_be_visible()


def capture(browser, base_url, receipt, filename, url_path, viewport, description, prepare):
    # A new context keeps each default page separate from test fixtures and drafts.
    context = browser.new_context(viewport=viewport)
    context.set_default_timeout(15_000)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: errors.append(
        f'HTTP {response.status}: {urlsplit(response.url).path}',
    ) if response.status >= 400 else None)
    page.on('requestfailed', lambda request: errors.append(
        f'Failed request: {urlsplit(request.url).path}',
    ))
    try:
        page.goto(base_url + url_path, wait_until='networkidle')
        prepare(page)
        if errors:
            raise RuntimeError('Page errors during screenshot capture: ' + '; '.join(errors[:5]))
        target = ARTIFACTS / filename
        page.screenshot(path=str(target), full_page=False)
        if errors:
            raise RuntimeError('Page errors during screenshot capture: ' + '; '.join(errors[:5]))
        current = urlsplit(page.url)
        receipt['screenshots'].append({
            'file': filename,
            'urlPath': current.path + ('#' + current.fragment if current.fragment else ''),
            'viewport': viewport,
            'description': description,
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        })
        save_provenance(receipt)
    finally:
        context.close()


def main():
    if not (SITE / 'index.html').is_file():
        raise RuntimeError('Build the static site with node scripts/build-site.mjs first')
    samples = json.loads((ROOT / 'samples' / 'index.json').read_text(encoding='utf-8'))
    sample_paths = {sample['id']: '/' + sample['entrypoint'] for sample in samples['samples']}
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    receipt = {
        'schemaVersion': 1,
        'sourceCommit': source_commit(),
        'sourceDirectory': '.site',
        'captureKind': 'actual browser screenshot',
        'dataKind': 'synthetic demo data',
        'uiLanguage': 'zh-CN',
        'status': 'in_progress',
        'screenshots': [],
    }
    save_provenance(receipt)
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(SITE)),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                executable_path=os.environ.get('PLAYWRIGHT_CHROMIUM_EXECUTABLE') or None,
            )
            try:
                receipt['browserVersion'] = browser.version
                capture(browser, base_url, receipt, 'catalog.png', '/', DESKTOP,
                        'Default task browser, including the two editable example cards.', prepare_catalog)
                capture(browser, base_url, receipt, 'financial-task.png', '/', DETAIL,
                        'Financial-modeling request form filled with a synthetic demo brief and Meta_Kim selected; the task is ready to copy.',
                        prepare_financial_task)
                capture(browser, base_url, receipt, 'design-system.png', sample_paths['service-console'], DESKTOP,
                        'Default booking design-system example with its original theme controls and synthetic booking data.',
                        prepare_design_system)
                capture(browser, base_url, receipt, 'operating-forecast.png', sample_paths['operating-forecast'], DESKTOP,
                        'Default 12-month operating forecast with the original synthetic assumptions and calculated scenarios.',
                        prepare_forecast)
            finally:
                browser.close()
        receipt['status'] = 'complete'
    except Exception:
        receipt['status'] = 'failed'
        raise
    finally:
        save_provenance(receipt)
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    print(json.dumps({
        'status': receipt['status'],
        'sourceCommit': receipt['sourceCommit'],
        'screenshots': len(receipt['screenshots']),
        'output': str(ARTIFACTS.relative_to(ROOT)),
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
