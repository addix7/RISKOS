import hashlib
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.schemas.transaction import TransactionCreate, TransactionResponse, TransactionListResponse
from app.models.transaction import Transaction, TransactionStatus
from app.models.device import Device
from app.models.ip_address import IPAddress
from app.models.payment_instrument import PaymentInstrument, InstrumentType
from app.services.graph_builder import upsert_entity_links

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _hash(value: str) -> str:
    """SHA-256 hash a PII field."""
    return hashlib.sha256(value.encode()).hexdigest()


@router.get("", response_model=TransactionListResponse)
def list_transactions(
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Offset"),
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List transactions with pagination and optional filtering."""
    query = db.query(Transaction)

    if customer_id:
        try:
            cid = uuid.UUID(customer_id)
            query = query.filter(Transaction.customer_id == cid)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid customer_id UUID")

    if status:
        try:
            st = TransactionStatus(status.lower())
            query = query.filter(Transaction.status == st)
        except ValueError:
            pass

    total = query.count()
    txns = query.order_by(Transaction.created_at.desc()).offset(offset).limit(limit).all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in txns],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)):
    """Retrieve a single transaction by UUID."""
    try:
        tid = uuid.UUID(transaction_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid transaction_id UUID")

    txn = db.query(Transaction).filter(Transaction.id == tid).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return TransactionResponse.model_validate(txn)


@router.post("", response_model=TransactionResponse, status_code=201)
def ingest_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    """Ingest a new payment transaction."""
    device = None
    if payload.device_fingerprint:
        fp_hash = _hash(payload.device_fingerprint)
        device = db.query(Device).filter(Device.fingerprint_hash == fp_hash).first()
        if not device:
            device = Device(fingerprint_hash=fp_hash)
            db.add(device)
            db.flush()

    ip = None
    if payload.ip_address:
        ip_hash = _hash(payload.ip_address)
        ip = db.query(IPAddress).filter(IPAddress.ip_hash == ip_hash).first()
        if not ip:
            ip = IPAddress(ip_hash=ip_hash)
            db.add(ip)
            db.flush()

    instrument = None
    if payload.instrument_hash:
        inst_hash = _hash(payload.instrument_hash)
        instrument = db.query(PaymentInstrument).filter(
            PaymentInstrument.instrument_hash == inst_hash
        ).first()
        if not instrument:
            try:
                itype = InstrumentType(payload.instrument_type or "card")
            except ValueError:
                itype = InstrumentType.card
            instrument = PaymentInstrument(instrument_hash=inst_hash, type=itype)
            db.add(instrument)
            db.flush()

    txn = Transaction(
        customer_id=payload.customer_id,
        merchant_id=payload.merchant_id,
        device_id=device.id if device else None,
        ip_id=ip.id if ip else None,
        instrument_id=instrument.id if instrument else None,
        amount=payload.amount,
        currency=payload.currency,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)

    upsert_entity_links(txn, db)
    return TransactionResponse.model_validate(txn)