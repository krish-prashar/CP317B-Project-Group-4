/* ------------------------------------------------------------------
   HealthTrack front end
   Sprint 1: AUTH-1, MET-1, IMP-1 (device sync), UI-1
   Sprint 2: Data Validation (warnings + flagged readings), Historical Trends (charts by date range)
   Talks to the FastAPI backend. Change API_URL if the server runs elsewhere.
------------------------------------------------------------------- */
const API_URL = "http://127.0.0.1:8000";

// Keys match the backend's snake_case metric names. This is only a fallback:
// on load it is replaced by the rules from GET /metrics/rules (Backend/validation.py).
let METRICS = {
  weight:     {label: "Weight",     units: ["kg", "lb"]},
  bmi:        {label: "BMI",        units: ["kg/m²"]},
  body_fat:   {label: "Body fat",   units: ["%"]},
  heart_rate: {label: "Heart rate", units: ["bpm"]}
};
let RULES = {};  // metric -> {label, units: {unit: {hard: [lo, hi], normal: [lo, hi]}}}
const IDLE_MS = 15 * 60 * 1000;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const label = k => METRICS[k]?.label || k.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
// The backend may return times without a timezone; they are UTC, so mark them.
const asDate = iso => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z");
const fmtDate = iso => asDate(iso).toLocaleString([], {dateStyle: "medium", timeStyle: "short"});

let user = null, token = null, lastActive = Date.now(), cache = [];

/* ---------- API helper ---------- */
class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }
async function api(path, {method = "GET", json, form} = {}) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (json) headers["Content-Type"] = "application/json";
  let res;
  try {
    res = await fetch(API_URL + path, {method, headers, body: json ? JSON.stringify(json) : form});
  } catch {
    throw new ApiError("Cannot reach the server. Check that the backend is running at " + API_URL + ".", 0);
  }
  if (res.status === 401 && token) { endSession("Your session expired. Sign in again."); throw new ApiError("Session expired", 401); }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = body.detail;
    if (Array.isArray(msg)) msg = msg.map(d => (d.loc?.slice(1).join(".") || "input") + ": " + d.msg).join("; ");
    throw new ApiError(msg || "Something went wrong (" + res.status + ").", res.status);
  }
  return body;
}

/* ---------- AUTH-1: staff sign-in (work email or work ID) ---------- */
// The app is for clinic / hospital staff, not the public. Staff sign in with the work
// email or work ID their organisation issued; creating an account needs both.
const WORK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,31}$/;  // same rule as Backend/schemas.py
let mode = "login";
function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("tab-login").setAttribute("aria-selected", !reg);
  $("tab-register").setAttribute("aria-selected", reg);
  $("identifier-label").textContent = reg ? "Work email" : "Work email or work ID";
  $("identifier").placeholder = reg ? "e.g. j.smith@stmarys.ca" : "e.g. j.smith@stmarys.ca or RN-10432";
  $("identifier").type = reg ? "email" : "text";
  $("identifier").autocomplete = reg ? "email" : "username";
  $("work-id-field").classList.toggle("hidden", !reg);
  $("work_id").required = reg;
  $("confirm-field").classList.toggle("hidden", !reg);
  $("pw-hint").classList.toggle("hidden", !reg);
  $("password").autocomplete = reg ? "new-password" : "current-password";
  $("auth-submit").textContent = reg ? "Create staff account" : "Sign in";
  $("auth-msg").innerHTML = "";
}
$("tab-login").onclick = () => setMode("login");
$("tab-register").onclick = () => setMode("register");
const authErr = t => $("auth-msg").innerHTML = `<div class="msg err">${esc(t)}</div>`;

