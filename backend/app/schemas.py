"""
Pydantic schemas.

`FormData` / `RiskAssessment` double as (a) the JSON schema we force the LLM
to emit via Groq's structured/JSON-mode output, and (b) the response shape
consumed directly by the Redux store on the frontend, so field names here
are the single source of truth end-to-end.
"""
from typing import Literal, Optional, List
from pydantic import BaseModel, Field


class AdditionalDeviationField(BaseModel):
    section: Literal["information", "details"]
    label: str
    value: str


class FormData(BaseModel):
    sitePlant: Optional[str] = None
    dateOfOccurrence: Optional[str] = None
    titleShortDescription: Optional[str] = None
    source: Optional[str] = None
    relatedProductMaterial: Optional[str] = None
    batchLotNumber: Optional[str] = None
    detailedDescription: Optional[str] = None
    initialImpact: Optional[str] = None
    initialSeverity: Optional[str] = None
    additionalFields: List[AdditionalDeviationField] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    severityClassification: Optional[str] = Field(
        default=None, description="One of: Critical, Major, Minor"
    )
    rootCauseHypothesis: Optional[str] = None
    nextQaActions: Optional[str] = None
    regulatoryQualityImpact: Optional[str] = None
    nextStepsAndAssurance: Optional[str] = None


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ProcessChatRequest(BaseModel):
    message: str
    conversation: List[ChatMessage] = Field(default_factory=list)
    currentFormData: FormData = Field(default_factory=FormData)
    currentRiskAssessment: RiskAssessment = Field(default_factory=RiskAssessment)
    deviationId: Optional[str] = None


class AgentTurnResponse(BaseModel):
    reply: str
    formData: FormData
    riskAssessment: RiskAssessment
    changedFields: List[str] = Field(default_factory=list)


class ExtractDocumentResponse(BaseModel):
    reply: str
    formData: FormData
    riskAssessment: RiskAssessment
    extractedText: str
    changedFields: List[str] = Field(default_factory=list)


class SaveDeviationRequest(BaseModel):
    deviationId: Optional[str] = None
    formData: FormData
    riskAssessment: RiskAssessment
    conversation: List[ChatMessage] = Field(default_factory=list)


class DeviationOut(BaseModel):
    id: str
    formData: FormData
    riskAssessment: RiskAssessment
    status: str

    class Config:
        from_attributes = True
