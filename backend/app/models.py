"""
ORM Models — Users and Inspections tables.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, index=True)
    email        = Column(String(255), unique=True, index=True, nullable=False)
    name         = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role         = Column(String(50), default="inspector", nullable=False)
    is_active    = Column(Boolean, default=True, nullable=False)
    created_at   = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    inspections  = relationship("Inspection", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


class Inspection(Base):
    __tablename__ = "inspections"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Prediction result
    defect_class    = Column(String(100), nullable=False)        # e.g. "Crazing"
    class_index     = Column(Integer, nullable=False)            # 0-5
    confidence      = Column(Float, nullable=False)              # 0.0 – 1.0
    is_defect       = Column(Boolean, nullable=False, default=True)

    # Stored files (relative paths under UPLOAD_DIR)
    original_image_path = Column(String(512), nullable=True)     # uploaded image
    gradcam_image_path  = Column(String(512), nullable=True)     # Grad-CAM overlay

    # Inspection mode: "upload" | "webcam"
    source          = Column(String(50), default="upload", nullable=False)

    # Optional metadata
    notes           = Column(Text, nullable=True)

    created_at      = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    user = relationship("User", back_populates="inspections")

    def __repr__(self):
        return f"<Inspection id={self.id} class={self.defect_class} conf={self.confidence:.2f}>"
