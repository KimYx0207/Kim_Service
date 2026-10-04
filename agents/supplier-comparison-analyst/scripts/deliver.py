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

TOOL = "supplier-comparison-calculate"
REQUIRED_MATERIALS = ("quantity", "currency", "specification", "quotes")
FIELD_LABELS = {"quantity": "采购数量", "currency": "币种", "specification": "规格与单位", "quotes": "候选报价"}
RECEIPT_KEYS = {"schemaVersion", "tool", "toolVersion", "status", "normalizedQuotes", "ranking", "sensitivity",
                "quality", "limitations", "networkUsed", "filesModified"}


def brief(task, materials):
    return {"request": task, **{key: materials.get(key) for key in ("specification", "quantity", "currency", "maxLeadDays", "weights")},
            "scope": "compare_supplied_materials_only", "permitsContactOrPurchase": False}


def missing_question(missing):
    return "请补充" + "、".join(FIELD_LABELS.get(key, key) for key in missing) + "；不需要为了核算先设置权重。"


def calculate_receipt(materials):
    try:
        with localcontext() as context:
            context.prec = 48
            return calculator.calculate(materials)
    except (calculator.InputError, ValueError, TypeError, RecursionError, ArithmeticError) as error:
        return invalid_receipt(error)


def invalid_receipt(error):
    receipt = calculator.base("invalid_input")
    # Preserve the original calculator's public errors, not adapter-only names.
    adapter_codes = {"nonfinite_number": "nonfinite_number",
                     "calculation_materials_size_limit": "input_size",
                     "materials_must_be_object": "root_shape"}
    code = "invalid_json_or_value"
    if isinstance(error, calculator.InputError):
        code = str(error)
    elif isinstance(error, DeliveryError):
        code = adapter_codes.get(str(error), code)
    receipt["quality"]["issues"] = [{"code": code}]
    receipt["limitations"] = ["Input rejected; no raw input is echoed."]
    return receipt


def validate_domain_receipt(receipt, materials):
    require(receipt["toolVersion"] == TOOL_VERSION)
    require(isinstance(receipt["quality"], dict) and set(receipt["quality"]) == {"issues", "certifiedSuppliers"})
    require(receipt["quality"]["certifiedSuppliers"] is False)
    require(isinstance(receipt["quality"]["issues"], list)
            and all(isinstance(issue, dict) and isinstance(issue.get("code"), str) for issue in receipt["quality"]["issues"]))
    require(isinstance(receipt["normalizedQuotes"], list) and isinstance(receipt["sensitivity"], list))
    require(receipt["ranking"] is None or isinstance(receipt["ranking"], list))
    if receipt["status"] == "invalid_input":
        require(receipt["normalizedQuotes"] == [] and receipt["ranking"] is None and receipt["sensitivity"] == [])
        return
    require(len(receipt["normalizedQuotes"]) == len(materials["quotes"]))
    for row, source in zip(receipt["normalizedQuotes"], materials["quotes"]):
        require(isinstance(row, dict))
        for key in ("supplierId", "specification", "currency"):
            require(row[key] == source.get(key))
        require(row["constraintStatus"] in ("excluded", "unknown", "eligible"))
        require(type(row["comparable"]) is bool)
        for key in ("conflicts", "missingFields", "exclusionReasons", "unknownConstraints"):
            require(isinstance(row[key], list))
        for key in ("packSize", "packPrice", "minimumPacks", "quotedUnitPrice", "requiredPacks", "purchasePacks",
                    "deliveredQuantity", "excessQuantity", "goodsSubtotal", "freight", "otherFees", "landedTotal",
                    "costPerDeliveredUnit", "leadDays", "qualityScore"):
            metric(row[key])
    expected_status = "partial" if receipt["quality"]["issues"] or any(
        row["constraintStatus"] == "unknown" for row in receipt["normalizedQuotes"]) else "completed"
    require(receipt["status"] == expected_status)


def calculation_issues(receipt):
    return [{"code": issue["code"], **({"field": issue["field"]} if issue.get("field") else {})}
            for issue in receipt["quality"]["issues"]]


def domain_handoff(receipt, issues):
    conflicts = list(dict.fromkeys(issue.get("field") for issue in issues if issue["code"] == "definition_conflict"))
    if conflicts:
        labels = {"currency": "币种", "specification": "规格与单位", "qualityDefinition": "质量评分定义"}
        question = "请确认候选报价的" + "、".join(labels.get(field, field) for field in conflicts) + "采用什么统一口径；当前不作横向排名。"
        return {"status": "needs_input", "code": "calculation_definition_conflict", "questions": [question]}
    return {"status": "blocked" if receipt["status"] == "invalid_input" else "ready",
            "code": "invalid_calculation_input" if receipt["status"] == "invalid_input" else None, "questions": []}


def render_delivery(receipt):
    if receipt["status"] == "invalid_input":
        return "材料格式有误，本次未形成可用核算结果；请按计算器输入合同修正。"
    def known(value, fallback):
        return fallback if value is None else value
    rows = [f"{row['supplierId']}：到货总支出 {known(row['landedTotal'], '待确认')} {known(row['currency'], '币种待确认')}，实收 {known(row['deliveredQuantity'], '待确认')}，超购 {known(row['excessQuantity'], '待确认')}，交期 {known(row['leadDays'], '待确认')} 天，约束状态 {row['constraintStatus']}"
            for row in receipt["normalizedQuotes"]]
    return "\n".join(rows + ["未合成排名，保留逐项比较；具体缺项见计算回执。" if receipt["ranking"] is None else
                             "评分仅使用本次材料明确给出的权重和质量口径，详见计算回执。",
                             "费用只包含已声明项目；交期和质量材料尚未核验。未联系供应商、下单或付款。"])


if __name__ == "__main__":
    sys.exit(main())
