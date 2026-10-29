"""
schemas.py — Pydantic models that validate request bodies and shape responses.
"""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

MetricType = Literal["weight", "bmi", "body_fat", "heart_rate"]


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
    metric: MetricType
    value: float = Field(gt=0, lt=10000)
    unit: str = Field(min_length=1, max_length=16)
    timestamp: datetime | None = None  # defaults to "now" on the server if omitted


class MeasurementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric: MetricType
    value: float
    unit: str
    timestamp: datetime