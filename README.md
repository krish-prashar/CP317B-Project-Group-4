# HealthTrack
CP317B Group 4.

Milestone 1 materials:
- [Project document](docs/milestone-01.md)
- `submission/Group4-Blog.xlsx`

## Running the app
```bash
cd Backend
pip install -r requirements.txt
uvicorn main:app --reload            # API on http://127.0.0.1:8000 (docs at /docs)
```
In a second terminal, serve the front end:
```bash
cd frontend
python -m http.server 5500           # open http://localhost:5500
```

## Running the tests
```bash
cd Backend
pip install -r requirements-dev.txt
python -m pytest
```

## Sprint 2
**Staff sign-in:** the system is for clinic and hospital staff, not the public.
- Staff sign in with the **work email or work ID** issued by their organisation (`POST /login` takes `identifier` + `password`; the old `email` field still works).
- Creating an account needs a work email, a work ID (3-32 letters, digits or dashes, e.g. `RN-10432`) and a password. Work IDs are unique and case-insensitive.
- Optional: set `HEALTHTRACK_ALLOWED_EMAIL_DOMAINS="stmarys.ca,cityclinic.org"` to only accept sign-ups from the organisation's email domains. Unset (the default) accepts any domain, which is easier for local testing.
- Every screen shows the **Health Monitoring System** mark at the top left so staff can tell they are on the right system.
- An existing `healthtrack.db` is upgraded on startup (it adds the `work_id` column). Accounts created before this change have no work ID yet and sign in with their email.

**Data validation:** every reading is checked against `Backend/validation.py`.
- Impossible values or a wrong unit (e.g. heart rate 900 bpm, weight in bpm) are rejected and not saved.
- Values outside the normal range are saved and flagged. The Add Measurement form asks the user to confirm first. Flags appear in History (with a "flagged only" filter), on the Daily Summary and on the trend charts.
- `GET /metrics/rules` gives the frontend the same ranges, so the warnings and the backend always agree. The ranges are there to catch typos and device errors, not to make clinical decisions, and clinical staff should review them.
- An existing `healthtrack.db` is upgraded on startup (it adds the `flag_reason` column).

**Historical trends:** the Trends page shows a line chart for one metric over a chosen date range (7/30/90 days, 12 months or custom dates).
- The normal range is shaded and flagged points are highlighted.
- Below the chart: count, latest, min, max, average and number flagged.
- `GET /measurements` now accepts `start`, `end` and `flagged` query parameters.

**Sprint 1 fixes:** the backend didn't start (missing `Body` import and `MAX_SYNC_READINGS`), and the device sync button called an endpoint that doesn't exist (`/measurements/bulk` → `/measurements/sync-device`).
