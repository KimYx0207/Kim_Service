#!/usr/bin/env python3
"""Real Chromium lifecycle evidence on an isolated copy of the full public corpus.

Run after examples/enterprise-knowledge/scripts/ingest.py. No model download or
vector claims. Event mutations happen through the unchanged application UI.
"""
import argparse
import hashlib
import json
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request
from urllib.parse import quote, urlencode

REPO = Path(__file__).resolve().parents[2]
APP = REPO / 'examples/enterprise-knowledge'
COMMIT = 'e0970de1b1207c2a9506adf238e6e1a22037e38a'
CORPUS_SHA = 'a0c5427013c65556aeddfdc246dd6068f3a7fad08ce6ae7adddaa9e87aae246d'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-data', type=Path, default=APP / 'data')
    parser.add_argument('--output', type=Path, default=REPO / 'artifacts/enterprise-lifecycle')
    parser.add_argument('--browser-path')
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    manifest = {'status': 'running', 'boundary': 'local controlled experiment on public historical corpus; not production SSO; BM25 only; no dense/hybrid/rerank or native Meta certification', 'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(), 'source_files': {str(p.relative_to(REPO)): sha(p) for folder in ('app', 'public') for p in sorted((APP / folder).glob('*')) if p.is_file()}, 'script_sha256': sha(__file__), 'captures': [], 'page_errors': []}
    write_json(out / 'manifest.json', manifest)
    process = None
    log = (out / 'server.log').open('w')
    try:
        from playwright.sync_api import sync_playwright, expect
        with tempfile.TemporaryDirectory(prefix='enterprise-lifecycle-') as temp:
            # SQLite backup is a transactionally consistent private copy. Never
            # submit controlled events against a benchmark owner's database.
            with sqlite3.connect(f'file:{args.source_data.resolve() / "workbench.sqlite"}?mode=ro', uri=True) as source, sqlite3.connect(Path(temp) / 'workbench.sqlite') as target:
                source.backup(target)
                count = target.execute('SELECT count(*) FROM passages').fetchone()[0]
                assert count == 72442, f'Expected fixed complete corpus, got {count}'
                assert target.execute('SELECT count(*) FROM events').fetchone()[0] == 0, 'Requires clean baseline events'
                assert target.execute('SELECT count(*) FROM overlays').fetchone()[0] == 0, 'Requires clean baseline overlays'
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            base = f'http://127.0.0.1:{port}'
            process = subprocess.Popen([sys.executable, '-m', 'app.main', '--port', str(port), '--data-dir', temp], cwd=APP, stdout=log, stderr=subprocess.STDOUT)
            for _ in range(150):
                if process.poll() is not None:
                    raise RuntimeError('API exited before ready; see server.log')
                try:
                    with urllib.request.urlopen(base + '/api/status', timeout=1) as response:
                        initial = json.load(response)
                    break
                except OSError:
                    time.sleep(.2)
            else:
                raise RuntimeError('API readiness timeout')
            assert initial['corpus']['passages'] == 72442
            assert initial['corpus']['source_commit'] == COMMIT
            assert initial['corpus']['sha256'] == CORPUS_SHA
            manifest['initial_status'] = initial
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=True, **({'executable_path': args.browser_path} if args.browser_path else {}))
                context = browser.new_context(viewport={'width': 1920, 'height': 1080}, reduced_motion='reduce')
                page = context.new_page()
                page.on('pageerror', lambda e: manifest['page_errors'].append(str(e)))
                page.set_default_timeout(30000)
                page.goto(base, wait_until='networkidle')
                expect(page.locator('#search-form')).to_be_visible()

                def record_response(response, payload=None):
                    return {'url': response.url, 'http_status': response.status, 'request': payload, 'body': response.json()}

                def get(path):
                    return record_response(context.request.get(base + path))

                def capture(step, evidence, view=page):
                    # Observe the app's own 3.5s dismissal and CSS fade. Do not
                    # hide/remove notifications or alter the rendered page.
                    # Playwright visibility alone includes opacity:0 elements.
                    toast = view.locator('#toast')
                    if toast.count():
                        expect(toast).to_have_css('opacity', '0', timeout=10000)
                    state_file = step + '.json'
                    filename = step + '.png'
                    write_json(out / state_file, {'step': step, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'evidence': evidence, 'boundary': manifest['boundary']})
                    view.screenshot(path=str(out / filename), full_page=False)
                    manifest['captures'].append({'step': step, 'file': filename, 'sha256': sha(out / filename), 'state_file': state_file, 'state_sha256': sha(out / state_file), 'url': view.url, 'title': view.title(), 'render_kind': 'actual_chromium_screenshot', 'capture_status': 'captured', 'data_status': 'assertions_passed'})
                    write_json(out / 'manifest.json', manifest)

                def navigate(name):
                    page.locator(f'[data-page="{name}"]').click()
                    expect(page.locator(f'[data-page="{name}"]')).to_have_attribute('aria-current', 'page')

                query = 'Kubernetes logging'

                def search(principal):
                    navigate('search')
                    page.locator('[name=query]').fill(query)
                    page.locator('label:has(input[value="bm25"])').click()
                    page.locator('#principal').select_option(principal)
                    page.locator('#top-k').select_option('50')
                    with page.expect_response(lambda r: r.url == base + '/api/search' and r.request.method == 'POST') as pending:
                        page.locator('#search-form button.primary').click()
                    response = pending.value
                    result = record_response(response, response.request.post_data_json)
                    assert response.status == 200 and result['body']['mode'] == 'bm25'
                    expect(page.locator('#search-results .loading')).to_have_count(0)
                    return result

                baseline = search('public')
                assert baseline['body']['results']
                passage = baseline['body']['results'][0]
                pid = passage['id']
                manifest['passage_id'] = pid
                # A literal substring of the selected original document provides a
                # stable catalog query. Verify visibility before testing absence.
                detail = get('/api/passages/' + quote(pid, safe='') + '?principal=public')
                assert detail['http_status'] == 200 and detail['body']['id'] == pid
                lines = [x for x in detail['body']['text'].splitlines() if x.strip()]
                catalog_query = max(lines, key=len)[:240]
                catalog_path = '/api/corpus?' + urlencode({'q': catalog_query, 'limit': 100})
                before_catalog = get(catalog_path)
                assert pid in [x['id'] for x in before_catalog['body']['items']]
                capture('01-public-bm25-selected', {'search': baseline, 'source': detail, 'catalog': before_catalog})
                with page.expect_response(lambda r: '/api/passages/' in r.url) as pending:
                    page.locator('[data-action=passage]').first.click()
                assert pending.value.status == 200
                expect(page.locator('#detail .source-text')).to_be_visible()
                capture('02-public-source', detail)
                page.locator('[data-action=experiment-passage]').click()
                expect(page.locator('#passage-id')).to_have_value(pid)

                def event(step, operation, revision, expected=200):
                    navigate('lifecycle')
                    page.locator('#passage-id').fill(pid)
                    page.locator('#event-operation').select_option(operation)
                    page.locator('#event-revision').fill(str(revision))
                    page.locator('#allowed-principals').fill('support')
                    page.locator('#event-id').fill('browser-' + step)
                    with page.expect_response(lambda r: r.url == base + '/api/events' and r.request.method == 'POST') as pending:
                        page.locator('#event-form button.primary').click()
                    response = pending.value
                    receipt = record_response(response, response.request.post_data_json)
                    assert response.status == expected, receipt
                    if expected == 200:
                        assert receipt['body']['applied'] and receipt['body']['event']['passage_id'] == pid
                        expect(page.locator('#event-receipt')).to_contain_text('事件已应用')
                    else:
                        assert receipt['body']['error']['code'] == 'stale_revision'
                        expect(page.locator('#event-form .form-error')).to_contain_text('stale_revision')
                        expect(page.locator('#passage-id')).to_have_value(pid)
                        expect(page.locator('#event-revision')).to_have_value(str(revision))
                    expect(page.locator('#event-form')).not_to_have_attribute('data-busy', 'true')
                    capture(step, receipt)
                    return receipt

                def visibility(principal, visible, step):
                    result = search(principal)
                    ids = [x['id'] for x in result['body']['results']]
                    assert (pid in ids) == visible, (principal, visible, ids)
                    direct = get('/api/passages/' + quote(pid, safe='') + '?' + urlencode({'principal': principal}))
                    assert direct['http_status'] == (200 if visible else 404), direct
                    if visible:
                        assert direct['body']['id'] == pid
                    else:
                        assert direct['body']['error']['code'] == 'not_found'
                        assert 'text' not in direct['body'] and 'title' not in direct['body']
                    catalog = get(catalog_path + '&principal=' + principal)
                    assert catalog['http_status'] == 200
                    assert (pid in [x['id'] for x in catalog['body']['items']]) == visible
                    assert catalog['body']['total'] == before_catalog['body']['total'] - (0 if visible else 1)
                    evidence = {'passage_id': pid, 'principal': principal, 'expected_visible': visible, 'search': result, 'catalog': catalog, 'direct': direct}
                    capture(step, evidence)
                    return evidence

                event('03-restrict-support', 'restrict', 1)
                hidden = visibility('public', False, '04-public-hidden-search')
                navigate('corpus')
                expect(page.locator('#corpus-table')).not_to_contain_text('正在读取目录')
                page.locator('#corpus-form [name=q]').fill(catalog_query)
                with page.expect_response(lambda r: '/api/corpus?' in r.url) as pending:
                    page.locator('#corpus-form button').click()
                catalog_ui = record_response(pending.value)
                assert catalog_ui['http_status'] == 200
                assert pid not in [x['id'] for x in catalog_ui['body']['items']]
                expect(page.locator(f'#corpus-table button[data-id="{pid}"]')).to_have_count(0)
                expect(page.locator('#corpus-table')).to_contain_text(f"共 {catalog_ui['body']['total']:,} 条")
                capture('05-public-hidden-catalog', {'catalog_ui': catalog_ui, 'checks': hidden})
                raw = context.new_page()
                denied = raw.goto(base + '/api/passages/' + quote(pid, safe='') + '?principal=public')
                assert denied.status == 404 and denied.json()['error']['code'] == 'not_found'
                capture('06-public-direct-404', record_response(denied), raw)
                raw.close()
                visibility('support', True, '07-support-readable-search')
                target_button = page.locator(f'[data-action=passage][data-id="{pid}"]')
                with page.expect_response(lambda r: '/api/passages/' in r.url) as pending:
                    target_button.click()
                source = record_response(pending.value)
                assert source['http_status'] == 200 and source['body']['id'] == pid
                expect(page.locator('#detail .source-text')).to_be_visible()
                capture('08-support-readable-source', source)
                page.keyboard.press('Escape')
                event('09-delete', 'delete', 2)
                visibility('public', False, '10-deleted-public')
                visibility('support', False, '11-deleted-support')
                event('12-stale-restore-rejected', 'restore', 1, 409)
                visibility('support', False, '13-still-deleted-after-stale')
                event('14-higher-revision-restore', 'restore', 3)
                visibility('public', True, '15-restored-public')
                visibility('support', True, '16-restored-support')
                final = get('/api/status')
                assert len(final['body']['events']) == 3, 'Rejected stale event must not persist'
                assert [(x['revision'], x['operation']) for x in sorted(final['body']['events'], key=lambda x: x['revision'])] == [(1, 'restrict'), (2, 'delete'), (3, 'restore')]
                manifest['final_status'] = final
                assert not manifest['page_errors'], manifest['page_errors']
                browser.close()
            manifest['status'] = 'passed'
    except BaseException as exc:
        manifest['status'] = 'failed'
        manifest['error'] = {'type': type(exc).__name__, 'message': str(exc)}
        (out / 'failure.txt').write_text(traceback.format_exc())
        raise
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
        log.close()
        write_json(out / 'manifest.json', manifest)
    print(json.dumps({'status': manifest['status'], 'captures': len(manifest['captures']), 'passage_id': manifest['passage_id']}))


if __name__ == '__main__':
    main()
