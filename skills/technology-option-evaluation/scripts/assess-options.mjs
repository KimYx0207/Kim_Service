#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const isText = v => typeof v === 'string' && v.trim().length > 0;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const DAY = 86400000;
function rows(value, label) {
  if (!Array.isArray(value) || value.length > 512) throw new TypeError(`${label}: bounded array required`);
  return value;
}
function uniqueMap(value, label) {
  const result = new Map();
  for (const item of rows(value, label)) {
    if (!object(item) || !isText(item.id) || result.has(item.id)) throw new TypeError(`${label}: unique IDs required`);
    result.set(item.id, item);
  }
  return result;
}
function date(value) {
  if (!isText(value) || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) return NaN;
  return Date.parse(value);
}

/** Compare supplied observations with explicit hard constraints. Does not search,
 * select an architecture, authenticate evidence, run a benchmark or grant authority. */
export function assessOptions(input) {
  if (!object(input) || !isText(input.environment) || !Number.isFinite(date(input.evaluatedAt))) throw new TypeError('environment and evaluatedAt required');
  const criteria = uniqueMap(input.criteria, 'criteria');
  const evidence = uniqueMap(input.evidence, 'evidence');
  const options = uniqueMap(input.candidates, 'candidates');
  if (!criteria.size || !options.size) throw new TypeError('criteria and candidates must not be empty');
  for (const c of criteria.values()) {
    if (!isText(c.unit) || !['observed', 'documented'].includes(c.evidenceRequired)) throw new TypeError('criterion unit and evidenceRequired required');
    if (!['min', 'max', 'expected'].some(k => Object.hasOwn(c, k))) throw new TypeError('criterion needs min, max or expected');
    for (const k of ['min', 'max', 'maxAgeDays']) if (Object.hasOwn(c, k) && (!Number.isFinite(c[k]) || (k === 'maxAgeDays' && c[k] < 0))) throw new TypeError('finite criterion values required');
    if (c.min > c.max) throw new TypeError('criterion minimum exceeds maximum');
    if (Object.hasOwn(c, 'expected') && typeof c.expected !== 'boolean') throw new TypeError('expected must be boolean');
    if (Object.hasOwn(c, 'expected') && ['min', 'max'].some(k => Object.hasOwn(c, k))) throw new TypeError('boolean and numeric constraints cannot be mixed');
  }
  const inspectEvidence = (refs, criterion) => {
    if (!Array.isArray(refs) || refs.length === 0 || new Set(refs).size !== refs.length) return false;
    const observed = ['local_observation', 'human_observation'];
    return refs.every(id => {
      const e = evidence.get(id);
      if (!e || !isText(e.ref) || !isText(e.version) || !Number.isFinite(date(e.observedAt))) return false;
      if (!['primary_source', ...observed, 'user_material'].includes(e.kind)) return false;
      if (criterion?.evidenceRequired === 'observed' && !observed.includes(e.kind)) return false;
      const age = date(input.evaluatedAt) - date(e.observedAt);
      return age >= 0 && (criterion?.maxAgeDays === undefined || age <= criterion.maxAgeDays * DAY);
    });
  };
  const candidates = [...options.values()].map(candidate => {
    if (!isText(candidate.mechanism)) throw new TypeError('candidate mechanism required');
    const gaps = [], failures = [], comparisons = [];
    if (candidate.environment !== input.environment) gaps.push('environment_mismatch');
    const dependencies = rows(candidate.dependencies, 'dependencies');
    if (!dependencies.length && !isText(candidate.noDependencyReason)) gaps.push('dependency_scope_unexplained');
    for (const dependency of dependencies) {
      if (!object(dependency) || !isText(dependency.name) || !isText(dependency.version)) throw new TypeError('dependency name/version required');
      if (dependency.compatible === false) failures.push(`incompatible:${dependency.name}`);
      else if (dependency.compatible !== true || !inspectEvidence(dependency.evidenceRefs)) gaps.push(`compatibility_unverified:${dependency.name}`);
    }
    const measurements = new Map();
    for (const measurement of rows(candidate.measurements, 'measurements')) {
      if (!object(measurement) || !criteria.has(measurement.criterionId) || measurements.has(measurement.criterionId)) throw new TypeError('unique known measurement criterion required');
      if (typeof measurement.value !== 'boolean' && !Number.isFinite(measurement.value)) throw new TypeError('finite measurement value required');
      measurements.set(measurement.criterionId, measurement);
    }
    for (const criterion of criteria.values()) {
      const m = measurements.get(criterion.id);
      if (!m || m.unit !== criterion.unit || !inspectEvidence(m.evidenceRefs, criterion)) {
        gaps.push(`measurement_unverified:${criterion.id}`); continue;
      }
      if ((Object.hasOwn(criterion, 'expected') && typeof m.value !== 'boolean') || (!Object.hasOwn(criterion, 'expected') && typeof m.value !== 'number')) throw new TypeError('measurement type must match criterion');
      const meets = Object.hasOwn(criterion, 'expected') ? m.value === criterion.expected :
        (criterion.min === undefined || m.value >= criterion.min) && (criterion.max === undefined || m.value <= criterion.max);
      comparisons.push({ criterionId: criterion.id, value: m.value, unit: m.unit, meets });
      if (!meets) failures.push(criterion.id);
    }
    return { id: candidate.id, status: failures.length ? 'violates-constraints' : gaps.length ? 'needs-evidence' : 'eligible-for-review', failures, gaps, comparisons };
  });
  return { schemaVersion: 1, candidates, eligibleForReview: candidates.filter(c => c.status === 'eligible-for-review').map(c => c.id),
    professionalQualityVerified: false, nativeRuntimeVerified: false,
    claimBoundary: 'Checks supplied observation/constraint consistency only. Source authenticity, semantics, representativeness and final selection require task evidence and review.' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.slice(2).join('\0') !== '--input-json\0-') throw new Error('Usage: assess-options.mjs --input-json -');
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > 1048576) throw new Error('input_too_large'); chunks.push(chunk); }
    process.stdout.write(JSON.stringify(assessOptions(JSON.parse(Buffer.concat(chunks).toString('utf8')))) + '\n');
  } catch (error) { process.stdout.write(JSON.stringify({ error: error instanceof SyntaxError ? 'invalid_json' : error.message, professionalQualityVerified: false }) + '\n'); process.exitCode = 1; }
}
