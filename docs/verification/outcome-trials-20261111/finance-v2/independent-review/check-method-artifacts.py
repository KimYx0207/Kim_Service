import json
import hashlib
from pathlib import Path

WORK = Path('/workspace/scratch/3a65c2d8ade9')
RUN = WORK / 'outcome_trials_20261111/finance-v2-method'
OUT = RUN / 'output'
AUDIT = WORK / 'audit_20261111/finance-v2-independent-review'

def read(p):
    return json.loads(p.read_text())

independent = read(AUDIT / 'method-recalculation.json')
main = read(OUT / 'forecast.json')
sensitivity = read(OUT / 'sensitivity.json')
month_aliases = {
    'pretaxProfit': 'pretaxIncome',
    'receivables': 'endingReceivables',
    'payables': 'endingPayables',
}
summary_aliases = {
    'totalRevenue': 'revenue',
    'totalNetIncome': 'netIncome',
    'minimumCash': 'minimumEndingCash',
    'firstGapMonth': 'firstNegativeCashMonth',
    'closingReceivables': 'endingReceivables',
    'closingPayables': 'endingPayables',
}
mismatches = []
counts = {}

def compare(a, e, location):
    if a != e:
        mismatches.append({'location': location, 'expected': e, 'actual': a})

def compare_forecast(actual, expected, label):
    count = 0
    compare([s['id'] for s in actual['scenarios']], [s['id'] for s in expected], f'{label}/scenarioIds')
    for a, e in zip(actual['scenarios'], expected):
        compare(len(a['months']), 12, f'{label}/{a["id"]}/rowCount')
        for am, em in zip(a['months'], e['months']):
            for key, value in am.items():
                expected_key = month_aliases.get(key, key)
                if key == 'netCashFlow':
                    ev = (round(em['receipts'] * 100) - round(em['payments'] * 100) + round(em['financing'] * 100)) / 100
                else:
                    ev = em.get(expected_key)
                compare(value, ev, f'{label}/{a["id"]}/{am["month"]}/{key}')
                count += 1
        for key, value in a['summary'].items():
            compare(value, e['summary'].get(summary_aliases.get(key, key)), f'{label}/{a["id"]}/summary/{key}')
            count += 1
    counts[label] = count

compare_forecast(main, independent['expectedMainForecast'], 'main')
expected_sensitivity = [s for s in independent['proposalHypothetical']['scenarios'] if s['id'] == 'base']
compare_forecast(sensitivity, expected_sensitivity, 'sensitivity')

comp = read(OUT / 'sensitivity-comparison.json')
original_base = independent['expectedMainForecast'][0]
proposed_base = expected_sensitivity[0]
for target, expected in [('baselineSummary', original_base['summary']), ('proposedSummary', proposed_base['summary'])]:
    for key, value in comp[target].items():
        compare(value, expected[summary_aliases.get(key, key)], f'sensitivity-comparison/{target}/{key}')
independent_impact = independent['proposalHypothetical']['comparison'][0]
for key, expected_key in [('totalNetIncomeChange', 'netIncomeChange'), ('endingCashChange', 'endingCashChange'), ('fundingRequiredChange', 'fundingRequiredChange')]:
    compare(comp['impact'][key], independent_impact[expected_key], f'sensitivity-comparison/impact/{key}')
counts['sensitivityComparisonValues'] = len(comp['baselineSummary']) + len(comp['proposedSummary']) + len(comp['impact'])

budget = read(RUN / 'inputs/confirmed-budget.json')
s_input = read(OUT / 'sensitivity-input.json')
input_changes = {key: {'confirmed': budget['drivers'][key], 'sensitivity': s_input['drivers'].get(key)} for key in budget['drivers'] if budget['drivers'][key] != s_input['drivers'].get(key)}
compare(input_changes, {'variableCostPerUnit': {'confirmed': 45, 'sensitivity': 50}}, 'sensitivity-input/economicDriverChanges')
for key in ('currency', 'startMonth', 'openingCash', 'openingReceivables', 'openingPayables'):
    compare(s_input[key], budget[key], f'sensitivity-input/{key}')
compare(s_input['scenarios'], [budget['scenarios'][0]], 'sensitivity-input/baseScenario')

binding = read(RUN / 'grade.json')['reviewBinding']
hash_mismatches = []
for name, expected_hash in binding['outputFiles'].items():
    observed_hash = hashlib.sha256((OUT / name).read_bytes()).hexdigest()
    if observed_hash != expected_hash:
        hash_mismatches.append({'file': name, 'expected': expected_hash, 'observed': observed_hash})

submission = read(OUT / 'submission.json')
path_observations = []
for key, value in submission['artifacts'].items():
    path_observations.append({'artifact': key, 'submittedPath': value, 'existsRelativeToOutput': (OUT / value).is_file(), 'existsRelativeToTaskDirectory': (RUN / value).is_file()})

result = {
    'reviewer': '/root/finance_v2_review',
    'basis': 'Expected rows were independently computed from supplied inputs. Aliases normalize output field names only; no producer script or repository scoring code loaded.',
    'comparedValues': counts,
    'mismatches': mismatches,
    'sensitivityInputEconomicChanges': input_changes,
    'bindingCopiedFrom': 'grade.json#/reviewBinding',
    'binding': binding,
    'outputHashMismatches': hash_mismatches,
    'submissionPathObservations': path_observations,
    'deliveryWarning': 'Original submission uses output/ prefixes and declares task-directory. The parent evaluator reports that the required artifact contract resolves relative to output/. All three submitted paths are absent under that root. Financial-content pass is not overall task_pass.',
}
(AUDIT / 'method-artifact-comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('binding',)}, ensure_ascii=False, indent=2))
