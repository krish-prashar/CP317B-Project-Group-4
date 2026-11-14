import { useRef, useState } from "react";
import html2canvas from "html2canvas";                                   // SHARE-1
import Message, { ApiErrorMessage, FlagBadge } from "../components/Message.jsx";
import { useMeasurements } from "../hooks/useMeasurements.js";
import { asDate, fmtDate, metricLabel, toDateInput } from "../lib/format.js";
import { readPref, writePref } from "../lib/session.js";

const DEFAULT_SHOWN = ["weight", "bmi", "body_fat", "heart_rate"];
const ALL = "all";          // FILTER-1: value of the "All metrics" option
const RECENT_COUNT = 5;     // FILTER-1: how many recent readings to list for one metric

/** UI-1: latest reading for each chosen metric.
 *  FILTER-1: filter the summary by one metric.
 *  SHARE-1: export the summary as a PNG image. */
export default function Summary({ api, metrics, user, onNavigate, onToast }) {
  const { data, error, loading } = useMeasurements(api);
  const prefKey = "ht_prefs_" + user;
  const [shown, setShown] = useState(() => readPref(prefKey, DEFAULT_SHOWN));
  const [filter, setFilter] = useState(ALL);           // FILTER-1
  const [exporting, setExporting] = useState(false);   // SHARE-1
  const [exportError, setExportError] = useState("");  // SHARE-1
  const exportRef = useRef(null);                      // SHARE-1: the area that becomes the image

  // Readings arrive newest first, so the first one per metric is the latest.
  const latest = {};
  for (const m of data) if (!latest[m.metric]) latest[m.metric] = m;

  // Known metrics first, then any other metric that exists in the data (e.g. from a device).
  const keys = [...new Set([...Object.keys(metrics), ...data.map(d => d.metric)])];

  // FILTER-1: which metric cards to show. "All" keeps the checkbox choice; one metric shows just that one.
  const visibleKeys = filter === ALL ? keys.filter(k => shown.includes(k)) : [filter];
  // FILTER-1: recent readings of the filtered metric (already newest first, no extra request).
  const recent = filter === ALL ? [] : data.filter(d => d.metric === filter).slice(0, RECENT_COUNT);

  function toggle(key) {
    const next = shown.includes(key) ? shown.filter(k => k !== key) : [...shown, key];
    setShown(next);
    writePref(prefKey, next);
  }

  // SHARE-1: screenshot the summary area and download it as a PNG.
  async function exportImage() {
    if (!exportRef.current) return;
    setExporting(true);
    setExportError("");
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, window.devicePixelRatio || 1),   // sharp on high-DPI screens
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `healthtrack-summary-${filter}-${toDateInput()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      onToast?.("Summary image downloaded.");
    } catch (err) {
      setExportError("Could not export the summary: " + (err?.message || err));
    } finally {
      setExporting(false);
    }
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
  } else if (!visibleKeys.length) {
    body = <div className="card empty" style={{ gridColumn: "1/-1" }}>Select at least one metric above to see its latest reading.</div>;
  } else {
    body = visibleKeys.map(k => {
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

  const canExport = !loading && !error && data.length > 0 && visibleKeys.length > 0;
  const filterName = filter === ALL ? "All metrics" : metricLabel(filter, metrics);

  return (
    <div className="card">
      {/* FILTER-1 + SHARE-1 controls */}
      <div className="row">
        <label>Filter by metric
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            aria-label="Filter the summary by metric"
          >
            <option value={ALL}>All metrics</option>
            {keys.map(k => <option key={k} value={k}>{metricLabel(k, metrics)}</option>)}
          </select>
        </label>
        <div className="btn-row">
          <button
            type="button"
            onClick={exportImage}
            disabled={!canExport || exporting}
            aria-label="Export the daily summary as a PNG image"
          >
            {exporting ? "Exporting…" : "Export as Image"}
          </button>
        </div>
      </div>
      <Message kind="err">{exportError}</Message>

      {/* Checkboxes only matter when showing all metrics */}
      {filter === ALL && (
        <div className="metric-picker">
          {keys.map(k => (
            <label key={k}>
              <input type="checkbox" checked={shown.includes(k)} onChange={() => toggle(k)} /> {metricLabel(k, metrics)}
            </label>
          ))}
        </div>
      )}

      {/* SHARE-1: everything inside this div ends up in the exported image */}
      <div ref={exportRef} style={{ background: "#ffffff", padding: "4px" }}>
        <h3>Daily Summary</h3>
        <p className="hint">{filterName} · {new Date().toLocaleDateString([], { dateStyle: "medium" })}</p>
        <div className="summary-grid">{body}</div>

        {/* FILTER-1: recent readings for the selected metric */}
        {recent.length > 1 && (
          <table aria-label={`Recent ${filterName} readings`}>
            <thead>
              <tr><th>Date and time</th><th>Value</th><th>Status</th></tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.id} className={r.flag_reason ? "flagged" : undefined}>
                  <td>{fmtDate(asDate(r.timestamp))}</td>
                  <td>{r.value} {r.unit}</td>
                  <td>{r.flag_reason ? <span className="flag">⚠ {r.flag_reason}</span> : "Normal"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
