from __future__ import annotations
import math
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.transaction import Transaction, TransactionStatus
from app.models.entity_link import EntityLink
from app.models.entity_time_window import EntityTimeWindow, WindowEntityType, WindowSize


WINDOW_DURATIONS = {
    WindowSize.m5: timedelta(minutes=5),
    WindowSize.m15: timedelta(minutes=15),
    WindowSize.h1: timedelta(hours=1),
    WindowSize.h24: timedelta(hours=24),
}


def compute_shannon_entropy(items: List[Any]) -> float:
    """
    Calculate Shannon entropy (base 2) for a discrete distribution:
    H = - sum(p_i * log2(p_i))
    Returns 0.0 for uniform/single-value (zero diversity) or empty items.
    """
    if not items or len(items) <= 1:
        return 0.0

    total = len(items)
    counts = Counter(items)
    if len(counts) <= 1:
        return 0.0

    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)

    return round(float(entropy), 4)


def aggregate_window_metrics(
    entity_type: WindowEntityType,
    entity_id: uuid.UUID,
    window_size: WindowSize,
    reference_time: datetime,
    db: Session,
) -> Dict[str, Any]:
    """
    Compute rolling aggregate metrics and entropy values for an entity in a given time window.
    """
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)

    duration = WINDOW_DURATIONS[window_size]
    window_start = reference_time - duration

    # Query relevant transactions in the time window
    query = db.query(Transaction).filter(
        Transaction.created_at >= window_start,
        Transaction.created_at <= reference_time,
    )

    if entity_type == WindowEntityType.merchant:
        query = query.filter(Transaction.merchant_id == entity_id)
    elif entity_type == WindowEntityType.device:
        query = query.filter(Transaction.device_id == entity_id)
    elif entity_type == WindowEntityType.ip:
        query = query.filter(Transaction.ip_id == entity_id)
    elif entity_type in (WindowEntityType.account_cluster, WindowEntityType.beneficiary):
        query = query.filter(Transaction.customer_id == entity_id)

    txns = query.all()
    txn_count = len(txns)

    if txn_count == 0:
        return {
            "window_start": window_start,
            "transaction_count": 0,
            "unique_accounts": 0,
            "unique_devices": 0,
            "unique_ips": 0,
            "new_edges_count": 0,
            "failed_count": 0,
            "total_amount_paise": 0,
            "device_entropy": 0.0,
            "ip_entropy": 0.0,
            "asn_entropy": 0.0,
        }

    # Extract distinct distributions
    account_ids = [t.customer_id for t in txns if t.customer_id is not None]
    device_ids = [str(t.device_id) for t in txns if t.device_id is not None]
    ip_ids = [str(t.ip_id) for t in txns if t.ip_id is not None]
    instrument_ids = [str(t.instrument_id) for t in txns if t.instrument_id is not None]
    asn_proxies = [str(t.ip_id)[:8] for t in txns if t.ip_id is not None]

    unique_accounts = len(set(account_ids))
    unique_devices = len(set(device_ids))
    unique_ips = len(set(ip_ids))
    unique_instruments = len(set(instrument_ids))

    failed_count = sum(1 for t in txns if t.status == TransactionStatus.declined)
    total_amount_paise = sum(int(t.amount) for t in txns)

    device_entropy = compute_shannon_entropy(device_ids)
    ip_entropy = compute_shannon_entropy(ip_ids)
    instrument_entropy = compute_shannon_entropy(instrument_ids)
    asn_entropy = compute_shannon_entropy(asn_proxies)

    # Count new entity links created across the active participating entities in this window
    new_edges_count = 0
    try:
        if entity_type == WindowEntityType.merchant:
            # Query links formed among active customer/device/ip/instrument entities in this window
            all_involved_ids = set(account_ids + [t.device_id for t in txns if t.device_id] + [t.ip_id for t in txns if t.ip_id] + [t.instrument_id for t in txns if t.instrument_id])
            if all_involved_ids:
                new_edges_count = db.query(func.count(EntityLink.id)).filter(
                    EntityLink.entity_a_id.in_(all_involved_ids) | EntityLink.entity_b_id.in_(all_involved_ids)
                ).scalar() or 0
        else:
            new_edges_count = db.query(func.count(EntityLink.id)).filter(
                (EntityLink.entity_a_id == entity_id) | (EntityLink.entity_b_id == entity_id)
            ).scalar() or 0
    except Exception:
        new_edges_count = 0

    return {
        "window_start": window_start,
        "transaction_count": txn_count,
        "unique_accounts": unique_accounts,
        "unique_devices": unique_devices,
        "unique_ips": unique_ips,
        "unique_instruments": unique_instruments,
        "new_edges_count": new_edges_count,
        "failed_count": failed_count,
        "total_amount_paise": total_amount_paise,
        "device_entropy": device_entropy,
        "ip_entropy": ip_entropy,
        "instrument_entropy": instrument_entropy,
        "asn_entropy": asn_entropy,
    }


def update_entity_time_windows(txn: Transaction, db: Session) -> List[EntityTimeWindow]:
    """
    On each transaction, update rolling entity_time_windows across all window sizes
    for the merchant, device, and IP entities.
    """
    ref_time = txn.created_at or datetime.now(timezone.utc)
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)

    entities = []
    if txn.merchant_id:
        entities.append((WindowEntityType.merchant, txn.merchant_id))
    if txn.device_id:
        entities.append((WindowEntityType.device, txn.device_id))
    if txn.ip_id:
        entities.append((WindowEntityType.ip, txn.ip_id))

    records = []
    for etype, eid in entities:
        for wsize in [WindowSize.m5, WindowSize.m15, WindowSize.h1, WindowSize.h24]:
            metrics = aggregate_window_metrics(etype, eid, wsize, ref_time, db)

            win_rec = db.query(EntityTimeWindow).filter(
                EntityTimeWindow.entity_type == etype,
                EntityTimeWindow.entity_id == eid,
                EntityTimeWindow.window_size == wsize,
            ).first()

            if not win_rec:
                win_rec = EntityTimeWindow(
                    entity_type=etype,
                    entity_id=eid,
                    window_size=wsize,
                    window_start=metrics["window_start"],
                )
                db.add(win_rec)

            win_rec.window_start = metrics["window_start"]
            win_rec.transaction_count = metrics["transaction_count"]
            win_rec.unique_accounts = metrics["unique_accounts"]
            win_rec.unique_devices = metrics["unique_devices"]
            win_rec.unique_ips = metrics["unique_ips"]
            win_rec.new_edges_count = metrics["new_edges_count"]
            win_rec.failed_count = metrics["failed_count"]
            win_rec.total_amount_paise = metrics["total_amount_paise"]
            win_rec.device_entropy = metrics["device_entropy"]
            win_rec.ip_entropy = metrics["ip_entropy"]
            win_rec.asn_entropy = metrics["asn_entropy"]

            records.append(win_rec)

    db.flush()
    return records