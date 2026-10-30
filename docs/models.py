"""
models.py — SQLAlchemy ORM tables: users, measurements, patients and conditions.
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
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
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
    metric: Mapped[str] = mapped_column(String(32), nullable=False)   # weight | bmi | body_fat | heart_rate
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(16), nullable=False)     # kg, lb, %, bpm, kg/m²
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="measurements")

    # Speeds up the dashboard query: "latest value of each metric for this user".
    __table_args__ = (Index("ix_measurements_user_metric_time", "user_id", "metric", "timestamp"),)

# ---------------------------------------------------------------------------
# Patient records — fixed fake data, filled in once by seed.py.
# Viewed by nurses in the health monitor app.
# ---------------------------------------------------------------------------

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    sex: Mapped[str] = mapped_column(String(10), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(3), nullable=True)
    height_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allergies: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)

    conditions: Mapped[list["Condition"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class Condition(Base):
    __tablename__ = "conditions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)       # e.g. "Asthma"
    category: Mapped[str] = mapped_column(String(20), nullable=False)    # Chronic | Illness | Disability
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    patient: Mapped["Patient"] = relationship(back_populates="conditions")
