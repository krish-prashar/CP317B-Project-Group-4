export const DAY_MS = 864e5;

// The backend may return times without a timezone; they are UTC, so mark them.
export const asDate = iso =>
  iso instanceof Date ? iso : new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z");

export const fmtDate = iso =>
  asDate(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const shiftToLocal = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4);

/** Value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm, local time). */
export const toDateTimeInput = (d = new Date()) => shiftToLocal(d).toISOString().slice(0, 16);

/** Value for <input type="date"> (YYYY-MM-DD, local time). */
export const toDateInput = (d = new Date()) => shiftToLocal(d).toISOString().slice(0, 10);

/** "heart_rate" -> label from the rules, or "Heart rate" if the metric has no rule. */
export const metricLabel = (key, metrics = {}) =>
  metrics[key]?.label || key.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
