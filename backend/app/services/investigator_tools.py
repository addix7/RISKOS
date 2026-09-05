from __future__ import annotations
import uuid
from typing import Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.models.transaction import Transaction
from app.models.customer import Customer
from app.models.chargeback import Chargeback
from app.models.entity_link import EntityLink, EntityType
from app.models.merchant import Merchant


def get_customer_history(customer_id: str, db: Session) -> dict:
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        return {"error": "Invalid customer_id"}

    customer = db.query(Customer).filter(Customer.id == cid).first()
    if not customer:
        return {"error": "Customer not found"}

    now = datetime.now(timezone.utc)
    acct_created = customer.account_created_at
    if acct_created.tzinfo is None:
        acct_created = acct_created.replace(tzinfo=timezone.utc)

    return {
        "customer_id": str(cid),
        "name": customer.name,
        "email": customer.email,
        "account_age_days": max((now - acct_created).days, 0),
        "trust_score": float(customer.trust_score),
    }


def get_transaction_history(customer_id: str, db: Session, limit: int = 20) -> dict:
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        return {"error": "Invalid customer_id"}

    txns = db.query(Transaction).filter(
        Transaction.customer_id == cid
    ).order_by(Transaction.created_at.desc()).limit(limit).all()

    return {
        "customer_id": str(cid),
        "transaction_count": len(txns),
        "transactions": [
            {
                "id": str(t.id),
                "amount_inr": round(int(t.amount) / 100, 2),
                "status": t.status.value,
                "risk_score": t.risk_score,
                "risk_label": t.risk_label.value if t.risk_label else None,
                "created_at": t.created_at.isoformat(),
            }
            for t in txns
        ],
    }


def get_device_history(device_id: str, db: Session) -> dict:
    try:
        did = uuid.UUID(device_id)
    except ValueError:
        return {"error": "Invalid device_id"}

    txns = db.query(Transaction).filter(Transaction.device_id == did).all()
    customer_ids = list(set(str(t.customer_id) for t in txns))

    return {
        "device_id": device_id,
        "total_transactions": len(txns),
        "distinct_customers": len(customer_ids),
        "customer_ids": customer_ids[:20],
        "risk_signal": "HIGH" if len(customer_ids) > 1 else "LOW",
    }


def get_ip_history(ip_id: str, db: Session) -> dict:
    try:
        iid = uuid.UUID(ip_id)
    except ValueError:
        return {"error": "Invalid ip_id"}

    txns = db.query(Transaction).filter(Transaction.ip_id == iid).all()
    customer_ids = list(set(str(t.customer_id) for t in txns))

    return {
        "ip_id": ip_id,
        "total_transactions": len(txns),
        "distinct_customers": len(customer_ids),
        "customer_ids": customer_ids[:20],
        "risk_signal": "HIGH" if len(customer_ids) > 2 else "LOW",
    }


def get_instrument_history(instrument_id: str, db: Session) -> dict:
    try:
        iid = uuid.UUID(instrument_id)
    except ValueError:
        return {"error": "Invalid instrument_id"}

    txns = db.query(Transaction).filter(Transaction.instrument_id == iid).all()
    customer_ids = list(set(str(t.customer_id) for t in txns))

    return {
        "instrument_id": instrument_id,
        "total_transactions": len(txns),
        "distinct_customers": len(customer_ids),
        "customer_ids": customer_ids[:20],
        "risk_signal": "HIGH" if len(customer_ids) > 1 else "LOW",
    }


def get_merchant_history(merchant_id: str, db: Session) -> dict:
    try:
        mid = uuid.UUID(merchant_id)
    except ValueError:
        return {"error": "Invalid merchant_id"}

    merchant = db.query(Merchant).filter(Merchant.id == mid).first()
    if not merchant:
        return {"error": "Merchant not found"}

    now = datetime.now(timezone.utc)
    recent_txns = db.query(func.count(Transaction.id)).filter(
        Transaction.merchant_id == mid,
        Transaction.created_at >= now - timedelta(hours=1),
    ).scalar() or 0

    total_txns = db.query(func.count(Transaction.id)).filter(
        Transaction.merchant_id == mid
    ).scalar() or 0

    return {
        "merchant_id": merchant_id,
        "name": merchant.name,
        "category": merchant.category,
        "total_transactions": total_txns,
        "transactions_last_hour": recent_txns,
    }


