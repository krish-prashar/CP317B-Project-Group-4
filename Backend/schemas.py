"""
schemas.py — Pydantic models that validate request bodies and shape responses.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

# Flexible metric names (weight, bmi, body_fat, heart_rate, hrv, blood_pressure_systolic, ...).
# Lowercase snake_case, max 32 chars to match models.Measurement.metric.
MetricName = Annotated[str, Field(min_length=1, max_length=32, pattern=r"^[a-z0-9_]+$")]

FUTURE_TOLERANCE = timedelta(minutes=5)  # allow small clock differences between devices


def to_utc(dt: datetime) -> datetime:
    """SQLite does not store timezone offsets, so everything is saved as UTC.
    Naive datetimes are assumed to already be UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt only uses the first 72 bytes
    full_name: str | None = Field(default=None, max_length=120)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def mark_utc(cls, v: datetime) -> datetime:
        return to_utc(v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Measurements ----------
class MeasurementCreate(BaseModel):
    metric: MetricName
    value: float = Field(allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=16)
    timestamp: datetime | None = None  # defaults to "now" on the server if omitted

    @field_validator("metric", mode="before")
    @classmethod
    def normalize_metric(cls, v):
        # "Heart Rate" / "heart-rate" -> "heart_rate"
        if isinstance(v, str):
            v = re.sub(r"[^a-z0-9]+", "_", v.strip().lower()).strip("_")
        return v

    @field_validator("unit", mode="before")
    @classmethod
    def strip_unit(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("timestamp")
    @classmethod
    def check_timestamp(cls, v: datetime | None) -> datetime | None:
        if v is None:
            return None
        v = to_utc(v)
        if v > datetime.now(timezone.utc) + FUTURE_TOLERANCE:
            raise ValueError("Timestamp cannot be in the future")
        return v


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric: str
    value: float
    unit: str
    timestamp: datetime

    @field_validator("timestamp")
    @classmethod
    def mark_utc(cls, v: datetime) -> datetime:
        # SQLite returns naive datetimes; tag them as UTC so JSON ends in "Z"/"+00:00".
        return to_utc(v)


class ImportRowError(BaseModel):
    line: int
    error: str


class ImportSummary(BaseModel):
    filename: str | None
    rows_imported: int
    rows_failed: int
    measurements_created: int
    errors: list[ImportRowError]  # first 20 failed rows, so the UI can show what went wrong