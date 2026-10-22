#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verify } from '../../../agents/delivery-verifier/scripts/verify.mjs';

export const CASE_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)));

/** Reuse the existing read-only verifier with a fixed public manifest, never caller status words. */
export function verifyPublicCase(artifactRoot = CASE_ROOT) {
  return verify(fs.readFileSync(new URL('verification-request.json', import.meta.url)), artifactRoot);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 2) {
    console.error('Usage: node docs/cases/maintenance-handoff-20261022/verify.mjs');
    process.exitCode = 2;
  } else {
    const result = verifyPublicCase();
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'completed' ? 0 : result.status === 'partial' ? 1 : 2;
  }
}
