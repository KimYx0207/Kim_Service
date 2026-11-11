from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
import json
import hashlib
import copy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
D = lambda x: Decimal(str(x))
M = lambda x: D(x).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
budget_bytes = (ROOT / 'inputs/confirmed-budget.json').read_bytes()
proposal_bytes = (ROOT / 'inputs/supplier-proposal.md').read_bytes()
budget = json.loads(budget_bytes)
forecast = json.loads((HERE / 'forecast.json').read_text())
facts = json.loads((HERE / 'facts.json').read_text())
submission = json.loads((HERE / 'submission.json').read_text())
checks = []
rounding_notes = []

def expect(condition, label):
    assert condition, label
    checks.append(label)

def eq(a, b, label):
    expect(D(a) == D(b), label)

def independent(input_data, definition):
    d = input_data['drivers']
    cash = D(input_data['openingCash'])
    ar = D(input_data['openingReceivables'])
    ap = D(input_data['openingPayables'])
    prev_revenue = D(0)
    prev_cost = D(0)
    rows = []
    for i in range(12):
        units = int((D(d['initialUnits']) * D(definition['unitsMultiplier']) *
                     (1 + D(d['monthlyGrowth']) + D(definition['growthDelta'])) ** i).quantize(D(1), rounding=ROUND_HALF_UP))
        revenue = M(D(units) * D(d['unitPrice']) * D(definition['priceMultiplier']))
        variable = M(D(units) * D(d['variableCostPerUnit']) * D(definition['costMultiplier']))
        fixed = M(d['fixedCostPerMonth'])
        depreciation = M(d['depreciationPerMonth'])
        pretax = M(revenue - variable - fixed - depreciation)
        tax = M(max(0, pretax) * D(d['taxRate']))
        net_income = M(pretax - tax)
        receipts = M(revenue * D(d['collectionShare']) + prev_revenue * (1-D(d['collectionShare'])) + (D(input_data['openingReceivables']) if i == 0 else 0))
        supplier = M(variable * D(d['paymentShare']) + prev_cost * (1-D(d['paymentShare'])) + (D(input_data['openingPayables']) if i == 0 else 0))
        capex = M(d['capexByMonth'][i])
        financing = M(d['financingByMonth'][i])
        payments = M(supplier + fixed + tax + capex)
        ncf = M(receipts - payments + financing)
        opening = cash
        cash = M(cash + ncf)
        ar = M(ar + revenue - receipts)
        ap = M(ap + variable - supplier)
        rows.append(dict(month=f'2027-{i+1:02d}', units=units, revenue=revenue, variableCost=variable, fixedCost=fixed,
                         depreciation=depreciation, pretaxProfit=pretax, tax=tax, netIncome=net_income, receipts=receipts,
                         supplierPayments=supplier, capex=capex, financing=financing, payments=payments, netCashFlow=ncf,
                         openingCash=opening, endingCash=cash, receivables=ar, payables=ap))
        prev_revenue, prev_cost = revenue, variable
    return rows

expect(forecast['schemaVersion'] == 1 and forecast['currency'] == 'CNY', 'schema_version_and_currency')
expect([s['id'] for s in forecast['scenarios']] == ['base', 'upside', 'downside'], 'exactly_three_supplied_scenarios')
expect(forecast['inputBasis']['appliedInput'] == budget, 'main_forecast_uses_unchanged_confirmed_budget')
expect(forecast['inputBasis']['inputHashes']['confirmedBudgetSha256'] == hashlib.sha256(budget_bytes).hexdigest(), 'budget_hash_matches_source')
expect(forecast['inputBasis']['inputHashes']['supplierProposalSha256'] == hashlib.sha256(proposal_bytes).hexdigest(), 'proposal_hash_matches_source')

