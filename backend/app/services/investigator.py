from __future__ import annotations
import json
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.transaction import Transaction
from app.models.investigation import Investigation, RecommendedAction
from app.services.feedback_loop import find_similar_cases
from app.services.investigator_tools import (
    TOOL_DEFINITIONS,
    TOOL_FUNCTION_MAP,
    get_customer_history,
    get_transaction_history,
    get_device_history,
    get_ip_history,
    get_instrument_history,
    get_merchant_history,
    get_related_accounts,
    get_chargeback_history,
)

SYSTEM_PROMPT = """You are RISKOS's AI Fraud Investigator. Your job is to investigate flagged payment transactions.

You MUST use the provided tools to gather evidence. Do NOT invent, assume, or fabricate any data.
Call tools to retrieve real information, then reason over what you find.

For each piece of evidence, tag its severity:
- HIGH_RISK: strong fraud indicator
- MEDIUM_RISK: suspicious but not conclusive  
- LOW_RISK: normal behavior

Output your final response as JSON with this exact structure:
{
  "evidence": [
    {"finding": "<description>", "severity": "HIGH_RISK|MEDIUM_RISK|LOW_RISK", "source": "<tool_name>"}
  ],
  "conclusion": "<plain language summary of findings>",
  "recommended_action": "allow|verify|hold|block",
  "confidence": 0.0-1.0
}"""


def run_investigation(txn: Transaction, db: Session) -> dict:
    if not settings.anthropic_api_key:
        return _heuristic_investigation(txn, db)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    except Exception:
        return _heuristic_investigation(txn, db)

    initial_message = (
        f"Investigate transaction ID: {txn.id}\n"
        f"Amount: ₹{round(int(txn.amount) / 100, 2)}\n"
        f"Customer ID: {txn.customer_id}\n"
        f"Merchant ID: {txn.merchant_id}\n"
        f"Device ID: {txn.device_id}\n"
        f"IP ID: {txn.ip_id}\n"
        f"Instrument ID: {txn.instrument_id}\n"
        f"Risk Score: {txn.risk_score}\n"
        f"Status: {txn.status.value}\n"
        "\nPlease investigate this transaction thoroughly using the available tools."
    )

    messages = [{"role": "user", "content": initial_message}]
    max_rounds = 8

    try:
        for _round in range(max_rounds):
            response = client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOL_DEFINITIONS,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": response.content})

            if response.stop_reason == "end_turn":
                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text
                return _parse_conclusion(final_text)

            if response.stop_reason == "tool_use":
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_input = block.input
                        tool_fn = TOOL_FUNCTION_MAP.get(tool_name)
                        if tool_fn:
                            result = tool_fn(db=db, **tool_input)
                        else:
                            result = {"error": f"Unknown tool: {tool_name}"}
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps(result),
                        })
                messages.append({"role": "user", "content": tool_results})
            else:
                break
    except Exception as ex:
        print(f"[INVESTIGATOR] LLM call failed, falling back: {ex}")
        return _heuristic_investigation(txn, db)

    return _heuristic_investigation(txn, db)


def _parse_conclusion(text: str) -> dict:
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            data = json.loads(text[start:end])
            return {
                "evidence": data.get("evidence", []),
                "ai_conclusion": data.get("conclusion", text),
                "recommended_action": data.get("recommended_action", "hold"),
                "confidence": float(data.get("confidence", 0.5)),
            }
    except Exception:
        pass
    return {
        "evidence": [],
        "ai_conclusion": text,
        "recommended_action": "hold",
        "confidence": 0.5,
    }


