from __future__ import annotations
import uuid
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app.models.entity_link import EntityLink, EntityType
from app.models.transaction import Transaction
from app.models.customer import Customer


def upsert_entity_links(txn: Transaction, db: Session) -> None:
    links_to_upsert = []

    if txn.device_id:
        links_to_upsert.append((
            EntityType.customer, txn.customer_id,
            EntityType.device, txn.device_id,
            "shared_device", 1.0,
        ))

    if txn.ip_id:
        links_to_upsert.append((
            EntityType.customer, txn.customer_id,
            EntityType.ip, txn.ip_id,
            "shared_ip", 1.0,
        ))

    if txn.instrument_id:
        links_to_upsert.append((
            EntityType.customer, txn.customer_id,
            EntityType.instrument, txn.instrument_id,
            "owns_instrument", 1.0,
        ))

    for a_type, a_id, b_type, b_id, rel, strength in links_to_upsert:
        existing = db.query(EntityLink).filter(
            EntityLink.entity_a_type == a_type,
            EntityLink.entity_a_id == a_id,
            EntityLink.entity_b_type == b_type,
            EntityLink.entity_b_id == b_id,
            EntityLink.relationship == rel,
        ).first()
        if not existing:
            link = EntityLink(
                entity_a_type=a_type,
                entity_a_id=a_id,
                entity_b_type=b_type,
                entity_b_id=b_id,
                relationship=rel,
                strength=strength,
            )
            db.add(link)

    db.commit()


def build_customer_graph(customer_id: str, db: Session, hops: int = 2) -> dict:
    try:
        cid = uuid.UUID(customer_id)
    except ValueError:
        return {
            "nodes": [],
            "edges": [],
            "abuse_ring_detected": False,
            "abuse_ring_confidence": 0.0,
            "center_customer_id": customer_id
        }

    nodes = {}
    raw_edges = []
    visited_customers = set()

    def _add_customer_node(cust_id: uuid.UUID):
        if str(cust_id) in nodes:
            return
        customer = db.query(Customer).filter(Customer.id == cust_id).first()
        label = customer.name if customer else str(cust_id)[:8]
        nodes[str(cust_id)] = {
            "id": str(cust_id),
            "type": "customer",
            "label": label,
            "properties": {"trust_score": float(customer.trust_score) if customer else 0.5},
            "is_flagged": (customer.trust_score < 0.3) if customer else False,
        }

    def _explore(entity_type_str: str, entity_id: uuid.UUID, depth: int):
        if depth <= 0:
            return

        try:
            etype = EntityType(entity_type_str)
        except ValueError:
            return

        links = db.query(EntityLink).filter(
            ((EntityLink.entity_a_type == etype) & (EntityLink.entity_a_id == entity_id)) |
            ((EntityLink.entity_b_type == etype) & (EntityLink.entity_b_id == entity_id))
        ).all()

        for link in links:
            a_id = str(link.entity_a_id)
            b_id = str(link.entity_b_id)
            a_type = link.entity_a_type.value
            b_type = link.entity_b_type.value

            # Add nodes
            for nid, ntype in [(a_id, a_type), (b_id, b_type)]:
                if nid not in nodes:
                    if ntype == "customer":
                        _add_customer_node(uuid.UUID(nid))
                    else:
                        nodes[nid] = {
                            "id": nid,
                            "type": ntype,
                            "label": f"{ntype}:{nid[:8]}",
                            "properties": {},
                            "is_flagged": False,
                        }

            if b_type in ("device", "ip", "instrument"):
                try:
                    cnt = _count_customers_for_entity(b_type, link.entity_b_id, db)
                    if cnt > 1:
                        nodes[b_id]["is_flagged"] = True
                        nodes[b_id]["properties"]["shared_by_customers"] = cnt
                except Exception:
                    pass

            raw_edges.append({
                "source": a_id,
                "target": b_id,
                "relationship": link.relationship,
                "strength": link.strength,
            })

            other_id_str = b_id if a_id == str(entity_id) else a_id
            other_type_str = b_type if a_id == str(entity_id) else a_type
            other_uuid = link.entity_b_id if a_id == str(entity_id) else link.entity_a_id

            if other_type_str == "customer" and other_id_str not in visited_customers and depth > 1:
                visited_customers.add(other_id_str)
                _explore("customer", other_uuid, depth - 1)
            elif other_type_str != "customer" and depth > 1:
                _explore(other_type_str, other_uuid, depth - 1)

    _add_customer_node(cid)
    visited_customers.add(str(cid))
    _explore("customer", cid, hops)

    # Deduplicate edges so edge count matches unique edges exactly
    seen_edges = set()
    deduped_edges = []
    for e in raw_edges:
        key = (e["source"], e["target"], e["relationship"])
        if key not in seen_edges:
            seen_edges.add(key)
            deduped_edges.append(e)

    all_customer_ids = [nid for nid, n in nodes.items() if n["type"] == "customer"]
    abuse_ring = len(all_customer_ids) >= 3
    abuse_confidence = min(len(all_customer_ids) / 10, 1.0) if abuse_ring else 0.0

    return {
        "nodes": list(nodes.values()),
        "edges": deduped_edges,
        "abuse_ring_detected": abuse_ring,
        "abuse_ring_confidence": round(abuse_confidence, 3),
        "center_customer_id": customer_id,
    }


def _count_customers_for_entity(entity_type: str, entity_id: uuid.UUID, db: Session) -> int:
    try:
        et = EntityType(entity_type)
    except ValueError:
        return 0
    return db.query(func.count(distinct(EntityLink.entity_a_id))).filter(
        EntityLink.entity_b_type == et,
        EntityLink.entity_b_id == entity_id,
        EntityLink.entity_a_type == EntityType.customer,
    ).scalar() or 0