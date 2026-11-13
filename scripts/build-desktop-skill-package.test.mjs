import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const cli=new URL('./build-desktop-skill-package.mjs',import.meta.url);
test('desktop export help needs no Meta installation; writes require an explicit correct Meta root',t=>{
  const help=spawnSync(process.execPath,[fileURLToPath(cli),'--help'],{encoding:'utf8'});assert.equal(help.status,0);assert.match(help.stdout,/--meta-root/);
  const missing=spawnSync(process.execPath,[fileURLToPath(cli),'--host','workbuddy'],{encoding:'utf8'});assert.equal(missing.status,1);assert.match(missing.stderr,/explicit absolute --meta-root/);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'wrong-meta-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'another-package'}));
  const wrong=spawnSync(process.execPath,[fileURLToPath(cli),'--meta-root',root,'--host','workbuddy'],{encoding:'utf8'});assert.equal(wrong.status,1);assert.match(wrong.stderr,/intended Meta_Kim/);
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'meta-kim',version:'0.0.0'}));
  const mismatch=spawnSync(process.execPath,[fileURLToPath(cli),'--meta-root',root,'--host','workbuddy'],{encoding:'utf8'});assert.equal(mismatch.status,1);assert.match(mismatch.stderr,/Service requires Meta/);
});
