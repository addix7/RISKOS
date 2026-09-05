from __future__ import annotations
import math
import uuid
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.merchant_baseline import MerchantBaseline
from app.models.transaction import Transaction
from app.models.entity_time_window import EntityTimeWindow, WindowEntityType, WindowSize
from app.services.temporal_features import aggregate_window_metrics, compute_shannon_entropy


def compute_merchant_baseline_from_history(
    merchant_id: uuid.UUID,
    day_of_week: Optional[int] = None,
    hour_of_day: Optional[int] = None,
    db: Session = None,
) -> MerchantBaseline:
    """
    Computes real historical baseline metrics for a merchant from actual transactions in the database.
    Calculates:
    - avg_transactions_per_window: mean 5-minute transaction volume
    - std_dev_transactions: standard deviation of 5-minute volume
    - avg_device_entropy: mean device entropy during normal operations
    """
    query = db.query(Transaction).filter(Transaction.merchant_id == merchant_id)
    txns = query.order_by(Transaction.created_at.asc()).all()

    if not txns or len(txns) < 5:
        # Fallback baseline when insufficient history exists
        baseline = db.query(MerchantBaseline).filter(
            MerchantBaseline.merchant_id == merchant_id
        ).first()
        if not baseline:
            baseline = MerchantBaseline(
                merchant_id=merchant_id,
                day_of_week=day_of_week if day_of_week is not None else 0,
                hour_of_day=hour_of_day if hour_of_day is not None else 12,
                avg_transactions_per_window=10.0,
                avg_new_accounts_per_window=3.0,
                avg_device_entropy=2.5,
                std_dev_transactions=3.0,
                known_event_tags={},
            )
            db.add(baseline)
            db.flush()
        return baseline

    # Slice history into 5-minute tumbling windows
    start_time = txns[0].created_at
    end_time = txns[-1].created_at
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    window_delta = timedelta(minutes=5)
    counts = []
    entropies = []

    curr = start_time
    while curr <= end_time:
        w_end = curr + window_delta
        w_txns = [t for t in txns if curr <= (t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at) < w_end]
        if w_txns:
            counts.append(len(w_txns))
            devs = [str(t.device_id) for t in w_txns if t.device_id]
            entropies.append(compute_shannon_entropy(devs))
        curr = w_end

    avg_count = float(np.mean(counts)) if counts else 10.0
    std_count = float(np.std(counts)) if len(counts) > 1 else max(avg_count * 0.3, 1.0)
    std_count = max(std_count, 1.0)  # Avoid divide by zero
    avg_entropy = float(np.mean(entropies)) if entropies else 2.5

    baseline = db.query(MerchantBaseline).filter(
        MerchantBaseline.merchant_id == merchant_id,
    ).first()

    if not baseline:
        baseline = MerchantBaseline(
            merchant_id=merchant_id,
            day_of_week=day_of_week if day_of_week is not None else 0,
            hour_of_day=hour_of_day if hour_of_day is not None else 12,
        )
        db.add(baseline)

    baseline.avg_transactions_per_window = round(avg_count, 2)
    baseline.std_dev_transactions = round(std_count, 2)
    baseline.avg_device_entropy = round(avg_entropy, 2)
    db.flush()
    return baseline


