#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/** Route evidence needs by declared value and stage, never authorize execution.
 * true means evidence was supplied for review, not that this helper authenticated it. */
export function assessValueStage({ valueTypes, stage, evidence, recurrence = 'unknown', recurrenceReason }) {
  if (!Array.isArray(valueTypes) || !valueTypes.length || new Set(valueTypes).size !== valueTypes.length ||
      !valueTypes.every(x => ['paid', 'internal', 'open-source'].includes(x))) throw new TypeError('valueTypes must contain unique paid/internal/open-source values');
  if (!['exploration', 'validation', 'delivery', 'scale'].includes(stage)) throw new TypeError('unknown stage');
  if (!evidence || Array.isArray(evidence) || typeof evidence !== 'object' || !Object.values(evidence).every(x => typeof x === 'boolean')) throw new TypeError('evidence values must be boolean');
  if (!['unknown', 'one-time', 'recurring'].includes(recurrence) || recurrence === 'one-time' && (typeof recurrenceReason !== 'string' || !recurrenceReason.trim())) throw new TypeError('recurrence and one-time reason required');
  const required = new Set(['outcome']);
  if (stage !== 'exploration') for (const k of ['adoption', 'cost']) required.add(k);
  if (['delivery', 'scale'].includes(stage)) for (const k of ['acceptance', 'owner']) required.add(k);
  if (stage === 'scale') for (const k of ['repeatability', 'capacity']) required.add(k);
  const commercialKeys = ['revenueModel', 'payer', 'urgency', 'dealSize', 'deliveryCost', ...(recurrence === 'one-time' ? [] : ['repeatPurchase'])];
  const commercialGaps = valueTypes.includes('paid') ? commercialKeys.filter(k => evidence[k] !== true) : [];
  if (valueTypes.includes('paid') && ['delivery', 'scale'].includes(stage)) for (const k of commercialKeys) required.add(k);
  const requiredEvidence = [...required], gaps = requiredEvidence.filter(k => evidence[k] !== true);
  return { schemaVersion: 1, valueTypes: [...valueTypes], stage, requiredEvidence, gaps, commercialGaps,
    status: gaps.length ? 'evidence-required' : 'ready-for-next-test',
    commercialEvidenceSupplied: valueTypes.includes('paid') && commercialGaps.length === 0,
    executionAuthorized: false, finalAcceptanceClaimed: false,
    claimBoundary: 'Evidence routing only. Booleans do not verify evidence quality, user approval, market demand or business viability.' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.slice(2).join('\0') !== '--input-json\0-') throw new Error('Usage: assess-value-stage.mjs --input-json -');
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > 65536) throw new Error('input_too_large'); chunks.push(chunk); }
    process.stdout.write(JSON.stringify(assessValueStage(JSON.parse(Buffer.concat(chunks).toString('utf8')))) + '\n');
  } catch (error) { process.stdout.write(JSON.stringify({ error: error instanceof SyntaxError ? 'invalid_json' : error.message, executionAuthorized: false }) + '\n'); process.exitCode = 1; }
}
