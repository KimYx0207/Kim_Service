import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const fail = code => { throw new Error(code); };
const finite = (x, min, max) => typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
const keys = (obj, allowed) => obj && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).every(k => allowed.includes(k));

// Supplied return-series arithmetic only: this is not a strategy engine or market-data verifier.
export function calculate(input) {
  if (!keys(input, ['periods', 'costRate', 'label']) || !Array.isArray(input.periods) || !input.periods.length || input.periods.length > 10000 || !finite(input.costRate, 0, 1)) fail('invalid_input');
  if (input.label !== undefined && (typeof input.label !== 'string' || input.label.length > 200)) fail('invalid_label');
  let equity = 1, benchmarkEquity = 1, peak = 1, maxDrawdown = 0, previousTime = -Infinity;
  const periods = [];
  for (const p of input.periods) {
    if (!keys(p, ['time', 'returnRate', 'turnover', 'benchmarkReturn', 'signalAvailableAt', 'executedAt']) ||
        !finite(p.returnRate, -1, 100) || !finite(p.turnover, 0, 100) || !finite(p.benchmarkReturn, -1, 100)) fail('invalid_period');
    const dates = [p.time, p.signalAvailableAt, p.executedAt];
    if (dates.some(x => typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(x) || !Number.isFinite(Date.parse(x)) || new Date(x).toISOString() !== x)) fail('invalid_timestamp');
    const [time, signal, executed] = dates.map(Date.parse);
    if (time <= previousTime) fail('unordered_periods');
    if (signal >= executed || executed > time) fail('lookahead_timing');
    if (executed <= previousTime) fail('overlapping_execution_period');
    const cost = input.costRate * p.turnover;
    const netReturn = p.returnRate - cost;
    if (netReturn < -1) fail('insolvent_return');
    equity *= 1 + netReturn;
    benchmarkEquity *= 1 + p.benchmarkReturn;
    if (!Number.isFinite(equity) || !Number.isFinite(benchmarkEquity)) fail('numeric_overflow');
    peak = Math.max(peak, equity);
    const drawdown = 1 - equity / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
    periods.push({ time: p.time, cost, netReturn, equity, benchmarkEquity, drawdown });
    previousTime = time;
  }
  return {
    schemaVersion: 1, status: 'completed', scope: 'supplied_return_arithmetic_only',
    inputSha256: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
    periods, totalReturn: equity - 1, benchmarkReturn: benchmarkEquity - 1, maxDrawdown,
    assumptions: ['cost = costRate * explicit turnover; cost is subtracted once per supplied period', 'no annualization or risk-adjusted statistic inferred from sample frequency', 'timestamps checked for internal ordering, not certified against market data', 'IEEE-754 Number arithmetic with floating-point rounding; not a decimal financial ledger'],
    unverified: ['data provenance', 'signal generation', 'execution price realism', 'survivorship bias', 'out-of-sample methodology'],
    tradingAuthorized: false, networkUsed: false, filesModified: false, nativeRuntimeVerified: false
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  let bytes = 0; const chunks = [];
  try {
    if (process.argv.slice(2).join(' ') !== '--input-json -') fail('invalid_arguments');
    for await (const chunk of process.stdin) {
      bytes += chunk.length;
      if (bytes > 2000000) fail('input_too_large');
      chunks.push(Buffer.from(chunk));
    }
    // To avoid duplicate-key ambiguity, accept canonical JSON only. Formatting differences
    // are rejected rather than normalized away; the documented CLI contract requires this.
    const text = new TextDecoder('utf-8', {fatal:true}).decode(Buffer.concat(chunks));
    const input = JSON.parse(text);
    if (text.trim() !== JSON.stringify(input)) fail('noncanonical_json');
    process.stdout.write(JSON.stringify(calculate(input)) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({ schemaVersion: 1, status: 'invalid_input', code: 'invalid_or_noncanonical_input', networkUsed: false, filesModified: false, tradingAuthorized: false }) + '\n');
    process.exitCode = 2;
  }
}
