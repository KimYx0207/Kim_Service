import { createHelper, unique, canonical, hash, requireValue as assert } from './runtime.mjs';

function inspectSchema(schema, isInput) {
  if (schema === undefined) return { assessment: 'not_declared', refs: 0, complex: false };
  const stack = [schema]; let refs = 0, complex = false;
  while (stack.length) {
    const item = stack.pop(); if (!item || typeof item !== 'object') continue;
    if (Object.hasOwn(item, '$ref') || Object.hasOwn(item, '$dynamicRef')) refs++;
    if (['$ref','$dynamicRef','allOf','anyOf','oneOf','not','if','then','else','dependentSchemas'].some(key => Object.hasOwn(item,key))) complex = true;
    // Schema maps contain property names, not schema keywords. Annotation values
    // (examples/default/const/enum) are instance data and must never be scanned.
    for (const key of ['properties','patternProperties','$defs','definitions','dependentSchemas']) {
      const map = item[key];
      if (map && typeof map === 'object' && !Array.isArray(map)) stack.push(...Object.values(map));
    }
    for (const key of ['additionalProperties','unevaluatedProperties','propertyNames','contains',
      'additionalItems','unevaluatedItems','not','if','then','else','contentSchema']) {
      if (item[key] && typeof item[key] === 'object') stack.push(item[key]);
    }
    for (const key of ['allOf','anyOf','oneOf','prefixItems']) {
      if (Array.isArray(item[key])) stack.push(...item[key]);
    }
    if (Array.isArray(item.items)) stack.push(...item.items);
    else if (item.items && typeof item.items === 'object') stack.push(item.items);
    // Older drafts allow schema dependencies alongside arrays of property names.
    if (item.dependencies && typeof item.dependencies === 'object') {
      for (const value of Object.values(item.dependencies)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) stack.push(value);
      }
    }
  }
  if (!isInput) return { assessment: complex ? 'requires_schema_review' : 'captured_not_validated', refs, complex };
  return { assessment: !complex && schema && typeof schema === 'object' && !Array.isArray(schema) && schema.type === 'object'
    ? 'object_root_declared_not_validated' : 'requires_schema_review', refs, complex };
}
export const run = createHelper(import.meta.url, 'mcp-contract-auditor', input => {
  const previous = unique(input.previous.tools, 'previous tools', 'name');
  const current = unique(input.current.tools, 'current tools', 'name');
  assert(new Set(input.approvedToolNames).size === input.approvedToolNames.length, 'Duplicate approved tool name');
  const approved = new Set(input.approvedToolNames);
  const comparisonComplete = input.previous.complete && input.current.complete;
  const onlyNew = [...current.keys()].filter(name => !previous.has(name)).sort();
  const onlyOld = [...previous.keys()].filter(name => !current.has(name)).sort();
  const changed = [...current.keys()].filter(name => previous.has(name)).sort().flatMap(name => {
    const old = previous.get(name), next = current.get(name);
    const fields = [...new Set([...Object.keys(old),...Object.keys(next)])].filter(key => canonical(old[key]) !== canonical(next[key])).sort();
    return fields.length ? [{ name, fields, previousHash: hash(old), currentHash: hash(next) }] : [];
  });
  const unapproved = [...current.keys()].filter(name => !approved.has(name)).sort();
  const schemaReviews = [...current.values()].sort((a,b)=>a.name.localeCompare(b.name,'en')).map(tool => {
    const inputReview = inspectSchema(tool.inputSchema, true), outputReview = inspectSchema(tool.outputSchema, false);
    const reviewReasons = [];
    if (!/^[A-Za-z0-9_.-]{1,128}$/u.test(tool.name)) reviewReasons.push('tool_name_outside_recommended_charset');
    if (inputReview.assessment === 'requires_schema_review') reviewReasons.push('input_schema_needs_specialist_validation');
    if (outputReview.complex) reviewReasons.push('output_schema_needs_specialist_validation');
    const annotationHints = {};
    for (const key of ['readOnlyHint','destructiveHint','idempotentHint','openWorldHint']) {
      annotationHints[key] = typeof tool.annotations?.[key] === 'boolean' ? tool.annotations[key] : 'unknown';
    }
    if (Object.values(annotationHints).includes('unknown')) reviewReasons.push('annotation_hints_incomplete_or_nonboolean');
    return { name: tool.name, inputAssessment: inputReview.assessment, outputAssessment: outputReview.assessment,
      referenceCount: inputReview.refs + outputReview.refs, annotationHints, reviewReasons };
  });
  const serverIdentityChanged = input.previous.serverId !== input.current.serverId;
  const protocolVersionChanged = input.previous.protocolVersion !== input.current.protocolVersion;
  const needsReview = !comparisonComplete || serverIdentityChanged || protocolVersionChanged || onlyNew.length || onlyOld.length || changed.length || unapproved.length || schemaReviews.some(row=>row.reviewReasons.length);
  return { status: needsReview ? 'needs_review' : 'completed', result: {
    serverIdentityChanged, protocolVersionChanged, comparisonComplete,
    added: comparisonComplete ? onlyNew : [], removed: comparisonComplete ? onlyOld : [],
    possibleAdded: comparisonComplete ? [] : onlyNew, possibleRemoved: comparisonComplete ? [] : onlyOld,
    changed, unapproved, schemaReviews, trust:'not_established_by_annotations',
    schemaValidation:'structural_inventory_only_not_full_json_schema_validation', liveConnectionObserved:false
  } };
});
