#!/usr/bin/env node
// Generated standalone runtime copies have one editable source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/application/service-helpers/runtime.mjs'), 'utf8');
const mode = process.argv[2];
if (!['build', 'check'].includes(mode)) throw new Error('Usage: build-service-helpers.mjs build|check');
let count = 0;
for (const dir of fs.readdirSync(path.join(root, 'skills'))) {
  const contract = path.join(root, 'skills', dir, 'helper-contract.json');
  if (!fs.existsSync(contract) || JSON.parse(fs.readFileSync(contract, 'utf8')).protocol !== 'kim-service-helper-v1') continue;
  const output = path.join(root, 'skills', dir, 'scripts/runtime.mjs');
  if (mode === 'build') fs.writeFileSync(output, source);
  else if (fs.readFileSync(output, 'utf8') !== source) throw new Error(`Stale generated runtime: ${dir}`);
  const capability = JSON.parse(fs.readFileSync(path.join(root, 'skills', dir, 'capability.json'), 'utf8')).capabilities[0];
  for (const kind of ['input','output']) {
    const schemaPath=path.join(root,'skills',dir,`schemas/${kind}.schema.json`);
    const schema=JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$comment:`Generated from capability.json ${kind}; edit the contract and rebuild.`,...capability[kind]},null,2)+'\n';
    if(mode==='build') fs.writeFileSync(schemaPath,schema);
    else if(fs.readFileSync(schemaPath,'utf8')!==schema) throw new Error(`Stale generated schema: ${dir}/${kind}`);
  }
  count++;
}
console.log(`${mode}: ${count} standalone helper runtimes`);
