from __future__ import annotations
import math
import uuid
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.transaction import Transaction, TransactionStatus
from app.models.merchant_baseline import MerchantBaseline
from app.models.entity_time_window import EntityTimeWindow, WindowEntityType, WindowSize
from app.models.campaign import Campaign, CampaignStatus, CampaignPolicy
from app.models.campaign_event import CampaignEvent
from app.services.temporal_features import aggregate_window_metrics, compute_shannon_entropy
from app.services.event_suppressor import check_legitimate_event

# Tiered thresholds
WATCHLIST_THRESHOLD = 0.45
FORMING_THRESHOLD = 0.65


def calculate_behavioral_similarity(txns: List[Transaction]) -> float:
    """
    Computes behavioral similarity across transactions in a candidate cluster:
    1. Amount uniformity (low coefficient of variation = scripted amounts).
    2. Timing cadence regularity (low variance in inter-arrival intervals).
    """
    if len(txns) < 3:
        return 0.0

    # 1. Amount variation
    amounts = [float(t.amount) for t in txns]
    mean_amt = float(np.mean(amounts))
    std_amt = float(np.std(amounts))
    cv = (std_amt / mean_amt) if mean_amt > 0 else 1.0
    amount_sim = max(1.0 - min(cv, 1.0), 0.0)

    # 2. Timing interval cadence
    sorted_txns = sorted(txns, key=lambda t: t.created_at)
    intervals = []
    for i in range(1, len(sorted_txns)):
        t1 = sorted_txns[i - 1].created_at
        t2 = sorted_txns[i].created_at
        if t1.tzinfo is None: t1 = t1.replace(tzinfo=timezone.utc)
        if t2.tzinfo is None: t2 = t2.replace(tzinfo=timezone.utc)
        dt = (t2 - t1).total_seconds()
        intervals.append(dt)

    if intervals:
        mean_gap = float(np.mean(intervals))
        std_gap = float(np.std(intervals))
        gap_cv = (std_gap / mean_gap) if mean_gap > 0 else 1.0
        timing_sim = max(1.0 - min(gap_cv, 1.0), 0.0)
    else:
        timing_sim = 0.0

    similarity = 0.60 * amount_sim + 0.40 * timing_sim
    return round(float(similarity), 4)


