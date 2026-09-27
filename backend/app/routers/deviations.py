"""
API endpoints:
  POST /api/deviations/process-chat     -> Tool 1 (log) & Tool 2 (edit) -- same endpoint,
                                            distinguished only by whether currentFormData is empty.
  POST /api/deviations/extract-document -> Tool 3 (PDF / email parser)
  POST /api/deviations/save             -> persist finalized record
  GET  /api/deviations                  -> list saved deviations
  GET  /api/deviations/{id}             -> fetch one
"""
import logging

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.graph.graph import run_turn
from app.models import Deviation
from app.schemas import (
    ProcessChatRequest,
    AgentTurnResponse,
    ExtractDocumentResponse,
    SaveDeviationRequest,
    DeviationOut,
    FormData,
    RiskAssessment,
)
from app.services.document_parser import extract_text_from_upload

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/deviations", tags=["deviations"])


@router.post("/process-chat", response_model=AgentTurnResponse)
def process_chat(payload: ProcessChatRequest):
    """
    Handles both:
      - Tool 1 (Log Deviation): currentFormData arrives empty/default.
      - Tool 2 (Edit Deviation): currentFormData already has values; the LLM
        is instructed to only return updates for fields mentioned in the new
        message, and merge_state() preserves everything else untouched.
    """
    result = run_turn(
        mode="chat",
        form_data=payload.currentFormData.model_dump(),
        risk_assessment=payload.currentRiskAssessment.model_dump(),
        conversation=[m.model_dump() for m in payload.conversation],
        user_message=payload.message,
    )

    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])

    return AgentTurnResponse(
        reply=result["reply"],
        formData=FormData(**result["form_data"]),
        riskAssessment=RiskAssessment(**result["risk_assessment"]),
        changedFields=result.get("changed_fields", []),
    )


@router.post("/extract-document", response_model=ExtractDocumentResponse)
async def extract_document(
    file: UploadFile = File(...),
    # currentFormData/currentRiskAssessment are sent as JSON strings in multipart form
    # via the frontend api client; kept simple here by accepting raw form fields.
):
    content = await file.read()
    try:
        extracted_text = extract_text_from_upload(file.filename or "upload.txt", content)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to parse uploaded document")
        raise HTTPException(status_code=400, detail=f"Could not read file: {exc}") from exc

    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in the uploaded file.")

    result = run_turn(
        mode="document",
        form_data={},
        risk_assessment={},
        conversation=[],
        document_text=extracted_text,
    )

    if result.get("error"):
        raise HTTPException(status_code=502, detail=result["error"])

    return ExtractDocumentResponse(
        reply=result["reply"],
        formData=FormData(**result["form_data"]),
        riskAssessment=RiskAssessment(**result["risk_assessment"]),
        extractedText=extracted_text,
        changedFields=result.get("changed_fields", []),
    )


@router.post("/save", response_model=DeviationOut)
def save_deviation(payload: SaveDeviationRequest, db: Session = Depends(get_db)):
    fd = payload.formData
    ra = payload.riskAssessment

    if payload.deviationId:
        record = db.get(Deviation, payload.deviationId)
        if not record:
            raise HTTPException(status_code=404, detail="Deviation not found")
    else:
        record = Deviation()
        db.add(record)

    record.product_name = fd.relatedProductMaterial
    record.product_grade_strength = None
    record.batch_lot_number = fd.batchLotNumber
    record.manufacturing_date = None
    record.expiry_date = None
    record.process_step = None
    record.equipment_id = None
    record.deviation_details = fd.detailedDescription or fd.titleShortDescription
    record.affected_quantity = None

    record.severity_classification = fd.initialSeverity or ra.severityClassification
    record.root_cause_hypothesis = ra.rootCauseHypothesis
    record.next_qa_actions = ra.nextQaActions
    record.regulatory_quality_impact = ra.regulatoryQualityImpact

    record.form_data_json = fd.model_dump()
    record.risk_assessment_json = ra.model_dump()
    record.conversation_json = [m.model_dump() for m in payload.conversation]
    record.status = "saved"

    db.commit()
    db.refresh(record)

    return DeviationOut(
        id=record.id,
        formData=FormData(**record.form_data_json),
        riskAssessment=RiskAssessment(**record.risk_assessment_json),
        status=record.status,
    )


@router.get("", response_model=list[DeviationOut])
def list_deviations(db: Session = Depends(get_db)):
    records = db.query(Deviation).order_by(Deviation.updated_at.desc()).all()
    return [
        DeviationOut(
            id=r.id,
            formData=FormData(**(r.form_data_json or {})),
            riskAssessment=RiskAssessment(**(r.risk_assessment_json or {})),
            status=r.status,
        )
        for r in records
    ]


@router.get("/{deviation_id}", response_model=DeviationOut)
def get_deviation(deviation_id: str, db: Session = Depends(get_db)):
    record = db.get(Deviation, deviation_id)
    if not record:
        raise HTTPException(status_code=404, detail="Deviation not found")
    return DeviationOut(
        id=record.id,
        formData=FormData(**(record.form_data_json or {})),
        riskAssessment=RiskAssessment(**(record.risk_assessment_json or {})),
        status=record.status,
    )
