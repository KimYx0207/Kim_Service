#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function runCli(argv=process.argv.slice(2)){
  if(!argv.length||argv.includes('--help')){console.log('node scripts/build-desktop-skill-package.mjs --meta-root /absolute/Meta_Kim --host workbuddy|doubao --component ID --output /absolute/new-directory [--source-record /absolute/SOURCE-REVISION.txt] [--check]\nSelect one canonical Agent or Skill. Uses the shared exporter from the explicitly selected Meta_Kim source/npm package. No installation or model call.');return;}
  const index=argv.indexOf('--meta-root');if(index<0||argv.lastIndexOf('--meta-root')!==index||!argv[index+1]||!path.isAbsolute(argv[index+1]))throw new Error('One explicit absolute --meta-root is required');
  const metaRoot=path.resolve(argv[index+1]);const manifest=JSON.parse(fs.readFileSync(path.join(metaRoot,'package.json'),'utf8'));
  if(manifest.name!=='meta-kim')throw new Error('--meta-root must be the intended Meta_Kim source or npm package');
  const requiredMeta=JSON.parse(fs.readFileSync(path.join(ROOT,'.github/release.json'),'utf8')).metaRelease;
  if(`v${manifest.version}`!==requiredMeta)throw new Error(`Service requires Meta ${requiredMeta}; selected ${manifest.version}`);
  const remaining=[...argv.slice(0,index),...argv.slice(index+2)];
  const {runDesktopSkillCli}=await import(pathToFileURL(path.join(metaRoot,'scripts/build-desktop-skill-package.mjs')).href);
  return runDesktopSkillCli(remaining,{kind:'service',sourceRoot:ROOT});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)runCli().catch(error=>{console.error(`Desktop Skill export: ${error.message}`);process.exitCode=1;});
