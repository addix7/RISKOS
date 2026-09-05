from __future__ import annotations
from app.config import settings


def simulate(
    risk_score: float,
    amount_paise: int,
) -> dict:
    """
    Simulate financial and friction outcomes for allow/verify/hold/block.
    Every option satisfies: net_expected_value_paise = -(estimated_fraud_loss_paise + friction_cost_paise)
    """
    prob_fraud = max(min(risk_score / 100.0, 1.0), 0.0)
    prob_legit = 1.0 - prob_fraud

    ve = settings.verification_effectiveness          # e.g. 0.85
    dropout = settings.verification_dropout_rate       # e.g. 0.08
    hold_leakage = 0.02                               # Manual review prevents 98% of fraud
    hold_friction_rate = 0.20                         # 20% friction on legit customers for temporary hold
    block_friction_rate = 1.00                        # 100% friction on legit customers wrongly blocked

    options = []

    # 1. Allow
    allow_exposure = int(round(prob_fraud * amount_paise))
    allow_friction = 0
    options.append({
        "action": "allow",
        "estimated_fraud_loss_paise": allow_exposure,
        "friction_cost_paise": allow_friction,
        "net_expected_value_paise": -(allow_exposure + allow_friction),
        "recommended": False,
    })

    # 2. Verify
    verify_exposure = int(round(prob_fraud * amount_paise * (1.0 - ve)))
    verify_friction = int(round(prob_legit * amount_paise * dropout))
    options.append({
        "action": "verify",
        "estimated_fraud_loss_paise": verify_exposure,
        "friction_cost_paise": verify_friction,
        "net_expected_value_paise": -(verify_exposure + verify_friction),
        "recommended": False,
    })

    # 3. Hold
    hold_exposure = int(round(prob_fraud * amount_paise * hold_leakage))
    hold_friction = int(round(prob_legit * amount_paise * hold_friction_rate))
    options.append({
        "action": "hold",
        "estimated_fraud_loss_paise": hold_exposure,
        "friction_cost_paise": hold_friction,
        "net_expected_value_paise": -(hold_exposure + hold_friction),
        "recommended": False,
    })

    # 4. Block
    block_exposure = 0
    block_friction = int(round(prob_legit * amount_paise * block_friction_rate))
    options.append({
        "action": "block",
        "estimated_fraud_loss_paise": block_exposure,
        "friction_cost_paise": block_friction,
        "net_expected_value_paise": -(block_exposure + block_friction),
        "recommended": False,
    })

    # Select optimal policy via argmax over net expected value (highest / least negative NEV)
    best_opt = max(options, key=lambda opt: opt["net_expected_value_paise"])
    for opt in options:
        opt["recommended"] = (opt["action"] == best_opt["action"])
    rec_action = best_opt["action"]

    for opt in options:
        opt["estimated_fraud_loss_inr"] = round(opt["estimated_fraud_loss_paise"] / 100, 2)
        opt["friction_cost_inr"] = round(opt["friction_cost_paise"] / 100, 2)
        opt["net_expected_value_inr"] = round(opt["net_expected_value_paise"] / 100, 2)

    return {
        "options": options,
        "recommended_action": rec_action,
    }