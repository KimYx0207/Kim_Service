// Original pure arithmetic aid. No network, model, filesystem or publishing access.
// Amounts and net revenue must use the caller's declared currency and cost scope.
export function summarizePilot({currency, charges, acceptedSeconds, costsComplete, netRevenue = null, budgetCap = null, evidenceKind}) {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new TypeError('declare one ISO-style currency code');
  if (!Array.isArray(charges)) throw new TypeError('charges must be an array');
  if (!['illustrative', 'recorded'].includes(evidenceKind)) throw new TypeError('declare illustrative or recorded evidence');
  if (typeof costsComplete !== 'boolean') throw new TypeError('declare whether the agreed cost scope is complete');
  const nonNegative = (value, label) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(label + ' must be finite and nonnegative');
  };
  nonNegative(acceptedSeconds, 'acceptedSeconds');
  // A cohort can have negative net receipts after refunds or chargebacks.
  if (netRevenue !== null && (typeof netRevenue !== 'number' || !Number.isFinite(netRevenue))) throw new TypeError('netRevenue must be finite or null');
  if (budgetCap !== null) nonNegative(budgetCap, 'budgetCap');
  const seen = new Set();
  let knownCost = 0;
  for (const charge of charges) {
    if (!charge || typeof charge.chargeId !== 'string' || !charge.chargeId.trim()) throw new TypeError('every charge needs an actual unique chargeId');
    if (seen.has(charge.chargeId)) throw new Error('duplicate chargeId: reconcile delivery retries before costing');
    seen.add(charge.chargeId);
    if (charge.currency !== currency) throw new Error('mixed currencies: convert with a recorded rate before costing');
    nonNegative(charge.amount, 'charge.amount');
    knownCost += charge.amount;
    if (!Number.isFinite(knownCost)) throw new RangeError('cost total exceeds numeric range');
  }
  // No per-charge rounding: keep caller amounts, then round only display totals.
  const display = value => {
    if (value === null) return null;
    if (!Number.isFinite(value)) throw new RangeError('derived economic value exceeds numeric range');
    // toFixed avoids overflowing an otherwise finite value merely to round it.
    return Math.abs(value) < 1e21 ? Number(value.toFixed(4)) : value;
  };
  return {
    currency,
    evidenceKind,
    knownCost: display(knownCost),
    acceptedSeconds,
    costBasis: costsComplete ? 'declared_complete_scope' : 'known_costs_only',
    costPerAcceptedMinute: acceptedSeconds > 0 ? display(knownCost / acceptedSeconds * 60) : null,
    netRevenue,
    netContribution: costsComplete && netRevenue !== null ? display(netRevenue - knownCost) : null,
    budgetRemaining: budgetCap === null ? null : display(budgetCap - knownCost),
    stopNewCharges: budgetCap === null ? null : knownCost >= budgetCap,
    evidenceLimits: 'Arithmetic only. Cost scope, accepted footage, receipts, net-revenue deductions and audience outcomes require independent evidence.'
  };
}
