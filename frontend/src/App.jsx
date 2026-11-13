import { useCallback, useEffect, useMemo, useState } from "react";
import Brand from "./components/Brand.jsx";
import { makeApi } from "./lib/api.js";
import { clearSession, loadSession, saveSession } from "./lib/session.js";
import { useIdleTimeout } from "./hooks/useIdleTimeout.js";
import { useRules } from "./hooks/useRules.js";
import SignIn from "./pages/SignIn.jsx";
import Summary from "./pages/Summary.jsx";
import AddMeasurement from "./pages/AddMeasurement.jsx";
import DeviceSync from "./pages/DeviceSync.jsx";
import History from "./pages/History.jsx";
import Trends from "./pages/Trends.jsx";

const VIEWS = [
  { id: "summary", label: "Daily Summary", Page: Summary },
  { id: "add",     label: "Add Measurement", Page: AddMeasurement },
  { id: "sync",    label: "Sync device", Page: DeviceSync },
  { id: "history", label: "History", Page: History },
  { id: "trends",  label: "Trends", Page: Trends },
];

export default function App() {
  const [session, setSession] = useState(loadSession);   // {token, email} or null
  const [notice, setNotice] = useState("");              // shown on the sign-in screen
  const [view, setView] = useState("summary");
  const [toast, setToast] = useState("");
  const { rules, metrics } = useRules();

  const signIn = useCallback((token, email) => {
    saveSession({ token, email });
    setSession({ token, email });
    setNotice("");
    setView("summary");
  }, []);

  const signOut = useCallback(reason => {
    clearSession();
    setSession(null);
    setNotice(typeof reason === "string" ? reason : "");
  }, []);

  const token = session?.token;
  const api = useMemo(
    () => makeApi(token, () => signOut("Your session expired. Sign in again.")),
    [token, signOut]
  );

  const onIdle = useCallback(() => signOut("You were signed out after 15 minutes of inactivity."), [signOut]);
  const onActivity = useCallback(() => session && saveSession(session), [session]);
  useIdleTimeout(Boolean(session), onIdle, onActivity);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!session) {
    return (
      <>
        <Brand />
        <SignIn api={api} notice={notice} onSignedIn={signIn} />
      </>
    );
  }

  const { Page } = VIEWS.find(v => v.id === view);
  return (
    <>
      <Brand />
      <div className="app">
        <div className="app-header">
          <h2>Welcome, {session.email}</h2>
          <button type="button" className="btn-danger" onClick={() => signOut()}>Sign out</button>
        </div>

        <nav>
          {VIEWS.map(v => (
            <button
              key={v.id}
              type="button"
              aria-current={v.id === view ? "page" : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>

        <Page
          api={api}
          rules={rules}
          metrics={metrics}
          user={session.email}
          onNavigate={setView}
          onToast={setToast}
        />

        {toast && <div className="toast"><div className="msg ok">{toast}</div></div>}
      </div>
    </>
  );
}
