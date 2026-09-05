from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.model_metrics import ModelMetrics
from app.schemas.dashboard import ModelHealthResponse
from app.services.risk_engine import get_model_metrics

router = APIRouter(prefix="/api/model", tags=["Model Health"])


@router.get("/health", response_model=ModelHealthResponse)
def model_health(db: Session = Depends(get_db)):
    """Return model metrics and false-positive rate drift by account age."""
    metrics_rows = db.query(ModelMetrics).order_by(ModelMetrics.run_at.desc()).limit(10).all()
    history = [
        {
            "run_at": m.run_at.isoformat(),
            "precision": m.precision,
            "recall": m.recall,
            "f1_score": m.f1_score,
            "false_positive_rate": m.false_positive_rate,
            "test_set_size": m.test_set_size,
        }
        for m in metrics_rows
    ]
    latest = history[0] if history else get_model_metrics()

    # False Positive Rate on legitimate non-fraud customers by account age cohort
    fp_by_age = _compute_fp_by_age(db)

    return ModelHealthResponse(
        latest=latest,
        history=history,
        fp_rate_by_account_age=fp_by_age,
    )


def _compute_fp_by_age(db: Session) -> dict:
    """
    Compute true False-Positive Rate breakdown by customer account age cohort:
    FPR = (Legitimate transactions flagged as hold/block) / (Total legitimate transactions)
    """
    from app.models.transaction import Transaction, RiskLabel, TransactionStatus
    from app.models.customer import Customer
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    buckets = {
        "new_accounts_lt7d": {"fp": 0, "total_legit": 0},
        "mid_accounts_7_90d": {"fp": 0, "total_legit": 0},
        "established_accounts_gt90d": {"fp": 0, "total_legit": 0},
    }

    # Only evaluate legitimate customers (trust_score >= 0.50, no syndicate accounts)
    legit_txns = db.query(Transaction, Customer).join(
        Customer, Transaction.customer_id == Customer.id
    ).filter(
        Customer.trust_score >= 0.50,
        Transaction.status != TransactionStatus.disputed,
    ).all()

    for txn, cust in legit_txns:
        acct_date = cust.account_created_at.replace(tzinfo=timezone.utc) if cust.account_created_at.tzinfo is None else cust.account_created_at
        age = (now - acct_date).days
        if age < 7:
            k = "new_accounts_lt7d"
        elif age < 90:
            k = "mid_accounts_7_90d"
        else:
            k = "established_accounts_gt90d"

        buckets[k]["total_legit"] += 1
        if txn.risk_label in (RiskLabel.hold, RiskLabel.block):
            buckets[k]["fp"] += 1

    result = {}
    for k, v in buckets.items():
        if v["total_legit"] > 0:
            result[k] = round(v["fp"] / v["total_legit"], 4)
        else:
            result[k] = 0.0
    return result