#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { run } from './files.mjs';
if(process.argv.length!==3 || !path.isAbsolute(process.argv[2])) throw new Error('Provide a new absolute example workspace path');
fs.mkdirSync(process.argv[2]); // Intentional no-overwrite example fixture.
// Resolve the directory we just created: macOS temporary paths may use /var aliases.
// The file helper continues to reject symlinks in explicitly supplied workspaces and sources.
const workspaceRoot=fs.realpathSync(process.argv[2]);
const example=JSON.parse(fs.readFileSync(new URL('../examples/input.json',import.meta.url),'utf8'));
fs.writeFileSync(path.join(workspaceRoot,'brief.md'),'# 入驻需求\n\n'+'客户材料与核验回执。😀\r\n'.repeat(2000));
const request={...example,workspaceRoot};
fs.writeFileSync(path.join(workspaceRoot,'request.json'),JSON.stringify(request,null,2)+'\n');
process.stdout.write(JSON.stringify(run(request))+'\n');
