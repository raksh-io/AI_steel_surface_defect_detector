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
import csv
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO, StringIO
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from PIL import Image
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app import models
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.inference import run_inference
from app.schemas import InspectionListResponse, InspectionOut, PredictionResult, InspectionUpdateNotes
from app.storage import upload_image_data

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/inspect", tags=["inspections"])

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/bmp", "image/webp"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


# ─── helpers ───────────────────────────────────────────────────────────────

def _save_image_bytes(data: bytes, prefix: str) -> str:
    """Upload image bytes to Supabase Storage or local fallback."""
    return upload_image_data(data, prefix)


def _save_pil(image: Image.Image, prefix: str) -> str:
    """Upload PIL image to Supabase Storage or local fallback."""
    buf = BytesIO()
    image.save(buf, format="PNG")
    return upload_image_data(buf.getvalue(), prefix)



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
    Persists every result (including No_Defect) and returns the prediction.
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

    # ── Persist every frame result (including No_Defect) ──
    orig_filename = _save_image_bytes(raw, "wcam")
    gradcam_bytes = base64.b64decode(result["gradcam_base64"])
    gradcam_filename = _save_image_bytes(gradcam_bytes, "wcam_gcam")
    record = _persist_inspection(
        db, current_user.id, result, orig_filename, gradcam_filename, source="webcam"
    )

    return PredictionResult(
        inspection_id=record.id,
        defect_class=result["class_name"],
        class_index=result["class_index"],
        confidence=result["confidence"],
        is_defect=(result["class_name"] != "No_Defect"),
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
    is_defect: Optional[bool] = Query(None, description="Filter by defect status"),
    search: Optional[str] = Query(None, description="Search in defect class or notes"),
    start_date: Optional[datetime] = Query(None, description="Filter from created date"),
    end_date: Optional[datetime] = Query(None, description="Filter to created date"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return paginated inspection history for the current user with flexible filtering."""
    q = (
        db.query(models.Inspection)
        .filter(models.Inspection.user_id == current_user.id)
    )
    if defect_class:
        q = q.filter(models.Inspection.defect_class == defect_class)
    if source:
        q = q.filter(models.Inspection.source == source)
    if is_defect is not None:
        q = q.filter(models.Inspection.is_defect == is_defect)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(or_(models.Inspection.defect_class.ilike(s), models.Inspection.notes.ilike(s)))
    if start_date:
        q = q.filter(models.Inspection.created_at >= start_date)
    if end_date:
        q = q.filter(models.Inspection.created_at <= end_date)

    total = q.count()
    items = q.order_by(models.Inspection.created_at.desc()).offset(skip).limit(limit).all()

    return InspectionListResponse(total=total, items=items)


@router.get("/export")
def export_inspections(
    format: str = Query("csv", pattern="^(csv|json)$"),
    defect_class: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    is_defect: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export inspections for the current user as CSV or JSON."""
    q = db.query(models.Inspection).filter(models.Inspection.user_id == current_user.id)
    if defect_class:
        q = q.filter(models.Inspection.defect_class == defect_class)
    if source:
        q = q.filter(models.Inspection.source == source)
    if is_defect is not None:
        q = q.filter(models.Inspection.is_defect == is_defect)
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(or_(models.Inspection.defect_class.ilike(s), models.Inspection.notes.ilike(s)))
    if start_date:
        q = q.filter(models.Inspection.created_at >= start_date)
    if end_date:
        q = q.filter(models.Inspection.created_at <= end_date)

    records = q.order_by(models.Inspection.created_at.desc()).all()
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    if format == "json":
        items = [
            {
                "id": r.id,
                "defect_class": r.defect_class,
                "class_index": r.class_index,
                "confidence": r.confidence,
                "is_defect": r.is_defect,
                "source": r.source,
                "notes": r.notes,
                "original_image_path": r.original_image_path,
                "gradcam_image_path": r.gradcam_image_path,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ]
        content = json.dumps(items, indent=2)
        return StreamingResponse(
            iter([content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=inspections_{timestamp_str}.json"},
        )

    # CSV format
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Inspection ID",
        "Timestamp (ISO)",
        "Defect Class",
        "Class Index",
        "Confidence",
        "Is Defect",
        "Source",
        "Notes",
        "Original Image Path",
        "Grad-CAM Image Path",
    ])
    for r in records:
        writer.writerow([
            r.id,
            r.created_at.isoformat() if r.created_at else "",
            r.defect_class,
            r.class_index,
            f"{r.confidence:.4f}",
            "Yes" if r.is_defect else "No",
            r.source,
            r.notes or "",
            r.original_image_path or "",
            r.gradcam_image_path or "",
        ])

    csv_data = output.getvalue()
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inspections_{timestamp_str}.csv"},
    )


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


@router.patch("/history/{inspection_id}/notes", response_model=InspectionOut)
def update_inspection_notes(
    inspection_id: int,
    payload: InspectionUpdateNotes,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update or append operator inspection notes."""
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
    record.notes = payload.notes
    db.commit()
    db.refresh(record)
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