$("auth-form").onsubmit = async e => {
  e.preventDefault();
  const ident = $("identifier").value.trim(), pw = $("password").value;
  $("auth-submit").disabled = true;
  try {
    let path, body;
    if (mode === "register") {
      const email = ident.toLowerCase(), workId = $("work_id").value.trim().toUpperCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return authErr("Enter your work email address.");
      if (!WORK_ID_RE.test(workId)) return authErr("Enter your work ID: 3-32 letters, digits or dashes (e.g. RN-10432).");
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return authErr("Password needs at least 8 characters, with a letter and a number.");
      if (pw !== $("confirm").value) return authErr("The two passwords do not match.");
      path = "/register"; body = {email, work_id: workId, password: pw};
    } else {
      if (!ident) return authErr("Enter your work email or work ID.");
      path = "/login"; body = {identifier: ident, password: pw};
    }
    const res = await api(path, {method: "POST", json: body});
    startSession(res.access_token, res.user.email);
  } catch (err) {
    authErr(err.status === 409 ? err.message + ". Sign in instead." : err.message);
  } finally {
    $("auth-submit").disabled = false;
  }
};
function startSession(tok, email) {
  token = tok; user = email; lastActive = Date.now();
  sessionStorage.setItem("ht_session", JSON.stringify({token, email, t: lastActive}));
  $("auth-form").reset();
  $("auth").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("who").textContent = email;
  go("summary");
}
function endSession(reason) {
  user = null; token = null; cache = [];
  sessionStorage.removeItem("ht_session");
  $("app").classList.add("hidden");
  $("auth").classList.remove("hidden");
  setMode("login");
  if (reason) $("auth-msg").innerHTML = `<div class="msg warn">${esc(reason)}</div>`;
}
$("logout").onclick = () => endSession();
["click", "keydown", "pointermove"].forEach(ev => document.addEventListener(ev, () => {
  if (user) { lastActive = Date.now(); sessionStorage.setItem("ht_session", JSON.stringify({token, email: user, t: lastActive})); }
}));
setInterval(() => { if (user && Date.now() - lastActive > IDLE_MS) endSession("You were signed out after 15 minutes of inactivity."); }, 15000);

/* ---------- data ---------- */
// All measurements come from the backend (newest first). Nothing health-related is kept in the browser.
async function loadData() { cache = await api("/measurements"); return cache; }
// Clean up readings that older versions of this page copied into localStorage.
try { Object.keys(localStorage).filter(k => k.startsWith("ht_local_")).forEach(k => localStorage.removeItem(k)); } catch {}
// Only the dashboard's metric-picker choice (not health data) is still saved in the browser.
// Sprint 1 default: the original four metrics are shown on the summary.
const getPrefs = () => read("ht_prefs_" + user, ["weight", "bmi", "body_fat", "heart_rate"]);
function toast(text) {
  $("toast").innerHTML = `<div class="msg ok">${esc(text)}</div>`;
  setTimeout(() => $("toast").innerHTML = "", 4000);
}
const showErr = (el, err) => { if (err.status !== 401) el.innerHTML = `<div class="msg err">${esc(err.message)}</div>`; };

/* ---------- navigation ---------- */
function go(view) {
  ["summary", "add", "import", "history", "trends"].forEach(v => $("view-" + v).classList.toggle("hidden", v !== view));
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (view === "summary") renderSummary();
  if (view === "history") renderHistory();
  if (view === "add") resetAdd();
  if (view === "trends") initTrends();
}
document.querySelectorAll("nav button").forEach(b => b.onclick = () => go(b.dataset.view));

/* ---------- UI-1: daily summary ---------- */
async function renderSummary() {
  $("summary-grid").innerHTML = `<p class="hint">Loading…</p>`;
  let data;
  try { data = await loadData(); } catch (err) { showErr($("summary-grid"), err); return; }
  // Core metrics first, then any other metric that exists in the data (e.g. from CSV imports).
  const keys = [...new Set([...Object.keys(METRICS), ...data.map(d => d.metric)])];
  const prefs = getPrefs();
  $("metric-picker").innerHTML = keys.map(k =>
    `<label><input type="checkbox" value="${esc(k)}" ${prefs.includes(k) ? "checked" : ""}> ${esc(label(k))}</label>`).join("");
  $("metric-picker").querySelectorAll("input").forEach(i => i.onchange = () => {
    write("ht_prefs_" + user, [...$("metric-picker").querySelectorAll("input:checked")].map(x => x.value));
    renderSummary();
  });
  if (!data.length) {
    $("summary-grid").innerHTML = `<div class="card empty" style="grid-column:1/-1"><p style="margin:0 auto 1rem">No readings yet.</p><button class="btn" id="empty-add">Add your first measurement</button></div>`;
    $("empty-add").onclick = () => go("add");
    return;
  }
  const shown = keys.filter(k => prefs.includes(k));
  if (!shown.length) { $("summary-grid").innerHTML = `<div class="card empty" style="grid-column:1/-1">Select at least one metric above to see its latest reading.</div>`; return; }
  $("summary-grid").innerHTML = shown.map(k => {
    const latest = data.filter(d => d.metric === k).sort((a, b) => asDate(b.timestamp) - asDate(a.timestamp))[0];
    return latest
      ? `<div class="metric${latest.flag_reason ? " flagged" : ""}"><div class="name">${esc(label(k))}</div><div class="val">${esc(latest.value)} <small>${esc(latest.unit)}</small></div><div class="when">${fmtDate(latest.timestamp)}</div>${flagBadge(latest)}</div>`
      : `<div class="metric"><div class="name">${esc(label(k))}</div><div class="when">No readings for this metric yet.</div></div>`;
  }).join("");
}

