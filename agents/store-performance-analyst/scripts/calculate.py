"""Bounded stdin/stdout calculator. No file, network, subprocess or install API."""
import json
import sys
from decimal import Decimal, localcontext, ROUND_HALF_EVEN

VERSION = "0.2.0"
MAX_BYTES = 65536
COUNTS = ("impressions", "visitors", "paidOrders")
MONEY = ("grossRevenue", "refundAmount", "adSpend", "goodsCost",
         "fulfilmentCost", "platformFees")
FIELDS = COUNTS + MONEY
DEFINITIONS = ("currency", "periodDays", "visitorBasis", "orderBasis",
               "refundBasis", "adAttributionWindow")
COSTS = ("adSpend", "goodsCost", "fulfilmentCost", "platformFees")


class InvalidInput(Exception):
    pass


def require(condition):
    if not condition:
        raise InvalidInput()


def label(value):
    require(isinstance(value, str) and 0 < len(value.strip()) <= 80)
    require(all(ord(c) >= 32 for c in value))
    return value


def number(value, integer=False):
    require(type(value) in (int, Decimal))
    result = Decimal(value)
    require(result.is_finite() and 0 <= result <= Decimal("1e18"))
    require(result.as_tuple().exponent >= -6)
    if integer:
        require(result == result.to_integral_value())
    return result


def definition(value):
    require(isinstance(value, dict) and set(value) <= set(DEFINITIONS))
    result = {}
    for key in DEFINITIONS:
        item = value.get(key)
        if item is None:
            result[key] = None
        elif key == "periodDays":
            result[key] = number(item, integer=True)
            require(0 < result[key] <= 3660)
        else:
            result[key] = label(item)
    return result


def validate(data):
    require(isinstance(data, dict))
    require(set(data) <= {"schemaVersion", "rows", "definitions", "comparison"})
    require(type(data.get("schemaVersion")) is int and data["schemaVersion"] == 1)
    rows = data.get("rows")
    require(isinstance(rows, list) and 1 <= len(rows) <= 200)
    parsed, seen = [], set()
    for row in rows:
        require(isinstance(row, dict) and set(row) <= set(FIELDS) | {"period", "sku", "channel"})
        keys = tuple(label(row.get(key)) for key in ("period", "sku", "channel"))
        require(keys not in seen)
        seen.add(keys)
        parsed.append(dict(zip(("period", "sku", "channel"), keys)) |
                      {key: None if row.get(key) is None else number(row[key], key in COUNTS)
                       for key in FIELDS})
    periods = {row["period"] for row in parsed}
    raw_defs = data.get("definitions", {})
    require(isinstance(raw_defs, dict))
    if "byPeriod" in raw_defs:
        require(set(raw_defs) == {"byPeriod"} and isinstance(raw_defs["byPeriod"], dict))
        require(set(raw_defs["byPeriod"]) <= periods)
        defs = {period: definition(raw_defs["byPeriod"].get(period, {})) for period in periods}
    else:
        defs = {period: definition(raw_defs) for period in periods}
    comparison = data.get("comparison")
    if comparison is not None:
        require(isinstance(comparison, dict) and set(comparison) == {"baselinePeriod", "currentPeriod"})
        for value in comparison.values():
            require(label(value) in periods)
        require(comparison["baselinePeriod"] != comparison["currentPeriod"])
    return parsed, defs, comparison


def subtract(value, *costs):
    if value is None or any(cost is None for cost in costs):
        return None
    return value - sum(costs, Decimal(0))


def ratio(numerator, denominator, multiplier=1):
    if numerator is None or denominator in (None, 0):
        return None
    return numerator / denominator * multiplier


def row_metrics(row):
    net = subtract(row["grossRevenue"], row["refundAmount"])
    return {
        "visitorToImpressionPercent": ratio(row["visitors"], row["impressions"], 100),
        "paidOrdersPerVisitorPercent": ratio(row["paidOrders"], row["visitors"], 100),
        "grossRevenuePerPaidOrder": ratio(row["grossRevenue"], row["paidOrders"]),
        "netRevenue": net,
        "refundAmountToGrossRevenuePercent": ratio(row["refundAmount"], row["grossRevenue"], 100),
        "adSpendPerAllPaidOrders": ratio(row["adSpend"], row["paidOrders"]),
        "contributionAfterListedCosts": subtract(net, *(row[key] for key in COSTS)),
    }


def decompose(before, after):
    required = ("visitors", "paidOrders", "grossRevenue")
    if any(row[key] is None for row in (before, after) for key in required):
        return None
    v0, v1 = before["visitors"], after["visitors"]
    o0, o1 = before["paidOrders"], after["paidOrders"]
    r0, r1 = before["grossRevenue"], after["grossRevenue"]
    if 0 in (v0, v1, o0, o1):
        return None
    traffic = (v1 - v0) * r0 / v0
    conversion = (o1 - v1 * o0 / v0) * r0 / o0
    basket = r1 - o1 * r0 / o0
    return {"trafficEffect": traffic, "conversionEffect": conversion,
            "basketEffect": basket, "grossRevenueDelta": r1 - r0,
            "refundEffect": subtract(before["refundAmount"], after["refundAmount"]),
            "netRevenueDelta": subtract(subtract(r1, after["refundAmount"]),
                                         subtract(r0, before["refundAmount"]))}


