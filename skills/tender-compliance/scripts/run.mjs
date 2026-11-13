import { createHelper, unique } from './runtime.mjs';
import { instant } from './time.mjs';

export const run = createHelper(import.meta.url, 'tender-compliance', input => {
  const clauses = unique(input.clauses, 'clauses');
  const responses = unique(input.responses, 'responses', 'clauseId');
  const evidence = unique(input.evidence, 'evidence');
  const asOf = instant(input.asOf), deadline = instant(input.deadline);
  const expiry = new Map(input.evidence.map(item => [item.id, item.validUntil === null ? null : instant(item.validUntil)]));
  const unknownResponseClauses = input.responses.filter(row => !clauses.has(row.clauseId)).map(row => row.clauseId);
  const rows = input.clauses.map(clause => {
    const response = responses.get(clause.id); const issues = []; const evidenceIds = response?.evidenceIds ?? [];
    if (!clause.sourceRef.trim()) issues.push('missing_clause_source');
    if (!response) issues.push('missing_response');
    else {
      if (response.clauseVersion !== clause.version) issues.push('stale_clause_version');
      if (!response.responseRef.trim()) issues.push('missing_response_reference');
      if (response.assessment !== 'claimed_compliant') issues.push(response.assessment);
      if (!evidenceIds.length) issues.push('missing_evidence');
      if (new Set(evidenceIds).size !== evidenceIds.length) issues.push('duplicate_evidence_reference');
      for (const id of evidenceIds) {
        if (!evidence.has(id)) { issues.push(`unknown_evidence:${id}`); continue; }
        if (!evidence.get(id).sourceRef.trim()) issues.push(`missing_evidence_source:${id}`);
        const end = expiry.get(id);
        if (end !== null && end <= asOf) issues.push(`expired_evidence:${id}`);
        else if (end !== null && end <= deadline) issues.push(`expires_before_deadline:${id}`);
      }
    }
    return { id: clause.id, mandatory: clause.mandatory,
      status: response?.assessment === 'noncompliant' ? 'noncompliant' : issues.length ? 'needs_review' : 'documented_pending_content_review', issues, evidenceIds };
  });
  const blockingClauseIds = rows.filter(row => row.mandatory && row.status !== 'documented_pending_content_review').map(row => row.id);
  const deadlinePassed = asOf >= deadline;
  const hasGaps = deadlinePassed || unknownResponseClauses.length > 0 || rows.some(row => row.issues.length);
  return { status: hasGaps ? 'needs_review' : 'completed', result: { tenderId: input.tenderId, deadlinePassed, rows, blockingClauseIds, unknownResponseClauses,
    readiness: hasGaps ? 'evidence_gaps' : 'ready_for_content_review', legalCompliance: 'not_determined', evidenceAuthentication: 'supplied_references_not_verified' } };
});
