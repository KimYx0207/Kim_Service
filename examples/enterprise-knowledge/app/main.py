"""Local HTTP application; Python -m app.main --port 4180."""
import argparse,json,mimetypes,re,traceback
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs,unquote
from pathlib import Path
from .storage import Storage,ROOT,COMMIT,AppError,ensure
from .retrieval import Retriever

def read_json(path,default=None):
 try:return json.loads(Path(path).read_text())
 except FileNotFoundError:return default

def reports():
 result=[]
 for p in sorted((ROOT/'evidence'/'evaluations').glob('*/report.json'),reverse=True):
  try:
   r=read_json(p);r['download_url']=f'/api/evaluations/{p.parent.name}/queries';r['per_query_download']=r['download_url'];result.append(r)
  except (OSError,ValueError):continue
 return result

def project():
 def material(path):
  p=(ROOT/path).resolve()
  if not p.is_relative_to(ROOT) or not p.is_file() or p.stat().st_size>500000:return {'path':str(path),'title':Path(path).name,'content':None}
  return {'path':str(path),'title':Path(path).name,'content':p.read_text(errors='replace')}
 facts=read_json(ROOT/'docs/governance/stage-facts.json',{});labels={'critical':'目标与边界','fetch':'资料与方法','thinking':'产品设计','execution':'实现','review':'审阅','meta-review':'证明边界复核','verification':'验证','evolution':'复盘'}
 stages=[{**x,'label':labels.get(x['id'],x['id']),'evidence':[material(p) for p in x.get('evidence_refs',[])]} for x in facts.get('stages',[])]
 return {'brief':material('docs/project-brief.md'),'documents':[material(p.relative_to(ROOT)) for p in sorted((ROOT/'docs/governance').rglob('*.md'))],'stages':stages,'native_meta':facts.get('native_meta',{'verified':False,'status':'unverified_transcript'}),'preparation':facts.get('preparation')}

def status(storage,retriever):
 g=storage.generation() or (storage.generations()[0] if storage.generations() else None);index={'generation':g['generation'] if g else None,'active_generation':storage.setting('active_generation'),'embedded':g['embedded'] if g else 0,'dimension':g['dimension'] if g else 384,'status':g['status'] if g else 'not_started','model':g['model'] if g else None};models={}
 for kind in ('embedding','reranker'):
  metadata=read_json(ROOT/'models'/kind/'manifest.json');models[kind]={'ready':bool(metadata and (ROOT/'models'/kind/'model.onnx').exists()),'metadata':metadata,'runtime_loaded':getattr(retriever,kind,None) is not None}
 corpus=storage.setting('corpus',{'documents':None,'declared_documents':57638,'passages':storage.count(),'source_commit':COMMIT,'sha256':None,'source_kind':'public_benchmark'})
 audit=read_json(ROOT/'evidence/document-corpus-audit.json',{})
 if audit and audit.get('source',{}).get('commit')==COMMIT:
  corpus={**corpus,'documents':audit['actual']['unique_document_ids'],'actual_documents':audit['actual']['unique_document_ids'],'documents_basis':'independent count of complete official document_level archive','empty_documents':audit['actual']['empty_text'],'document_audit_ref':'evidence/document-corpus-audit.json','document_source_sha256':audit['archive']['sha256']}
 facts=read_json(ROOT/'docs/governance/stage-facts.json',{})
 return {'corpus':corpus,'index':index,'generations':storage.generations(),'models':models,'jobs':storage.jobs(),'evaluations':reports(),'events':storage.events(),'native_meta':facts.get('native_meta',{'verified':False,'status':'unverified_transcript'})}

