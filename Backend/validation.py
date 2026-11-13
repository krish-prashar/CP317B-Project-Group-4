"""
validation.py — Measurement validation rules (Sprint 2, Data Validation story).

Two levels of checks run on every measurement before it is saved:

* Hard limits  -> the value is physically impossible or the unit is wrong for the
                  metric (e.g. heart rate 900 bpm, weight in "bpm"). The reading
                  is REJECTED.
* Normal range -> the value is possible but outside the usual adult range
                  (e.g. heart rate 140 bpm). The reading is SAVED but FLAGGED so
                  staff reviewing the history can see it needs a second look.

The ranges are deliberately broad. They exist to catch typos and device glitches,
not to make clinical judgements. Clinical staff should review and adjust them.

Metrics with no rule here (e.g. new device metrics) are still accepted; only the
generic checks in schemas.py apply to them.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Range:
    low: float
    high: float

    def __contains__(self, value: float) -> bool:
        return self.low <= value <= self.high


@dataclass(frozen=True)
class UnitRule:
    hard: Range     # outside this -> reject
    normal: Range   # outside this (but inside hard) -> flag


@dataclass(frozen=True)
class MetricRule:
    label: str
    units: dict[str, UnitRule]   # first unit is the default in the UI


METRIC_RULES: dict[str, MetricRule] = {
    "weight": MetricRule("Weight", {
        "kg": UnitRule(hard=Range(0.5, 400), normal=Range(30, 200)),
        "lb": UnitRule(hard=Range(1, 880), normal=Range(66, 440)),
    }),
    "bmi": MetricRule("BMI", {
        "kg/m²": UnitRule(hard=Range(8, 100), normal=Range(16, 40)),
    }),
    "body_fat": MetricRule("Body fat", {
        "%": UnitRule(hard=Range(1, 75), normal=Range(5, 50)),
    }),
    "heart_rate": MetricRule("Heart rate", {
        "bpm": UnitRule(hard=Range(20, 300), normal=Range(40, 120)),
    }),
    "blood_pressure_systolic": MetricRule("Systolic BP", {
        "mmHg": UnitRule(hard=Range(40, 300), normal=Range(90, 140)),
    }),
    "blood_pressure_diastolic": MetricRule("Diastolic BP", {
        "mmHg": UnitRule(hard=Range(20, 200), normal=Range(60, 90)),
    }),
    "temperature": MetricRule("Temperature", {
        "°C": UnitRule(hard=Range(25, 45), normal=Range(35.5, 38.0)),
        "°F": UnitRule(hard=Range(77, 113), normal=Range(95.9, 100.4)),
    }),
    "oxygen_saturation": MetricRule("SpO₂", {
        "%": UnitRule(hard=Range(40, 100), normal=Range(92, 100)),
    }),
    "respiratory_rate": MetricRule("Respiratory rate", {
        "breaths/min": UnitRule(hard=Range(2, 80), normal=Range(12, 20)),
    }),
}


class ValidationError(ValueError):
    """A reading that must not be saved. The message is shown to the user."""


def _fmt(n: float) -> str:
    return f"{n:g}"


def check_measurement(metric: str, value: float, unit: str) -> str | None:
    """Validate one reading against METRIC_RULES.

    Raises ValidationError if the reading must be rejected.
    Returns a short flag reason if the reading is outside the normal range,
    or None if it is within range (or the metric has no rule).
    """
    rule = METRIC_RULES.get(metric)
    if rule is None:
        return None

    unit_rule = rule.units.get(unit)
    if unit_rule is None:
        allowed = ", ".join(rule.units)
        raise ValidationError(f"'{unit}' is not a valid unit for {rule.label}. Use: {allowed}.")

    hard, normal = unit_rule.hard, unit_rule.normal
    if value not in hard:
        raise ValidationError(
            f"{rule.label} of {_fmt(value)} {unit} is not possible "
            f"(accepted: {_fmt(hard.low)}–{_fmt(hard.high)} {unit}). Check for a typo."
        )
    if value < normal.low:
        return f"Below normal range ({_fmt(normal.low)}–{_fmt(normal.high)} {unit})"
    if value > normal.high:
        return f"Above normal range ({_fmt(normal.low)}–{_fmt(normal.high)} {unit})"
    return None


def rules_as_dict() -> dict:
    """JSON-friendly copy of the rules, served to the frontend so both sides
    use the same numbers."""
    return {
        metric: {
            "label": rule.label,
            "units": {
                unit: {
                    "hard": [r.hard.low, r.hard.high],
                    "normal": [r.normal.low, r.normal.high],
                }
                for unit, r in rule.units.items()
            },
        }
        for metric, rule in METRIC_RULES.items()
    }