/* ---------- MET-1: add measurement ---------- */
function nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function fillMetrics() {
  $("m-metric").innerHTML = Object.entries(METRICS).map(([k, m]) => `<option value="${esc(k)}">${esc(m.label)}</option>`).join("");
  fillUnits();
}
function fillUnits() {
  $("m-unit").innerHTML = METRICS[$("m-metric").value].units.map(u => `<option>${esc(u)}</option>`).join("");
  showRange();
}
function showRange() {
  const r = RULES[$("m-metric").value]?.units[$("m-unit").value];
  $("m-range").textContent = r ? `Normal range: ${r.normal[0]}–${r.normal[1]} ${$("m-unit").value}` : "";
}
$("m-metric").onchange = fillUnits;
$("m-unit").onchange = showRange;
fillMetrics();
function resetAdd() { $("add-msg").innerHTML = ""; $("m-value").value = ""; $("m-date").value = nowLocal(); fillUnits(); }

/* ---------- Data Validation ---------- */
// Same two levels as Backend/validation.py: outside "hard" = rejected, outside "normal" = saved but flagged.
// The backend re-checks every reading, so this is only for giving the warning before saving.
async function loadRules() {
  try {
    RULES = await api("/metrics/rules");
    METRICS = Object.fromEntries(Object.entries(RULES).map(([k, r]) => [k, {label: r.label, units: Object.keys(r.units)}]));
    fillMetrics();
  } catch { /* server down: keep the fallback list; the backend still validates on save */ }
}
function checkReading(metric, value, unit) {
  const r = RULES[metric]?.units[unit];
  if (!r) return {};
  const name = label(metric);
  if (value < r.hard[0] || value > r.hard[1])
    return {error: `${name} of ${value} ${unit} is not possible (accepted: ${r.hard[0]}–${r.hard[1]} ${unit}). Check for a typo.`};
  if (value < r.normal[0] || value > r.normal[1])
    return {warning: `${name} of ${value} ${unit} is outside the normal range (${r.normal[0]}–${r.normal[1]} ${unit}).`};
  return {};
}
const flagBadge = m => m.flag_reason ? `<div class="flag" title="${esc(m.flag_reason)}">⚠ ${esc(m.flag_reason)}</div>` : "";

$("add-form").onsubmit = e => {
  e.preventDefault();
  const problems = [], raw = $("m-value").value.trim(), n = Number(raw);
  if (!raw) problems.push("Enter a value.");
  else if (!Number.isFinite(n) || n <= 0) problems.push("Value must be a number greater than 0.");
  if (!$("m-unit").value) problems.push("Choose a unit.");
  if (!$("m-date").value) problems.push("Choose a date and time.");
  else if (new Date($("m-date").value) > new Date()) problems.push("Date and time cannot be in the future.");
  if (!problems.length) {
    const {error} = checkReading($("m-metric").value, n, $("m-unit").value);
    if (error) problems.push(error);
  }
  if (problems.length) {
    $("add-msg").innerHTML = `<div class="msg err"><strong>Measurement not saved.</strong><ul>${problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>`;
    return;
  }
  const row = {metric: $("m-metric").value, value: n, unit: $("m-unit").value, timestamp: new Date($("m-date").value).toISOString()};
  const {warning} = checkReading(row.metric, row.value, row.unit);
  if (!warning) return saveMeasurement(row);
  // Out of normal range: ask before saving. Saved readings are flagged in the history.
  $("add-msg").innerHTML = `<div class="msg warn"><strong>Please confirm.</strong> ${esc(warning)}
    If the value is correct it will be saved and flagged for review.
    <div class="btn-row" style="margin-top:10px"><button type="button" id="m-confirm">Save and flag</button>
    <button type="button" id="m-edit" class="btn-secondary">Edit value</button></div></div>`;
  $("m-confirm").onclick = () => saveMeasurement(row);
  $("m-edit").onclick = () => { $("add-msg").innerHTML = ""; $("m-value").focus(); };
};
async function saveMeasurement(row) {
  try {
    const saved = await api("/measurements", {method: "POST", json: row});
    toast(saved.flag_reason ? "Measurement saved and flagged for review." : "Measurement saved.");
    go("history");
  } catch (err) { showErr($("add-msg"), err); }
}

