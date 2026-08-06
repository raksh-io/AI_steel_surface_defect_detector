"""
Database Setup
==============
SQLAlchemy engine, session factory, and declarative Base.
All ORM models import Base from here.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


def _make_engine():
    url = settings.DATABASE_URL
    if url and url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    if not url or url.startswith("sqlite"):
        # SQLite: no pool settings, needs check_same_thread=False
        return create_engine(url or "sqlite:///./steel_defects.db", connect_args={"check_same_thread": False})
    # PostgreSQL
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)

engine = _make_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


def get_db():
    """
    FastAPI dependency — yield a DB session, always close on exit.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
