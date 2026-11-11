#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStartPageData } from '../src/data/task-browser.mjs';
import { planSiteContent } from '../src/application/task-browser/site-plan.mjs';
import { writeStaticSite } from '../src/data/site-output.mjs';
import { renderStartPage } from './start-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function buildSite({ root = ROOT, output = path.join(root, '.site'), sourceRef } = {}) {
  const data = buildStartPageData(root);
  const ref = sourceRef || data.ui.repository.ref;
  return writeStaticSite({ root, output, sourceRef: ref,
    html: renderStartPage(root, { sourceRef: ref }), componentPaths: planSiteContent(data) });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length > 2) throw new Error('Usage: node scripts/build-site.mjs');
    console.log(JSON.stringify(buildSite({ sourceRef: process.env.GITHUB_SHA }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
