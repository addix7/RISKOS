"""
Risk Detection Engine: loads the trained model artifact
and scores transactions with clean, normalized feature explanations.
"""
from __future__ import annotations
import numpy as np
import joblib
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.config import settings
from app.models.transaction import Transaction, RiskLabel
from app.ml.feature_engineering import compute_features, FEATURE_COLUMNS

_artifact: Optional[dict] = None


def load_model() -> None:
    """Load model artifact at startup. Call from lifespan handler."""
    global _artifact
    path = Path(settings.model_artifact_path)
    if not path.exists():
        print(f"[RISK] Model artifact not found at {path}. Run train_model.py first.")
        _artifact = None
        return
    _artifact = joblib.load(path)
    print(f"[RISK] Model loaded from {path}")


def _label_from_score(score: float) -> RiskLabel:
    if score <= 40:
        return RiskLabel.allow
    elif score <= 65:
        return RiskLabel.verify
    elif score <= 85:
        return RiskLabel.hold
    else:
        return RiskLabel.block


def score_transaction(txn: Transaction, db: Session) -> dict:
    """
    Score a transaction and return risk_score (0-100), risk_label,
    feature values, and normalized feature contributions (0.0 to 1.0 scale).
    """
    features = compute_features(txn, db)
    feature_vector = np.array([[features[c] for c in FEATURE_COLUMNS]], dtype=np.float32)

    if _artifact is None:
        load_model()

    if _artifact is None:
        score = _heuristic_score(features)
        contributions = {c: 0.0 for c in FEATURE_COLUMNS}
    else:
        model = _artifact["model"]
        prob = float(model.predict_proba(feature_vector)[0][1])
        score = round(prob * 100, 2)

        # Normalized feature contributions
        contributions = _importance_contributions(_artifact, feature_vector)

    label = _label_from_score(score)
    return {
        "risk_score": score,
        "risk_label": label,
        "features": features,
        "feature_contributions": contributions,
    }


def _heuristic_score(features: dict) -> float:
    """Simple heuristic when model artifact is absent."""
    score = 0.0
    if features["prior_chargeback_count"] > 0:
        score += 20 * min(features["prior_chargeback_count"], 3)
    if features["amount_vs_avg_ratio"] > 5:
        score += 25
    elif features["amount_vs_avg_ratio"] > 2:
        score += 15
    if features["is_new_device"] and features["is_new_ip"]:
        score += 15
    if features["device_distinct_customers"] > 3:
        score += min(features["device_distinct_customers"] * 5, 25)
    if features["ip_distinct_customers"] > 3:
        score += min(features["ip_distinct_customers"] * 3, 15)
    if features["txn_freq_1h"] > 5:
        score += 10
    if features["account_age_days"] < 7:
        score += 15
    score += (1.0 - features["trust_score"]) * 30
    return min(round(score, 2), 100.0)


def _importance_contributions(artifact: dict, feature_vector: np.ndarray) -> dict:
    """Normalized feature importance contribution (0.0 to 1.0 scale summing to 1.0)."""
    importances = artifact.get("feature_importances", {})
    cols = artifact.get("feature_columns", FEATURE_COLUMNS)
    vals = feature_vector[0]

    scale_factors = {
        "account_age_days": 365.0,
        "avg_amount": 5000000.0,
        "prior_txn_count": 20.0,
        "prior_chargeback_count": 5.0,
        "amount_vs_avg_ratio": 10.0,
        "no_history": 1.0,
        "txn_freq_1h": 10.0,
        "failed_count_30m": 5.0,
        "is_new_device": 1.0,
        "device_distinct_customers": 10.0,
        "is_new_ip": 1.0,
        "ip_distinct_customers": 10.0,
        "instrument_distinct_customers": 10.0,
        "trust_score": 1.0,
    }
    raw_weights = {}
    for col, val in zip(cols, vals):
        imp = importances.get(col, 0.0)
        norm_val = min(max(float(val) / scale_factors.get(col, 1.0), 0.0), 5.0)
        raw_weights[col] = imp * (1.0 + norm_val)

    total = sum(raw_weights.values()) or 1.0
    return {col: round(float(w / total), 4) for col, w in raw_weights.items()}


def get_model_metrics() -> Optional[dict]:
    if _artifact is None:
        load_model()
    if _artifact is None:
        return None
    return _artifact.get("metrics")