for s, definition in zip(forecast['scenarios'], budget['scenarios']):
    rows = s['months']
    expect(len(rows) == 12, f'{s["id"]}_12_months')
    independent_rows = independent(budget, definition)
    prev_cash = D(budget['openingCash'])
    prev_ar = D(budget['openingReceivables'])
    prev_ap = D(budget['openingPayables'])
    for row, expected in zip(rows, independent_rows):
        prefix = f'{s["id"]}_{row["month"]}'
        expect(row['month'] == expected['month'], prefix+'_month_sequence')
        for key in ['month','revenue','netIncome','receipts','payments','financing','endingCash']:
            expect(key in row, prefix+'_required_'+key)
        for key, value in expected.items():
            if key == 'month':
                continue
            diff = D(row[key]) - D(value)
            if diff:
                rounding_notes.append({'scenario':s['id'],'month':row['month'],'field':key,'deliveredValue':row[key],'decimalHalfUpValue':float(value),'difference':float(diff)})
            limit = D('0.05') if key in {'receipts','netCashFlow','openingCash','endingCash','receivables'} else D('0')
            expect(abs(diff) <= limit, prefix+'_independent_'+key)
        eq(row['openingCash'], prev_cash, prefix+'_opening_cash_continuity')
        eq(D(row['endingCash']), prev_cash + D(row['receipts']) - D(row['payments']) + D(row['financing']), prefix+'_cash_rollforward_exact')
        eq(row['receivables'], prev_ar + D(row['revenue']) - D(row['receipts']), prefix+'_ar_rollforward_exact')
        eq(row['payables'], prev_ap + D(row['variableCost']) - D(row['supplierPayments']), prefix+'_ap_rollforward_exact')
        eq(row['payments'], D(row['supplierPayments'])+D(row['fixedCost'])+D(row['tax'])+D(row['capex']), prefix+'_cash_payment_components_exact')
        eq(row['netIncome'], D(row['revenue'])-D(row['variableCost'])-D(row['fixedCost'])-D(row['depreciation'])-D(row['tax']), prefix+'_profit_components_exact')
        eq(row['financing'], 0, prefix+'_no_automatic_financing')
        prev_cash, prev_ar, prev_ap = map(D, [row['endingCash'], row['receivables'], row['payables']])
    summary = s['summary']
    mappings = {'totalRevenue':'revenue','totalNetIncome':'netIncome','totalUnits':'units','totalVariableCost':'variableCost','totalFixedCost':'fixedCost','totalDepreciation':'depreciation','totalTax':'tax','totalReceipts':'receipts','totalSupplierPayments':'supplierPayments','totalPayments':'payments','totalCapex':'capex','totalFinancing':'financing','totalNetCashFlow':'netCashFlow'}
    for total, field in mappings.items():
        eq(summary[total], sum(D(r[field]) for r in rows), s['id']+'_summary_'+total)
    low = min(rows, key=lambda r:r['endingCash'])
    gap = next((r['month'] for r in rows if r['endingCash'] < 0), None)
    eq(summary['minimumCash'], low['endingCash'], s['id']+'_minimum_cash')
    expect(summary['minimumCashMonth'] == low['month'], s['id']+'_minimum_cash_month')
    expect(summary['firstGapMonth'] == gap, s['id']+'_first_gap')
    eq(summary['fundingRequired'], max(0, -D(low['endingCash'])), s['id']+'_funding_requirement')
    eq(summary['endingCash'], rows[-1]['endingCash'], s['id']+'_ending_cash')
    eq(summary['closingReceivables'], rows[-1]['receivables'], s['id']+'_ending_ar')
    eq(summary['closingPayables'], rows[-1]['payables'], s['id']+'_ending_ap')
    bridge = D(budget['openingCash']) + D(summary['totalNetIncome']) + D(summary['totalDepreciation']) - D(summary['totalCapex']) - (D(summary['closingReceivables'])-D(budget['openingReceivables'])) + (D(summary['closingPayables'])-D(budget['openingPayables'])) + D(summary['totalFinancing'])
    eq(summary['endingCash'], bridge, s['id']+'_annual_profit_to_cash_bridge_exact')

conflict = facts['conflicts'][0]
expect(all(k in conflict for k in ['issue','sources','status','appliedValue','alternateValue','unit']), 'conflict_required_fields')
expect(conflict['appliedValue'] == 45 and conflict['alternateValue'] == 50 and conflict['unit'] == 'CNY/单', 'confirmed_45_and_unaccepted_50_kept_separate')
expect('尚未接受' in proposal_bytes.decode(), 'supplier_unaccepted_status_checked_against_source')
expect(forecast['supplierCostSensitivity']['status'] == 'hypothetical_not_approved', 'alternate_not_misrepresented_as_approved')
alt_input = copy.deepcopy(budget)
alt_input['drivers']['variableCostPerUnit'] = 50
for case, definition in zip(forecast['supplierCostSensitivity']['cases'], budget['scenarios']):
    alt_rows = independent(alt_input, definition)
    eq(case['summary']['totalNetIncome'], sum(r['netIncome'] for r in alt_rows), case['scenarioId']+'_alternate_profit_independent')
    expect(abs(D(case['summary']['endingCash']) - alt_rows[-1]['endingCash']) <= D('0.05'), case['scenarioId']+'_alternate_cash_independent')
    expect(abs(D(case['summary']['fundingRequired']) - max(D(0), -min(r['endingCash'] for r in alt_rows))) <= D('0.05'), case['scenarioId']+'_alternate_funding_independent')
    main = next(s for s in forecast['scenarios'] if s['id'] == case['scenarioId'])
    eq(case['netIncomeChange'], D(case['summary']['totalNetIncome']) - D(main['summary']['totalNetIncome']), case['scenarioId']+'_alternate_profit_delta')
    eq(case['endingCashChange'], D(case['summary']['endingCash']) - D(main['summary']['endingCash']), case['scenarioId']+'_alternate_cash_delta')

expect(submission['artifacts'] == {'forecast':'forecast.json','decision':'decision.md','facts':'facts.json'}, 'submission_paths')
for artifact in submission['artifacts'].values():
    expect((HERE/artifact).is_file() and (HERE/artifact).stat().st_size > 0, 'artifact_exists_'+artifact)
max_delta = max((abs(D(n['difference'])) for n in rounding_notes), default=D(0))
report = {
    'schemaVersion':1,
    'status':'passed_with_rounding_notes' if rounding_notes else 'passed',
    'executed':'python3 output/verify_forecast.py',
    'checkCount':len(checks),
    'monthlyRowsVerified':36,
    'cashAndReceivablesPayablesBridges':'exact_to_cent_for_all_36_rows_and_all_3_annual_bridges',
    'independentMethod':'Python Decimal reconstruction from confirmed budget, separate from JavaScript package calculation.',
    'independentRoundingPolicy':'Decimal ROUND_HALF_UP to cents; package uses JavaScript binary floating-point rounding. Numeric differences are preserved below, not silently ignored.',
    'maximumAbsoluteDecimalDifference':float(max_delta),
    'roundingNotes':rounding_notes,
    'checks':checks,
    'notPerformed':['external_research','real_business_acceptance','complete_three_statement_balance','professional_effect_evaluation','funding_transaction','supplier_contract_acceptance'],
    'sourceIntegrity':'Input hashes match the bytes read when the forecast was generated; this workflow did not write input, method or run files.'
}
(HERE/'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'status':report['status'],'checkCount':len(checks),'monthlyRowsVerified':36,'roundingNotes':len(rounding_notes),'maximumAbsoluteDecimalDifference':float(max_delta)},ensure_ascii=False))
