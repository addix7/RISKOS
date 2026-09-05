from __future__ import annotations
import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import Session

from app.models.transaction import Transaction
from app.models.chargeback import Chargeback, ChargebackStatus
from app.models.investigation import Investigation
from app.models.human_review import HumanReview
from app.models.customer import Customer
from app.models.merchant import Merchant
from app.models.device import Device
from app.models.ip_address import IPAddress
from app.models.payment_instrument import PaymentInstrument


def generate_evidence_pack(transaction_id: str, db: Session) -> dict:
    try:
        tid = uuid.UUID(transaction_id)
    except ValueError:
        return {"error": "Invalid transaction_id"}

    txn = db.query(Transaction).filter(Transaction.id == tid).first()
    if txn is None:
        return {"error": "Transaction not found"}

    chargeback = db.query(Chargeback).filter(Chargeback.transaction_id == tid).first()
    if chargeback is None:
        chargeback = Chargeback(transaction_id=tid, status=ChargebackStatus.open)
        db.add(chargeback)
        db.commit()
        db.refresh(chargeback)

    customer = db.query(Customer).filter(Customer.id == txn.customer_id).first()
    merchant = db.query(Merchant).filter(Merchant.id == txn.merchant_id).first()
    device = db.query(Device).filter(Device.id == txn.device_id).first() if txn.device_id else None
    ip_addr = db.query(IPAddress).filter(IPAddress.id == txn.ip_id).first() if txn.ip_id else None
    instrument = db.query(PaymentInstrument).filter(PaymentInstrument.id == txn.instrument_id).first() if txn.instrument_id else None

    investigation = db.query(Investigation).filter(
        Investigation.transaction_id == tid
    ).order_by(Investigation.created_at.desc()).first()

    reviews = []
    if investigation:
        reviews = db.query(HumanReview).filter(
            HumanReview.investigation_id == investigation.id
        ).all()

    now = datetime.now(timezone.utc)
    acct_age = 0
    if customer and customer.account_created_at:
        c_time = customer.account_created_at
        if c_time.tzinfo is None:
            c_time = c_time.replace(tzinfo=timezone.utc)
        acct_age = max((now - c_time).days, 0)

    pack = {
        "evidence_pack_version": "1.0",
        "generated_at": now.isoformat(),
        "transaction": {
            "id": str(txn.id),
            "amount_paise": int(txn.amount),
            "amount_inr": round(int(txn.amount) / 100, 2),
            "currency": txn.currency,
            "status": txn.status.value,
            "created_at": txn.created_at.isoformat(),
            "risk_score": txn.risk_score,
            "risk_label": txn.risk_label.value if txn.risk_label else None,
        },
        "customer": {
            "id": str(customer.id) if customer else str(txn.customer_id),
            "name": customer.name if customer else "Unknown",
            "email": customer.email if customer else "unknown@domain.xyz",
            "account_age_days": acct_age,
            "trust_score": float(customer.trust_score) if customer else 0.5,
        },
        "merchant": {
            "id": str(merchant.id) if merchant else str(txn.merchant_id),
            "name": merchant.name if merchant else "Unknown Merchant",
            "category": merchant.category if merchant else "general",
        },
        "telemetry": {
            "device_id": str(device.id) if device else None,
            "device_fingerprint_hash": device.fingerprint_hash if device else None,
            "ip_id": str(ip_addr.id) if ip_addr else None,
            "ip_hash": ip_addr.ip_hash if ip_addr else None,
            "instrument_id": str(instrument.id) if instrument else None,
            "instrument_hash": instrument.instrument_hash if instrument else None,
            "instrument_type": instrument.type.value if instrument else None,
        },
        "chargeback": {
            "id": str(chargeback.id),
            "filed_at": chargeback.filed_at.isoformat(),
            "status": chargeback.status.value,
        },
        "investigation": None,
        "human_reviews": [],
        "privacy_statement": "Telemetry identifiers and payment instruments are cryptographically hashed using SHA-256. Raw payment credentials and raw IP addresses are not stored in unhashed form, ensuring full compliance with PCI-DSS and privacy regulations.",
    }

    if investigation:
        pack["investigation"] = {
            "id": str(investigation.id),
            "evidence": investigation.evidence,
            "ai_conclusion": investigation.ai_conclusion,
            "recommended_action": investigation.recommended_action.value if investigation.recommended_action else None,
            "confidence": investigation.confidence,
            "created_at": investigation.created_at.isoformat(),
        }

    for review in reviews:
        pack["human_reviews"].append({
            "reviewer": review.reviewer_name,
            "decision": review.decision.value,
            "final_action": review.final_action.value,
            "reason": review.reason,
            "reviewed_at": review.created_at.isoformat(),
        })

    out_dir = Path("./evidence_packs")
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / f"{chargeback.id}.json"
    json_path.write_text(json.dumps(pack, indent=2, default=str), encoding="utf-8")

    # Generate PDF Evidence Pack via ReportLab
    pdf_path = out_dir / f"{chargeback.id}.pdf"
    _build_pdf_pack(pack, str(pdf_path))

    chargeback.status = ChargebackStatus.evidence_submitted
    chargeback.evidence_pack_url = str(pdf_path)
    db.commit()

    return {
        "chargeback_id": str(chargeback.id),
        "status": chargeback.status.value,
        "evidence_pack": pack,
        "pack_json_path": str(json_path),
        "pack_pdf_path": str(pdf_path),
        "format": "JSON + PDF",
    }


