import { useState } from "react";
import { ApiErrorMessage } from "../components/Message.jsx";
import { useMeasurements } from "../hooks/useMeasurements.js";
import { asDate, fmtDate, metricLabel } from "../lib/format.js";

/** All readings, newest first, with flagged readings highlighted (Data Validation). */
export default function History({ api, metrics, onNavigate }) {
  const { data, error, loading } = useMeasurements(api);
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const flaggedCount = data.filter(r => r.flag_reason).length;
  const rows = flaggedOnly ? data.filter(r => r.flag_reason) : data;

  let body;
  if (loading) body = <p className="hint">Loading…</p>;
  else if (error) body = <ApiErrorMessage error={error} />;
  else if (!data.length) {
    body = (
      <div className="empty">
        No measurements yet.{" "}
        <button type="button" className="link-button" onClick={() => onNavigate("add")}>Add one</button> or sync a device.
      </div>
    );
  } else {
    body = (
      <>
        <p className="hint">
          {flaggedCount
            ? <><span className="flag">⚠ {flaggedCount}</span> reading{flaggedCount === 1 ? " is" : "s are"} outside the normal range.</>
            : "No flagged readings."}
        </p>
        {rows.length > 0 && (
          <table>
            <thead>
              <tr><th>Date and time</th><th>Metric</th><th>Value</th><th>Unit</th><th>Flag</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className={r.flag_reason ? "flagged" : undefined}>
                  <td>{fmtDate(asDate(r.timestamp))}</td>
                  <td>{metricLabel(r.metric, metrics)}</td>
                  <td>{r.value}</td>
                  <td>{r.unit}</td>
                  <td>{r.flag_reason && <span className="flag">⚠ {r.flag_reason}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  }

  return (
    <div className="card">
      <h3>History</h3>
      <label className="inline">
        <input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} /> Show flagged readings only
      </label>
      {body}
    </div>
  );
}
