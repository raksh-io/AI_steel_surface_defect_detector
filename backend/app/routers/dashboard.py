"""
Dashboard Router
================
GET /api/dashboard/stats — aggregate stats for the current user
"""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import ClassDistributionItem, DashboardStats, InspectionOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return dashboard statistics for the authenticated user:
    - total inspections
    - total defects (confidence >= 0.5)
    - defect rate
    - per-class distribution
    - last 10 inspections
    """
    uid = current_user.id

    # ── Totals ──
    total_inspections = (
        db.query(func.count(models.Inspection.id))
        .filter(models.Inspection.user_id == uid)
        .scalar() or 0
    )

    total_defects = (
        db.query(func.count(models.Inspection.id))
        .filter(
            models.Inspection.user_id == uid,
            models.Inspection.is_defect == True,        # noqa: E712
        )
        .scalar() or 0
    )

    defect_rate = (total_defects / total_inspections) if total_inspections > 0 else 0.0

    # ── Class distribution ──
    rows = (
        db.query(models.Inspection.defect_class, func.count(models.Inspection.id))
        .filter(models.Inspection.user_id == uid)
        .group_by(models.Inspection.defect_class)
        .all()
    )
    class_distribution = [
        ClassDistributionItem(defect_class=cls, count=cnt) for cls, cnt in rows
    ]

    # ── Recent inspections ──
    recent = (
        db.query(models.Inspection)
        .filter(models.Inspection.user_id == uid)
        .order_by(models.Inspection.created_at.desc())
        .limit(10)
        .all()
    )

    return DashboardStats(
        total_inspections=total_inspections,
        total_defects=total_defects,
        defect_rate=round(defect_rate, 4),
        class_distribution=class_distribution,
        recent_inspections=recent,
    )
