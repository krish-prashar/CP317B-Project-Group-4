/** "Nice" axis ticks (1, 2, 2.5, 5 × 10^n) so labels are round numbers. */
export function niceTicks(lo, hi, count = 5) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const ticks = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step / 2; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }
  return ticks;
}

/** Count, latest, min, max, average and flagged count for the stats row. */
export function summarize(points) {
  const vals = points.map(p => p.v);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    count: points.length,
    latest: points.at(-1).v,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: Math.round(avg * 100) / 100,
    flagged: points.filter(p => p.flag).length,
  };
}