def create_server(port=4180,data_dir=None):
 storage=Storage(data_dir);retriever=Retriever(storage)
 class Handler(BaseHTTPRequestHandler):
  def log_message(self,format,*args):pass
  def send_data(self,data,status=200,content_type='application/json; charset=utf-8',download=None):
   body=json.dumps(data,ensure_ascii=False).encode() if content_type.startswith('application/json') else data if isinstance(data,bytes) else data.encode();self.send_response(status);self.send_header('Content-Type',content_type);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
   if download:self.send_header('Content-Disposition',f'attachment; filename="{download}"')
   self.end_headers();self.wfile.write(body)
  def handle_request(self,post=False):
   try:
    host=self.headers.get('Host','');ensure(re.fullmatch(r'(localhost|127\.0\.0\.1)(:\d+)?',host),'invalid_host','此服务只允许本机访问',403);url=urlparse(self.path);path=unquote(url.path);params=parse_qs(url.query);get=lambda key,default=None:params.get(key,[default])[0]
    if post:
     origin=self.headers.get('Origin');ensure(origin is None or origin==f'http://{host}','invalid_origin','请求来源不正确',403);ensure(self.headers.get('Content-Type','').split(';')[0]=='application/json','invalid_content_type','操作须使用JSON格式',415);length=int(self.headers.get('Content-Length','0'));ensure(0<length<=1000000,'invalid_body','提交内容为空或过大',413)
     try:body=json.loads(self.rfile.read(length))
     except ValueError:raise AppError('invalid_json','提交内容不是有效JSON')
     ensure(isinstance(body,dict),'invalid_body','提交内容须为对象')
     if path=='/api/search':return self.send_data(retriever.search(body.get('query'),body.get('mode','hybrid'),body.get('top_k',10),body.get('principal','public'),body.get('generation')))
     if path=='/api/events':return self.send_data(storage.apply_event(body))
     if path=='/api/generations/activate':return self.send_data(storage.activate(body.get('generation'),body.get('expected_active')))
    else:
     if path=='/api/status':return self.send_data(status(storage,retriever))
     if path=='/api/jobs':return self.send_data({'jobs':storage.jobs()})
     if path=='/api/corpus':
      offset=int(get('offset',0));limit=int(get('limit',20));ensure(offset>=0 and 1<=limit<=100,'invalid_pagination','分页范围不正确');return self.send_data(storage.list_passages(offset,limit,get('q',''),get('principal','public')))
     if path.startswith('/api/passages/'):return self.send_data(storage.get(path[len('/api/passages/'):],get('principal','public')))
     if path=='/api/project':return self.send_data(project())
     if path=='/api/evaluations':return self.send_data({'reports':reports()})
     match=re.fullmatch(r'/api/evaluations/([A-Za-z0-9_-]+)(/queries)?',path)
     if match:
      folder=ROOT/'evidence/evaluations'/match[1]
      if match[2]:
       p=folder/'queries.jsonl';ensure(p.is_file(),'not_found','逐题结果尚不存在',404);return self.send_data(p.read_bytes(),content_type='application/x-ndjson; charset=utf-8',download=match[1]+'-queries.jsonl')
      report=read_json(folder/'report.json');ensure(report is not None,'not_found','评测报告尚不存在',404);return self.send_data(report)
     if not path.startswith('/api/'):
      relative='index.html' if path=='/' else path[1:];file=(ROOT/'public'/relative).resolve();ensure(file.is_relative_to(ROOT/'public') and file.is_file(),'not_found','页面不存在',404);mime=mimetypes.guess_type(file)[0] or 'application/octet-stream';return self.send_data(file.read_bytes(),content_type=mime+('; charset=utf-8' if mime.startswith('text/') or mime=='application/javascript' else ''))
    raise AppError('not_found','接口不存在',404)
   except AppError as e:self.send_data({'error':{'code':e.code,'message':e.message,'details':e.details}},e.status)
   except (ValueError,TypeError) as e:self.send_data({'error':{'code':'invalid_input','message':'输入格式不正确'}},400)
   except Exception:
    traceback.print_exc();self.send_data({'error':{'code':'internal_error','message':'服务处理失败，请查看运行日志'}},500)
  def do_GET(self):self.handle_request()
  def do_POST(self):self.handle_request(True)
 server=ThreadingHTTPServer(('127.0.0.1',port),Handler);server.storage=storage;server.retriever=retriever;return server

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--port',type=int,default=4180);p.add_argument('--data-dir');a=p.parse_args();server=create_server(a.port,a.data_dir);print(f'企业知识工作台 http://127.0.0.1:{server.server_port}',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
if __name__=='__main__':main()
