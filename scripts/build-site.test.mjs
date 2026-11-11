import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildSite } from './build-site.mjs';
import { writeStaticSite } from '../src/data/site-output.mjs';

const root=path.resolve(import.meta.dirname,'..');
test('publication includes real sample dependencies and source links bound to the build revision',()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'kim-site-'));
  try{
    const output=path.join(parent,'site');
    const result=buildSite({root,output,sourceRef:'verified-revision'});
    assert.equal(result.componentCount,2);
    const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
    assert.match(html,/verified-revision/);
    assert.ok(fs.existsSync(path.join(output,'agents/financial-modeler/scripts/operating-forecast.js')));
    assert.ok(fs.existsSync(path.join(output,'agents/design-system-designer/examples/service-console/index.html')));
    assert.ok(!fs.existsSync(path.join(output,'.github')));
    const manifest=JSON.parse(fs.readFileSync(path.join(output,'site-manifest.json')));
    assert.ok(manifest.files.every(relative=>fs.lstatSync(path.join(output,relative)).isFile()));
    assert.equal(buildSite({root,output,sourceRef:'verified-revision'}).fileCount,result.fileCount);
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
});

test('rebuild removes only prior owned output files and preserves unknown user files',()=>{
  const parent=fs.mkdtempSync(path.join(os.tmpdir(),'kim-site-owned-'));
  try{
    const source=path.join(parent,'source');fs.mkdirSync(path.join(source,'agents/sample'),{recursive:true});
    fs.writeFileSync(path.join(source,'agents/sample/old.txt'),'old');
    const output=path.join(parent,'site');
    writeStaticSite({root:source,output,html:'old',componentPaths:['agents/sample'],sourceRef:'first'});
    fs.writeFileSync(path.join(output,'notes.txt'),'user notes');
    fs.unlinkSync(path.join(source,'agents/sample/old.txt'));
    fs.writeFileSync(path.join(source,'agents/sample/new.txt'),'new');
    writeStaticSite({root:source,output,html:'new',componentPaths:['agents/sample'],sourceRef:'second'});
    assert.equal(fs.readFileSync(path.join(output,'notes.txt'),'utf8'),'user notes');
    assert.equal(fs.existsSync(path.join(output,'agents/sample/old.txt')),false);
    assert.equal(fs.readFileSync(path.join(output,'agents/sample/new.txt'),'utf8'),'new');
    const foreign=path.join(parent,'foreign');fs.mkdirSync(foreign);fs.writeFileSync(path.join(foreign,'index.html'),'mine');
    assert.throws(()=>writeStaticSite({root:source,output:foreign,html:'new',componentPaths:[]}),/unmanaged/);
    assert.equal(fs.readFileSync(path.join(foreign,'index.html'),'utf8'),'mine');
  }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