def score_campaign_cluster(
    merchant_id: uuid.UUID,
    reference_time: Optional[datetime] = None,
    db: Session = None,
) -> Dict[str, Any]:
    """
    Evaluates whether an active cluster represents a forming fraud campaign
    using the 7-signal weighted formula (incorporating instrument concentration)
    and tiered thresholds.
    """
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    elif reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    # 1. Gather temporal window metrics
    metrics = aggregate_window_metrics(
        entity_type=WindowEntityType.merchant,
        entity_id=merchant_id,
        window_size=WindowSize.m5,
        reference_time=reference_time,
        db=db,
    )
    txn_count = metrics["transaction_count"]
    if txn_count < 3:
        return {
            "campaign_score": 0.0,
            "is_campaign": False,
            "status": "normal",
            "signals": {},
            "suppressor": {"is_legitimate": True, "suppressor_action": "SUPPRESS_ALERT"},
        }

    # Fetch 5m transactions for fine-grained cluster metrics
    win_start = reference_time - timedelta(minutes=5)
    txns = db.query(Transaction).filter(
        Transaction.merchant_id == merchant_id,
        Transaction.created_at >= win_start,
        Transaction.created_at <= reference_time,
    ).all()

    # 2. Look up historical baseline for volume comparison
    dow = reference_time.weekday()
    hod = reference_time.hour
    baseline = db.query(MerchantBaseline).filter(
        MerchantBaseline.merchant_id == merchant_id,
        MerchantBaseline.day_of_week == dow,
        MerchantBaseline.hour_of_day == hod,
    ).first()
    if not baseline:
        baseline = db.query(MerchantBaseline).filter(MerchantBaseline.merchant_id == merchant_id).first()

    avg_txns = baseline.avg_transactions_per_window if baseline else 10.0
    std_txns = baseline.std_dev_transactions if baseline else 3.0

    # 3. Compute 7 Individual Weighted Signals
    # (1) Volume Anomaly (0.25)
    z_score = (txn_count - avg_txns) / max(std_txns, 1.0)
    volume_anomaly = max(min(z_score / 10.0, 1.0), 0.0)

    # (2) Edge Creation Anomaly (0.20)
    new_edges = metrics["new_edges_count"]
    edge_creation_anomaly = max(min(new_edges / 6.0, 1.0), 0.0)

    # (3) Device Concentration (0.13)
    max_h = metrics["max_possible_entropy"] if "max_possible_entropy" in metrics else math.log2(max(txn_count, 2))
    dev_entropy = metrics["device_entropy"]
    dev_ratio = (dev_entropy / max_h) if max_h > 0 else 0.0
    device_concentration = max(min(1.0 - dev_ratio, 1.0), 0.0)

    # (4) IP / ASN Concentration (0.09)
    ip_entropy = metrics["ip_entropy"]
    ip_ratio = (ip_entropy / max_h) if max_h > 0 else 0.0
    ip_asn_concentration = max(min(1.0 - ip_ratio, 1.0), 0.0)

    # (5) Payment Instrument Concentration (0.08)
    inst_entropy = metrics.get("instrument_entropy", 0.0)
    inst_ratio = (inst_entropy / max_h) if max_h > 0 else 0.0
    instrument_concentration = max(min(1.0 - inst_ratio, 1.0), 0.0)

    # (6) Behavioral Similarity (0.15)
    behavioral_similarity = calculate_behavioral_similarity(txns)

    # (7) Velocity Anomaly (0.10)
    m1h = aggregate_window_metrics(
        entity_type=WindowEntityType.merchant,
        entity_id=merchant_id,
        window_size=WindowSize.h1,
        reference_time=reference_time,
        db=db,
    )
    txns_1h = m1h["transaction_count"]
    accel_ratio = (txn_count / 5.0) / ((txns_1h / 60.0) + 0.1)
    velocity_anomaly = max(min((accel_ratio - 1.0) / 4.0, 1.0), 0.0)

    # 4. 7-Signal Weighted Formula Calculation
    campaign_score = (
        0.25 * volume_anomaly +
        0.20 * edge_creation_anomaly +
        0.13 * device_concentration +
        0.09 * ip_asn_concentration +
        0.08 * instrument_concentration +
        0.15 * behavioral_similarity +
        0.10 * velocity_anomaly
    )
    campaign_score = round(float(campaign_score), 4)

    # 5. Legitimate-Event Suppressor Check (Gatekeeper)
    suppressor_res = check_legitimate_event(
        merchant_id=merchant_id,
        reference_time=reference_time,
        window_size=WindowSize.m5,
        db=db,
    )

    is_suppressed = suppressor_res.get("is_legitimate", False)

    # 6. Tiered Status Evaluation
    if is_suppressed:
        status = "suppressed"
        is_campaign = False
    elif campaign_score >= FORMING_THRESHOLD:
        status = "forming"
        is_campaign = True
    elif campaign_score >= WATCHLIST_THRESHOLD:
        status = "watchlist"
        is_campaign = True
    else:
        status = "normal"
        is_campaign = False

    signals = {
        "volume_anomaly": round(volume_anomaly, 4),
        "edge_creation_anomaly": round(edge_creation_anomaly, 4),
        "device_concentration": round(device_concentration, 4),
        "ip_asn_concentration": round(ip_asn_concentration, 4),
        "instrument_concentration": round(instrument_concentration, 4),
        "behavioral_similarity": round(behavioral_similarity, 4),
        "velocity_anomaly": round(velocity_anomaly, 4),
        "z_score": round(z_score, 2),
        "new_edges": new_edges,
        "dev_entropy_ratio": round(dev_ratio, 4),
        "txn_count": txn_count,
    }

    # Extract participating entities
    entity_ids = []
    dev_set = set(str(t.device_id) for t in txns if t.device_id)
    ip_set = set(str(t.ip_id) for t in txns if t.ip_id)
    inst_set = set(str(t.instrument_id) for t in txns if t.instrument_id)
    cust_set = set(str(t.customer_id) for t in txns if t.customer_id)

    for d in dev_set: entity_ids.append({"entity_type": "device", "entity_id": d})
    for ip in ip_set: entity_ids.append({"entity_type": "ip", "entity_id": ip})
    for inst in inst_set: entity_ids.append({"entity_type": "instrument", "entity_id": inst})
    for c in cust_set: entity_ids.append({"entity_type": "customer", "entity_id": c})

    return {
        "campaign_score": campaign_score,
        "is_campaign": is_campaign,
        "status": status,
        "confidence": round(0.70 + (campaign_score * 0.25), 2),
        "signals": signals,
        "suppressor": suppressor_res,
        "entity_ids": entity_ids,
        "txns": txns,
    }


