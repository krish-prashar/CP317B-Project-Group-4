import { DAY_MS, fmtDate } from "../lib/format.js";
import { niceTicks } from "../lib/chart.js";

const W = 640, H = 300, L = 56, R = 28, T = 16, B = 44;   // size and margins (SVG units)

/**
 * Line chart of one metric over a date range.
 * points: [{t: Date, v: number, flag: string|null}] sorted oldest -> newest
 * normal: [low, high] range to shade, or undefined
 */
export default function LineChart({ points, start, end, unit, name, normal }) {
  const t0 = start.getTime(), t1 = end.getTime();
  const yTicks = niceTicks(Math.min(...points.map(p => p.v)), Math.max(...points.map(p => p.v)));
  const y0 = yTicks[0], y1 = yTicks.at(-1);

  const x = t => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const clampY = v => y(Math.min(Math.max(v, y0), y1));

  const longRange = (t1 - t0) / DAY_MS > 200;
  const fmtTick = d => d.toLocaleDateString([], longRange ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" });
  const xTicks = Array.from({ length: 6 }, (_, i) => new Date(t0 + (i * (t1 - t0)) / 5));
  const midY = (H - B + T) / 2;
  const showBand = normal && normal[1] >= y0 && normal[0] <= y1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {showBand && (
        <rect className="band" x={L} y={clampY(normal[1])} width={W - L - R} height={clampY(normal[0]) - clampY(normal[1])}>
          <title>{`Normal range ${normal[0]}–${normal[1]} ${unit}`}</title>
        </rect>
      )}

      {yTicks.map(v => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text className="tick" x={L - 6} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      {xTicks.map(d => (
        <text key={d.getTime()} className="tick" x={x(d.getTime())} y={H - B + 16} textAnchor="middle">{fmtTick(d)}</text>
      ))}

      <line className="axis" x1={L} x2={L} y1={T} y2={H - B} />
      <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
      <text className="axis-label" x={14} y={midY} textAnchor="middle" transform={`rotate(-90 14 ${midY})`}>{`${name} (${unit})`}</text>
      <text className="axis-label" x={(L + W - R) / 2} y={H - 6} textAnchor="middle">Date</text>

      {points.length > 1 && (
        <polyline className="line" points={points.map(p => `${x(p.t.getTime())},${y(p.v)}`).join(" ")} />
      )}
      {points.map(p => (
        <circle
          key={p.id}
          className={"pt" + (p.flag ? " flagged" : "")}
          cx={x(p.t.getTime())}
          cy={y(p.v)}
          r={p.flag ? 5 : 4}
        >
          <title>{`${p.v} ${unit} — ${fmtDate(p.t)}${p.flag ? "\n⚠ " + p.flag : ""}`}</title>
        </circle>
      ))}
    </svg>
  );
}
