"""
Dashboard Router
================
GET /api/dashboard/stats — aggregate stats for the current user
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, List
from collections import defaultdict

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.dependencies import get_current_user
from app.schemas import (
    ClassDistributionItem,
    DashboardStats,
    InspectionOut,
    DashboardAnalytics,
    ConfidenceBucket,
    SourceBreakdownItem,
    TimelineItem,
)

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


@router.get("/analytics", response_model=DashboardAnalytics)
def get_analytics(
    days: Optional[int] = Query(None, ge=1, le=365, description="Filter for past N days"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return comprehensive server-side analytics:
    - Overall summary metrics & average confidence
    - Timeline defect trends
    - Defect class distribution & top defect category
    - Confidence score distribution histogram
    - Source breakdown (upload vs live webcam)
    """
    uid = current_user.id
    q = db.query(models.Inspection).filter(models.Inspection.user_id == uid)

    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(models.Inspection.created_at >= cutoff)

    records = q.order_by(models.Inspection.created_at.asc()).all()

    total_inspections = len(records)
    total_defects = sum(1 for r in records if r.is_defect)
    defect_rate = (total_defects / total_inspections) if total_inspections > 0 else 0.0

    avg_confidence = (
        sum(r.confidence for r in records) / total_inspections
        if total_inspections > 0
        else 0.0
    )

    # Class distribution & top class
    class_counts = defaultdict(int)
    for r in records:
        class_counts[r.defect_class] += 1

    class_distribution = [
        ClassDistributionItem(defect_class=cls, count=cnt)
        for cls, cnt in class_counts.items()
    ]
    # Filter out No_Defect for top defect class calculation
    defect_only_counts = {k: v for k, v in class_counts.items() if k != "No_Defect"}
    top_defect_class = (
        max(defect_only_counts.items(), key=lambda x: x[1])[0]
        if defect_only_counts
        else None
    )

    # Confidence histogram
    buckets = [
        {"range": "0-20%", "min": 0.0, "max": 0.2, "count": 0},
        {"range": "20-40%", "min": 0.2, "max": 0.4, "count": 0},
        {"range": "40-60%", "min": 0.4, "max": 0.6, "count": 0},
        {"range": "60-80%", "min": 0.6, "max": 0.8, "count": 0},
        {"range": "80-100%", "min": 0.8, "max": 1.01, "count": 0},
    ]
    for r in records:
        for b in buckets:
            if b["min"] <= r.confidence < b["max"]:
                b["count"] += 1
                break

    confidence_histogram = [
        ConfidenceBucket(range=b["range"], min=b["min"], max=b["max"], count=b["count"])
        for b in buckets
    ]

    # Source breakdown
    source_counts = defaultdict(int)
    for r in records:
        source_counts[r.source] += 1
    source_breakdown = [
        SourceBreakdownItem(name=src, value=cnt)
        for src, cnt in source_counts.items()
    ]

    # Timeline (by calendar day)
    timeline_dict = defaultdict(lambda: {"total": 0, "defects": 0})
    for r in records:
        if r.created_at:
            day_str = r.created_at.strftime("%b %d")
            timeline_dict[day_str]["total"] += 1
            if r.is_defect:
                timeline_dict[day_str]["defects"] += 1

    timeline = [
        TimelineItem(date=d, total=v["total"], defects=v["defects"])
        for d, v in timeline_dict.items()
    ]

    return DashboardAnalytics(
        total_inspections=total_inspections,
        total_defects=total_defects,
        defect_rate=round(defect_rate, 4),
        avg_confidence=round(avg_confidence, 4),
        top_defect_class=top_defect_class,
        confidence_histogram=confidence_histogram,
        source_breakdown=source_breakdown,
        timeline=timeline,
        class_distribution=class_distribution,
    )