def detect_and_record_campaigns(
    merchant_id: uuid.UUID,
    reference_time: Optional[datetime] = None,
    db: Session = None,
) -> Optional[Campaign]:
    """
    Runs the campaign detection pipeline, logs events to CampaignEvent,
    and returns the persisted Campaign record if watchlist/forming/active.
    """
    scored = score_campaign_cluster(merchant_id=merchant_id, reference_time=reference_time, db=db)

    if not scored["is_campaign"]:
        return None

    ref = reference_time or datetime.now(timezone.utc)
    if ref.tzinfo is None: ref = ref.replace(tzinfo=timezone.utc)

    recent_campaigns = db.query(Campaign).filter(
        Campaign.status.in_([CampaignStatus.watchlist, CampaignStatus.forming, CampaignStatus.active]),
        Campaign.detected_at >= ref - timedelta(hours=1),
    ).all()

    target_entity_set = set(e["entity_id"] for e in scored["entity_ids"])
    recent_campaign = None
    for c in recent_campaigns:
        c_entity_set = set(e["entity_id"] for e in (c.entity_ids or []))
        if target_entity_set.intersection(c_entity_set):
            recent_campaign = c
            break

    signals = scored["signals"]
    status_enum = CampaignStatus.forming if scored["status"] == "forming" else CampaignStatus.watchlist
    entry_point_str = f"Volume surge ({signals['z_score']}z) with behavioral similarity ({signals['behavioral_similarity']}) & instrument concentration ({signals['instrument_concentration']})"

    if not recent_campaign:
        recent_campaign = Campaign(
            status=status_enum,
            detected_at=ref,
            campaign_score=scored["campaign_score"],
            confidence=scored["confidence"],
            entity_ids=scored["entity_ids"],
            entry_point=entry_point_str,
            legitimate_event_check=scored["suppressor"],
            exposure_at_risk_low_paise=int(len(scored["entity_ids"]) * 2500000),
            exposure_at_risk_high_paise=int(len(scored["entity_ids"]) * 6500000),
            exposure_confidence=0.80,
            recommended_policy=CampaignPolicy.contain if scored["campaign_score"] >= 0.75 else (
                CampaignPolicy.challenge if scored["campaign_score"] >= FORMING_THRESHOLD else CampaignPolicy.allow
            ),
        )
        db.add(recent_campaign)
        db.flush()

        # Log initial event
        evt = CampaignEvent(
            campaign_id=recent_campaign.id,
            event_type="campaign_detected" if status_enum == CampaignStatus.forming else "watchlist_added",
            occurred_at=ref,
            detail={
                "campaign_score": scored["campaign_score"],
                "status": status_enum.value,
                "signals": signals,
                "entry_point": entry_point_str,
            }
        )
        db.add(evt)
    else:
        # Update existing campaign
        recent_campaign.campaign_score = max(recent_campaign.campaign_score, scored["campaign_score"])
        if status_enum == CampaignStatus.forming and recent_campaign.status == CampaignStatus.watchlist:
            recent_campaign.status = CampaignStatus.forming
        recent_campaign.entity_ids = scored["entity_ids"]
        recent_campaign.legitimate_event_check = scored["suppressor"]

        evt = CampaignEvent(
            campaign_id=recent_campaign.id,
            event_type="score_updated",
            occurred_at=ref,
            detail={"campaign_score": scored["campaign_score"], "signals": signals}
        )
        db.add(evt)

    # Link transactions
    for t in scored.get("txns", []):
        t.campaign_id = recent_campaign.id

    db.commit()
    db.refresh(recent_campaign)
    return recent_campaign