import { useEffect, useState } from "react";
import { makeApi } from "../lib/api.js";
import { FALLBACK_METRICS, metricsFromRules } from "../lib/validation.js";

/** Loads the validation rules once (public endpoint, no sign-in needed). */
export function useRules() {
  const [rules, setRules] = useState({});

  useEffect(() => {
    let active = true;
    makeApi(null)("/metrics/rules")
      .then(r => { if (active) setRules(r); })
      .catch(() => { /* server down: keep fallback metrics; backend still validates on save */ });
    return () => { active = false; };
  }, []);

  const metrics = Object.keys(rules).length ? metricsFromRules(rules) : FALLBACK_METRICS;
  return { rules, metrics };
}