/* ---------- history ---------- */
async function renderHistory() {
  $("history").innerHTML = `<p class="hint">Loading…</p>`;
  let d;
  try { d = (await loadData()).slice().sort((a, b) => asDate(b.timestamp) - asDate(a.timestamp)); } catch (err) { showErr($("history"), err); return; }
  if (!d.length) { $("history").innerHTML = `<div class="empty">No measurements yet. <a href="#" id="h-add">Add one</a> or sync a device.</div>`; $("h-add").onclick = e => { e.preventDefault(); go("add"); }; return; }
  const flaggedCount = d.filter(r => r.flag_reason).length;
  if ($("h-flagged").checked) d = d.filter(r => r.flag_reason);
  const summary = `<p class="hint">${flaggedCount ? `<span class="flag">⚠ ${flaggedCount}</span> reading${flaggedCount === 1 ? " is" : "s are"} outside the normal range.` : "No flagged readings."}</p>`;
  if (!d.length) { $("history").innerHTML = summary; return; }
  $("history").innerHTML = summary + `<table><thead><tr><th>Date and time</th><th>Metric</th><th>Value</th><th>Unit</th><th>Flag</th></tr></thead><tbody>` +
    d.map(r => `<tr${r.flag_reason ? ' class="flagged"' : ""}><td>${fmtDate(r.timestamp)}</td><td>${esc(label(r.metric))}</td><td>${esc(r.value)}</td><td>${esc(r.unit)}</td><td>${r.flag_reason ? `<span class="flag">⚠ ${esc(r.flag_reason)}</span>` : ""}</td></tr>`).join("") + `</tbody></table>`;
}
$("h-flagged").onchange = renderHistory;

/* ---------- IMP-1: CSV import ---------- */
function deviceReadings() {
  const ago = min => new Date(Date.now() - min * 60000).toISOString();
  return [
    {metric: "weight",     value: 78.4, unit: "kg",    timestamp: ago(45)},  // smart scale
    {metric: "bmi",        value: 24.7, unit: "kg/m²", timestamp: ago(45)},  // smart scale
    {metric: "body_fat",   value: 18.6, unit: "%",     timestamp: ago(45)},  // smart scale
    {metric: "heart_rate", value: 66,   unit: "bpm",   timestamp: ago(5)}    // watch
  ];
}
const SYNC_LABEL = "Sync with Smart Scale/Watch";
// Replaces the old CSV upload markup inside #view-import, so the HTML file needs no changes.
$("view-import").innerHTML = `
  <div class="card">
    <h2>Sync your devices</h2>
    <p class="hint">Pull the latest readings from your smart scale and watch.</p>
    <button class="btn" id="do-sync" type="button" aria-label="Sync latest readings from smart scale and watch">${SYNC_LABEL}</button>
    <div id="sync-result" role="status" aria-live="polite"></div>
  </div>`;
const syncNav = document.querySelector('nav button[data-view="import"]');
if (syncNav) syncNav.textContent = "Sync device";

