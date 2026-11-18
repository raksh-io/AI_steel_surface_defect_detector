"""
Pydantic Schemas
================
Request / response data shapes for all API endpoints.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ─────────────────────────────────────────
# Auth Schemas
# ─────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=72)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


# ─────────────────────────────────────────
# Inspection Schemas
# ─────────────────────────────────────────

class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    defect_class: str
    class_index: int
    confidence: float
    is_defect: bool
    original_image_path: Optional[str]
    gradcam_image_path: Optional[str]
    source: str
    notes: Optional[str]
    created_at: datetime


class InspectionListResponse(BaseModel):
    total: int
    items: List[InspectionOut]


class InspectionUpdateNotes(BaseModel):
    notes: Optional[str] = Field(None, max_length=2000)


# ─────────────────────────────────────────
# Inference / Prediction Schemas
# ─────────────────────────────────────────

class PredictionResult(BaseModel):
    """Response from POST /inspect/upload and POST /inspect/webcam-frame"""
    inspection_id: int
    defect_class: str
    class_index: int
    confidence: float
    is_defect: bool
    gradcam_base64: str         # base64-encoded PNG of Grad-CAM overlay
    original_base64: str        # base64-encoded PNG of original (224×224)
    source: str


# ─────────────────────────────────────────
# Dashboard Schemas
# ─────────────────────────────────────────

class ClassDistributionItem(BaseModel):
    defect_class: str
    count: int


class DashboardStats(BaseModel):
    total_inspections: int
    total_defects: int
    defect_rate: float                              # 0-1
    class_distribution: List[ClassDistributionItem]
    recent_inspections: List[InspectionOut]


class ConfidenceBucket(BaseModel):
    range: str
    min: float
    max: float
    count: int


class SourceBreakdownItem(BaseModel):
    name: str
    value: int


class TimelineItem(BaseModel):
    date: str
    total: int
    defects: int


class DashboardAnalytics(BaseModel):
    total_inspections: int
    total_defects: int
    defect_rate: float
    avg_confidence: float
    top_defect_class: Optional[str]
    confidence_histogram: List[ConfidenceBucket]
    source_breakdown: List[SourceBreakdownItem]
    timeline: List[TimelineItem]
    class_distribution: List[ClassDistributionItem]
