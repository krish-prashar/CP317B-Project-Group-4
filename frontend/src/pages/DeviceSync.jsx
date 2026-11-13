import { useState } from "react";
import Message, { ApiErrorMessage } from "../components/Message.jsx";
import { plural } from "../lib/format.js";

// Simulated readings from a smart scale and watch (no real device integration yet).
function deviceReadings() {
  const ago = min => new Date(Date.now() - min * 60000).toISOString();
  return [
    { metric: "weight",     value: 78.4, unit: "kg",    timestamp: ago(45) },  // smart scale
    { metric: "bmi",        value: 24.7, unit: "kg/m²", timestamp: ago(45) },  // smart scale
    { metric: "body_fat",   value: 18.6, unit: "%",     timestamp: ago(45) },  // smart scale
    { metric: "heart_rate", value: 66,   unit: "bpm",   timestamp: ago(5) },   // watch
  ];
}

/** IMP-1: push the latest device readings to the backend in one batch. */
export default function DeviceSync({ api, onNavigate }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function sync() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      setResult(await api("/measurements/sync-device", { method: "POST", json: deviceReadings() }));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h3>Sync your devices</h3>
      <p className="hint">Pull the latest readings from your smart scale and watch.</p>
      <button type="button" disabled={busy} onClick={sync}>
        {busy ? "Syncing…" : "Sync with Smart Scale/Watch"}
      </button>
      <div role="status" aria-live="polite">
        {result && (
          <Message kind="ok">
            <strong>Synced {plural(result.synced, "reading")}</strong> from your smart scale and watch.{" "}
            {result.flagged > 0 && <span className="flag">⚠ {result.flagged} outside the normal range (flagged). </span>}
            <button type="button" className="link-button" onClick={() => onNavigate("summary")}>View dashboard</button>
          </Message>
        )}
        <ApiErrorMessage error={error} />
      </div>
    </div>
  );
}
