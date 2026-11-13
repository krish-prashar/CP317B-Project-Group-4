"""API tests for the Sprint 2 stories, run against a throwaway SQLite database.

Data Validation:   impossible readings rejected, out-of-range readings saved + flagged.
Historical Trends: /measurements filtered by metric and date range.
"""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
from database import Base, get_db


@pytest.fixture()
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_db
    # Skip the lifespan hook so the real healthtrack.db is never touched.
    c = TestClient(main.app)
    res = c.post("/register", json={"email": "nurse@stmarys.example", "work_id": "RN-1001", "password": "secret123"})
    c.headers["Authorization"] = "Bearer " + res.json()["access_token"]
    yield c
    main.app.dependency_overrides.clear()


def iso(days_ago: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def add(client, metric, value, unit, days_ago=0):
    return client.post(
        "/measurements",
        json={"metric": metric, "value": value, "unit": unit, "timestamp": iso(days_ago)},
    )


# ---------- Data Validation ----------
def test_normal_reading_saved_without_flag(client):
    res = add(client, "heart_rate", 72, "bpm")
    assert res.status_code == 201
    assert res.json()["flag_reason"] is None


def test_out_of_range_reading_saved_with_flag(client):
    res = add(client, "heart_rate", 135, "bpm")
    assert res.status_code == 201
    assert res.json()["flag_reason"].startswith("Above normal range")
    # The flag is stored, so history shows it too.
    history = client.get("/measurements").json()
    assert history[0]["flag_reason"] is not None


def test_impossible_reading_rejected_and_not_saved(client):
    res = add(client, "heart_rate", 720, "bpm")
    assert res.status_code == 422
    assert "not possible" in res.json()["detail"]
    assert client.get("/measurements").json() == []


def test_wrong_unit_rejected(client):
    res = add(client, "weight", 70, "bpm")
    assert res.status_code == 422
    assert "not a valid unit" in res.json()["detail"]


@pytest.mark.parametrize("body", [
    {"metric": "heart_rate", "unit": "bpm"},                    # missing value
    {"metric": "heart_rate", "value": None, "unit": "bpm"},     # null value
    {"metric": "heart_rate", "value": 70, "unit": ""},          # empty unit
    {"metric": "", "value": 70, "unit": "bpm"},                 # empty metric
])
def test_missing_or_null_fields_rejected(client, body):
    assert client.post("/measurements", json=body).status_code == 422


def test_future_timestamp_rejected(client):
    future = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    res = client.post("/measurements", json={"metric": "heart_rate", "value": 70, "unit": "bpm", "timestamp": future})
    assert res.status_code == 422


def test_device_sync_flags_and_counts(client):
    readings = [
        {"metric": "heart_rate", "value": 66, "unit": "bpm"},
        {"metric": "oxygen_saturation", "value": 89, "unit": "%"},
    ]
    res = client.post("/measurements/sync-device", json=readings)
    assert res.status_code == 201
    assert res.json()["synced"] == 2
    assert res.json()["flagged"] == 1


def test_device_sync_with_impossible_reading_saves_nothing(client):
    readings = [
        {"metric": "heart_rate", "value": 66, "unit": "bpm"},
        {"metric": "weight", "value": 7800, "unit": "kg"},
    ]
    res = client.post("/measurements/sync-device", json=readings)
    assert res.status_code == 422
    assert "Reading 2" in res.json()["detail"]
    assert client.get("/measurements").json() == []


def test_flagged_filter(client):
    add(client, "heart_rate", 70, "bpm")
    add(client, "heart_rate", 150, "bpm")
    flagged = client.get("/measurements", params={"flagged": "true"}).json()
    assert [m["value"] for m in flagged] == [150]


def test_rules_endpoint_is_public(client):
    del client.headers["Authorization"]
    res = client.get("/metrics/rules")
    assert res.status_code == 200
    assert "bpm" in res.json()["heart_rate"]["units"]


# ---------- Historical Trends ----------
def test_date_range_returns_only_readings_in_range(client):
    for days_ago, value in [(40, 80.0), (20, 79.0), (10, 78.5), (2, 78.0)]:
        add(client, "weight", value, "kg", days_ago)
    add(client, "heart_rate", 70, "bpm", 5)

    res = client.get("/measurements", params={"metric": "weight", "start": iso(30), "end": iso(0)})
    assert res.status_code == 200
    assert [m["value"] for m in res.json()] == [78.0, 78.5, 79.0]  # newest first


def test_date_range_with_no_data_returns_empty_list(client):
    add(client, "weight", 78, "kg", 100)
    res = client.get("/measurements", params={"metric": "weight", "start": iso(7), "end": iso(0)})
    assert res.status_code == 200
    assert res.json() == []


def test_start_after_end_rejected(client):
    res = client.get("/measurements", params={"start": iso(0), "end": iso(7)})
    assert res.status_code == 422


def test_other_users_data_not_visible(client):
    add(client, "weight", 78, "kg", 1)
    other = client.post("/register", json={"email": "doctor@stmarys.example", "work_id": "MD-2002", "password": "secret456"}).json()
    res = client.get("/measurements", headers={"Authorization": "Bearer " + other["access_token"]},
                     params={"start": iso(30)})
    assert res.json() == []


# ---------- Staff sign-in: work email or work ID ----------
def test_sign_in_with_work_email(client):
    del client.headers["Authorization"]
    res = client.post("/login", json={"identifier": "Nurse@StMarys.example", "password": "secret123"})
    assert res.status_code == 200
    assert res.json()["user"]["work_id"] == "RN-1001"


def test_sign_in_with_work_id_is_case_insensitive(client):
    del client.headers["Authorization"]
    res = client.post("/login", json={"identifier": " rn-1001 ", "password": "secret123"})
    assert res.status_code == 200
    assert res.json()["user"]["email"] == "nurse@stmarys.example"


def test_legacy_email_field_still_accepted_on_login(client):
    del client.headers["Authorization"]
    res = client.post("/login", json={"email": "nurse@stmarys.example", "password": "secret123"})
    assert res.status_code == 200


def test_wrong_password_or_unknown_identifier_rejected(client):
    del client.headers["Authorization"]
    assert client.post("/login", json={"identifier": "RN-1001", "password": "wrong1234"}).status_code == 401
    assert client.post("/login", json={"identifier": "RN-9999", "password": "secret123"}).status_code == 401
    assert client.post("/login", json={"identifier": "nobody@stmarys.example", "password": "secret123"}).status_code == 401


def test_register_requires_work_id(client):
    res = client.post("/register", json={"email": "new@stmarys.example", "password": "secret123"})
    assert res.status_code == 422


@pytest.mark.parametrize("bad", ["ab", "has space", "x" * 33, "bad!id"])
def test_register_rejects_malformed_work_id(client, bad):
    res = client.post("/register", json={"email": "new@stmarys.example", "work_id": bad, "password": "secret123"})
    assert res.status_code == 422


def test_register_rejects_duplicate_work_id(client):
    res = client.post("/register", json={"email": "other@stmarys.example", "work_id": "rn-1001", "password": "secret123"})
    assert res.status_code == 409
    assert "Work ID" in res.json()["detail"]


def test_register_rejects_duplicate_email(client):
    res = client.post("/register", json={"email": "nurse@stmarys.example", "work_id": "RN-3003", "password": "secret123"})
    assert res.status_code == 409


def test_allowed_domains_blocks_personal_email(client, monkeypatch):
    monkeypatch.setattr(main, "ALLOWED_EMAIL_DOMAINS", {"stmarys.example"})
    res = client.post("/register", json={"email": "someone@gmail.com", "work_id": "RN-4004", "password": "secret123"})
    assert res.status_code == 403
    res = client.post("/register", json={"email": "someone@stmarys.example", "work_id": "RN-4004", "password": "secret123"})
    assert res.status_code == 201
