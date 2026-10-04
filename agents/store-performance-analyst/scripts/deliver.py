#!/usr/bin/env python3
"""Component-owned calculation delivery. Bounded stdin/stdout; no side effects."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
from decimal import Decimal, localcontext

# Import only the adjacent reviewed calculator, without creating __pycache__.
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("component_calculator", Path(__file__).with_name("calculate.py"))
calculator = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(calculator)
MAX_ENVELOPE_BYTES = 1600000
TOOL_VERSION = calculator.VERSION


class DeliveryError(Exception):
    pass


def require(condition, code="calculation_receipt_invalid"):
    if not condition:
        raise DeliveryError(code)


def parse_json(raw):
    # Reuse the calculator's strict parser, including nested duplicate keys.
    return json.loads(raw, parse_float=Decimal, object_pairs_hook=calculator.unique_object,
                      parse_constant=lambda _: (_ for _ in ()).throw(DeliveryError("nonfinite_number")))


def missing_materials(materials):
    return [key for key in REQUIRED_MATERIALS if key not in materials or materials[key] is None
            or (isinstance(materials[key], str) and not materials[key].strip())
            or (isinstance(materials[key], list) and not materials[key])]


def result(status, task="", materials=None, **fields):
    output = {"schemaVersion": 1, "status": status, "tool": TOOL, "toolVersion": TOOL_VERSION,
              "calculationPerformed": False, "brief": brief(task, materials or {}),
              "missing": [], "questions": [], "issues": [], "receipt": None, "receiptJson": None, "receiptSha256": None, "delivery": None,
              "handoff": {"status": "blocked", "code": None, "questions": []},
              "networkUsed": False, "filesModified": False}
    output.update(fields)
    return output


def metric(value):
    require(value is None or (isinstance(value, str) and re.fullmatch(r"-?\d+(?:\.\d{1,6})?", value) is not None))


def validate_receipt(receipt, materials):
    require(isinstance(receipt, dict) and set(receipt) == RECEIPT_KEYS)
    require(receipt["tool"] == TOOL and type(receipt["schemaVersion"]) is int and receipt["schemaVersion"] == 1)
    require(receipt["networkUsed"] is False and receipt["filesModified"] is False)
    require(receipt["status"] in ("completed", "partial", "invalid_input"))
    require(isinstance(receipt["limitations"], list))
    validate_domain_receipt(receipt, materials)


def deliver(envelope):
    require(isinstance(envelope, dict) and set(envelope) == {"task", "inputJson"}, "invalid_request_envelope")
    task, input_json = envelope["task"], envelope["inputJson"]
    require(isinstance(task, str) and task.strip() and len(task.encode("utf-16-le", "surrogatepass")) // 2 <= 6000
            and isinstance(input_json, str), "invalid_request_envelope")
    try:
        require(len(input_json.encode("utf-8")) <= calculator.MAX_BYTES, "calculation_materials_size_limit")
        materials = parse_json(input_json)
    except Exception as error:
        return receipt_delivery(invalid_receipt(error), task, {})
    if not isinstance(materials, dict):
        return receipt_delivery(invalid_receipt(DeliveryError("materials_must_be_object")), task, {})
    missing = missing_materials(materials)
    if missing:
        questions = [missing_question(missing)]
        return result("needs_input", task, materials, missing=missing, questions=questions,
                      handoff={"status": "needs_input", "code": "calculation_materials_missing", "questions": questions})
    receipt = calculate_receipt(materials)
    return receipt_delivery(receipt, task, materials)


def receipt_delivery(receipt, task, materials):
    validate_receipt(receipt, materials)
    receipt_json = json.dumps(receipt, ensure_ascii=True, separators=(",", ":"))
    receipt_hash = hashlib.sha256(receipt_json.encode("utf-8")).hexdigest()
    issues = calculation_issues(receipt)
    handoff = domain_handoff(receipt, issues)
    return result(receipt["status"], task, materials, calculationPerformed=True,
                  questions=handoff["questions"], issues=issues, receipt=receipt, receiptJson=receipt_json, receiptSha256=receipt_hash,
                  delivery=render_delivery(receipt), handoff=handoff)


def brief_number(value):
    # Briefs retain JSON numeric types; validated arithmetic stays in Decimal.
    if isinstance(value, Decimal):
        if not value.is_finite() or abs(value) > Decimal("1e308"):
            return None
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError()


def main():
    envelope = None
    try:
        require(sys.argv[1:] == ["--input-json", "-"], "invalid_request_arguments")
        raw = sys.stdin.buffer.read(MAX_ENVELOPE_BYTES + 1)
        require(len(raw) <= MAX_ENVELOPE_BYTES, "calculation_envelope_size_limit")
        envelope = parse_json(raw.decode("utf-8"))
        output = deliver(envelope)
        serialized = json.dumps(output, ensure_ascii=True, allow_nan=False, default=brief_number, separators=(",", ":"))
    except Exception as error:
        # Never echo rejected materials, exception messages, paths or tracebacks.
        code = str(error) if isinstance(error, DeliveryError) else "invalid_json_or_value"
        task = envelope.get("task", "") if isinstance(envelope, dict) else ""
        task = task if isinstance(task, str) and len(task) <= 6000 else ""
        output = result("invalid_input", task, issues=[{"code": code}],
                        handoff={"status": "blocked", "code": code, "questions": []})
        serialized = json.dumps(output, ensure_ascii=True, separators=(",", ":"))
    sys.stdout.write(serialized + "\n")
    return 2 if output["status"] == "invalid_input" else 0

TOOL = "store-performance-calculator"
REQUIRED_MATERIALS = ("rows",)
RECEIPT_KEYS = {"schemaVersion", "tool", "version", "status", "calculationTable", "comparisons", "quality",
                "limitations", "networkUsed", "filesModified"}


def brief(task, materials):
    return {"request": task, "comparison": materials.get("comparison"), "definitions": materials.get("definitions"),
            "scope": "review_supplied_store_rows_only", "permitsBusinessChanges": False}


def missing_question(missing):
    return "请提供要复盘的期间、SKU、渠道及明确指标行（如曝光、访客、支付订单和收入）；未知退款或成本可留空。"


def calculate_receipt(materials):
    try:
        with localcontext() as context:
            context.prec = 80
            receipt = calculator.calculate(*calculator.validate(materials))
            # Match the original CLI's decimal-string receipt, including half-even rounding.
            return json.loads(json.dumps(receipt, default=calculator.render, ensure_ascii=True))
    except Exception as error:
        return invalid_receipt(error)


def invalid_receipt(error):
    return {"schemaVersion": 1, "tool": TOOL, "version": TOOL_VERSION,
                "status": "invalid_input", "calculationTable": [], "comparisons": [],
                "quality": [{"code": "invalid_input", "message": "Input must match the bounded documented JSON schema."}],
                "limitations": ["No calculations completed."], "networkUsed": False, "filesModified": False}


def validate_domain_receipt(receipt, materials):
    require(receipt["version"] == TOOL_VERSION)
    for key in ("calculationTable", "comparisons", "quality"):
        require(isinstance(receipt[key], list))
    require(all(isinstance(issue, dict) and isinstance(issue.get("code"), str) for issue in receipt["quality"]))
    if receipt["status"] == "invalid_input":
        require(receipt["calculationTable"] == [] and receipt["comparisons"] == [])
        return
    require(receipt["status"] == ("partial" if receipt["quality"] else "completed"))
    require(len(receipt["calculationTable"]) == len(materials["rows"]))
    for row, source in zip(receipt["calculationTable"], materials["rows"]):
        for key in ("period", "sku", "channel"):
            require(row[key] == source[key])
        for key in ("inputs", "metrics", "definitions"):
            require(isinstance(row[key], dict))
        for key in ("paidOrdersPerVisitorPercent", "netRevenue", "contributionAfterListedCosts"):
            metric(row["metrics"][key])
        require(row["definitions"]["currency"] is None or isinstance(row["definitions"]["currency"], str))
    for comparison in receipt["comparisons"]:
        require(comparison["status"] in ("comparable", "not_comparable"))
        if comparison["status"] == "not_comparable":
            require(isinstance(comparison["reasons"], list) and isinstance(comparison["conflictingFields"], list))
            require("deltas" not in comparison and "revenueDecomposition" not in comparison)
        else:
            require(isinstance(comparison["deltas"], dict))
            metric(comparison["deltas"]["paidOrdersPerVisitorPercent"])


def calculation_issues(receipt):
    fields = ("fields", "period", "row", "sku", "channel", "reasons", "conflictingFields", "unknownFields")
    # Empty arrays remain meaningful, and row zero must not be dropped.
    return [{"code": issue["code"], **{key: issue[key] for key in fields if key in issue
             and (issue[key] is not None if key == "row" else isinstance(issue[key], list) or bool(issue[key]))}}
            for issue in receipt["quality"]]


def domain_handoff(receipt, issues):
    return {"status": "blocked" if receipt["status"] == "invalid_input" else "ready",
            "code": "invalid_calculation_input" if receipt["status"] == "invalid_input" else None, "questions": []}


def render_delivery(receipt):
    if receipt["status"] == "invalid_input":
        return "材料格式有误，本次未形成可用核算结果；请按计算器输入合同修正。"
    def known(value, fallback):
        return fallback if value is None else value
    rows = [f"{row['period']}/{row['sku']}/{row['channel']}：支付订单/访客 " +
            ("未知或不适用" if row["metrics"]["paidOrdersPerVisitorPercent"] is None else row["metrics"]["paidOrdersPerVisitorPercent"] + "%") +
            f"，退款净收入 {known(row['metrics']['netRevenue'], '未知')} {known(row['definitions']['currency'], '币种未知')}，所列成本后贡献 {known(row['metrics']['contributionAfterListedCosts'], '未知')}"
            for row in receipt["calculationTable"]]
    comparisons = [f"{item['sku']}/{item['channel']}：口径缺失、冲突或期间行未匹配，保留各期指标，不作跨期比较和收入分解。"
                   if item["status"] == "not_comparable" else
                   f"{item['sku']}/{item['channel']}：支付订单/访客变化 {known(item['deltas']['paidOrdersPerVisitorPercent'], '未知')} 个百分点；收入分解仅为算术，不证明因果。"
                   for item in receipt["comparisons"]]
    return "\n".join(rows + comparisons + ["缺失退款或成本保持未知；所列成本后贡献未含固定开支与税费。广告费/全部订单不是广告CAC或ROAS，不汇总跨SKU/渠道访客。未登录后台、投放或变更业务。"])


if __name__ == "__main__":
    sys.exit(main())
