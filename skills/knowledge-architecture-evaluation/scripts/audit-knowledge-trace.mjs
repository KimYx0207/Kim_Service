#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const text = v => typeof v === 'string' && v.trim().length > 0;
function array(value, label) {
  if (!Array.isArray(value) || value.length > 1024) throw new TypeError(`${label}: bounded array required`);
  return value;
}
function ids(value, label) {
  const values = array(value, label);
  if (!values.every(text) || new Set(values).size !== values.length) throw new TypeError(`${label}: unique IDs required`);
  return values;
}

/** Audit only caller-supplied lineage and access snapshot. No source deletion,
 * cache invalidation, authentication, network access or answer grading is performed. */
export function auditKnowledgeTrace(input) {
  if (!input || !text(input.corpusVersion) || !text(input.policyVersion)) throw new TypeError('corpusVersion and policyVersion required');
  const allowed = new Set(ids(input.allowedSourceIds, 'allowedSourceIds'));
  const exposed = ids(input.exposedIds, 'exposedIds'), cited = ids(input.citedIds, 'citedIds');
  const nodes = new Map();
  for (const node of array(input.nodes, 'nodes')) {
    if (!node || !text(node.id) || !text(node.revision) || nodes.has(node.id)) throw new TypeError('unique node IDs and revisions required');
    if (!['source', 'chunk', 'wiki', 'graph', 'summary', 'cache'].includes(node.kind)) throw new TypeError('unknown node kind');
    if (node.kind === 'source' && typeof node.revoked !== 'boolean') throw new TypeError('source revoked flag required');
    nodes.set(node.id, node);
  }
  const issues = [], sources = new Set(), active = new Set(), visited = new Set();
  const issue = (code, id, dependencyId) => {
    const value = { code, id, ...(dependencyId === undefined ? {} : { dependencyId }) };
    if (!issues.some(x => JSON.stringify(x) === JSON.stringify(value))) issues.push(value);
  };
  function visit(id) {
    if (active.has(id)) { issue('lineage_cycle', id); return; }
    if (visited.has(id)) return;
    const node = nodes.get(id);
    if (!node) { issue('unknown_node', id); return; }
    active.add(id);
    if (node.kind === 'source') {
      sources.add(id);
      if (node.revoked) issue('revoked_source', id);
      if (!allowed.has(id)) issue('unauthorized_source', id);
    } else {
      const inputs = array(node.inputs, `nodes.${id}.inputs`);
      if (!inputs.length) issue('missing_lineage', id);
      if (node.kind === 'cache' && node.policyVersion !== input.policyVersion) issue('stale_cache_policy', id);
      for (const edge of inputs) {
        if (!edge || !text(edge.id) || !text(edge.revision)) throw new TypeError('dependency id and revision required');
        if (nodes.has(edge.id) && nodes.get(edge.id).revision !== edge.revision) issue('stale_dependency', id, edge.id);
        visit(edge.id);
      }
    }
    active.delete(id); visited.add(id);
  }
  for (const id of [...exposed, ...cited]) visit(id);
  return { schemaVersion: 1, status: issues.length ? 'rejected' : exposed.length ? 'consistent_trace' : 'unverified',
    corpusVersion: input.corpusVersion, policyVersion: input.policyVersion, issues, sourceIds: [...sources].sort(),
    answerQualityVerified: false, humanReviewVerified: false, nativeRuntimeVerified: false,
    claimBoundary: 'Supplied lineage/access consistency only. A real server must supply current identity, source versions and every exposed artifact; passing is not proof of actual deletion, truthful citations or answer quality.' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.slice(2).join('\0') !== '--input-json\0-') throw new Error('Usage: audit-knowledge-trace.mjs --input-json -');
    const chunks = []; let size = 0;
    for await (const chunk of process.stdin) { size += chunk.length; if (size > 1048576) throw new Error('input_too_large'); chunks.push(chunk); }
    const result = auditKnowledgeTrace(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    process.stdout.write(JSON.stringify(result) + '\n'); process.exitCode = result.status === 'rejected' ? 1 : 0;
  } catch (error) { process.stdout.write(JSON.stringify({ error: error instanceof SyntaxError ? 'invalid_json' : error.message, answerQualityVerified: false }) + '\n'); process.exitCode = 1; }
}
