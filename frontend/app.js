/* ------------------------------------------------------------------
   HealthTrack Sprint 1 front end (AUTH-1, MET-1, IMP-1, UI-1)
   Talks to the FastAPI backend (register, login, measurements, CSV import). Change API_URL if the server runs elsewhere.
------------------------------------------------------------------- */
const API_URL = "http://127.0.0.1:8000";

// Keys match the backend's snake_case metric names.
const METRICS = {
  weight:     {label: "Weight",     units: ["kg", "lb"]},
  bmi:        {label: "BMI",        units: ["kg/m²"]},
  body_fat:   {label: "Body fat",   units: ["%"]},
  heart_rate: {label: "Heart rate", units: ["bpm"]}
};
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
  if (res.status === 401 && token) { endSession("Your session expired. Log in again."); throw new ApiError("Session expired", 401); }
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = body.detail;
    if (Array.isArray(msg)) msg = msg.map(d => (d.loc?.slice(1).join(".") || "input") + ": " + d.msg).join("; ");
    throw new ApiError(msg || "Something went wrong (" + res.status + ").", res.status);
  }
  return body;
}

/* ---------- AUTH-1 ---------- */
let mode = "login";
function setMode(m) {
  mode = m;
  const reg = m === "register";
  $("tab-login").setAttribute("aria-selected", !reg);
  $("tab-register").setAttribute("aria-selected", reg);
  $("confirm-field").classList.toggle("hidden", !reg);
  $("pw-hint").classList.toggle("hidden", !reg);
  $("password").autocomplete = reg ? "new-password" : "current-password";
  $("auth-submit").textContent = reg ? "Create account" : "Log in";
  $("auth-msg").innerHTML = "";
}
$("tab-login").onclick = () => setMode("login");
$("tab-register").onclick = () => setMode("register");
const authErr = t => $("auth-msg").innerHTML = `<div class="msg err">${esc(t)}</div>`;

$("auth-form").onsubmit = async e => {
  e.preventDefault();
  const email = $("email").value.trim().toLowerCase(), pw = $("password").value;
  $("auth-submit").disabled = true;
  try {
    if (mode === "register") {
      if (!/^\S+@\S+\.\S+$/.test(email)) return authErr("Enter a valid email address.");
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return authErr("Password needs at least 8 characters, with a letter and a number.");
      if (pw !== $("confirm").value) return authErr("The two passwords do not match.");
    }
    const res = await api(mode === "register" ? "/register" : "/login", {method: "POST", json: {email, password: pw}});
    startSession(res.access_token, res.user.email);
  } catch (err) {
    authErr(err.status === 409 ? "An account with this email already exists. Log in instead." : err.message);
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
setInterval(() => { if (user && Date.now() - lastActive > IDLE_MS) endSession("You were logged out after 15 minutes of inactivity."); }, 15000);

/* ---------- data ---------- */
// All measurements come from the backend (newest first). Nothing health-related is kept in the browser.
async function loadData() { cache = await api("/measurements"); return cache; }
// Clean up readings that older versions of this page copied into localStorage.
try { Object.keys(localStorage).filter(k => k.startsWith("ht_local_")).forEach(k => localStorage.removeItem(k)); } catch {}
// Only the dashboard's metric-picker choice (not health data) is still saved in the browser.
const getPrefs = () => read("ht_prefs_" + user, Object.keys(METRICS));
function toast(text) {
  $("toast").innerHTML = `<div class="msg ok">${esc(text)}</div>`;
  setTimeout(() => $("toast").innerHTML = "", 4000);
}
const showErr = (el, err) => { if (err.status !== 401) el.innerHTML = `<div class="msg err">${esc(err.message)}</div>`; };

/* ---------- navigation ---------- */
function go(view) {
  ["summary", "add", "import", "history"].forEach(v => $("view-" + v).classList.toggle("hidden", v !== view));
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  if (view === "summary") renderSummary();
  if (view === "history") renderHistory();
  if (view === "add") resetAdd();
  if (view === "import") $("import-result").innerHTML = "";
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
      ? `<div class="metric"><div class="name">${esc(label(k))}</div><div class="val">${esc(latest.value)} <small>${esc(latest.unit)}</small></div><div class="when">${fmtDate(latest.timestamp)}</div></div>`
      : `<div class="metric"><div class="name">${esc(label(k))}</div><div class="when">No readings for this metric yet.</div></div>`;
  }).join("");
}

