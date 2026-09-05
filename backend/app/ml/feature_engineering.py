from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.models.transaction import Transaction, TransactionStatus
from app.models.entity_link import EntityLink, EntityType

# Default population baseline amount in paise (₹2,500 = 250,000 paise)
GLOBAL_BASELINE_AMOUNT_PAISE = 250000.0

FEATURE_COLUMNS = [
    "account_age_days",
    "avg_amount",
    "prior_txn_count",
    "prior_chargeback_count",
    "amount_vs_avg_ratio",
    "no_history",
    "txn_freq_1h",
    "failed_count_30m",
    "is_new_device",
    "device_distinct_customers",
    "is_new_ip",
    "ip_distinct_customers",
    "instrument_distinct_customers",
    "trust_score",
]


def compute_features(txn: Transaction, db: Session) -> dict:
    now = datetime.now(timezone.utc)
    customer = txn.customer

    acct_created = customer.account_created_at if customer else now
    if acct_created.tzinfo is None:
        acct_created = acct_created.replace(tzinfo=timezone.utc)
    account_age_days = max((now - acct_created).days, 0)

    past_txns = db.query(Transaction).filter(
        Transaction.customer_id == txn.customer_id,
        Transaction.id != txn.id,
        Transaction.created_at < txn.created_at,
    ).all()

    prior_txn_count = len(past_txns)
    no_history = 1.0 if prior_txn_count == 0 else 0.0

    if prior_txn_count > 0:
        past_amounts = [int(t.amount) for t in past_txns]
        avg_amount = float(np.mean(past_amounts))
    else:
        # Static baseline for first transaction ensures stability and eliminates cold-start blindness
        avg_amount = GLOBAL_BASELINE_AMOUNT_PAISE

    amount_vs_avg_ratio = float(int(txn.amount) / avg_amount) if avg_amount > 0 else 1.0
    amount_vs_avg_ratio = min(amount_vs_avg_ratio, 50.0)

    from app.models.chargeback import Chargeback
    prior_chargeback_count = db.query(func.count(Chargeback.id)).join(
        Transaction, Chargeback.transaction_id == Transaction.id
    ).filter(Transaction.customer_id == txn.customer_id).scalar() or 0

    txn_time = txn.created_at
    if txn_time.tzinfo is None:
        txn_time = txn_time.replace(tzinfo=timezone.utc)

    one_hour_ago = txn_time - timedelta(hours=1)
    thirty_min_ago = txn_time - timedelta(minutes=30)

    txn_freq_1h = db.query(func.count(Transaction.id)).filter(
        Transaction.customer_id == txn.customer_id,
        Transaction.id != txn.id,
        Transaction.created_at >= one_hour_ago,
        Transaction.created_at <= txn_time,
    ).scalar() or 0

    failed_count_30m = db.query(func.count(Transaction.id)).filter(
        Transaction.customer_id == txn.customer_id,
        Transaction.id != txn.id,
        Transaction.status == TransactionStatus.declined,
        Transaction.created_at >= thirty_min_ago,
        Transaction.created_at <= txn_time,
    ).scalar() or 0

    is_new_device = 1
    device_distinct_customers = 1
    if txn.device_id:
        prev_device_use = db.query(func.count(Transaction.id)).filter(
            Transaction.customer_id == txn.customer_id,
            Transaction.device_id == txn.device_id,
            Transaction.id != txn.id,
        ).scalar() or 0
        is_new_device = 0 if prev_device_use > 0 else 1

        device_distinct_customers = db.query(
            func.count(distinct(Transaction.customer_id))
        ).filter(
            Transaction.device_id == txn.device_id,
        ).scalar() or 1
        device_distinct_customers = min(device_distinct_customers, 50)

    is_new_ip = 1
    ip_distinct_customers = 1
    if txn.ip_id:
        prev_ip_use = db.query(func.count(Transaction.id)).filter(
            Transaction.customer_id == txn.customer_id,
            Transaction.ip_id == txn.ip_id,
            Transaction.id != txn.id,
        ).scalar() or 0
        is_new_ip = 0 if prev_ip_use > 0 else 1

        ip_distinct_customers = db.query(
            func.count(distinct(Transaction.customer_id))
        ).filter(
            Transaction.ip_id == txn.ip_id,
        ).scalar() or 1
        ip_distinct_customers = min(ip_distinct_customers, 50)

    instrument_distinct_customers = 1
    if txn.instrument_id:
        instrument_distinct_customers = db.query(
            func.count(distinct(Transaction.customer_id))
        ).filter(
            Transaction.instrument_id == txn.instrument_id,
        ).scalar() or 1
        instrument_distinct_customers = min(instrument_distinct_customers, 50)

    trust_score = float(customer.trust_score) if (customer and customer.trust_score is not None) else 0.5

    return {
        "account_age_days": float(account_age_days),
        "avg_amount": float(avg_amount),
        "prior_txn_count": float(prior_txn_count),
        "prior_chargeback_count": float(prior_chargeback_count),
        "amount_vs_avg_ratio": float(amount_vs_avg_ratio),
        "no_history": float(no_history),
        "txn_freq_1h": float(txn_freq_1h),
        "failed_count_30m": float(failed_count_30m),
        "is_new_device": float(is_new_device),
        "device_distinct_customers": float(device_distinct_customers),
        "is_new_ip": float(is_new_ip),
        "ip_distinct_customers": float(ip_distinct_customers),
        "instrument_distinct_customers": float(instrument_distinct_customers),
        "trust_score": float(trust_score),
    }