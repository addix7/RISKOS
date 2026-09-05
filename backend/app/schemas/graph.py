from typing import List, Optional
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    properties: dict = {}
    is_flagged: bool = False


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    strength: float = 1.0


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    abuse_ring_detected: bool = False
    abuse_ring_confidence: Optional[float] = None
    center_customer_id: str
