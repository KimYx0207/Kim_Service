#!/usr/bin/env node
// Generated standalone runtime copies have one editable source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverComponents } from './capability-catalog.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'src/application/service-helpers/runtime.mjs'), 'utf8');
const mode = process.argv[2];
if (!['build', 'check'].includes(mode)) throw new Error('Usage: build-service-helpers.mjs build|check');
let count = 0;
for (const component of discoverComponents(root)) {
  const directory = path.join(root, component.path);
  const contract = path.join(directory, 'helper-contract.json');
  if (!fs.existsSync(contract) || JSON.parse(fs.readFileSync(contract, 'utf8')).protocol !== 'kim-service-helper-v1') continue;
  const helper = JSON.parse(fs.readFileSync(contract, 'utf8'));
  const output = path.join(directory, 'scripts/runtime.mjs');
  if (mode === 'build') fs.writeFileSync(output, source);
  else if (fs.readFileSync(output, 'utf8') !== source) throw new Error(`Stale generated runtime: ${component.path}`);
  const capability = component.contract.capabilities.find(item => item.id === helper.capabilityId);
  if (!capability) throw new Error(`Helper capability is missing: ${component.path}`);
  for (const kind of ['input','output']) {
    const schemaPath=path.join(directory,`schemas/${kind}.schema.json`);
    const schema=JSON.stringify({$schema:'https://json-schema.org/draft/2020-12/schema',$comment:`Generated from capability.json ${kind}; edit the contract and rebuild.`,...capability[kind]},null,2)+'\n';
    if(mode==='build') fs.writeFileSync(schemaPath,schema);
    else if(fs.readFileSync(schemaPath,'utf8')!==schema) throw new Error(`Stale generated schema: ${component.path}/${kind}`);
  }
  count++;
}
console.log(`${mode}: ${count} standalone helper runtimes`);