$("do-sync").onclick = async () => {
  const btn = $("do-sync"), out = $("sync-result");
  btn.disabled = true; btn.textContent = "Syncing…"; out.innerHTML = "";
  try {
    const r = await api("/measurements/sync-device", {method: "POST", json: deviceReadings()});
    const flagged = r.flagged ? ` <span class="flag">⚠ ${r.flagged} outside the normal range (flagged).</span>` : "";
    out.innerHTML = `<div class="msg ok"><strong>Synced ${r.synced} reading${r.synced === 1 ? "" : "s"}</strong> from your smart scale and watch.${flagged} <a href="#" id="sync-view">View dashboard</a></div>`;
    $("sync-view").onclick = e => { e.preventDefault(); go("summary"); };
  } catch (err) { showErr(out, err); }
  finally { btn.disabled = false; btn.textContent = SYNC_LABEL; }
};

/* ---------- Historical Trends ---------- */
// One line chart per metric for a chosen date range. The normal range (from the
// validation rules) is shaded, and flagged readings are drawn in amber.
const DAY_MS = 864e5;
const dateInput = d => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

async function initTrends() {
  // Metrics the patient actually has readings for, plus the known ones.
  let data = cache;
  if (!data.length) { try { data = await loadData(); } catch (err) { showErr($("t-msg"), err); return; } }
  const keys = [...new Set([...data.map(d => d.metric), ...Object.keys(METRICS)])]
    .sort((a, b) => label(a).localeCompare(label(b)));
  const current = $("t-metric").value;
  $("t-metric").innerHTML = keys.map(k => `<option value="${esc(k)}">${esc(label(k))}</option>`).join("");
  // Default to the metric with the most recent reading.
  $("t-metric").value = keys.includes(current) ? current : (data[0]?.metric || keys[0]);
  if (!$("t-to").value) { $("t-to").value = dateInput(new Date()); $("t-from").value = dateInput(new Date(Date.now() - 30 * DAY_MS)); }
  renderTrends();
}

function trendRange() {
  const v = $("t-range").value;
  if (v !== "custom") return {start: new Date(Date.now() - Number(v) * DAY_MS), end: new Date()};
  if (!$("t-from").value || !$("t-to").value) return {error: "Choose both a start and an end date."};
  const start = new Date($("t-from").value + "T00:00"), end = new Date($("t-to").value + "T23:59:59.999");
  if (start > end) return {error: "The start date must be on or before the end date."};
  return {start, end: end > new Date() ? new Date() : end};
}

let trendRequest = 0;  // ignore responses from older requests if the user changes filters quickly
async function renderTrends(keepUnit = false) {
  $("t-custom").classList.toggle("hidden", $("t-range").value !== "custom");
  $("t-msg").innerHTML = ""; $("t-stats").innerHTML = "";
  const metric = $("t-metric").value, range = trendRange();
  if (range.error) { $("t-msg").innerHTML = `<div class="msg err">${esc(range.error)}</div>`; $("t-chart").innerHTML = ""; return; }

  const id = ++trendRequest;
  $("t-chart").innerHTML = `<p class="hint">Loading…</p>`;
  const q = new URLSearchParams({metric, start: range.start.toISOString(), end: range.end.toISOString(), limit: 5000});
  let rows;
  try { rows = await api("/measurements?" + q); } catch (err) { showErr($("t-msg"), err); $("t-chart").innerHTML = ""; return; }
  if (id !== trendRequest) return;

  // Readings of one metric can use different units (kg / lb). Chart one unit at a time.
  const units = [...new Set(rows.map(r => r.unit))];
  $("t-unit-field").classList.toggle("hidden", units.length < 2);
  const prevUnit = $("t-unit").value;
  $("t-unit").innerHTML = units.map(u => `<option>${esc(u)}</option>`).join("");
  $("t-unit").value = keepUnit && units.includes(prevUnit) ? prevUnit : (rows[0]?.unit || "");  // rows are newest first
  const unit = $("t-unit").value;
  const points = rows.filter(r => r.unit === unit)
    .map(r => ({t: asDate(r.timestamp), v: r.value, flag: r.flag_reason}))
    .sort((a, b) => a.t - b.t);

  if (!points.length) {
    $("t-chart").innerHTML = `<div class="msg warn">No ${esc(label(metric).toLowerCase())} readings between ${range.start.toLocaleDateString()} and ${range.end.toLocaleDateString()}.</div>`;
    return;
  }
  const hidden = rows.length - points.length;
  if (hidden) $("t-msg").innerHTML = `<p class="hint">${hidden} reading${hidden === 1 ? "" : "s"} recorded in another unit not shown. Change the unit to see ${hidden === 1 ? "it" : "them"}.</p>`;

  $("t-chart").setAttribute("aria-label", `${label(metric)} in ${unit}, ${points.length} readings from ${range.start.toLocaleDateString()} to ${range.end.toLocaleDateString()}`);
  $("t-chart").innerHTML = lineChart(points, range, unit, label(metric), RULES[metric]?.units[unit]?.normal);
  const vals = points.map(p => p.v), round = x => Math.round(x * 100) / 100;
  const stat = (name, v) => `<div>${name}<strong>${v}</strong></div>`;
  $("t-stats").innerHTML = stat("Readings", points.length) + stat("Latest", `${points.at(-1).v} ${esc(unit)}`) +
    stat("Min", `${Math.min(...vals)} ${esc(unit)}`) + stat("Max", `${Math.max(...vals)} ${esc(unit)}`) +
    stat("Average", `${round(vals.reduce((a, b) => a + b, 0) / vals.length)} ${esc(unit)}`) +
    stat("Flagged", points.filter(p => p.flag).length);
}
["t-metric", "t-range", "t-from", "t-to"].forEach(id => $(id).onchange = () => renderTrends());
$("t-unit").onchange = () => renderTrends(true);

