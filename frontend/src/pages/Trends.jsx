import { useMemo, useState } from "react";
import LineChart from "../components/LineChart.jsx";
import Message, { ApiErrorMessage } from "../components/Message.jsx";
import { useMeasurements } from "../hooks/useMeasurements.js";
import { asDate, DAY_MS, metricLabel, plural, toDateInput } from "../lib/format.js";
import { summarize } from "../lib/chart.js";

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
  { value: "custom", label: "Custom…" },
];

/** Start/end Dates for the chosen range, or {error}. */
export function resolveRange(preset, from, to, now = new Date()) {
  if (preset !== "custom") return { start: new Date(now.getTime() - Number(preset) * DAY_MS), end: now };
  if (!from || !to) return { error: "Choose both a start and an end date." };
  const start = new Date(from + "T00:00");
  const end = new Date(to + "T23:59:59.999");
  if (start > end) return { error: "The start date must be on or before the end date." };
  return { start, end: end > now ? now : end };
}

/** Historical Trends: one line chart per metric for a chosen date range. */
export default function Trends({ api, rules, metrics }) {
  const all = useMeasurements(api);                 // to list metrics that have data
  const [metric, setMetric] = useState("");
  const [preset, setPreset] = useState("30");
  const [from, setFrom] = useState(() => toDateInput(new Date(Date.now() - 30 * DAY_MS)));
  const [to, setTo] = useState(() => toDateInput());
  const [unit, setUnit] = useState(null);           // null = use the most recent reading's unit

  const keys = [...new Set([...all.data.map(d => d.metric), ...Object.keys(metrics)])]
    .sort((a, b) => metricLabel(a, metrics).localeCompare(metricLabel(b, metrics)));
  // Default to the metric with the most recent reading.
  const activeMetric = metric || all.data[0]?.metric || keys[0];

  // Computed once per selection, so "now" doesn't change on every render.
  const range = useMemo(() => resolveRange(preset, from, to), [preset, from, to]);
  const params = all.loading || range.error ? null : {
    metric: activeMetric,
    start: range.start.toISOString(),
    end: range.end.toISOString(),
    limit: 5000,
  };
  const { data: rows, error, loading } = useMeasurements(api, params);

  // A metric can be recorded in more than one unit (kg / lb); chart one at a time.
  const units = [...new Set(rows.map(r => r.unit))];
  const activeUnit = units.includes(unit) ? unit : rows[0]?.unit;   // rows are newest first
  const points = rows
    .filter(r => r.unit === activeUnit)
    .map(r => ({ id: r.id, t: asDate(r.timestamp), v: r.value, flag: r.flag_reason }))
    .sort((a, b) => a.t - b.t);
  const hidden = rows.length - points.length;
  const name = metricLabel(activeMetric, metrics);

  let body;
  if (range.error) body = <Message kind="err">{range.error}</Message>;
  else if (all.error || error) body = <ApiErrorMessage error={all.error || error} />;
  else if (all.loading || loading) body = <p className="hint">Loading…</p>;
  else if (!points.length) {
    body = (
      <Message kind="warn">
        No {name.toLowerCase()} readings between {range.start.toLocaleDateString()} and {range.end.toLocaleDateString()}.
      </Message>
    );
  } else {
    const s = summarize(points);
    const stat = (label, value) => <div>{label}<strong>{value}</strong></div>;
    body = (
      <>
        {hidden > 0 && (
          <p className="hint">{plural(hidden, "reading")} recorded in another unit not shown. Change the unit to see {hidden === 1 ? "it" : "them"}.</p>
        )}
        <div
          className="chart"
          role="img"
          aria-label={`${name} in ${activeUnit}, ${plural(points.length, "reading")} from ${range.start.toLocaleDateString()} to ${range.end.toLocaleDateString()}`}
        >
          <LineChart
            points={points}
            start={range.start}
            end={range.end}
            unit={activeUnit}
            name={name}
            normal={rules[activeMetric]?.units[activeUnit]?.normal}
          />
        </div>
        <div className="stats">
          {stat("Readings", s.count)}
          {stat("Latest", `${s.latest} ${activeUnit}`)}
          {stat("Min", `${s.min} ${activeUnit}`)}
          {stat("Max", `${s.max} ${activeUnit}`)}
          {stat("Average", `${s.avg} ${activeUnit}`)}
          {stat("Flagged", s.flagged)}
        </div>
      </>
    );
  }

  return (
    <div className="card">
      <h3>Historical Trends</h3>
      <div className="row">
        <label>Metric
          <select value={activeMetric} onChange={e => { setMetric(e.target.value); setUnit(null); }}>
            {keys.map(k => <option key={k} value={k}>{metricLabel(k, metrics)}</option>)}
          </select>
        </label>
        <label>Date range
          <select value={preset} onChange={e => setPreset(e.target.value)}>
            {PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        {units.length > 1 && (
          <label>Unit
            <select value={activeUnit} onChange={e => setUnit(e.target.value)}>
              {units.map(u => <option key={u}>{u}</option>)}
            </select>
          </label>
        )}
      </div>
      {preset === "custom" && (
        <div className="row">
          <label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
      )}
      {body}
    </div>
  );
}
