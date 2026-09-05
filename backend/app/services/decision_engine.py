from __future__ import annotations
from app.models.transaction import RiskLabel

RISK_BANDS = [
    (0,  20,  RiskLabel.allow,  "allow",          "Low risk. Transaction cleared."),
    (21, 40,  RiskLabel.allow,  "allow_monitor",  "Marginal risk. Allow with monitoring."),
    (41, 65,  RiskLabel.verify, "verify",         "Elevated risk. Step-up verification required."),
    (66, 85,  RiskLabel.hold,   "hold",           "High risk. Held for human review."),
    (86, 100, RiskLabel.block,  "block",          "Critical risk. Transaction blocked."),
]


def make_decision(risk_score: float, context: dict | None = None) -> dict:
    score = max(0.0, min(100.0, risk_score))

    for low, high, label, band, description in RISK_BANDS:
        if low <= score <= high:
            return {
                "final_action": label.value,
                "risk_band": band,
                "reasoning": description,
                "confidence": _band_confidence(score, low, high),
            }

    return {
        "final_action": RiskLabel.block.value,
        "risk_band": "block",
        "reasoning": "Critical risk score.",
        "confidence": 0.95,
    }


def _band_confidence(score: float, low: float, high: float) -> float:
    band_width = max(high - low, 1)
    center = (low + high) / 2
    distance_from_center = abs(score - center)
    raw = 1.0 - (distance_from_center / (band_width / 2)) * 0.3
    return round(min(max(raw, 0.5), 1.0), 3)