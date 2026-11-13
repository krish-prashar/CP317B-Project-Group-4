import { useState } from "react";
import { ApiErrorMessage, FlagBadge } from "../components/Message.jsx";
import { useMeasurements } from "../hooks/useMeasurements.js";
import { asDate, fmtDate, metricLabel } from "../lib/format.js";
import { readPref, writePref } from "../lib/session.js";

const DEFAULT_SHOWN = ["weight", "bmi", "body_fat", "heart_rate"];

/** UI-1: latest reading for each chosen metric. */
export default function Summary({ api, metrics, user, onNavigate }) {
  const { data, error, loading } = useMeasurements(api);
  const prefKey = "ht_prefs_" + user;
  const [shown, setShown] = useState(() => readPref(prefKey, DEFAULT_SHOWN));

  // Readings arrive newest first, so the first one per metric is the latest.
  const latest = {};
  for (const m of data) if (!latest[m.metric]) latest[m.metric] = m;

  // Known metrics first, then any other metric that exists in the data (e.g. from a device).
  const keys = [...new Set([...Object.keys(metrics), ...data.map(d => d.metric)])];

  function toggle(key) {
    const next = shown.includes(key) ? shown.filter(k => k !== key) : [...shown, key];
    setShown(next);
    writePref(prefKey, next);
  }

  let body;
  if (loading) body = <p className="hint">Loading…</p>;
  else if (error) body = <ApiErrorMessage error={error} />;
  else if (!data.length) {
    body = (
      <div className="card empty" style={{ gridColumn: "1/-1" }}>
        <p>No readings yet.</p>
        <button type="button" onClick={() => onNavigate("add")}>Add your first measurement</button>
      </div>
    );
  } else if (!keys.some(k => shown.includes(k))) {
    body = <div className="card empty" style={{ gridColumn: "1/-1" }}>Select at least one metric above to see its latest reading.</div>;
  } else {
    body = keys.filter(k => shown.includes(k)).map(k => {
      const m = latest[k];
      return (
        <div key={k} className={"metric" + (m?.flag_reason ? " flagged" : "")}>
          <div className="name">{metricLabel(k, metrics)}</div>
          {m ? (
            <>
              <div className="val">{m.value} <small>{m.unit}</small></div>
              <div className="when">{fmtDate(asDate(m.timestamp))}</div>
              <FlagBadge reason={m.flag_reason} />
            </>
          ) : (
            <div className="when">No readings for this metric yet.</div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="card">
      <h3>Daily Summary</h3>
      <div className="metric-picker">
        {keys.map(k => (
          <label key={k}>
            <input type="checkbox" checked={shown.includes(k)} onChange={() => toggle(k)} /> {metricLabel(k, metrics)}
          </label>
        ))}
      </div>
      <div className="summary-grid">{body}</div>
    </div>
  );
}