/* ---------- MET-1: add measurement ---------- */
function nowLocal() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
function fillUnits() { $("m-unit").innerHTML = METRICS[$("m-metric").value].units.map(u => `<option>${esc(u)}</option>`).join(""); }
$("m-metric").innerHTML = Object.entries(METRICS).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join("");
$("m-metric").onchange = fillUnits;
function resetAdd() { $("add-msg").innerHTML = ""; $("m-value").value = ""; $("m-date").value = nowLocal(); fillUnits(); }

$("add-form").onsubmit = async e => {
  e.preventDefault();
  const problems = [], raw = $("m-value").value.trim(), n = Number(raw);
  if (!raw) problems.push("Enter a value.");
  else if (!Number.isFinite(n) || n <= 0) problems.push("Value must be a number greater than 0.");
  if (!$("m-unit").value) problems.push("Choose a unit.");
  if (!$("m-date").value) problems.push("Choose a date and time.");
  if (problems.length) {
    $("add-msg").innerHTML = `<div class="msg err"><strong>Measurement not saved.</strong><ul>${problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>`;
    return;
  }
  const row = {metric: $("m-metric").value, value: n, unit: $("m-unit").value, timestamp: new Date($("m-date").value).toISOString()};
  try {
    await api("/measurements", {method: "POST", json: row});
    toast("Measurement saved.");
    go("history");
  } catch (err) { showErr($("add-msg"), err); }
};

/* ---------- history ---------- */
async function renderHistory() {
  $("history").innerHTML = `<p class="hint">Loading…</p>`;
  let d;
  try { d = (await loadData()).slice().sort((a, b) => asDate(b.timestamp) - asDate(a.timestamp)); } catch (err) { showErr($("history"), err); return; }
  if (!d.length) { $("history").innerHTML = `<div class="empty">No measurements yet. <a href="#" id="h-add">Add one</a> or import a CSV file.</div>`; $("h-add").onclick = e => { e.preventDefault(); go("add"); }; return; }
  $("history").innerHTML = `<table><thead><tr><th>Date and time</th><th>Metric</th><th>Value</th><th>Unit</th></tr></thead><tbody>` +
    d.map(r => `<tr><td>${fmtDate(r.timestamp)}</td><td>${esc(label(r.metric))}</td><td>${esc(r.value)}</td><td>${esc(r.unit)}</td></tr>`).join("") + `</tbody></table>`;
}

/* ---------- IMP-1: CSV import ---------- */
$("sample").onclick = () => {
  const csv = "timestamp,metric,value,unit\n2026-10-01T08:00:00Z,weight,72.4,kg\n2026-10-01T08:05:00Z,heart_rate,64,bpm\n2026-10-02T08:00:00Z,bmi,22.8,kg/m²\n2026-10-03T08:00:00Z,body_fat,18.5,%\n";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"})); a.download = "healthtrack-sample.csv"; a.click();
};
$("do-import").onclick = async () => {
  const out = $("import-result"), f = $("csv-file").files[0];
  if (!f) { out.innerHTML = `<div class="msg err">Choose a CSV file first.</div>`; return; }
  const form = new FormData(); form.append("file", f);
  $("do-import").disabled = true;
  try {
    const r = await api("/measurements/import", {method: "POST", form});
    let html = r.rows_imported ? `<div class="msg ok"><strong>${r.rows_imported} row${r.rows_imported === 1 ? "" : "s"} imported</strong> (${r.measurements_created} measurement${r.measurements_created === 1 ? "" : "s"} saved).</div>` : "";
    if (r.rows_failed) html += `<div class="msg err"><strong>${r.rows_failed} row${r.rows_failed === 1 ? "" : "s"} skipped${r.rows_failed > r.errors.length ? " (showing the first " + r.errors.length + ")" : ""}:</strong><ul>${r.errors.map(b => `<li>Line ${b.line}: ${esc(b.error)}</li>`).join("")}</ul></div>`;
    if (!r.rows_imported && !r.rows_failed) html = `<div class="msg warn">The file has no data rows.</div>`;
    out.innerHTML = html;
  } catch (err) { showErr(out, err); }
  finally { $("do-import").disabled = false; }
};

/* ---------- boot: restore session unless idle too long ---------- */
(() => {
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem("ht_session") || "null"); } catch {}
  if (s && Date.now() - s.t < IDLE_MS) startSession(s.token, s.email);
})();