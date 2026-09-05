from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.graph import GraphResponse
from app.services.graph_builder import build_customer_graph

router = APIRouter(prefix="/api/graph", tags=["Graph"])


@router.get("/{customer_id}")
def get_entity_graph(
    customer_id: str,
    hops: int = Query(default=2, ge=1, le=3),
    db: Session = Depends(get_db),
):
    """Get entity relationship graph centered on a customer."""
    return build_customer_graph(customer_id, db, hops=hops)
