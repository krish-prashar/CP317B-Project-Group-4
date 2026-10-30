"""
csv_import.py — Pure-Python CSV parsing for bulk measurement import.
No FastAPI / DB code here, so it is easy to test on its own.

Expected columns (header names are case-insensitive, aliases accepted):
    timestamp | date | datetime   -> when the reading was taken (ISO 8601)
    metric    | metric_name      -> e.g. weight, bmi, heart_rate
    value                        -> number (or a supported compound value, see below)
    unit      | units            -> e.g. kg, %, bpm

Compound values are split into numeric measurements so they fit the
Measurement.value FLOAT column:
    "118/76"                         -> <metric>_systolic, <metric>_diastolic
    "5:32" (pace)                    -> 5.53 (decimal minutes)
    "Zone 3"                         -> 3
    "40.78,-73.96" (GPS)             -> <metric>_lat, <metric>_lon
    "Deep: 1.5, Light: 4.0, REM: 1.2" -> <metric>_deep, <metric>_light, <metric>_rem
"""
import csv
import io
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

COLUMN_ALIASES: dict[str, tuple[str, ...]] = {
    "timestamp": ("timestamp", "date", "datetime", "time"),
    "metric": ("metric", "metric_name", "name"),
    "value": ("value",),
    "unit": ("unit", "units"),
}
MAX_METRIC_LEN = 32   # matches models.Measurement.metric
MAX_UNIT_LEN = 16     # matches models.Measurement.unit
MAX_ERRORS_REPORTED = 20

_NUM = r"-?\d+(?:\.\d+)?"


class CSVFormatError(ValueError):
    """The file as a whole is unusable (empty, missing columns, not CSV)."""


@dataclass
class ParsedMeasurement:
    metric: str
    value: float
    unit: str
    timestamp: datetime


@dataclass
class ImportResult:
    measurements: list[ParsedMeasurement] = field(default_factory=list)
    rows_imported: int = 0
    rows_failed: int = 0
    errors: list[dict] = field(default_factory=list)


# ---------- Field parsers (each raises ValueError with a readable message) ----------
def parse_timestamp(raw: str) -> datetime:
    s = raw.strip()
    if not s:
        raise ValueError("missing timestamp")
    if s.endswith(("Z", "z")):
        s = s[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        raise ValueError(f"invalid timestamp '{raw}' (use ISO 8601, e.g. 2026-10-27T06:45:00Z)")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)  # naive times are treated as UTC
    return dt


def normalize_metric(raw: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "_", raw.strip().lower()).strip("_")
    if not name:
        raise ValueError("missing metric")
    return name


def parse_unit(raw: str) -> str:
    unit = raw.strip()
    if not unit:
        raise ValueError("missing unit")
    if len(unit) > MAX_UNIT_LEN:
        raise ValueError(f"unit '{unit}' is longer than {MAX_UNIT_LEN} characters")
    return unit


def _finite(s: str) -> float:
    v = float(s)
    if not math.isfinite(v):
        raise ValueError(f"value '{s}' is not a finite number")
    return v


def expand_value(metric: str, raw_value: str, unit: str) -> list[tuple[str, float, str]]:
    """Turn one CSV value into one or more (metric, float_value, unit) tuples."""
    v = raw_value.strip()
    if not v:
        raise ValueError("missing value")

    # 1. Plain number
    try:
        return [(metric, _finite(v), unit)]
    except ValueError:
        pass

    # 2. Blood pressure "118/76"
    if m := re.fullmatch(rf"({_NUM})\s*/\s*({_NUM})", v):
        return [
            (f"{metric}_systolic", float(m[1]), unit),
            (f"{metric}_diastolic", float(m[2]), unit),
        ]

    # 3. Pace / duration "5:32" -> 5.53 minutes
    if m := re.fullmatch(r"(\d+):([0-5]\d)", v):
        return [(metric, round(int(m[1]) + int(m[2]) / 60, 2), unit)]

    # 4. Heart-rate zone "Zone 3"
    if m := re.fullmatch(r"zone\s*(\d+)", v, re.IGNORECASE):
        return [(metric, float(m[1]), unit)]

    # 5. GPS "lat,long"
    if m := re.fullmatch(rf"({_NUM})\s*,\s*({_NUM})", v):
        lat, lon = float(m[1]), float(m[2])
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError(f"GPS coordinates '{v}' are out of range")
        return [(f"{metric}_lat", lat, "°"), (f"{metric}_lon", lon, "°")]

    # 6. Labeled parts "Deep: 1.5, Light: 4.0, REM: 1.2"
    part = rf"[A-Za-z]+\s*:\s*{_NUM}"
    if re.fullmatch(rf"{part}(?:\s*,\s*{part})*", v):
        return [
            (f"{metric}_{label.lower()}", float(num), unit)
            for label, num in re.findall(rf"([A-Za-z]+)\s*:\s*({_NUM})", v)
        ]

    raise ValueError(f"value '{v}' is not a number or a supported format")


# ---------- Whole-file parser ----------
def _resolve_columns(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise CSVFormatError("CSV file is empty or has no header row")
    lookup = {(name or "").strip().lower(): name for name in fieldnames}
    resolved, missing = {}, []
    for canonical, aliases in COLUMN_ALIASES.items():
        actual = next((lookup[a] for a in aliases if a in lookup), None)
        if actual is None:
            missing.append(f"{canonical} (or {', '.join(aliases[1:])})" if len(aliases) > 1 else canonical)
        else:
            resolved[canonical] = actual
    if missing:
        raise CSVFormatError("Missing required column(s): " + "; ".join(missing))
    return resolved


def parse_measurements_csv(text: str) -> ImportResult:
    result = ImportResult()
    reader = csv.DictReader(io.StringIO(text), skipinitialspace=True)
    try:
        cols = _resolve_columns(reader.fieldnames)
        for row in reader:
            # Skip fully blank lines silently.
            if not any((cell or "").strip() for key, cell in row.items() if key is not None):
                continue
            try:
                get = lambda c: row.get(cols[c]) or ""
                ts = parse_timestamp(get("timestamp"))
                metric = normalize_metric(get("metric"))
                unit = parse_unit(get("unit"))
                parts = expand_value(metric, get("value"), unit)
                for name, _, _ in parts:
                    if len(name) > MAX_METRIC_LEN:
                        raise ValueError(f"metric name '{name}' is longer than {MAX_METRIC_LEN} characters")
            except ValueError as exc:
                result.rows_failed += 1
                if len(result.errors) < MAX_ERRORS_REPORTED:
                    result.errors.append({"line": reader.line_num, "error": str(exc)})
                continue

            result.rows_imported += 1
            result.measurements.extend(
                ParsedMeasurement(metric=n, value=val, unit=u, timestamp=ts) for n, val, u in parts
            )
    except csv.Error as exc:
        raise CSVFormatError(f"Could not read CSV: {exc}")
    return result