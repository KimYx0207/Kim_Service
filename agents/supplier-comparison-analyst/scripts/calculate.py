#!/usr/bin/env python3
"""Bounded stdin/stdout supplier arithmetic; no files, network, or subprocesses."""
import json
import re
import sys
from decimal import Decimal, InvalidOperation, ROUND_CEILING, localcontext

VERSION = "0.1.0"
MAX_BYTES = 262144
ROOT_KEYS = {"schemaVersion", "quantity", "currency", "specification", "quotes", "weights",
             "qualityScale", "maxLeadDays", "minimumQualityScore", "sensitivityDelta"}
QUOTE_KEYS = {"supplierId", "specification", "currency", "packSize", "packPrice",
              "minimumPacks", "freight", "otherFees", "leadDays", "qualityEvidence",
              "qualityScore", "qualityDefinition"}


class InputError(Exception):
    pass


def check(condition, code):
    if not condition:
        raise InputError(code)


def number(value, integer=False, positive=False):
    check(type(value) in (str, int, Decimal), "number_type")
    raw = str(value)
    check(len(raw) <= 48 and re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", raw) is not None,
          "number_format")
    try:
        result = Decimal(raw)
    except InvalidOperation:
        raise InputError("number_format") from None
    check(result.is_finite() and result >= 0 and result <= Decimal("1000000000000000"),
          "number_range")
    check(result.as_tuple().exponent >= -6, "number_precision")
    if positive:
        check(result > 0, "number_positive")
    if integer:
        check(result == result.to_integral_value() and result <= 1000000000, "integer_required")
    return result


def string(value, limit=256):
    check(isinstance(value, str) and 0 < len(value.strip()) <= limit, "string_type_or_length")
    check(value == value.strip() and not any(ord(ch) < 32 for ch in value), "string_format")
    return value


def currency(value):
    check(re.fullmatch(r"[A-Z]{3}", string(value, 3)) is not None, "currency_format")
    return value


def fmt(value):
    if value is None:
        return None
    rendered = format(value, "f")
    return rendered.rstrip("0").rstrip(".") if "." in rendered else rendered


def bounded_decimal(value):
    return fmt(value.quantize(Decimal("0.000001")))


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        check(key not in result, "duplicate_json_key")
        result[key] = value
    return result


def base(status):
    return {"schemaVersion": 1, "tool": "supplier-comparison-calculate", "toolVersion": VERSION,
            "status": status, "normalizedQuotes": [], "ranking": None, "sensitivity": [],
            "quality": {"issues": [], "certifiedSuppliers": False}, "limitations": [],
            "networkUsed": False, "filesModified": False}


