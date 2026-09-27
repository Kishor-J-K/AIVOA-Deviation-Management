"""
Database engine + session management.

Works against PostgreSQL or MySQL in production (set DATABASE_URL) and
falls back to a local SQLite file for zero-config demos.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

connect_args = {}
if settings.database_url.startswith("sqlite"):
    # Needed because FastAPI can touch the connection from different threads.
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create tables if they don't exist. Called once at app startup."""
    from app import models  # noqa: F401  (ensure models are registered on Base)
    Base.metadata.create_all(bind=engine)
