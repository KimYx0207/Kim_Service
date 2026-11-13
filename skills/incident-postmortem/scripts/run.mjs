import { createHelper, unique, requireValue as assert } from './runtime.mjs';

export function instant(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/u.exec(value);
  assert(m, 'Timestamp needs ISO date, time and timezone');
  const [, y, mo, d, h, mi, s, tz] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  assert(month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && Number(h) < 24 && Number(mi) < 60 && Number(s) < 60, 'Invalid calendar timestamp');
  if (tz !== 'Z') assert(Number(tz.slice(1,3)) <= 14 && Number(tz.slice(4)) < 60 && (Number(tz.slice(1,3)) !== 14 || Number(tz.slice(4)) === 0), 'Invalid timezone offset');
  const time = Date.parse(value); assert(Number.isFinite(time), 'Invalid timestamp'); return time;
}
export const run = createHelper(import.meta.url, 'incident-postmortem', input => {
  unique(input.actions, 'actions');
  assert(input.incident.evidenceRefs.every(ref => ref.trim()), 'Incident evidence references must not be blank');
  const { incident } = input;
  const times = ['startedAt','detectedAt','mitigatedAt','recoveredAt'].map(k => instant(incident[k]));
  const asOf = instant(input.asOf);
  assert(times.every((time, i) => i === 0 || time >= times[i-1]), 'Incident timeline is not chronological');
  assert(times[3] <= asOf, 'Recovery is after observation time');
  const actions = input.actions.map(action => {
    const issues = [];
    if (!action.owner.trim()) issues.push('missing_owner');
    if (!action.verification.trim()) issues.push('missing_verification');
    if (action.dueAt === null) issues.push('missing_due_date');
    const due = action.dueAt === null ? null : instant(action.dueAt);
    const overdue = due !== null && due < asOf && action.status !== 'completed';
    if (overdue) issues.push('overdue');
    const evidenceSupportedCompletion = action.status === 'completed' && action.completionEvidence.some(ref => ref.trim());
    if (action.completionEvidence.some(ref => !ref.trim())) issues.push('blank_completion_reference');
    if (action.status === 'completed' && !evidenceSupportedCompletion) issues.push('completion_without_evidence');
    return { id: action.id, issues, overdue, evidenceSupportedCompletion };
  });
  const types = new Set(input.actions.map(action => action.type));
  const missingActionTypes = ['prevent','detect','mitigate'].filter(type => !types.has(type));
  return { status: actions.some(a => a.issues.length) || missingActionTypes.length ? 'needs_review' : 'completed', result: {
    incidentId: incident.id, durationsMinutes: { detection: (times[1]-times[0])/60000, detectionToMitigation: (times[2]-times[1])/60000, mitigationToRecovery: (times[3]-times[2])/60000, customerImpact: (times[3]-times[0])/60000 },
    actions, missingActionTypes, metricScope: 'single_incident_not_mean_mttr', causeAssessment: 'requires_source_based_review'
  } };
});
