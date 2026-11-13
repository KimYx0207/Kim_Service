"""SQLite authority for immutable corpus, jobs, generations and global visibility."""
import hashlib, json, os, re, sqlite3, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'e0970de1b1207c2a9506adf238e6e1a22037e38a'
def now(): return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
def digest(value): return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()
def canonical(value): return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
def atomic_json(path, value):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+'.tmp')
    with tmp.open('w') as out:out.write(json.dumps(value,ensure_ascii=False,indent=2));out.flush();os.fsync(out.fileno())
    os.replace(tmp,path)
    fd=os.open(path.parent,os.O_RDONLY);os.fsync(fd);os.close(fd)
def model_identity(metadata):
    return {k:metadata.get(k) for k in ('repository','revision','max_length','output_dimension','pooling','format')} | {'files':sorted([{'path':f['local_path'],'sha256':f['sha256']} for f in metadata.get('files',[]) if f['local_path']!='README.md'],key=lambda x:x['path'])}
def model_fingerprint(metadata):return digest(canonical(model_identity(metadata)))
def file_digest(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        while b:=f.read(1024*1024):h.update(b)
    return h.hexdigest()
class AppError(Exception):
    def __init__(self, code, message, status=400, details=None):
        super().__init__(message); self.code=code; self.message=message; self.status=status; self.details=details

def ensure(ok,code,message,status=400):
    if not ok: raise AppError(code,message,status)
class Storage:
    def __init__(self, data_dir=None):
        self.root=Path(data_dir or os.environ.get('KNOWLEDGE_DATA_DIR',ROOT/'data')).resolve(); self.root.mkdir(parents=True,exist_ok=True)
        self._verified={}
        self.db_path=self.root/'workbench.sqlite'; self.index_root=self.root/'indexes'; self.index_root.mkdir(exist_ok=True)
        with self.connect() as db:
            db.executescript('''
              PRAGMA journal_mode=WAL;
              CREATE TABLE IF NOT EXISTS passages(row_no INTEGER PRIMARY KEY,id TEXT UNIQUE NOT NULL,text TEXT NOT NULL,title TEXT NOT NULL,url TEXT NOT NULL,sha256 TEXT NOT NULL,source_revision TEXT NOT NULL);
              CREATE VIRTUAL TABLE IF NOT EXISTS passage_fts USING fts5(id UNINDEXED,title,text,tokenize='porter unicode61');
              CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT,status TEXT,processed INTEGER,total INTEGER,checkpoint TEXT,error TEXT,updated_at TEXT);
              CREATE TABLE IF NOT EXISTS generations(generation TEXT PRIMARY KEY,status TEXT,embedded INTEGER,total INTEGER,dimension INTEGER,model TEXT,created_at TEXT,manifest TEXT);
              CREATE TABLE IF NOT EXISTS overlays(passage_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,operation TEXT NOT NULL,allowed_principals TEXT NOT NULL,label TEXT NOT NULL);
              CREATE TABLE IF NOT EXISTS events(event_id TEXT PRIMARY KEY,digest TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL);
            ''')
    def connect(self):
        db=sqlite3.connect(self.db_path,timeout=30); db.row_factory=sqlite3.Row;db.execute('PRAGMA busy_timeout=30000');return db
    def setting(self,key,default=None,db=None):
        if db is None:
            with self.connect() as c:return self.setting(key,default,c)
        row=db.execute('SELECT value FROM settings WHERE key=?',(key,)).fetchone();return json.loads(row[0]) if row else default
    def set_setting(self,key,value,db=None):
        if db is None:
            with self.connect() as c:return self.set_setting(key,value,c)
        db.execute('INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',(key,canonical(value)))
    def job(self,id,kind,status,processed,total,checkpoint=None,error=None,db=None):
        if db is None:
            with self.connect() as c:return self.job(id,kind,status,processed,total,checkpoint,error,c)
        db.execute('INSERT OR REPLACE INTO jobs VALUES(?,?,?,?,?,?,?,?)',(id,kind,status,processed,total,canonical(checkpoint or {}),error,now()))
    def jobs(self):
        with self.connect() as db:
            result=[]
            for r in db.execute('SELECT * FROM jobs ORDER BY updated_at DESC'):
                x=dict(r);x['checkpoint']=json.loads(x['checkpoint']);result.append(x)
            return result
    def count(self):
        with self.connect() as db:return db.execute('SELECT count(*) FROM passages').fetchone()[0]
    def all_passages(self,offset=0,limit=None):
        with self.connect() as db:return [dict(r) for r in db.execute('SELECT * FROM passages WHERE row_no>? ORDER BY row_no LIMIT ?',(offset,limit or 100000000))]
    def allowed(self,id,principal='public',db=None):
        if db is None:
            with self.connect() as c:return self.allowed(id,principal,c)
        r=db.execute('SELECT * FROM overlays WHERE passage_id=?',(id,)).fetchone()
        return r is None or (r['operation']!='delete' and (r['operation']=='restore' or principal in json.loads(r['allowed_principals'])))
    def allowed_ids(self,principal='public'):
        with self.connect() as db:
            hidden={r['passage_id'] for r in db.execute('SELECT * FROM overlays') if r['operation']=='delete' or (r['operation']=='restrict' and principal not in json.loads(r['allowed_principals']))}
            return hidden
    def get(self,id,principal='public'):
        with self.connect() as db:
            if not self.allowed(id,principal,db):raise AppError('not_found','资料不存在或当前无权读取',404)
            r=db.execute('SELECT * FROM passages WHERE id=?',(id,)).fetchone()
            ensure(r is not None,'not_found','资料不存在或当前无权读取',404)
            result=dict(r);ensure(digest(result['text'])==result['sha256'],'passage_corrupt','资料正文与来源摘要不一致',409);return result
    def list_passages(self,offset=0,limit=20,q='',principal='public'):
        hidden=self.allowed_ids(principal)
        with self.connect() as db:
            clause=' WHERE (title LIKE ? OR text LIKE ?)' if q else '';params=[f'%{q}%',f'%{q}%'] if q else []
            if hidden:
                clause+=(' AND ' if clause else ' WHERE ')+f"id NOT IN ({','.join('?' for _ in hidden)})";params+=list(hidden)
            total=db.execute('SELECT count(*) FROM passages'+clause,params).fetchone()[0]
            rows=[dict(r) for r in db.execute('SELECT * FROM passages'+clause+' ORDER BY row_no LIMIT ? OFFSET ?',params+[limit,offset])]
            return {'total':total,'items':rows}
    def generation(self,name=None):
        name=name or self.setting('active_generation')
        if not name:return None
        with self.connect() as db:r=db.execute('SELECT * FROM generations WHERE generation=?',(name,)).fetchone()
        if not r:return None
        x=dict(r);x['manifest']=json.loads(x['manifest'] or '{}');x['model']=json.loads(x['model'] or 'null');return x
    def generations(self):
        with self.connect() as db:names=[r[0] for r in db.execute('SELECT generation FROM generations ORDER BY created_at DESC')]
        return [self.generation(x) for x in names]
    def save_generation(self,name,status,embedded,total,dimension,model,manifest):
        ensure(re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,79}',name),'invalid_generation','索引版本名称不正确')
        with self.connect() as db:
            existing=db.execute('SELECT created_at FROM generations WHERE generation=?',(name,)).fetchone()
            db.execute('INSERT OR REPLACE INTO generations VALUES(?,?,?,?,?,?,?,?)',(name,status,embedded,total,dimension,canonical(model),existing[0] if existing else now(),canonical(manifest)))
    def validate_generation(self,generation):
        g=self.generation(generation);ensure(g and g['status']=='complete','index_not_ready','索引尚未完整发布',409)
        generation=g['generation']
        folder=self.index_root/generation;manifest_path=folder/'manifest.json'
        try:
            manifest=json.loads(manifest_path.read_text());ensure(canonical(manifest)==canonical(g['manifest']),'index_corrupt','索引清单与数据库绑定不一致',409)
            ensure(manifest.get('corpus_sha256')==self.setting('corpus_sha256'),'source_mismatch','索引绑定了不同来源快照',409)
            ensure(manifest.get('model_fingerprint')==model_fingerprint(g['model'])==model_fingerprint(manifest.get('model',{})),'model_mismatch','索引模型身份不一致',409)
            from .identity import validate_execution
            validate_execution(manifest, g['model'])
            ensure(manifest.get('embedded')==manifest.get('total')==g['total']==g['embedded'],'index_corrupt','索引数量与发布记录不一致',409)
            expected={'vectors.f32.npy','vectors.i8.npy','scales.f32.npy','ids.json'};ensure(set(manifest.get('files',{}))==expected,'index_corrupt','索引文件清单不完整',409)
            signatures=[]
            for name in sorted(expected):
                p=folder/name;st=p.stat();ensure(not p.is_symlink() and st.st_size==manifest['files'][name]['bytes'],'index_corrupt','索引文件不存在或长度变化',409);signatures.append((name,st.st_ino,st.st_size,st.st_mtime_ns,st.st_ctime_ns))
            signature=(digest(canonical(manifest)),tuple(signatures))
            if self._verified.get(generation)!=signature:
                for name in expected:ensure(file_digest(folder/name)==manifest['files'][name]['sha256'],'index_corrupt','索引文件摘要变化，禁止采用或读取',409)
                self._verified[generation]=signature
            return g
        except (OSError,ValueError,KeyError) as e:raise AppError('index_corrupt','索引发布文件不完整或无法读取',409) from e
    def activate(self,generation,expected_active):
        self.validate_generation(generation)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE');current=self.setting('active_generation',None,db)
            row=db.execute('SELECT status FROM generations WHERE generation=?',(generation,)).fetchone()
            ensure(row and row[0]=='complete','index_not_ready','索引尚未完成，不能采用',409)
            if current==generation:return {'active_generation':current,'previous_generation':current,'idempotent':True}
            ensure(current==expected_active,'active_conflict','采用版本已变化，请重新读取',409)
            self.set_setting('active_generation',generation,db)
            body={'operation':'activate_generation','generation':generation,'previous_generation':current,'at':now()}
            event_id='activate-'+str(time.time_ns());db.execute('INSERT INTO events VALUES(?,?,?,?)',(event_id,digest(canonical(body)),canonical(body),now()))
            return {'active_generation':generation,'previous_generation':current}
    def apply_event(self,body):
        ensure(isinstance(body,dict),'invalid_event','事件格式不正确')
        ensure(set(body)=={'event_id','passage_id','revision','operation','allowed_principals','label'},'invalid_event','事件字段缺失或多余')
        ensure(isinstance(body['event_id'],str) and 0<len(body['event_id'])<=128,'invalid_event','事件编号不正确')
        ensure(isinstance(body['passage_id'],str) and 0<len(body['passage_id'])<=500,'invalid_event','资料编号不正确')
        ensure(type(body['revision']) is int and body['revision']>0,'invalid_revision','事件版本必须为正整数')
        ensure(body['operation'] in ('restrict','delete','restore') and body['label']=='controlled_experiment','invalid_event','仅允许明确标记的受控实验事件')
        ensure(isinstance(body['allowed_principals'],list) and all(isinstance(p,str) and p.strip() and len(p)<=100 for p in body['allowed_principals']),'invalid_principals','权限主体列表不正确')
        h=digest(canonical(body))
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE');old=db.execute('SELECT * FROM events WHERE event_id=?',(body['event_id'],)).fetchone()
            if old:
                ensure(old['digest']==h,'idempotency_conflict','事件编号已用于不同内容',409);return {'event':json.loads(old['body']),'applied':False,'idempotent':True}
            exists=db.execute('SELECT 1 FROM passages WHERE id=?',(body['passage_id'],)).fetchone();ensure(exists,'not_found','资料不存在',404)
            prior=db.execute('SELECT revision FROM overlays WHERE passage_id=?',(body['passage_id'],)).fetchone()
            ensure(prior is None or body['revision']>prior[0],'stale_revision','旧事件不能覆盖当前权限或恢复已删除资料',409)
            db.execute('INSERT OR REPLACE INTO overlays VALUES(?,?,?,?,?)',(body['passage_id'],body['revision'],body['operation'],canonical(body['allowed_principals']),body['label']))
            db.execute('INSERT INTO events VALUES(?,?,?,?)',(body['event_id'],h,canonical(body),now()))
            self.set_setting('overlay_epoch',self.setting('overlay_epoch',0,db)+1,db)
            return {'event':body,'applied':True,'idempotent':False}
    def events(self):
        with self.connect() as db:return [{'id':r['event_id'],'at':r['created_at'],**json.loads(r['body'])} for r in db.execute('SELECT * FROM events ORDER BY created_at DESC LIMIT 100')]
