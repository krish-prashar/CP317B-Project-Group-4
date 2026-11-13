import { useState } from "react";
import Message, { ApiErrorMessage } from "../components/Message.jsx";
import { toDateTimeInput } from "../lib/format.js";
import { checkReading } from "../lib/validation.js";

/** MET-1 + Data Validation: add a reading; warn before saving out-of-range values. */
export default function AddMeasurement({ api, rules, metrics, onNavigate, onToast }) {
  const firstMetric = Object.keys(metrics)[0];
  const [metric, setMetric] = useState(firstMetric);
  const [unit, setUnit] = useState(metrics[firstMetric].units[0]);
  const [value, setValue] = useState("");
  const [when, setWhen] = useState(() => toDateTimeInput());
  const [problems, setProblems] = useState([]);
  const [pending, setPending] = useState(null);   // {row, warning} waiting for confirmation
  const [apiError, setApiError] = useState(null);
  const [busy, setBusy] = useState(false);

  // The metric list can change once the rules load; keep the selection valid.
  const currentMetric = metrics[metric] ? metric : firstMetric;
  const units = metrics[currentMetric].units;
  const currentUnit = units.includes(unit) ? unit : units[0];
  const normal = rules[currentMetric]?.units[currentUnit]?.normal;

  function clearMessages() { setProblems([]); setPending(null); setApiError(null); }

  function changeMetric(e) {
    setMetric(e.target.value);
    setUnit(metrics[e.target.value].units[0]);
    clearMessages();
  }

  function submit(e) {
    e.preventDefault();
    clearMessages();
    const raw = value.trim(), n = Number(raw);
    const found = [];
    if (!raw) found.push("Enter a value.");
    else if (!Number.isFinite(n) || n <= 0) found.push("Value must be a number greater than 0.");
    if (!currentUnit) found.push("Choose a unit.");
    if (!when) found.push("Choose a date and time.");
    else if (new Date(when) > new Date()) found.push("Date and time cannot be in the future.");

    const check = found.length ? {} : checkReading(rules, currentMetric, n, currentUnit);
    if (check.error) found.push(check.error);
    if (found.length) { setProblems(found); return; }

    const row = { metric: currentMetric, value: n, unit: currentUnit, timestamp: new Date(when).toISOString() };
    if (check.warning) setPending({ row, warning: check.warning });  // ask first
    else save(row);
  }

  async function save(row) {
    setBusy(true);
    try {
      const saved = await api("/measurements", { method: "POST", json: row });
      onToast(saved.flag_reason ? "Measurement saved and flagged for review." : "Measurement saved.");
      onNavigate("history");
    } catch (err) {
      setPending(null);
      setApiError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Add Measurement</h3>
      <div role="alert">
        {problems.length > 0 && (
          <Message kind="err">
            <strong>Measurement not saved.</strong>
            <ul>{problems.map(p => <li key={p}>{p}</li>)}</ul>
          </Message>
        )}
        {pending && (
          <Message kind="warn">
            <strong>Please confirm.</strong> {pending.warning} If the value is correct it will be saved and flagged for review.
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button type="button" disabled={busy} onClick={() => save(pending.row)}>Save and flag</button>
              <button type="button" className="btn-secondary" onClick={() => setPending(null)}>Edit value</button>
            </div>
          </Message>
        )}
        <ApiErrorMessage error={apiError} />
      </div>

      <form onSubmit={submit} noValidate>
        <select aria-label="Metric" value={currentMetric} onChange={changeMetric}>
          {Object.entries(metrics).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <input
          type="number"
          step="any"
          aria-label="Value"
          placeholder="Value"
          value={value}
          onChange={e => { setValue(e.target.value); setPending(null); }}
        />
        <select aria-label="Unit" value={currentUnit} onChange={e => { setUnit(e.target.value); setPending(null); }}>
          {units.map(u => <option key={u}>{u}</option>)}
        </select>
        {normal && <p className="hint" style={{ marginTop: -5 }}>Normal range: {normal[0]}–{normal[1]} {currentUnit}</p>}
        <input type="datetime-local" aria-label="Date and time" value={when} onChange={e => setWhen(e.target.value)} />
        <button type="submit" disabled={busy}>Save Measurement</button>
      </form>
    </div>
  );
}
