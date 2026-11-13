#!/usr/bin/env python3
"""Capture real tutorial evidence from the local application; never simulate renders.

Run from any directory. The API child and browser share this invocation, and the
child is always stopped. No lifecycle writes, activation, indexing or evaluation
are performed. Existing valid captures are retained on resume.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]

def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def digest(data): return hashlib.sha256(data).hexdigest()
def json_bytes(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2).encode()
def available_browser():
    for name in ('chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome', 'msedge'):
        if shutil.which(name): return shutil.which(name)
    for candidate in (
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        os.path.expandvars(r'%PROGRAMFILES%\Google\Chrome\Application\chrome.exe'),
        os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe'),
    ):
        if pathlib.Path(candidate).is_file(): return candidate
    return None  # Playwright's installed Chromium is the final normal fallback.

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser-path', help='Installed Chrome/Chromium executable; default: discover installed browser, then Playwright Chromium')
    parser.add_argument('--output', default=str(ROOT/'evidence/tutorial-captures'), help='Evidence directory; existing valid screenshots are preserved')
    parser.add_argument('--server-python', default=str(ROOT/'.venv/bin/python') if (ROOT/'.venv/bin/python').exists() else sys.executable)
    parser.add_argument('--port', type=int, default=0, help='Local API port; 0 selects an unused port')
    parser.add_argument('--query', default='Kubernetes logging')
    parser.add_argument('--expected-queries', type=int, default=188, help='Required full Cloud lastturn benchmark size')
    parser.add_argument('--width', type=int, default=1920)
    parser.add_argument('--height', type=int, default=1080)
    parser.add_argument('--resume', action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument('--headed', action='store_true', help='Show the real browser instead of headless capture')
    args = parser.parse_args()
    out = pathlib.Path(args.output).expanduser().resolve(); out.mkdir(parents=True, exist_ok=True)
    manifest_path = out/'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if args.resume and manifest_path.exists() else {'schema_version':1,'runs':[],'captures':[]}
    run_id = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    run = {'id':run_id,'started_at':now(),'status':'running','viewport':[args.width,args.height],
           'browser_path':args.browser_path or available_browser() or 'playwright-installed-chromium',
           'query':args.query,'api_mutations':'none; only /api/search POST',
           'source_hashes':{str(p.relative_to(ROOT)):digest(p.read_bytes()) for folder in ('app','scripts','public') for p in sorted((ROOT/folder).glob('*')) if p.is_file() and p.suffix in ('.py','.js','.mjs','.css','.html')},'steps':[]}
    manifest['runs'].append(run)
    def save():
        temp=out/'manifest.json.tmp';temp.write_bytes(json_bytes(manifest)+b'\n');temp.replace(manifest_path)
    def skipped(step, title, reason, data=None):
        run['steps'].append({'step':step,'title':title,'capture_status':'skipped','data_status':'blocked','reason':reason,'at':now(),'data_state':data})
        save(); print(f'{step}: BLOCKED — {reason}',flush=True)
    port=args.port
    if not port:
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
    base=f'http://127.0.0.1:{port}';run['api_base']=base
    server=None;browser=None;log=None;exit_code=0
    def http(path):
        try:
            with urllib.request.urlopen(base+path,timeout=45) as res:return {'url':base+path,'status':res.status,'body':json.load(res)}
        except urllib.error.HTTPError as e:return {'url':base+path,'status':e.code,'body':json.load(e)}
    try:
        log=open(out/f'{run_id}-server.log','w')
        server=subprocess.Popen([args.server_python,'-m','app.main','--port',str(port)],cwd=ROOT,stdout=log,stderr=log)
        for _ in range(120):
            try:
                initial=http('/api/status')
                if initial['status']==200:break
            except (urllib.error.URLError,TimeoutError):pass
            if server.poll() is not None:raise RuntimeError('API child exited; see server log')
            time.sleep(.25)
        else:raise RuntimeError('API did not become ready within 30 seconds')
        (out/f'{run_id}-initial-status.json').write_bytes(json_bytes(initial))
        run['initial_status_file']=f'{run_id}-initial-status.json'
        from playwright.sync_api import sync_playwright, expect
        with sync_playwright() as pw:
            launch={'headless':not args.headed}
            browser_path=args.browser_path or available_browser()
            if browser_path:launch['executable_path']=browser_path
            browser=pw.chromium.launch(**launch)
            page=browser.new_page(viewport={'width':args.width,'height':args.height},device_scale_factor=1)
            page.set_default_timeout(30000)
            js_errors=[];page.on('pageerror',lambda error:js_errors.append(str(error)))
            page.goto(base,wait_until='domcontentloaded');expect(page.locator('#search-form')).to_be_visible()
            run['actual_browser_version']=browser.version
            def capture(step,title,data,data_status='observed',reason=None):
                # Snapshot is the API response actually used by the action, or the
                # file underlying the document view; no fabricated metrics.
                state_file=f'{run_id}-{step}-state.json';state_bytes=json_bytes(data)
                (out/state_file).write_bytes(state_bytes)
                normalized=json.loads(state_bytes)
                # The random local port is not part of semantic state identity.
                normalized_text=json.dumps(normalized,ensure_ascii=False,sort_keys=True).replace(base,'http://local-api')
                fingerprint=digest(json_bytes({'data':normalized_text,'sources':run['source_hashes'],'viewport':run['viewport']}))
                previous=next((x for x in reversed(manifest['captures']) if x['step']==step and x.get('input_fingerprint')==fingerprint and x.get('capture_status')=='captured'),None)
                if args.resume and previous and (out/previous['file']).exists() and digest((out/previous['file']).read_bytes())==previous['sha256']:
                    run['steps'].append({'step':step,'title':title,'capture_status':'reused','data_status':data_status,'file':previous['file'],'sha256':previous['sha256'],'state_file':state_file,'input_fingerprint':fingerprint,'at':now()});save();return
                filename=f'{step}-{run_id}.png'
                page.screenshot(path=str(out/filename),full_page=False)
                entry={'step':step,'title':title,'capture_status':'captured','data_status':data_status,'reason':reason,
                       'file':filename,'sha256':digest((out/filename).read_bytes()),'url':page.url,'page_title':page.title(),
                       'at':now(),'state_file':state_file,'state_sha256':digest(state_bytes),'input_fingerprint':fingerprint,
                       'page_state':{'heading':page.locator('h1').first.inner_text() if page.locator('h1').count() else None,
                                     'dialog_open':page.locator('dialog[open]').count()>0},'render_kind':'actual_chromium_screenshot'}
                manifest['captures'].append(entry);run['steps'].append(entry);save();print(f'{step}: {data_status} → {filename}',flush=True)
            def navigate(name):
                page.locator(f'[data-page="{name}"]').click()
                expect(page.locator(f'[data-page="{name}"]')).to_have_attribute('aria-current','page')
            project=http('/api/project');navigate('project');expect(page.locator('.document-card').first).to_be_visible()
            docs=project['body'].get('documents',[])
            def document(step,title,doc,index=None,brief=False):
                if not doc or not doc.get('content'):skipped(step,title,'API未提供材料正文',doc);return
                locator=page.locator('[data-action="brief"]') if brief else page.locator(f'[data-action="document"][data-index="{index}"]')
                locator.click();expect(page.locator('#detail .document-text')).to_be_visible()
                # A full-page screenshot does not expand a scrollable dialog.
                # Scroll the actual dialog in overlapping readable viewport pages.
                dialog=page.locator('#detail')
                geometry=dialog.evaluate('(el) => ({height:el.clientHeight,total:el.scrollHeight})')
                limit=max(0,geometry['total']-geometry['height'])
                stride=max(100,geometry['height']-90)
                positions=list(range(0,limit+1,stride))
                if positions[-1]!=limit:positions.append(limit)
                for n,offset in enumerate(positions,1):
                    actual_offset=dialog.evaluate('(el,y) => {el.scrollTop=y;return el.scrollTop}',offset)
                    state={'api_url':project['url'],'http_status':project['status'],'document':doc,'document_page':{'page':n,'pages':len(positions),'scroll_top':actual_offset,'client_height':geometry['height'],'scroll_height':geometry['total']}}
                    capture(step if n==1 else f'{step}-p{n:02d}',title,state,'source_record')
                page.keyboard.press('Escape');expect(page.locator('#detail')).not_to_be_visible()
            outline=next(((i,d) for i,d in enumerate(docs) if d.get('path','').endswith('prd-outline.md')),None)
            if outline:document('01-overall-prd','总体PRD',outline[1],outline[0])
            else:document('01-overall-prd','总体项目边界',project['body'].get('brief'),brief=True)
            modules=[(i,d) for i,d in enumerate(docs) if '/modules/' in d.get('path','')]
            if not modules:skipped('02-module-prd','模块PRD','API未列出模块PRD')
            for n,(i,d) in enumerate(modules,1):document(f'02-{n:02d}-module-prd',f'模块PRD：{d.get("title",d.get("path"))}',d,i)
            capture('03-stage-records','八阶段本项目记录',project,'case_records_not_native_live')
            navigate('corpus');expect(page.locator('#corpus-table')).not_to_contain_text('正在读取目录')
            capture('04-corpus-jobs','真实语料与任务进度',http('/api/status'),'live_progress')
            first_source=None
            for n,mode in enumerate(('bm25','dense','hybrid','rerank'),5):
                navigate('search');page.locator('[name=query]').fill(args.query)
                page.locator(f'label:has(input[name=mode][value="{mode}"])').click()
                with page.expect_response(lambda r:r.url==base+'/api/search' and r.request.method=='POST',timeout=180000) as response_info:
                    page.get_by_role('button',name='查找证据').click()
                response=response_info.value;payload=response.json();state={'url':response.url,'http_status':response.status,'response':payload}
                if response.ok:
                    expect(page.locator('#search-results .loading')).to_have_count(0)
                    if payload.get('results'):expect(page.locator('.result-card').first).to_be_visible()
                    capture(f'{n:02d}-{mode}',f'{mode}真实检索结果',state,'query_executed')
                    if mode=='bm25' and payload.get('results'):
                        first_source=payload['results'][0]
                        with page.expect_response(lambda r:'/api/passages/' in r.url) as source_response_info:
                            page.locator('[data-action=passage]').first.click()
                        source_response=source_response_info.value
                        expect(page.locator('#detail .source-text')).to_be_visible()
                        capture('05b-source','完整原文与来源',{'search_response':state,'source_url':source_response.url,'source_http_status':source_response.status,'source':source_response.json()},'source_displayed')
                        page.keyboard.press('Escape')
                else:
                    expect(page.locator('#search-form .form-error')).not_to_be_empty()
                    capture(f'{n:02d}-{mode}',f'{mode}真实失败状态',state,'blocked',payload.get('error',{}).get('message'))
            reports=http('/api/evaluations');navigate('evaluation')
            expect(page.locator('#report-id')).to_be_visible()
            report_items=reports['body'].get('reports',[])
            if not report_items:
                capture('09-evaluation','评测尚未产生报告',reports,'blocked','无真实评测报告')
            for n,item in enumerate(report_items,1):
                report_url=base+'/api/evaluations/'+urllib.parse.quote(str(item['id']),safe='')
                expect(page.locator('#report-id')).to_be_enabled()
                with page.expect_response(lambda r:r.url==report_url) as report_response_info:
                    page.locator('#report-id').select_option(str(item['id']))
                report_response=report_response_info.value
                report={'url':report_response.url,'status':report_response.status,'body':report_response.json()}
                expect(page.locator('.stats')).to_be_visible()
                expect(page.locator('#report-id')).to_have_value(str(item['id']))
                expect(page.locator('.stats .stat-note').last).to_have_text(str(item['id']))
                value=report['body'];methods={x.get('mode'):x for x in value.get('methods',[])}
                complete=value.get('query_count')==args.expected_queries and all(m in methods and methods[m].get('query_count')==args.expected_queries and methods[m].get('status') in ('completed','complete','ready') and all(methods[m].get(k) is not None for k in ('recall_5','recall_10','recall_50','ndcg_10','mrr_10')) for m in ('bm25','dense','hybrid','rerank')) and value.get('status') in ('completed','complete','ready')
                capture(f'09-{n:02d}-evaluation','完整评测或当前真实进度',report,'full_report_observed' if complete else 'partial','报告完整性按实际状态与指标字段检查；不等于质量达标')
            # View existing logs through the real browser's file viewer. Never
            # draw a terminal, replace its text, or fabricate a native pass.
            gate_paths=[]
            for relative in project['body'].get('native_meta',{}).get('evidence_refs',[]):
                path=(ROOT/relative).resolve()
                if path.is_relative_to(ROOT) and path.is_file():gate_paths.append(path)
            for candidate in (ROOT/'evidence/meta-boundary/inspect.stderr.log',ROOT/'evidence/meta-preparation/summary.json'):
                if candidate.is_file() and candidate not in gate_paths:gate_paths.append(candidate)
            if not gate_paths:skipped('10-native-gate','原生gate记录','没有可读取的原生gate证据文件')
            for n,path in enumerate(gate_paths,1):
                page.goto(path.as_uri(),wait_until='domcontentloaded')
                body=path.read_bytes()
                capture(f'10-{n:02d}-native-gate','原生gate真实文件',{'source_file':str(path.relative_to(ROOT)),'sha256':digest(body),'content':body.decode(errors='replace'),'native_meta':project['body'].get('native_meta')},'native_status_record_not_pass_claim')
            run['page_errors']=js_errors
            run['status']='captured_with_page_errors' if js_errors else 'capture_run_finished'
            browser.close();browser=None
    except Exception as exc:
        run['status']='blocked';run['error']={'type':type(exc).__name__,'message':str(exc)};exit_code=2
        print(f'Capture blocked: {exc}',file=sys.stderr)
    finally:
        if browser:
            try:browser.close()
            except Exception:pass
        if server:
            server.terminate()
            try:server.wait(timeout=10)
            except subprocess.TimeoutExpired:server.kill();server.wait()
            run['api_child_exit_code']=server.returncode
        if log:log.close()
        run['finished_at']=now();save()
        print(f'Manifest: {manifest_path}',flush=True)
    return exit_code

if __name__=='__main__':raise SystemExit(main())
