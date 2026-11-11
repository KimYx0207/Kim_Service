#!/usr/bin/env node
// Explicit file/stdio adapter; the forecast module itself performs no I/O.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import operating from './operating-forecast.js';

export function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) {
    process.stdout.write('Usage: node scripts/forecast-cli.mjs --input-json <file|-> [--format json|csv]\nAll data must use one currency and explicit assumptions. Results go to stdout.\n');
    return 0;
  }
  try {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--input-json', '--format'].includes(args[i]) || options[args[i]] || !args[i + 1]) throw new Error('需要 --input-json <file|->，可选 --format json|csv');
      options[args[i]] = args[i + 1];
    }
    if (!options['--input-json'] || !['json', 'csv'].includes(options['--format'] ?? 'json')) throw new Error('输入或输出格式无效');
    const source = fs.readFileSync(options['--input-json'] === '-' ? 0 : options['--input-json']);
    if (source.length > 128 * 1024) throw new Error('输入超过 128 KiB；请只提供此模型需要的12个月假设');
    const result = operating.forecast(JSON.parse(source.toString('utf8')));
    process.stdout.write(options['--format'] === 'csv' ? operating.toCsv(result) : JSON.stringify(result, null, 2) + '\n');
    return 0;
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'invalid_input', message: error.message }) + '\n');
    return 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main();
