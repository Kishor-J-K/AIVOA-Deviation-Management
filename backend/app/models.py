"""
ORM models.

`Deviation` stores the finalized, saved record. `formData` / `riskAssessment`
are also kept as raw JSON snapshots (`form_data_json`, `risk_assessment_json`)
so the full AI-produced state round-trips exactly, in addition to the
individually-queryable flattened columns used for reporting/search.
"""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Text, JSON

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Deviation(Base):
    __tablename__ = "deviations"

    id = Column(String(36), primary_key=True, default=_uuid)

    # --- Product / batch details ---
    product_name = Column(String(255), nullable=True)
    product_grade_strength = Column(String(255), nullable=True)
    batch_lot_number = Column(String(255), nullable=True)
    manufacturing_date = Column(String(64), nullable=True)  # kept as string: user input may be partial
    expiry_date = Column(String(64), nullable=True)

    # --- Deviation event details ---
    process_step = Column(String(255), nullable=True)
    equipment_id = Column(String(255), nullable=True)
    deviation_details = Column(Text, nullable=True)
    affected_quantity = Column(String(128), nullable=True)

    # --- AI risk assessment ---
    severity_classification = Column(String(64), nullable=True)   # Critical / Major / Minor
    root_cause_hypothesis = Column(Text, nullable=True)
    next_qa_actions = Column(Text, nullable=True)
    regulatory_quality_impact = Column(Text, nullable=True)

    # --- Full JSON snapshots (source of truth for the UI) ---
    form_data_json = Column(JSON, nullable=False, default=dict)
    risk_assessment_json = Column(JSON, nullable=False, default=dict)
    conversation_json = Column(JSON, nullable=False, default=list)

    status = Column(String(32), default="draft")  # draft | saved

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
