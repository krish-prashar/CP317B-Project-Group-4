// Client side of the Data Validation story. The real rules live in
// Backend/validation.py and are loaded from GET /metrics/rules; the backend
// re-checks every reading, so these checks only decide what to warn about.

// Used until the rules arrive (or if the server is down).
export const FALLBACK_METRICS = {
  weight:     { label: "Weight",     units: ["kg", "lb"] },
  bmi:        { label: "BMI",        units: ["kg/m²"] },
  body_fat:   { label: "Body fat",   units: ["%"] },
  heart_rate: { label: "Heart rate", units: ["bpm"] },
};

/** {metric: {label, units: {unit: {...}}}} -> {metric: {label, units: [unit, ...]}} */
export function metricsFromRules(rules) {
  return Object.fromEntries(
    Object.entries(rules).map(([key, r]) => [key, { label: r.label, units: Object.keys(r.units) }])
  );
}

/**
 * Same two levels as the backend:
 *   outside the hard range   -> { error }    (not saved)
 *   outside the normal range -> { warning }  (saved and flagged after confirmation)
 */
export function checkReading(rules, metric, value, unit) {
  const rule = rules[metric];
  const r = rule?.units[unit];
  if (!r) return {};
  const name = rule.label;
  const [hardLo, hardHi] = r.hard;
  const [normLo, normHi] = r.normal;
  if (value < hardLo || value > hardHi) {
    return { error: `${name} of ${value} ${unit} is not possible (accepted: ${hardLo}–${hardHi} ${unit}). Check for a typo.` };
  }
  if (value < normLo || value > normHi) {
    return { warning: `${name} of ${value} ${unit} is outside the normal range (${normLo}–${normHi} ${unit}).` };
  }
  return {};
}
