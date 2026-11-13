import { createHelper, unique, requireValue as assert } from './runtime.mjs';

export const run = createHelper(import.meta.url, 'data-lineage-impact', input => {
  const nodes = unique(input.nodes, 'nodes');
  assert(new Set(input.changed).size === input.changed.length, 'Duplicate changed object');
  const edges = new Map(); const adjacency = new Map(input.nodes.map(n => [n.id, []]));
  const evidenceMissing = [];
  for (const edge of input.edges) {
    assert(nodes.has(edge.from) && nodes.has(edge.to), 'Edge references an unknown object');
    const key = JSON.stringify([edge.from, edge.to, edge.confidence, edge.evidenceRef]);
    if (edges.has(key)) continue;
    edges.set(key, edge); adjacency.get(edge.from).push(edge);
  }
  const unmatchedSeeds = input.changed.filter(id => !nodes.has(id));
  const changed = new Set(input.changed); const paths = new Map(); const queue = [];
  for (const id of input.changed.filter(id => nodes.has(id))) { paths.set(`${id}\0true`, [id]); queue.push({ id, observed: true }); }
  for (let head = 0; head < queue.length; head++) {
    const { id, observed } = queue[head]; const path = paths.get(`${id}\0${observed}`);
    for (const edge of adjacency.get(id)) {
      const nextObserved = observed && edge.confidence === 'observed' && Boolean(edge.evidenceRef.trim());
      const key = `${edge.to}\0${nextObserved}`;
      if (paths.has(key)) continue;
      paths.set(key, [...path, edge.to]); queue.push({ id: edge.to, observed: nextObserved });
    }
  }
  const reachable = new Set(queue.map(n => n.id));
  for (const edge of edges.values()) if (reachable.has(edge.from) && !edge.evidenceRef.trim()) evidenceMissing.push(`${edge.from} → ${edge.to}`);
  const indegree = new Map([...reachable].map(id => [id, 0]));
  for (const edge of edges.values()) if (reachable.has(edge.from) && reachable.has(edge.to)) indegree.set(edge.to, indegree.get(edge.to) + 1);
  const ready = [...indegree].filter(([,n]) => n === 0).map(([id]) => id); let processed = 0;
  for (let head = 0; head < ready.length; head++) {
    processed++;
    for (const edge of adjacency.get(ready[head])) if (reachable.has(edge.to)) {
      indegree.set(edge.to, indegree.get(edge.to) - 1); if (indegree.get(edge.to) === 0) ready.push(edge.to);
    }
  }
  const cycleDetected = processed < reachable.size;
  const affected = [...reachable].filter(id => !changed.has(id)).sort().map(id => {
    const observedPath = paths.get(`${id}\0true`);
    return { id, owner: nodes.get(id).owner, certainty: observedPath ? 'observed_path' : 'possible_path', path: observedPath ?? paths.get(`${id}\0false`) };
  });
  return { status: unmatchedSeeds.length || evidenceMissing.length || cycleDetected || affected.some(n => !n.owner.trim() || n.certainty === 'possible_path') ? 'needs_review' : 'completed',
    result: { affected, unmatchedSeeds, cycleDetected, evidenceMissing, coverage: 'supplied_edges_only' } };
});