def get_related_accounts(customer_id: str, db: Session) -> dict:
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        return {"error": "Invalid customer_id"}

    direct_links = db.query(EntityLink).filter(
        (EntityLink.entity_a_id == cid) | (EntityLink.entity_b_id == cid)
    ).all()

    linked_entities = []
    connected_cust_ids = set()
    shared_breakdown = {"shared_device_accounts": 0, "shared_ip_accounts": 0, "shared_instrument_accounts": 0}

    for link in direct_links:
        entity_id = link.entity_b_id if link.entity_a_id == cid else link.entity_a_id
        entity_type = link.entity_b_type if link.entity_a_id == cid else link.entity_a_type
        
        secondary_links = db.query(EntityLink).filter(
            ((EntityLink.entity_a_id == entity_id) & (EntityLink.entity_b_type == EntityType.customer)) |
            ((EntityLink.entity_b_id == entity_id) & (EntityLink.entity_a_type == EntityType.customer))
        ).all()
        
        sharing_custs = set()
        for sl in secondary_links:
            cust_other = sl.entity_b_id if sl.entity_a_id == entity_id else sl.entity_a_id
            if cust_other != cid:
                sharing_custs.add(str(cust_other))
                connected_cust_ids.add(str(cust_other))

        count_other = len(sharing_custs)
        if link.relationship == "shared_device":
            shared_breakdown["shared_device_accounts"] = max(shared_breakdown["shared_device_accounts"], count_other)
        elif link.relationship == "shared_ip":
            shared_breakdown["shared_ip_accounts"] = max(shared_breakdown["shared_ip_accounts"], count_other)
        elif link.relationship in ("owns_instrument", "shared_instrument"):
            shared_breakdown["shared_instrument_accounts"] = max(shared_breakdown["shared_instrument_accounts"], count_other)

        linked_entities.append({
            "entity_id": str(entity_id),
            "entity_type": entity_type.value,
            "relationship": link.relationship,
            "other_linked_accounts_count": count_other,
        })

    total_connected = len(connected_cust_ids)
    risk_signal = "HIGH" if (total_connected >= 2 or any(v > 1 for v in shared_breakdown.values())) else "LOW"

    return {
        "customer_id": customer_id,
        "direct_linked_entities_count": len(linked_entities),
        "total_connected_accounts_count": total_connected,
        "connected_customer_ids": list(connected_cust_ids)[:20],
        "shared_infrastructure": shared_breakdown,
        "risk_signal": risk_signal,
    }


def get_chargeback_history(customer_id: str, db: Session) -> dict:
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        return {"error": "Invalid customer_id"}

    chargebacks = db.query(Chargeback).join(
        Transaction, Chargeback.transaction_id == Transaction.id
    ).filter(Transaction.customer_id == cid).all()

    return {
        "customer_id": customer_id,
        "chargeback_count": len(chargebacks),
        "chargebacks": [
            {
                "id": str(cb.id),
                "transaction_id": str(cb.transaction_id),
                "status": cb.status.value,
                "filed_at": cb.filed_at.isoformat(),
            }
            for cb in chargebacks
        ],
        "risk_signal": "HIGH" if len(chargebacks) > 1 else "MEDIUM" if len(chargebacks) == 1 else "LOW",
    }


TOOL_DEFINITIONS = [
    {
        "name": "get_customer_history",
        "description": "Retrieve customer account details and trust score for a given customer ID.",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string", "description": "UUID of the customer"}},
            "required": ["customer_id"],
        },
    },
    {
        "name": "get_transaction_history",
        "description": "Retrieve recent transaction history for a customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "customer_id": {"type": "string"},
                "limit": {"type": "integer", "default": 20},
            },
            "required": ["customer_id"],
        },
    },
    {
        "name": "get_device_history",
        "description": "Check how many distinct customers have used a device. High count = abuse risk.",
        "input_schema": {
            "type": "object",
            "properties": {"device_id": {"type": "string"}},
            "required": ["device_id"],
        },
    },
    {
        "name": "get_ip_history",
        "description": "Check how many distinct customers have used an IP address.",
        "input_schema": {
            "type": "object",
            "properties": {"ip_id": {"type": "string"}},
            "required": ["ip_id"],
        },
    },
    {
        "name": "get_instrument_history",
        "description": "Check how many distinct customers have used a payment instrument.",
        "input_schema": {
            "type": "object",
            "properties": {"instrument_id": {"type": "string"}},
            "required": ["instrument_id"],
        },
    },
    {
        "name": "get_merchant_history",
        "description": "Get merchant profile and recent transaction volume.",
        "input_schema": {
            "type": "object",
            "properties": {"merchant_id": {"type": "string"}},
            "required": ["merchant_id"],
        },
    },
    {
        "name": "get_related_accounts",
        "description": "Traverse entity relationship graph to find accounts connected to this customer via shared device/IP/instrument.",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string"}},
            "required": ["customer_id"],
        },
    },
    {
        "name": "get_chargeback_history",
        "description": "Retrieve chargeback history for a customer.",
        "input_schema": {
            "type": "object",
            "properties": {"customer_id": {"type": "string"}},
            "required": ["customer_id"],
        },
    },
]

TOOL_FUNCTION_MAP = {
    "get_customer_history": get_customer_history,
    "get_transaction_history": get_transaction_history,
    "get_device_history": get_device_history,
    "get_ip_history": get_ip_history,
    "get_instrument_history": get_instrument_history,
    "get_merchant_history": get_merchant_history,
    "get_related_accounts": get_related_accounts,
    "get_chargeback_history": get_chargeback_history,
}