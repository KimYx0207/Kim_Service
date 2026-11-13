import { createHelper, hash, bytes, equal, unique, requireValue as assert, boundedInteger } from './runtime.mjs';

function splitUtf8(text, limit) {
  const data = Buffer.from(text, 'utf8'); const parts = [];
  for (let start = 0; start < data.length;) {
    let end = Math.min(start + limit, data.length);
    while (end < data.length && (data[end] & 0xc0) === 0x80) end--;
    assert(end > start, 'Chunk budget is smaller than a UTF-8 code point');
    parts.push({ startByte: start, endByte: end, text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data.subarray(start, end)) });
    start = end;
  }
  return parts;
}
function build(input, policy) {
  assert(Array.isArray(input.sources) && input.sources.length && input.sources.length <= policy.maxSources, 'build requires a bounded sources list');
  unique(input.sources, 'sources');
  const chunkBytes = boundedInteger(input.chunkBytes ?? policy.chunkBytes, policy.minChunkBytes, policy.maxChunkBytes, 'chunkBytes');
  let total = 0; const sources = []; const chunks = [];
  for (const source of input.sources) {
    assert(Buffer.from(source.text, 'utf8').toString('utf8') === source.text, 'Source text contains an unpaired Unicode surrogate');
    total += bytes(source.text); assert(total <= policy.maxSourceBytes, 'Source material exceeds configured pack byte budget');
    const sourceSha256 = hash(source.text);
    if (source.expectedSha256) assert(source.expectedSha256 === sourceSha256, `Stale source: ${source.id}`);
    const encoded = Buffer.from(source.text, 'utf8');
    const pages = source.pages ?? []; unique(pages, `${source.id} pages`);
    let last = 0;
    for (const page of pages) {
      assert(page.startByte >= last && page.endByte > page.startByte && page.endByte <= encoded.length, 'Page ranges must be ordered, disjoint and inside the source');
      new TextDecoder('utf-8', { fatal: true }).decode(encoded.subarray(page.startByte, page.endByte)); last = page.endByte;
    }
    const sections = []; let offset = 0; let lineNumber = 1; const hierarchy = [];
    for (const [line] of source.text.matchAll(/[^\n]*(?:\n|$)/gu)) {
      const heading = line.match(/^(#{1,6})\s+(.+?)(?:\r?\n)?$/u);
      if (heading) {
        assert(sections.length < policy.maxSectionsPerSource, 'Too many source sections; split the source into smaller packs');
        const level = heading[1].length; hierarchy.splice(level - 1); hierarchy[level - 1] = heading[2];
        sections.push({ id: `${source.id}:section:${sections.length + 1}`, title: heading[2], level, startByte: offset, line: lineNumber, headings: hierarchy.filter(Boolean) });
      }
      offset += bytes(line); lineNumber++;
    }
    sources.push({ id: source.id, title: source.title, revision: source.revision, uri: source.uri ?? null,
      bytes: encoded.length, sha256: sourceSha256, pages, sections });
    let nextLine = 1;
    for (const [index, part] of splitUtf8(source.text, chunkBytes).entries()) {
      const lineStart = nextLine; nextLine += (part.text.match(/\n/g) ?? []).length;
      chunks.push({ id: `${source.id}:${sourceSha256.slice(0, 12)}:${index + 1}`, sourceId: source.id,
        sourceSha256, startByte: part.startByte, endByte: part.endByte, lineStart, lineEnd: nextLine,
        pageIds: pages.filter(page => page.startByte < part.endByte && page.endByte > part.startByte).map(page => page.id),
        sectionIds: sections.filter((section, i) => section.startByte < part.endByte && (sections[i + 1]?.startByte ?? encoded.length) > part.startByte).map(section => section.id),
        sha256: hash(part.text), text: part.text });
    }
  }
  assert(chunks.length <= policy.maxChunks, 'Too many chunks; increase chunkBytes within policy or split the pack');
  const pack = { schemaVersion: 1, context: input.context, sources, chunks };
  return { ...pack, packSha256: hash(pack) };
}
function validatePack(pack, context, policy) {
  assert(pack && pack.schemaVersion === 1 && equal(pack.context, context), 'Pack context differs from the current organization/Work/revision');
  const { packSha256, ...body } = pack;
  assert(hash(body) === packSha256, 'Pack hash mismatch; rebuild from the source');
  assert(Array.isArray(pack.sources) && Array.isArray(pack.chunks) && pack.chunks.length <= policy.maxChunks, 'Invalid bounded pack');
  const sources = unique(pack.sources, 'pack sources'); unique(pack.chunks, 'pack chunks');
  for (const chunk of pack.chunks) {
    const source = sources.get(chunk.sourceId); assert(source && chunk.sourceSha256 === source.sha256 && hash(chunk.text) === chunk.sha256, 'Chunk/source hash mismatch');
  }
  let total = 0;
  for (const source of pack.sources) {
    let end = 0; const parts = [];
    for (const chunk of pack.chunks.filter(item => item.sourceId === source.id)) {
      assert(chunk.startByte === end && chunk.endByte === end + bytes(chunk.text), 'Chunks must cover source bytes exactly once in order');
      end = chunk.endByte; parts.push(chunk.text);
    }
    total += end;
    assert(end === source.bytes && hash(parts.join('')) === source.sha256, 'Source cannot be reconstructed from its chunks');
  }
  assert(total <= policy.maxSourceBytes, 'Pack source byte budget exceeded');
}
export const run = createHelper(import.meta.url, 'evidence-pack', (input, policy) => {
  const pack = input.operation === 'build' ? build(input, policy) : input.pack;
  validatePack(pack, input.context, policy);
  const offset = boundedInteger(input.indexOffset ?? 0, 0, pack.chunks.length, 'indexOffset');
  const pageSize = boundedInteger(input.indexPageSize ?? policy.indexPageSize, 1, policy.maxIndexPageSize, 'indexPageSize');
  const budget = boundedInteger(input.contextBudgetBytes ?? policy.contextBudgetBytes, policy.minContextBudgetBytes, policy.maxContextBudgetBytes, 'contextBudgetBytes');
  const allIds = input.chunkIds ?? pack.chunks.map(item => item.id); assert(new Set(allIds).size === allIds.length, 'Duplicate selected chunk IDs');
  const selectionOffset = boundedInteger(input.selectionOffset ?? 0, 0, allIds.length, 'selectionOffset');
  const ids = allIds.slice(selectionOffset);
  const byId = new Map(pack.chunks.map(item => [item.id, item]));
  for (const id of allIds) assert(byId.has(id), `Unknown chunk ${id}`);
  let text = ''; const citations = []; let minimumRequiredBytes = null;
  for (const id of ids) {
    const chunk = byId.get(id);
    const entry = `[${chunk.id} bytes ${chunk.startByte}-${chunk.endByte}; sha256 ${chunk.sha256}]\n${chunk.text}\n`;
    if (bytes(text) + bytes(entry) <= budget) { text += entry; const { text: ignored, ...citation } = chunk; citations.push(citation); }
    else { minimumRequiredBytes = bytes(entry); break; }
  }
  const remaining = ids.slice(citations.length);
  const indexItems = pack.chunks.slice(offset, offset + pageSize).map(({ text: ignored, ...item }) => item);
  return { result: { ...(input.operation === 'build' ? { pack } : {}), packSha256: pack.packSha256,
    index: { items: indexItems, total: pack.chunks.length, offset, nextOffset: offset + pageSize < pack.chunks.length ? offset + pageSize : null },
    context: { text, bytes: bytes(text), budgetBytes: budget, citations, complete: remaining.length === 0,
      remainingChunkIds: remaining.slice(0, policy.maxIndexPageSize), remainingCount: remaining.length,
      selectionStatus: remaining.length && !citations.length ? 'budget_too_small' : remaining.length ? 'page_complete' : 'selection_complete',
      minimumRequiredBytes, selectionOffset,
      nextSelectionOffset: remaining.length && citations.length ? selectionOffset + citations.length : null },
    extraction: { performed: false, inputFormat: 'supplied_utf8_text', pageNumbers: 'supplied_only' },
    handoff: { savePackAs: 'evidence-pack.json', nextOperation: remaining.length ? citations.length ? 'read' : 'increase_context_budget' : null, adopted: 'not_decided' } } };
}, { input: '../schemas/core-input.schema.json', output: '../schemas/core-output.schema.json' });
