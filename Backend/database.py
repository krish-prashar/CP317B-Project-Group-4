"""
database.py — SQLite connection + session management for HealthTrack.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# The DB file is created in the folder you run uvicorn from (backend/).
SQLALCHEMY_DATABASE_URL = "sqlite:///./healthtrack.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # SQLite only allows the creating thread to use a connection by default;
    # FastAPI handles requests in a thread pool, so we turn that check off.
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Base class every ORM model inherits from."""
    pass


def get_db():
    """FastAPI dependency: opens a DB session per request and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()