"""Unit tests for validation.py (Data Validation story)."""
import pytest

from validation import METRIC_RULES, ValidationError, check_measurement, rules_as_dict


@pytest.mark.parametrize("metric,value,unit", [
    ("heart_rate", 72, "bpm"),
    ("weight", 70.5, "kg"),
    ("weight", 155, "lb"),
    ("temperature", 37.0, "°C"),
    ("oxygen_saturation", 98, "%"),
])
def test_normal_reading_is_not_flagged(metric, value, unit):
    assert check_measurement(metric, value, unit) is None


@pytest.mark.parametrize("metric,value,unit,word", [
    ("heart_rate", 140, "bpm", "Above"),
    ("heart_rate", 35, "bpm", "Below"),
    ("oxygen_saturation", 88, "%", "Below"),
    ("blood_pressure_systolic", 165, "mmHg", "Above"),
])
def test_out_of_normal_range_is_flagged(metric, value, unit, word):
    reason = check_measurement(metric, value, unit)
    assert reason is not None and reason.startswith(word)


@pytest.mark.parametrize("metric,value,unit", [
    ("heart_rate", 900, "bpm"),     # typo, extra digit
    ("heart_rate", 0, "bpm"),
    ("weight", -5, "kg"),
    ("oxygen_saturation", 101, "%"),
    ("temperature", 98.6, "°C"),    # Fahrenheit value entered as Celsius
])
def test_impossible_value_is_rejected(metric, value, unit):
    with pytest.raises(ValidationError, match="not possible"):
        check_measurement(metric, value, unit)


def test_wrong_unit_is_rejected():
    with pytest.raises(ValidationError, match="not a valid unit"):
        check_measurement("heart_rate", 72, "kg")


def test_boundaries_are_inclusive():
    # Exactly on the normal-range edges is normal; exactly on the hard edges is accepted.
    assert check_measurement("heart_rate", 40, "bpm") is None
    assert check_measurement("heart_rate", 120, "bpm") is None
    assert check_measurement("heart_rate", 20, "bpm") is not None
    assert check_measurement("heart_rate", 300, "bpm") is not None


def test_unknown_metric_is_accepted_without_flag():
    assert check_measurement("skeletal_muscle_mass", 35.2, "kg") is None


def test_rules_are_consistent():
    for metric, rule in METRIC_RULES.items():
        for unit, r in rule.units.items():
            assert r.hard.low <= r.normal.low <= r.normal.high <= r.hard.high, (metric, unit)


def test_rules_as_dict_shape():
    rules = rules_as_dict()
    assert rules["heart_rate"]["units"]["bpm"] == {"hard": [20, 300], "normal": [40, 120]}