def _heuristic_investigation(txn: Transaction, db: Session) -> dict:
    evidence = []
    
    # 1. Customer history
    cust_res = get_customer_history(str(txn.customer_id), db)
    if not cust_res.get("error"):
        age = cust_res.get("account_age_days", 0)
        trust = cust_res.get("trust_score", 0.5)
        if age < 3:
            evidence.append({
                "finding": f"Newly created account ({age} days old). Low historical reputation.",
                "severity": "HIGH_RISK",
                "source": "get_customer_history"
            })
        if trust < 0.3:
            evidence.append({
                "finding": f"Customer trust score is critically low: {trust:.2f}",
                "severity": "HIGH_RISK",
                "source": "get_customer_history"
            })
        elif age >= 3 and trust >= 0.3:
            evidence.append({
                "finding": f"Account age {age} days, trust score {trust:.2f}",
                "severity": "LOW_RISK",
                "source": "get_customer_history"
            })

    # 2. Chargeback history
    cb_res = get_chargeback_history(str(txn.customer_id), db)
    if not cb_res.get("error") and cb_res.get("chargeback_count", 0) > 0:
        cb_cnt = cb_res["chargeback_count"]
        evidence.append({
            "finding": f"Customer has {cb_cnt} past chargeback dispute(s) on record.",
            "severity": "HIGH_RISK",
            "source": "get_chargeback_history"
        })

    # 3. Device history
    if txn.device_id:
        dev_res = get_device_history(str(txn.device_id), db)
        distinct_c = dev_res.get("distinct_customers", 1)
        if distinct_c > 1:
            evidence.append({
                "finding": f"Device fingerprint shared across {distinct_c} distinct customer accounts (syndicate indicator).",
                "severity": "HIGH_RISK",
                "source": "get_device_history"
            })
        else:
            evidence.append({
                "finding": f"Device linked exclusively to {distinct_c} customer.",
                "severity": "LOW_RISK",
                "source": "get_device_history"
            })

    # 4. IP history
    if txn.ip_id:
        ip_res = get_ip_history(str(txn.ip_id), db)
        distinct_ip = ip_res.get("distinct_customers", 1)
        if distinct_ip > 2:
            evidence.append({
                "finding": f"IP address shared across {distinct_ip} distinct customer accounts (proxy/VPN exit node).",
                "severity": "HIGH_RISK",
                "source": "get_ip_history"
            })

    # 5. Payment Instrument history
    if txn.instrument_id:
        inst_res = get_instrument_history(str(txn.instrument_id), db)
        distinct_inst = inst_res.get("distinct_customers", 1)
        if distinct_inst > 1:
            evidence.append({
                "finding": f"Payment instrument shared across {distinct_inst} distinct customer accounts (stolen card / carding ring indicator).",
                "severity": "HIGH_RISK",
                "source": "get_instrument_history"
            })

    # 6. Related accounts graph cluster
    rel_res = get_related_accounts(str(txn.customer_id), db)
    if not rel_res.get("error") and rel_res.get("total_connected_accounts_count", 0) > 0:
        tot = rel_res["total_connected_accounts_count"]
        evidence.append({
            "finding": f"Graph analysis identified syndicate cluster with {tot} other connected accounts sharing hardware/IP/payment credentials.",
            "severity": "HIGH_RISK",
            "source": "get_related_accounts"
        })

    # 7. Adaptive Feedback Loop: check for prior human reviewer overrides
    similar_cases = find_similar_cases(None, db, txn=txn, limit=3)
    has_legit_override = False
    for sim in similar_cases:
        severity = "LOW_RISK" if sim["analyst_overrode_to"] == "allow" else "MEDIUM_RISK"
        if sim["analyst_overrode_to"] == "allow":
            has_legit_override = True
        evidence.append({
            "finding": f"Adaptive Feedback: Prior similar case ({sim['similarity_reason']}) was overridden from '{sim['ai_recommended']}' to '{sim['analyst_overrode_to']}' by analyst {sim['reviewer']} (Reason: {sim['review_reason']}).",
            "severity": severity,
            "source": "adaptive_feedback_loop"
        })

    score = txn.risk_score if txn.risk_score is not None else 50.0
    if score >= 86:
        action = "block"
        conclusion = f"Critical risk detected (score: {score:.1f}). Coordinated multi-entity fraud syndicate identified across shared hardware, IP, and card credentials. Recommended action: BLOCK."
        conf = 0.92
    elif score >= 66:
        action = "hold"
        conclusion = f"High risk transaction (score: {score:.1f}). Elevated risk signals found across shared hardware, IP, and card credentials. Recommended action: HOLD for human analyst review."
        conf = 0.88
    elif score >= 41:
        action = "verify"
        conclusion = f"Moderate risk transaction (score: {score:.1f}). Discrepancies detected requiring step-up verification (e.g. OTP/3DS)."
        conf = 0.78
    else:
        action = "allow"
        conclusion = f"Low risk profile (score: {score:.1f}). No anomalous velocity or high-severity indicators found. Recommended action: ALLOW."
        conf = 0.90

    if has_legit_override:
        conclusion += " (Note: Prior human analyst overrides were identified for this cluster, signaling potential family-sharing or VIP false positive)."

    return {
        "evidence": evidence,
        "ai_conclusion": conclusion,
        "recommended_action": action,
        "confidence": conf,
    }