def calculate(rows, defs, comparison):
    quality, table, comparisons = [], [], []
    for period in sorted(defs):
        missing = [key for key, value in defs[period].items() if value is None]
        if missing:
            quality.append({"code": "missing_definitions", "period": period, "fields": missing})
    for index, row in enumerate(rows):
        missing = [key for key in FIELDS if row[key] is None]
        if missing:
            quality.append({"code": "missing_fields", "row": index, "fields": missing})
        zero = [key for key in COUNTS + ("grossRevenue",) if row[key] == 0]
        if zero:
            quality.append({"code": "zero_denominator", "row": index, "fields": zero})
        if row["refundAmount"] is not None and row["grossRevenue"] is not None and row["refundAmount"] > row["grossRevenue"]:
            quality.append({"code": "refund_exceeds_gross", "row": index})
        table.append({"period": row["period"], "sku": row["sku"], "channel": row["channel"],
                      "definitions": defs[row["period"]], "inputs": {key: row[key] for key in FIELDS},
                      "metrics": row_metrics(row)})
    if comparison:
        p0, p1 = comparison["baselinePeriod"], comparison["currentPeriod"]
        before = {(r["sku"], r["channel"]): r for r in rows if r["period"] == p0}
        after = {(r["sku"], r["channel"]): r for r in rows if r["period"] == p1}
        conflict = [key for key in DEFINITIONS if defs[p0][key] != defs[p1][key]]
        unknown = [key for key in DEFINITIONS if defs[p0][key] is None or defs[p1][key] is None]
        for sku, channel in sorted(before.keys() | after.keys()):
            record = {"sku": sku, "channel": channel, "baselinePeriod": p0, "currentPeriod": p1}
            reasons = (["definition_conflict"] if conflict else []) + (["missing_definitions"] if unknown else [])
            if (sku, channel) not in before or (sku, channel) not in after:
                reasons.append("unmatched_sku_channel")
            if reasons:
                record.update(status="not_comparable", reasons=reasons, conflictingFields=conflict, unknownFields=unknown)
                quality.append({"code": "not_comparable", **record})
            else:
                b, a = before[(sku, channel)], after[(sku, channel)]
                bm, am = row_metrics(b), row_metrics(a)
                record.update(status="comparable", deltas={key: subtract(am[key], bm[key]) for key in am},
                              revenueDecomposition=decompose(b, a))
                if record["revenueDecomposition"] is None:
                    quality.append({"code": "decomposition_unavailable", "sku": sku, "channel": channel})
            comparisons.append(record)
    return {"schemaVersion": 1, "tool": "store-performance-calculator", "version": VERSION,
            "status": "partial" if quality else "completed", "calculationTable": table,
            "comparisons": comparisons, "quality": quality,
            "limitations": ["No aggregation: SKU/channel visitors may overlap; no store unique-visitor total.",
                            "Ratios and ordered traffic/conversion/basket decomposition are arithmetic, not causal attribution.",
                            "Ad spend/all paid orders is not attributed CAC or ROAS. Visitor/impression ratio is not CTR.",
                            "Contribution subtracts only ad/goods/fulfilment/platform costs; excludes overhead, salaries and taxes.",
                            "Null means unknown or undefined; percentage deltas are percentage points. Decimal strings rounded to 6 places, half-even.",
                            "Matching supplied definitions cannot prove source accuracy or disjoint order/revenue allocation."],
            "networkUsed": False, "filesModified": False}


def render(value):
    if isinstance(value, Decimal):
        rounded = value.quantize(Decimal("0.000001"), rounding=ROUND_HALF_EVEN)
        return "0" if rounded == 0 else format(rounded, "f").rstrip("0").rstrip(".")
    raise TypeError()


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result)
        result[key] = value
    return result


def main():
    try:
        require(sys.argv[1:] == ["--input-json", "-"])
        raw = sys.stdin.buffer.read(MAX_BYTES + 1)
        require(len(raw) <= MAX_BYTES)
        data = json.loads(raw.decode("utf-8"), parse_float=Decimal,
                          parse_constant=lambda _: (_ for _ in ()).throw(InvalidInput()),
                          object_pairs_hook=unique_object)
        with localcontext() as context:
            context.prec = 80
            result = calculate(*validate(data))
            output = json.dumps(result, default=render, ensure_ascii=True, separators=(",", ":"))
        code = 0
    except Exception:
        # Never include raw input, exception messages, paths or stack traces.
        output = json.dumps({"schemaVersion": 1, "tool": "store-performance-calculator", "version": VERSION,
                             "status": "invalid_input", "calculationTable": [], "comparisons": [],
                             "quality": [{"code": "invalid_input", "message": "Input must match the bounded documented JSON schema."}],
                             "limitations": ["No calculations completed."], "networkUsed": False, "filesModified": False})
        code = 2
    sys.stdout.write(output + "\n")
    return code


if __name__ == "__main__":
    sys.exit(main())
