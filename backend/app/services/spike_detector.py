from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.transaction import Transaction
from app.config import settings

WINDOW_MINUTES = 5
BASELINE_HOURS = 1


def get_spike_status(merchant_id: str, db: Session) -> dict:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=WINDOW_MINUTES)
    baseline_start = now - timedelta(hours=BASELINE_HOURS)

    import uuid
    try:
        mid = uuid.UUID(merchant_id)
    except ValueError:
        return {"error": "Invalid merchant_id"}

    # Current window transactions
    current_count = db.query(func.count(Transaction.id)).filter(
        Transaction.merchant_id == mid,
        Transaction.created_at >= window_start,
        Transaction.created_at <= now,
    ).scalar() or 0

    # 1. First check rolling 1-hour transaction history
    n_buckets = int(BASELINE_HOURS * 60 / WINDOW_MINUTES)
    bucket_counts = []
    for i in range(n_buckets):
        b_end = baseline_start + timedelta(minutes=(i + 1) * WINDOW_MINUTES)
        b_start = baseline_start + timedelta(minutes=i * WINDOW_MINUTES)
        cnt = db.query(func.count(Transaction.id)).filter(
            Transaction.merchant_id == mid,
            Transaction.created_at >= b_start,
            Transaction.created_at < b_end,
        ).scalar() or 0
        bucket_counts.append(cnt)

    if sum(bucket_counts) > 0:
        baseline_mean = float(np.mean(bucket_counts))
        baseline_std = float(np.std(bucket_counts))
    else:
        # 2. Fall back to the merchant's diurnal baseline profile in merchant_baselines
        from app.models.merchant_baseline import MerchantBaseline
        base_obj = db.query(MerchantBaseline).filter(
            MerchantBaseline.merchant_id == mid,
            MerchantBaseline.day_of_week == now.weekday(),
            MerchantBaseline.hour_of_day == now.hour,
        ).first()

        if not base_obj:
            base_obj = db.query(MerchantBaseline).filter(
                MerchantBaseline.merchant_id == mid
            ).first()

        if base_obj:
            baseline_mean = float(base_obj.avg_transactions_per_window)
            baseline_std = float(base_obj.std_dev_transactions)
        else:
            baseline_mean = 10.0
            baseline_std = 3.0

    threshold = baseline_mean + settings.spike_std_multiplier * baseline_std
    spike_detected = (current_count > threshold and current_count >= 2) or (current_count > 10)

    return {
        "merchant_id": merchant_id,
        "current_count": current_count,
        "baseline_mean": round(baseline_mean, 2),
        "baseline_std": round(baseline_std, 2),
        "threshold": round(threshold, 2),
        "spike_detected": bool(spike_detected),
        "window_minutes": WINDOW_MINUTES,
    }