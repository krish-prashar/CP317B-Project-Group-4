import { useState } from "react";
import Message from "../components/Message.jsx";

// Same rule as Backend/schemas.py: 3-32 letters, digits or dashes.
const WORK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9-]{2,31}$/;
const EMPTY = { identifier: "", workId: "", password: "", confirm: "" };

/** Staff sign-in / account creation. Staff use the work email or work ID issued by their organisation. */
export default function SignIn({ api, notice, onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));
  const switchMode = m => { setMode(m); setError(""); };

  function validate() {
    const ident = form.identifier.trim();
    if (!register) return ident ? null : "Enter your work email or work ID.";
    if (!/^\S+@\S+\.\S+$/.test(ident)) return "Enter your work email address.";
    if (!WORK_ID_RE.test(form.workId.trim())) return "Enter your work ID: 3-32 letters, digits or dashes (e.g. RN-10432).";
    const pw = form.password;
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password needs at least 8 characters, with a letter and a number.";
    if (pw !== form.confirm) return "The two passwords do not match.";
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }

    const ident = form.identifier.trim();
    const [path, body] = register
      ? ["/register", { email: ident.toLowerCase(), work_id: form.workId.trim().toUpperCase(), password: form.password }]
      : ["/login", { identifier: ident, password: form.password }];

    setBusy(true);
    setError("");
    try {
      const res = await api(path, { method: "POST", json: body });
      setForm(EMPTY);
      onSignedIn(res.access_token, res.user.email);
    } catch (err) {
      setError(err.status === 409 ? `${err.message}. Sign in instead.` : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-card">
      <h1>Staff sign in</h1>
      <p className="subtitle hint">
        Access is limited to authorised staff. Use the work email or work ID issued by your organisation.
      </p>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!register} onClick={() => switchMode("login")}>Sign in</button>
        <button type="button" role="tab" aria-selected={register} onClick={() => switchMode("register")}>Create staff account</button>
      </div>

      {error ? <Message kind="err">{error}</Message> : <Message kind="warn">{notice}</Message>}

      <form onSubmit={submit} noValidate>
        <label className="field-label" htmlFor="identifier">{register ? "Work email" : "Work email or work ID"}</label>
        <input
          id="identifier"
          type={register ? "email" : "text"}
          placeholder={register ? "e.g. j.smith@stmarys.ca" : "e.g. j.smith@stmarys.ca or RN-10432"}
          autoComplete={register ? "email" : "username"}
          autoCapitalize="none"
          spellCheck={false}
          value={form.identifier}
          onChange={set("identifier")}
        />

        {register && (
          <>
            <label className="field-label" htmlFor="work_id">Work ID</label>
            <input
              id="work_id"
              placeholder="Staff / employee ID, e.g. RN-10432"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={form.workId}
              onChange={set("workId")}
            />
          </>
        )}

        <label className="field-label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Password"
          autoComplete={register ? "new-password" : "current-password"}
          value={form.password}
          onChange={set("password")}
        />

        {register && (
          <>
            <p className="hint" style={{ marginTop: -5 }}>Min 8 chars, at least 1 letter &amp; 1 number</p>
            <input
              id="confirm"
              type="password"
              placeholder="Confirm Password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={set("confirm")}
            />
          </>
        )}

        <button type="submit" disabled={busy}>{register ? "Create staff account" : "Sign in"}</button>
      </form>
    </div>
  );
}
