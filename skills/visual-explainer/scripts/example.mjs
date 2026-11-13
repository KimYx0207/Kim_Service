#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {run} from './run.mjs';
if(process.argv.length!==3 || !path.isAbsolute(process.argv[2])) throw new Error('Provide a new absolute output directory');
const input=JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
const output=run(input);fs.mkdirSync(process.argv[2]);
const files=output.result.files.map(file=>{fs.writeFileSync(path.join(process.argv[2],file.name),file.content,{flag:'wx'});return {name:file.name,sha256:file.sha256};});
process.stdout.write(JSON.stringify({directory:process.argv[2],files,renderingObserved:'not_browser_verified',runtimeStatus:'illustration_only'})+'\n');
