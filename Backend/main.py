"""
main.py — HealthTrack FastAPI app.
Sprint 1: auth, measurements, daily summary, device sync.
Sprint 2: measurement validation + flagging, date-range queries for historical trends.
Run from the backend/ folder:  uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Body, Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db
from validation import ValidationError, check_measurement, rules_as_dict

# ---------- Config ----------
# Set a real secret in production:  export HEALTHTRACK_SECRET_KEY="some-long-random-string"
SECRET_KEY = os.getenv("HEALTHTRACK_SECRET_KEY", "dev-only-change-me-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Optional: restrict sign-up to the organisation's email domains, e.g.
#   export HEALTHTRACK_ALLOWED_EMAIL_DOMAINS="stmarys.ca,cityclinic.org"
# Empty (the default) accepts any domain, which is what you want for local development.
ALLOWED_EMAIL_DOMAINS = {d.strip().lower() for d in os.getenv("HEALTHTRACK_ALLOWED_EMAIL_DOMAINS", "").split(",") if d.strip()}

BCRYPT_MAX_BYTES = 72  # bcrypt ignores (newer versions reject) anything past 72 bytes
MAX_SYNC_READINGS = 500  # largest batch a device may push in one sync
UNPROCESSABLE = 422  # status name differs between Starlette versions, so use the number
bearer_scheme = HTTPBearer(auto_error=False)


# ---------- App ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # creates healthtrack.db + tables on first run
    _add_missing_columns()
    yield


def _add_missing_columns():
    """create_all() does not alter existing tables, so a healthtrack.db created in
    Sprint 1 would be missing columns added later. Add them in place (SQLite only
    needs ALTER TABLE ... ADD COLUMN for a nullable column)."""
    existing = {c["name"] for c in inspect(engine).get_columns("measurements")}
    if "flag_reason" not in existing:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE measurements ADD COLUMN flag_reason VARCHAR(120)"))
    # Sprint 3: staff sign in with a work email or work ID.
    users = {c["name"] for c in inspect(engine).get_columns("users")}
    if "work_id" not in users:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN work_id VARCHAR(32)"))
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_work_id ON users (work_id)"))


app = FastAPI(title="HealthTrack API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"], # frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ---------- Auth helpers ----------
def _password_bytes(password: str) -> bytes:
    """Encode to UTF-8 and truncate to bcrypt's 72-byte limit.
    Used by BOTH hash and verify so the same bytes are always compared."""
    return password.encode("utf-8")[:BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt())
    return hashed.decode("utf-8")  # store as text in SQLite


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_password_bytes(plain), hashed.encode("utf-8"))
    except ValueError:
        # Stored hash is malformed / not a bcrypt hash — treat as a failed login.
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        raise unauthorized

    user = db.get(models.User, user_id)
    if user is None:
        raise unauthorized
    return user


# ---------- Validation helper ----------
def validate_reading(reading: schemas.MeasurementCreate) -> str | None:
    """Apply validation.py rules. Raises 422 for impossible readings and returns the
    flag reason (or None) for readings that can be saved."""
    try:
        return check_measurement(reading.metric, reading.value, reading.unit)
    except ValidationError as exc:
        raise HTTPException(status_code=UNPROCESSABLE, detail=str(exc))


# ---------- Routes ----------
@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "app": "HealthTrack API"}


@app.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    domain = email.rsplit("@", 1)[-1]
    if ALLOWED_EMAIL_DOMAINS and domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Use the work email issued by your organisation")
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Work email is already registered")
    if db.query(models.User).filter(models.User.work_id == payload.work_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Work ID is already registered")

    user = models.User(
        email=email,
        work_id=payload.work_id,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log the user straight in after signing up.
    return schemas.Token(access_token=create_access_token(user.id), user=user)


@app.post("/login", response_model=schemas.Token, tags=["auth"])
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    """Sign in with a work email or a work ID. Same error either way, so the response
    doesn't reveal which identifiers exist."""
    ident = payload.identifier.strip()
    if payload.is_email:
        lookup = models.User.email == ident.lower()
    else:
        lookup = models.User.work_id == ident.upper()
    user = db.query(models.User).filter(lookup).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Incorrect work email / work ID or password")

    return schemas.Token(access_token=create_access_token(user.id), user=user)


@app.get("/me", response_model=schemas.UserOut, tags=["auth"])
def read_me(current_user: models.User = Depends(get_current_user)):
    """Handy for checking a token works; the frontend will use it too."""
    return current_user


# ---------- Metric rules ----------
@app.get("/metrics/rules", tags=["measurements"])
def metric_rules():
    """Units and accepted/normal ranges per metric (validation.py), so the frontend
    warns about the same values the backend flags. No login needed: contains no patient data."""
    return rules_as_dict()