def check_legitimate_event(
    merchant_id: uuid.UUID,
    reference_time: Optional[datetime] = None,
    window_size: WindowSize = WindowSize.m5,
    db: Session = None,
) -> Dict[str, Any]:
    """
    Legitimate-Event Suppressor:
    Evaluates whether an active traffic surge at a merchant is a legitimate event
    (e.g., flash sale, marketing drop, festival sale) or a coordinated fraud campaign.

    Discriminators:
    1. Baseline Comparison: Checks historical norms for (day_of_week, hour_of_day) and known event tags.
    2. Infrastructure Entropy & Device Density:
       - Legitimate Flash Sale: High volume + HIGH device density (>= 70% unique devices) + HIGH entropy ratio (>= 75%).
       - Coordinated Fraud / Evasion Ring: High volume + LOW device density (e.g. 1-8 rotating devices across 50 txns) + LOW entropy ratio (< 65%).
    """
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    elif reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    # 1. Fetch current window metrics for merchant
    metrics = aggregate_window_metrics(
        entity_type=WindowEntityType.merchant,
        entity_id=merchant_id,
        window_size=window_size,
        reference_time=reference_time,
        db=db,
    )

    txn_count = metrics["transaction_count"]
    uniq_accts = metrics["unique_accounts"]
    uniq_devs = metrics["unique_devices"]
    uniq_ips = metrics["unique_ips"]
    dev_entropy = metrics["device_entropy"]
    ip_entropy = metrics["ip_entropy"]
    asn_entropy = metrics["asn_entropy"]

    # 2. Look up historical baseline
    dow = reference_time.weekday()
    hod = reference_time.hour

    baseline = db.query(MerchantBaseline).filter(
        MerchantBaseline.merchant_id == merchant_id,
        MerchantBaseline.day_of_week == dow,
        MerchantBaseline.hour_of_day == hod,
    ).first()

    if not baseline:
        baseline = db.query(MerchantBaseline).filter(
            MerchantBaseline.merchant_id == merchant_id,
        ).first()

    if not baseline:
        baseline = compute_merchant_baseline_from_history(merchant_id, dow, hod, db=db)

    avg_txns = baseline.avg_transactions_per_window if baseline else 10.0
    std_txns = baseline.std_dev_transactions if baseline else 3.0
    known_tags = (baseline.known_event_tags or {}) if baseline else {}

    # 3. Calculate deviation and entropy metrics
    vol_multiplier = round(txn_count / max(avg_txns, 1.0), 2)
    z_score = round((txn_count - avg_txns) / max(std_txns, 1.0), 2)
    max_possible_entropy = round(math.log2(txn_count), 4) if txn_count > 1 else 0.0
    entropy_ratio = round(dev_entropy / max_possible_entropy, 4) if max_possible_entropy > 0 else 0.0
    device_density = round(uniq_devs / max(txn_count, 1), 4)

    # 4. Rigorous Discriminator Evaluation
    is_spike = (txn_count > avg_txns * 2.0) or (z_score >= 2.5)

    # Legitimate Crowd Criteria:
    # Requires high device density (>= 70% unique devices) AND high entropy ratio (>= 75% of theoretical max)
    is_legitimate_crowd = (device_density >= 0.70) and (entropy_ratio >= 0.75) and (dev_entropy >= 2.0)

    matched_baseline_event = False
    event_tag_name = None
    if isinstance(known_tags, list):
        for tag in known_tags:
            if tag.get("tag") in ("flash_sale", "festival_sale", "recurring_spike"):
                matched_baseline_event = True
                event_tag_name = tag.get("tag")
                break
    elif isinstance(known_tags, dict) and known_tags.get("tag"):
        matched_baseline_event = True
        event_tag_name = known_tags.get("tag")

    if not is_spike:
        return {
            "is_legitimate": True,
            "suppressor_action": "SUPPRESS_ALERT",
            "reason": f"Normal traffic volume within historical baseline (z-score: {z_score}, multiplier: {vol_multiplier}x).",
            "matched_baseline": True,
            "metrics": {
                "transaction_count": txn_count,
                "baseline_expected": avg_txns,
                "volume_multiplier": vol_multiplier,
                "z_score": z_score,
                "unique_accounts": uniq_accts,
                "unique_devices": uniq_devs,
                "unique_ips": uniq_ips,
                "device_density": device_density,
                "device_entropy": dev_entropy,
                "ip_entropy": ip_entropy,
                "asn_entropy": asn_entropy,
                "max_possible_entropy": max_possible_entropy,
                "entropy_ratio": entropy_ratio,
            },
        }

    # Spike detected - evaluate entropy and event signatures
    if is_legitimate_crowd:
        reason_msg = (
            f"Traffic surge ({vol_multiplier}x baseline, {txn_count} txns) confirmed as legitimate consumer event based on high infrastructure diversity "
            f"(Device Density: {device_density*100:.1f}%, Device Entropy: {dev_entropy} [{entropy_ratio*100:.1f}% of max], IP Entropy: {ip_entropy}, "
            f"{uniq_devs} unique devices / {uniq_accts} accounts). Alert suppressed."
        )
        if matched_baseline_event:
            reason_msg += f" Matches known merchant event profile: '{event_tag_name}'."
        else:
            reason_msg += " Suppressed via organic entropy signature (untagged event)."

        return {
            "is_legitimate": True,
            "suppressor_action": "SUPPRESS_ALERT",
            "reason": reason_msg,
            "matched_baseline": matched_baseline_event,
            "metrics": {
                "transaction_count": txn_count,
                "baseline_expected": avg_txns,
                "volume_multiplier": vol_multiplier,
                "z_score": z_score,
                "unique_accounts": uniq_accts,
                "unique_devices": uniq_devs,
                "unique_ips": uniq_ips,
                "device_density": device_density,
                "device_entropy": dev_entropy,
                "ip_entropy": ip_entropy,
                "asn_entropy": asn_entropy,
                "max_possible_entropy": max_possible_entropy,
                "entropy_ratio": entropy_ratio,
            },
        }
    else:
        # Coordinated Fraud / Evasion Ring
        reason_msg = (
            f"Suspicious coordinated spike detected ({vol_multiplier}x baseline, {txn_count} txns). "
            f"Abnormally low infrastructure diversity (Device Density: {device_density*100:.1f}%, Device Entropy: {dev_entropy} [{entropy_ratio*100:.1f}% of max], "
            f"only {uniq_devs} devices and {uniq_ips} IPs across {uniq_accts} accounts). Coordinated campaign indicator."
        )
        return {
            "is_legitimate": False,
            "suppressor_action": "FLAG_CAMPAIGN",
            "reason": reason_msg,
            "matched_baseline": False,
            "metrics": {
                "transaction_count": txn_count,
                "baseline_expected": avg_txns,
                "volume_multiplier": vol_multiplier,
                "z_score": z_score,
                "unique_accounts": uniq_accts,
                "unique_devices": uniq_devs,
                "unique_ips": uniq_ips,
                "device_density": device_density,
                "device_entropy": dev_entropy,
                "ip_entropy": ip_entropy,
                "asn_entropy": asn_entropy,
                "max_possible_entropy": max_possible_entropy,
                "entropy_ratio": entropy_ratio,
            },
        }