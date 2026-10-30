"""
schemas.py — Pydantic models that validate request bodies and shape responses.
"""
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field

# Flexible metric names (weight, bmi, body_fat, heart_rate, hrv, blood_pressure_systolic, ...).
# Lowercase snake_case, max 32 chars to match models.Measurement.metric.
MetricName = Annotated[str, Field(min_length=1, max_length=32, pattern=r"^[a-z0-9_]+$")]


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)  # bcrypt only uses the first 72 bytes
    full_name: str | None = Field(default=None, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Measurements (used in Step 2) ----------
class MeasurementCreate(BaseModel):
    metric: MetricName
    value: float = Field(allow_inf_nan=False)
    unit: str = Field(min_length=1, max_length=16)
    timestamp: datetime | None = None  # defaults to "now" on the server if omitted


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric: str
    value: float
    unit: str
    timestamp: datetime


class ImportRowError(BaseModel):
    line: int
    error: str


class ImportSummary(BaseModel):
    filename: str | None
    rows_imported: int
    rows_failed: int
    measurements_created: int
    errors: list[ImportRowError]  # first 20 failed rows, so the UI can show what went wrong