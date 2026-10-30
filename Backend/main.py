"""
main.py — HealthTrack FastAPI app (Sprint 1, Step 1: auth).
Run from the backend/ folder:  uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import models
import schemas
from csv_import import CSVFormatError, parse_measurements_csv
from database import Base, engine, get_db

# ---------- Config ----------
# Set a real secret in production:  export HEALTHTRACK_SECRET_KEY="some-long-random-string"
SECRET_KEY = os.getenv("HEALTHTRACK_SECRET_KEY", "dev-only-change-me-please")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

BCRYPT_MAX_BYTES = 72  # bcrypt ignores (newer versions reject) anything past 72 bytes
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB CSV limit
bearer_scheme = HTTPBearer(auto_error=False)


# ---------- App ----------
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # creates healthtrack.db + tables on first run
    yield


app = FastAPI(title="HealthTrack API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
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


# ---------- Routes ----------
@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "app": "HealthTrack API"}


@app.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED, tags=["auth"])
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = models.User(
        email=email,
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
    user = db.query(models.User).filter(models.User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    return schemas.Token(access_token=create_access_token(user.id), user=user)


@app.get("/me", response_model=schemas.UserOut, tags=["auth"])
def read_me(current_user: models.User = Depends(get_current_user)):
    """Handy for checking a token works; the frontend will use it too."""
    return current_user


@app.post(
    "/measurements/import",
    response_model=schemas.ImportSummary,
    status_code=status.HTTP_201_CREATED,
    tags=["measurements"],
)
def import_measurements(
    file: UploadFile = File(..., description="CSV with columns: timestamp, metric, value, unit"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Bulk-import measurements from a CSV. Bad rows are skipped and reported, not fatal."""
    if file.filename and not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please upload a .csv file")

    raw = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="CSV must be 5 MB or smaller")

    try:
        text = raw.decode("utf-8-sig")  # "-sig" strips the BOM Excel adds
    except UnicodeDecodeError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV must be UTF-8 encoded")

    try:
        result = parse_measurements_csv(text)
    except CSVFormatError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    try:
        db.add_all(
            models.Measurement(
                user_id=current_user.id,
                metric=m.metric,
                value=m.value,
                unit=m.unit,
                timestamp=m.timestamp,
            )
            for m in result.measurements
        )
        db.commit()  # one transaction: all valid rows are saved together
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save measurements")

    return schemas.ImportSummary(
        filename=file.filename,
        rows_imported=result.rows_imported,
        rows_failed=result.rows_failed,
        measurements_created=len(result.measurements),
        errors=result.errors,
    )