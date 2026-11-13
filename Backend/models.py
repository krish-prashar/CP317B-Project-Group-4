"""
models.py — SQLAlchemy ORM tables: users and measurements.
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # Work email issued by the clinic / hospital. Staff can sign in with either this or work_id.
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Staff / employee ID issued by the organisation (stored upper-case). Nullable only so
    # that users created before this column existed can still sign in with their email.
    work_id: Mapped[str | None] = mapped_column(String(32), unique=True, index=True, nullable=True)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    measurements: Mapped[list["Measurement"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Measurement(Base):
    __tablename__ = "measurements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    metric: Mapped[str] = mapped_column(String(32), nullable=False)   # see validation.METRIC_RULES
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)     # kg, lb, %, bpm, kg/m², mmHg, ...
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    # Set when the value is outside the normal range for its metric (see validation.py).
    # NULL means the reading passed every check.
    flag_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="measurements")

    # Speeds up the dashboard query: "latest value of each metric for this user".
    __table_args__ = (Index("ix_measurements_user_metric_time", "user_id", "metric", "timestamp"),)