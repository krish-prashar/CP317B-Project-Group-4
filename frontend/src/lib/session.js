// The sign-in token lives in sessionStorage (cleared when the tab closes).
// No health data is stored in the browser.
const KEY = "ht_session";
export const IDLE_MS = 15 * 60 * 1000;

export function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return s && Date.now() - s.t < IDLE_MS ? s : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(KEY, JSON.stringify({ ...session, t: Date.now() }));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

export function readPref(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePref(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage full or blocked: preference just isn't remembered */ }
}
