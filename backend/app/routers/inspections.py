"""
Inspections Router
==================
POST /api/inspect/upload         — upload an image, get prediction + Grad-CAM
POST /api/inspect/webcam-frame   — submit a webcam frame (base64 or multipart)
GET  /api/inspect/history        — paginated inspection history for current user
GET  /api/inspect/history/{id}   — single inspection record
DELETE /api/inspect/history/{id} — delete a single record
"""

import base64
import logging
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from PIL import Image
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.inference import run_inference
from app.schemas import InspectionListResponse, InspectionOut, PredictionResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inspect", tags=["inspections"])

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/bmp", "image/webp"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ─── helpers ───────────────────────────────────────────────────────────────

def _save_image_bytes(data: bytes, prefix: str) -> str:
    """Save raw image bytes to UPLOAD_DIR and return the relative path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.png"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    return filename   # relative path stored in DB


def _save_pil(image: Image.Image, prefix: str) -> str:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.png"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    image.save(filepath, format="PNG")
    return filename


def _persist_inspection(
    db: Session,
    user_id: int,
    result: dict,
    original_filename: Optional[str],
    gradcam_filename: Optional[str],
    source: str,
) -> models.Inspection:
    """Write an Inspection row to the database and return it."""
    record = models.Inspection(
        user_id=user_id,
        defect_class=result["class_name"],
        class_index=result["class_index"],
        confidence=result["confidence"],
        is_defect=(result["class_name"] != "No_Defect"),
        original_image_path=original_filename,
        gradcam_image_path=gradcam_filename,
        source=source,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ─── Routes ───────────────────────────────────────────────────────────────

@router.post("/upload", response_model=PredictionResult, status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Accept a steel surface image upload.
    Returns defect class, confidence, and Grad-CAM overlay (base64).
    """
    # ── Validate ──
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {file.content_type}. Use JPEG/PNG/BMP.",
        )

    raw = await file.read()
    if len(raw) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # ── Open image ──
    try:
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not decode image: {exc}",
        )

    # ── Run inference ──
    try:
        result = run_inference(image)
    except Exception as exc:
        logger.exception("Inference failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {exc}",
        )

    # ── Save files ──
    orig_filename = _save_image_bytes(raw, "orig")
    gradcam_bytes = base64.b64decode(result["gradcam_base64"])
    gradcam_filename = _save_image_bytes(gradcam_bytes, "gcam")

    # ── Persist ──
    record = _persist_inspection(
        db, current_user.id, result, orig_filename, gradcam_filename, source="upload"
    )

    return PredictionResult(
        inspection_id=record.id,
        defect_class=result["class_name"],
        class_index=result["class_index"],
        confidence=result["confidence"],
        is_defect=record.is_defect,
        gradcam_base64=result["gradcam_base64"],
        original_base64=result["original_base64"],
        source="upload",
    )


@router.post("/webcam-frame", response_model=PredictionResult, status_code=status.HTTP_201_CREATED)
async def webcam_frame(
    frame_b64: str = Form(..., description="Base64-encoded JPEG/PNG frame from the browser"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Accept a webcam frame (base64-encoded) from the browser.
    Only persists the record if confidence >= DEFECT_CONFIDENCE_THRESHOLD.
    Always returns the prediction result.
    """
    # ── Decode frame ──
    try:
        # Strip data-URI prefix if present: "data:image/jpeg;base64,..."
        if "," in frame_b64:
            frame_b64 = frame_b64.split(",", 1)[1]
        raw = base64.b64decode(frame_b64)
        image = Image.open(BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid frame data: {exc}",
        )

    # ── Run inference ──
    try:
        result = run_inference(image)
    except Exception as exc:
        logger.exception("Webcam inference failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {exc}",
        )

    # ── Conditionally persist (only high-confidence detections) ──
    record_id = -1
    if result["confidence"] >= settings.DEFECT_CONFIDENCE_THRESHOLD:
        orig_filename = _save_image_bytes(raw, "wcam")
        gradcam_bytes = base64.b64decode(result["gradcam_base64"])
        gradcam_filename = _save_image_bytes(gradcam_bytes, "wcam_gcam")
        record = _persist_inspection(
            db, current_user.id, result, orig_filename, gradcam_filename, source="webcam"
        )
        record_id = record.id

    return PredictionResult(
        inspection_id=record_id,
        defect_class=result["class_name"],
        class_index=result["class_index"],
        confidence=result["confidence"],
        is_defect=(result["class_name"] != "No_Defect" and result["confidence"] >= settings.DEFECT_CONFIDENCE_THRESHOLD),
        gradcam_base64=result["gradcam_base64"],
        original_base64=result["original_base64"],
        source="webcam",
    )


@router.get("/history", response_model=InspectionListResponse)
def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    defect_class: Optional[str] = Query(None, description="Filter by class name"),
    source: Optional[str] = Query(None, description="Filter by source: upload | webcam"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return paginated inspection history for the current user."""
    q = (
        db.query(models.Inspection)
        .filter(models.Inspection.user_id == current_user.id)
    )
    if defect_class:
        q = q.filter(models.Inspection.defect_class == defect_class)
    if source:
        q = q.filter(models.Inspection.source == source)

    total = q.count()
    items = q.order_by(models.Inspection.created_at.desc()).offset(skip).limit(limit).all()

    return InspectionListResponse(total=total, items=items)


@router.get("/history/{inspection_id}", response_model=InspectionOut)
def get_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Retrieve a single inspection record (must belong to the current user)."""
    record = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.id == inspection_id,
            models.Inspection.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    return record


@router.delete("/history/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inspection(
    inspection_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a single inspection record (must belong to the current user)."""
    record = (
        db.query(models.Inspection)
        .filter(
            models.Inspection.id == inspection_id,
            models.Inspection.user_id == current_user.id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found")
    db.delete(record)
    db.commit()