def calculate(data):
    check(isinstance(data, dict) and not (set(data) - ROOT_KEYS), "root_shape")
    check(type(data.get("schemaVersion")) is int and data["schemaVersion"] == 1, "schema_version")
    check(isinstance(data.get("quotes"), list) and 1 <= len(data["quotes"]) <= 100, "quotes_count")
    quantity = number(data["quantity"], integer=True, positive=True) if "quantity" in data else None
    spec = string(data["specification"]) if "specification" in data else None
    curr = currency(data["currency"]) if "currency" in data else None
    max_lead = number(data["maxLeadDays"], integer=True) if "maxLeadDays" in data else None
    quality_scale = data.get("qualityScale")
    if "qualityScale" in data:
        check(isinstance(quality_scale, dict) and set(quality_scale) == {"definition", "minimum", "maximum"},
              "quality_scale_shape")
        definition = string(quality_scale["definition"], 512)
        low = number(quality_scale["minimum"])
        high = number(quality_scale["maximum"])
        check(high > low, "quality_scale_range")
    else:
        definition, low, high = None, None, None
    quality_min = number(data["minimumQualityScore"]) if "minimumQualityScore" in data else None
    if quality_min is not None:
        check(quality_scale is not None and low <= quality_min <= high, "quality_threshold_scale")
    weights = data.get("weights")
    if "weights" in data:
        check(isinstance(weights, dict) and set(weights) == {"cost", "delivery", "quality"}, "weights_shape")
        weights = {key: number(value) for key, value in weights.items()}
        check(sum(weights.values()) > 0, "weights_positive_sum")
    delta = number(data["sensitivityDelta"], positive=True) if "sensitivityDelta" in data else None
    if delta is not None:
        check(weights is not None and delta < 1, "sensitivity_range")

    result = base("completed")
    result["limitations"] = ["User materials and quality claims are unverified; no supplier certification.",
                             "Totals include only declared freight and otherFees; omitted charges remain unknown."]
    issues = result["quality"]["issues"]
    for field, value in (("quantity", quantity), ("specification", spec), ("currency", curr)):
        if value is None:
            issues.append({"code": "missing_root", "field": field})
    seen = set()
    rows = []
    conflict = spec is None or curr is None or quantity is None
    for quote in data["quotes"]:
        check(isinstance(quote, dict) and not (set(quote) - QUOTE_KEYS), "quote_shape")
        sid = string(quote.get("supplierId"), 64)
        check(sid not in seen, "duplicate_supplier_id")
        seen.add(sid)
        missing = [key for key in ("specification", "currency", "packSize", "packPrice", "minimumPacks",
                                   "freight", "otherFees", "leadDays") if key not in quote]
        qspec = string(quote["specification"]) if "specification" in quote else None
        qcurr = currency(quote["currency"]) if "currency" in quote else None
        values = {}
        for field in ("packSize", "packPrice", "minimumPacks", "freight", "otherFees", "leadDays", "qualityScore"):
            values[field] = number(quote[field], integer=field in {"packSize", "minimumPacks", "leadDays"},
                                   positive=field == "packSize") if field in quote else None
        evidence = string(quote["qualityEvidence"], 2000) if "qualityEvidence" in quote else None
        qdefinition = string(quote["qualityDefinition"], 512) if "qualityDefinition" in quote else None
        score = values["qualityScore"]
        if score is not None and quality_scale is not None:
            check(low <= score <= high, "quality_score_range")
        if evidence is None and score is None:
            missing.append("qualityEvidence_or_qualityScore")
        row_conflicts = []
        if qspec is None or spec is None or qspec != spec:
            row_conflicts.append("specification")
        if qcurr is None or curr is None or qcurr != curr:
            row_conflicts.append("currency")
        if score is not None and (definition is None or qdefinition != definition):
            row_conflicts.append("qualityDefinition")
        if row_conflicts:
            conflict = True
        required_packs = purchased = delivered = subtotal = total = per_unit = None
        if quantity is not None and values["packSize"] is not None and not any(
                field in row_conflicts for field in ("specification", "currency")):
            required_packs = (quantity / values["packSize"]).to_integral_value(rounding=ROUND_CEILING)
            if values["minimumPacks"] is not None:
                purchased = max(required_packs, values["minimumPacks"])
                delivered = purchased * values["packSize"]
                if values["packPrice"] is not None:
                    subtotal = purchased * values["packPrice"]
                    if values["freight"] is not None and values["otherFees"] is not None:
                        total = subtotal + values["freight"] + values["otherFees"]
                        per_unit = total / delivered
        exclusions, unknown_constraints = [], []
        if max_lead is not None:
            if values["leadDays"] is None:
                unknown_constraints.append("maxLeadDays")
            elif values["leadDays"] > max_lead:
                exclusions.append("maxLeadDays")
        if quality_min is not None:
            if score is None or "qualityDefinition" in row_conflicts:
                unknown_constraints.append("minimumQualityScore")
            elif score < quality_min:
                exclusions.append("minimumQualityScore")
        row = {"supplierId": sid, "specification": qspec, "currency": qcurr,
               "comparable": not row_conflicts and quantity is not None, "conflicts": row_conflicts,
               "packSize": fmt(values["packSize"]), "packPrice": fmt(values["packPrice"]),
               "minimumPacks": fmt(values["minimumPacks"]),
               "quotedUnitPrice": bounded_decimal(values["packPrice"] / values["packSize"]) if values["packPrice"] is not None and values["packSize"] is not None else None,
               "requiredPacks": fmt(required_packs), "purchasePacks": fmt(purchased),
               "deliveredQuantity": fmt(delivered), "excessQuantity": fmt(delivered - quantity) if delivered is not None else None,
               "goodsSubtotal": fmt(subtotal),
               "freight": fmt(values["freight"]), "otherFees": fmt(values["otherFees"]),
               "landedTotal": fmt(total), "costPerDeliveredUnit": bounded_decimal(per_unit) if per_unit is not None else None,
               "leadDays": fmt(values["leadDays"]), "qualityEvidence": evidence,
               "qualityScore": fmt(score), "missingFields": missing,
               "constraintStatus": "excluded" if exclusions else ("unknown" if unknown_constraints else "eligible"),
               "exclusionReasons": exclusions, "unknownConstraints": unknown_constraints}
        rows.append((row, values, total))
        result["normalizedQuotes"].append(row)
        for field in missing:
            issues.append({"supplierId": sid, "code": "missing_field", "field": field})
        for field in row_conflicts:
            issues.append({"supplierId": sid, "code": "definition_conflict", "field": field})
    eligible = [(row, values, total) for row, values, total in rows if row["constraintStatus"] != "excluded"]
    if issues or any(row["constraintStatus"] == "unknown" for row, _, _ in rows):
        result["status"] = "partial"
    if weights is None:
        result["limitations"].append("No user weights: preserve multidimensional comparison; ranking is null.")
        return result
    blocked = conflict or quantity is None or not eligible or any(
        row["constraintStatus"] != "eligible" or
        (weights["cost"] > 0 and total is None) or
        (weights["delivery"] > 0 and values["leadDays"] is None) or
        (weights["quality"] > 0 and (values["qualityScore"] is None or definition is None))
        for row, values, total in eligible)
    if blocked:
        result["limitations"].append("Ranking withheld: incomplete or conflicting definitions/constraints; weights were not redistributed.")
        return result
    cost_values = [total for _, _, total in eligible]
    lead_values = [values["leadDays"] for _, values, _ in eligible]

    def inverse(value, candidates):
        if value is None:
            return None
        smallest, largest = min(candidates), max(candidates)
        return Decimal(1) if largest == smallest else (largest - value) / (largest - smallest)

    components = {}
    for row, values, total in eligible:
        components[row["supplierId"]] = {
            "cost": inverse(total, cost_values) if all(value is not None for value in cost_values) else None,
            "delivery": inverse(values["leadDays"], lead_values) if all(value is not None for value in lead_values) else None,
            "quality": (values["qualityScore"] - low) / (high - low) if values["qualityScore"] is not None and definition is not None else None}

    def rank(active_weights):
        weight_sum = sum(active_weights.values())
        scores = {sid: sum((parts[key] * weight for key, weight in active_weights.items() if weight > 0), Decimal(0)) / weight_sum
                  for sid, parts in components.items()}
        order = sorted(scores, key=lambda sid: (-scores[sid], sid))
        distinct = sorted(set(scores.values()), reverse=True)
        return [{"supplierId": sid, "rank": distinct.index(scores[sid]) + 1,
                 "score": bounded_decimal(scores[sid]),
                 "components": {key: bounded_decimal(value) if value is not None else None for key, value in components[sid].items()}}
                for sid in order]

    result["ranking"] = rank(weights)
    result["limitations"].append("Scores use candidate min/max for cost/delivery and user qualityScale; tied rank does not choose a supplier.")
    if delta is not None:
        for key, weight in weights.items():
            if weight == 0:
                continue
            for direction in (-1, 1):
                variant = dict(weights)
                variant[key] = weight * (1 + direction * delta)
                result["sensitivity"].append({"dimension": key, "relativeChange": fmt(direction * delta),
                                               "weights": {name: fmt(value) for name, value in variant.items()},
                                               "ranking": rank(variant)})
    else:
        result["limitations"].append("No sensitivityDelta supplied: sensitivity scenarios were not invented.")
    return result


def main():
    try:
        check(sys.argv[1:] == ["--input-json", "-"], "arguments")
        raw = sys.stdin.buffer.read(MAX_BYTES + 1)
        check(len(raw) <= MAX_BYTES, "input_size")
        data = json.loads(raw.decode("utf-8"), parse_float=Decimal, object_pairs_hook=unique_object,
                          parse_constant=lambda _: (_ for _ in ()).throw(InputError("nonfinite_number")))
        with localcontext() as context:
            context.prec = 48
            result = calculate(data)
        code = 0
    except (InputError, ValueError, TypeError, RecursionError, InvalidOperation) as error:
        result = base("invalid_input")
        result["quality"]["issues"] = [{"code": str(error) if isinstance(error, InputError) else "invalid_json_or_value"}]
        result["limitations"] = ["Input rejected; no raw input is echoed."]
        code = 2
    sys.stdout.write(json.dumps(result, ensure_ascii=True, separators=(",", ":")) + "\n")
    return code


if __name__ == "__main__":
    sys.exit(main())
