#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportServiceCapabilities } from '../src/data/service-helper-catalog.mjs';
if (process.argv.length!==3 || process.argv[2]!=='export') throw new Error('Usage: node scripts/service-capabilities.mjs export');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.stdout.write(JSON.stringify(exportServiceCapabilities(root))+'\n');