// "Nice" axis ticks (1, 2, 2.5, 5 × 10^n) so labels are round numbers.
function niceTicks(lo, hi, count = 5) {
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / count, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const ticks = [];
  for (let t = Math.floor(lo / step) * step; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return ticks;
}

function lineChart(points, range, unit, name, normal) {
  const W = 640, H = 300, L = 56, R = 28, T = 16, B = 44;
  const t0 = range.start.getTime(), t1 = range.end.getTime();
  const vals = points.map(p => p.v);
  const yt = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = yt[0], y1 = yt.at(-1);
  const x = t => L + (t - t0) / (t1 - t0 || 1) * (W - L - R);
  const y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const clampY = v => y(Math.min(Math.max(v, y0), y1));

  const days = (t1 - t0) / DAY_MS;
  const fmtTick = d => d.toLocaleDateString([], days > 200 ? {month: "short", year: "2-digit"} : {month: "short", day: "numeric"});
  const xt = Array.from({length: 6}, (_, i) => new Date(t0 + i * (t1 - t0) / 5));

  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  if (normal && normal[1] >= y0 && normal[0] <= y1) {
    const top = clampY(normal[1]), bottom = clampY(normal[0]);
    svg += `<rect class="band" x="${L}" y="${top}" width="${W - L - R}" height="${bottom - top}"><title>Normal range ${normal[0]}–${normal[1]} ${esc(unit)}</title></rect>`;
  }
  svg += yt.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
  svg += xt.map(d => `<text class="tick" x="${x(d.getTime())}" y="${H - B + 16}" text-anchor="middle">${esc(fmtTick(d))}</text>`).join("");
  svg += `<line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>`;
  svg += `<text class="axis-label" x="14" y="${(H - B + T) / 2}" text-anchor="middle" transform="rotate(-90 14 ${(H - B + T) / 2})">${esc(name)} (${esc(unit)})</text>`;
  svg += `<text class="axis-label" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">Date</text>`;
  if (points.length > 1) svg += `<polyline class="line" points="${points.map(p => `${x(p.t)},${y(p.v)}`).join(" ")}"/>`;
  svg += points.map(p => `<circle class="pt${p.flag ? " flagged" : ""}" cx="${x(p.t)}" cy="${y(p.v)}" r="${p.flag ? 5 : 4}"><title>${esc(`${p.v} ${unit} — ${fmtDate(p.t.toISOString())}${p.flag ? "\n⚠ " + p.flag : ""}`)}</title></circle>`).join("");
  return svg + `</svg>`;
}

/* ---------- boot: load validation rules, restore session unless idle too long ---------- */
loadRules();
(() => {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem("ht_session") || "null"); } catch {}
  if (s && Date.now() - s.t < IDLE_MS) startSession(s.token, s.email);
})();