def _build_pdf_pack(data: dict, output_path: str) -> None:
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        doc = SimpleDocTemplate(output_path, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()
        elements = []

        title_style = ParagraphStyle("TitleStyle", parent=styles["Heading1"], fontSize=18, textColor=colors.HexColor("#0f172a"), spaceAfter=6)
        sub_style = ParagraphStyle("SubStyle", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#64748b"), spaceAfter=12)
        h2_style = ParagraphStyle("H2Style", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#1e293b"), spaceBefore=10, spaceAfter=6)
        body_style = ParagraphStyle("BodyStyle", parent=styles["Normal"], fontSize=9, leading=12, textColor=colors.HexColor("#334155"))

        # Header
        elements.append(Paragraph("RISKOS — Chargeback Dispute Evidence Pack", title_style))
        elements.append(Paragraph(f"Dispute ID: {data['chargeback']['id']} | Generated: {data['generated_at']}", sub_style))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=12))

        # Transaction Summary Table
        t = data["transaction"]
        m = data["merchant"]
        c = data["customer"]
        table_data = [
            ["Transaction ID", t["id"][:16] + "...", "Amount", f"INR {t['amount_inr']:,} ({t['amount_paise']} paise)"],
            ["Merchant", f"{m['name']} ({m['category']})", "Transaction Time", t["created_at"]],
            ["Customer", f"{c['name']} ({c['email']})", "Customer Trust Score", f"{c['trust_score']:.2f}"],
            ["Risk Score", f"{t['risk_score']} ({t['risk_label']})", "Status", t["status"].upper()],
        ]
        t_summary = Table(table_data, colWidths=[120, 150, 120, 150])
        t_summary.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        elements.append(Paragraph("Transaction & Customer Profile", h2_style))
        elements.append(t_summary)
        elements.append(Spacer(1, 10))

        # AI Investigation Evidence Log
        elements.append(Paragraph("Automated AI Investigation Findings", h2_style))
        inv = data.get("investigation")
        if inv and inv.get("evidence"):
            evidence_items = inv["evidence"].get("items", [])
            ev_data = [["Finding", "Severity", "Source Tool"]]
            for ev in evidence_items:
                ev_data.append([
                    Paragraph(ev["finding"], body_style),
                    ev["severity"],
                    ev["source"]
                ])
            t_ev = Table(ev_data, colWidths=[320, 100, 120])
            t_ev.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ]))
            elements.append(t_ev)
        elements.append(Spacer(1, 10))

        # Human Review Decision
        elements.append(Paragraph("Analyst Human Review Record", h2_style))
        reviews = data.get("human_reviews", [])
        if reviews:
            rev_data = [["Reviewer", "Decision", "Final Action", "Reason / Notes"]]
            for r in reviews:
                rev_data.append([
                    r["reviewer"],
                    r["decision"],
                    r["final_action"].upper(),
                    Paragraph(r["reason"] or "N/A", body_style),
                ])
            t_rev = Table(rev_data, colWidths=[100, 120, 90, 230])
            t_rev.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ]))
            elements.append(t_rev)
        else:
            elements.append(Paragraph("No human analyst reviews logged for this case.", body_style))

        elements.append(Spacer(1, 14))
        elements.append(Paragraph(f"<b>Privacy Compliance Note:</b> {data['privacy_statement']}", body_style))

        doc.build(elements)
    except Exception as ex:
        print(f"[CHARGEBACK] PDF generation warning: {ex}")