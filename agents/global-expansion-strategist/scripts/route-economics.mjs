#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Pure arithmetic over caller-supplied, already normalized scenario amounts.
// This helper neither fetches rates nor validates market facts or eligibility.
export function calculateRouteEconomics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('scenario must be an object');
  const required = ['unit','currency','period','netRevenue','variableCosts','founderHours','hourlyValue','fixedCosts','capacity','costCoverage'];
  const missing = required.filter(key => input[key] === undefined || input[key] === null);
  if (input.costCoverage !== 'complete_for_scenario' && !missing.includes('costCoverage')) missing.push('costCoverage');
  if (input.unknowns !== undefined && (!Array.isArray(input.unknowns) || input.unknowns.some(x => typeof x !== 'string' || !x.trim()))) throw new TypeError('unknowns must be non-empty descriptions');
  const limitations = [...missing, ...(input.unknowns ?? [])];
  const boundary = { calculationOnly: true, professionalEffect: 'not_evaluated', nativeRuntimeVerified: false };
  if (limitations.length) return { status: 'needs_inputs', missing: limitations, ...boundary };
  for (const key of ['unit','period']) if (typeof input[key] !== 'string' || !input[key].trim()) throw new TypeError(key + ' must state the scenario basis');
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new TypeError('currency must be an explicit three-letter code');
  const finite = (n, label, nonnegative = true) => {
    if (typeof n !== 'number' || !Number.isFinite(n) || (nonnegative && n < 0)) throw new TypeError(label + ' must be a finite' + (nonnegative ? ' nonnegative' : '') + ' number');
    return n;
  };
  const money = (value, label, nonnegative = true) => {
    if (!value || typeof value !== 'object' || value.currency !== input.currency) throw new TypeError(label + ': currency mismatch; provide documented normalization first');
    return finite(value.amount, label, nonnegative);
  };
  if (!Array.isArray(input.variableCosts)) throw new TypeError('variableCosts must be an explicit array');
  const names = new Set();
  const costs = input.variableCosts.map((cost, i) => {
    if (!cost || typeof cost.name !== 'string' || !cost.name.trim() || names.has(cost.name)) throw new TypeError('variable cost requires a distinct name');
    names.add(cost.name);
    return money(cost, 'variableCosts[' + i + ']');
  });
  const revenue = money(input.netRevenue, 'netRevenue', false);
  const variableCash = costs.reduce((total, n) => total + n, 0);
  const founderHours = finite(input.founderHours, 'founderHours');
  const timeCost = founderHours * money(input.hourlyValue, 'hourlyValue');
  const fixedCosts = money(input.fixedCosts, 'fixedCosts');
  const capacity = finite(input.capacity, 'capacity');
  if (!Number.isInteger(capacity)) throw new TypeError('capacity must count whole stated units in the stated period');
  const cashContribution = revenue - variableCash;
  const contributionAfterTime = cashContribution - timeCost;
  if (![variableCash,timeCost,cashContribution,contributionAfterTime].every(Number.isFinite)) throw new RangeError('scenario arithmetic overflow');
  // Negative unit contribution is never viable at positive sales, even with no fixed costs.
  // Zero contribution and zero fixed costs means zero units are needed to cover costs; it promises no profit.
  const breakEven = contribution => contribution < 0 ? null : fixedCosts === 0 ? 0 : contribution > 0 ? Math.ceil(fixedCosts / contribution) : null;
  const cashBreakEvenUnits = breakEven(cashContribution);
  const timeBreakEvenUnits = breakEven(contributionAfterTime);
  return {
    status: 'calculated', currency: input.currency, period: input.period, unit: input.unit,
    netRevenue: revenue, variableCash, timeCost, cashContribution, contributionAfterTime,
    fixedCosts, capacity, cashBreakEvenUnits, timeBreakEvenUnits,
    cashCoverageWithinCapacity: cashBreakEvenUnits !== null && cashBreakEvenUnits <= capacity,
    timeCoverageWithinCapacity: timeBreakEvenUnits !== null && timeBreakEvenUnits <= capacity,
    calculationScope: 'Input amounts only; no FX lookup, cash-timing model, CAC/LTV estimate, market ranking, authorization or eligibility decision.',
    ...boundary
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { process.stdout.write(JSON.stringify(calculateRouteEconomics(JSON.parse(fs.readFileSync(0, 'utf8'))), null, 2) + '\n'); }
  catch (error) { process.stderr.write(error.message + '\n'); process.exitCode = 1; }
}