# ---------- Measurements ----------
@app.get("/measurements", response_model=list[schemas.MeasurementOut], tags=["measurements"])
def list_measurements(
    metric: str | None = Query(default=None, description="Only return this metric, e.g. heart_rate"),
    start: datetime | None = Query(default=None, description="Only readings taken at or after this time (ISO 8601)"),
    end: datetime | None = Query(default=None, description="Only readings taken at or before this time (ISO 8601)"),
    flagged: bool | None = Query(default=None, description="true = only flagged readings, false = only unflagged"),
    limit: int = Query(default=500, ge=1, le=5000),
    offset: int = Query(default=0, ge=0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The current user's measurements, newest first (paginated with limit/offset).
    start/end/metric power the Historical Trends chart."""
    start = schemas.to_utc(start) if start else None
    end = schemas.to_utc(end) if end else None
    if start and end and start > end:
        raise HTTPException(status_code=UNPROCESSABLE, detail="Start date must be before end date")

    stmt = select(models.Measurement).where(models.Measurement.user_id == current_user.id)
    if metric:
        stmt = stmt.where(models.Measurement.metric == metric.strip().lower())
    if start:
        stmt = stmt.where(models.Measurement.timestamp >= start)
    if end:
        stmt = stmt.where(models.Measurement.timestamp <= end)
    if flagged is not None:
        flag_col = models.Measurement.flag_reason
        stmt = stmt.where(flag_col.is_not(None) if flagged else flag_col.is_(None))
    stmt = (
        stmt.order_by(models.Measurement.timestamp.desc(), models.Measurement.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return db.scalars(stmt).all()


@app.get("/measurements/latest", response_model=list[schemas.MeasurementOut], tags=["measurements"])
def latest_measurements(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Newest reading of each distinct metric — powers the Daily Summary dashboard."""
    # Number each user's readings per metric, newest = 1 (id breaks timestamp ties).
    ranked = (
        select(
            models.Measurement.id,
            func.row_number()
            .over(
                partition_by=models.Measurement.metric,
                order_by=(models.Measurement.timestamp.desc(), models.Measurement.id.desc()),
            )
            .label("rn"),
        )
        .where(models.Measurement.user_id == current_user.id)
        .subquery()
    )
    stmt = (
        select(models.Measurement)
        .join(ranked, models.Measurement.id == ranked.c.id)
        .where(ranked.c.rn == 1)
        .order_by(models.Measurement.metric)
    )
    return db.scalars(stmt).all()


@app.post(
    "/measurements",
    response_model=schemas.MeasurementOut,
    status_code=status.HTTP_201_CREATED,
    tags=["measurements"],
)
def create_measurement(
    payload: schemas.MeasurementCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually add one measurement (JSON body).
    Impossible values are rejected (422); out-of-range values are saved with a flag."""
    flag_reason = validate_reading(payload)
    measurement = models.Measurement(
        user_id=current_user.id,
        metric=payload.metric,
        value=payload.value,
        unit=payload.unit,
        timestamp=payload.timestamp or datetime.now(timezone.utc),
        flag_reason=flag_reason,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@app.post(
    "/measurements/sync-device",
    response_model=schemas.SyncSummary,
    status_code=status.HTTP_201_CREATED,
    tags=["measurements"],
)
def sync_device(
    readings: list[schemas.MeasurementCreate] = Body(
        ...,
        min_length=1,
        max_length=MAX_SYNC_READINGS,
        description="JSON array of readings pushed by a smart scale / watch",
    ),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Simulated IoT device sync: save a batch of readings for the logged-in user.

    Every reading is validated by MeasurementCreate and validation.py before anything is
    saved, so a single impossible reading rejects the whole batch with 422. Readings that
    are only outside the normal range are saved and flagged.
    """
    flags: list[str | None] = []
    problems: list[str] = []
    for i, reading in enumerate(readings, start=1):
        try:
            flags.append(check_measurement(reading.metric, reading.value, reading.unit))
        except ValidationError as exc:
            problems.append(f"Reading {i}: {exc}")
    if problems:
        raise HTTPException(
            status_code=UNPROCESSABLE,
            detail="No readings were saved. " + " ".join(problems),
        )

    now = datetime.now(timezone.utc)
    saved: list[models.Measurement] = []

    try:
        for reading, flag_reason in zip(readings, flags):
            measurement = models.Measurement(
                user_id=current_user.id,
                metric=reading.metric,
                value=reading.value,
                unit=reading.unit,
                timestamp=reading.timestamp or now,
                flag_reason=flag_reason,
            )
            db.add(measurement)
            saved.append(measurement)
        db.commit()  # one transaction: the whole batch is saved, or none of it
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save readings")

    for measurement in saved:
        db.refresh(measurement)

    return schemas.SyncSummary(
        synced=len(saved),
        metrics=sorted({m.metric for m in saved}),
        measurements=saved,
        flagged=sum(1 for m in saved if m.flag_reason),
    )