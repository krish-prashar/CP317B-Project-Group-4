/** Coloured message box. kind: "err" | "ok" | "warn". */
export default function Message({ kind = "err", children }) {
  if (!children) return null;
  return <div className={`msg ${kind}`}>{children}</div>;
}

/** Error box for a failed request. 401s are skipped: the app signs out and explains on the sign-in screen. */
export function ApiErrorMessage({ error }) {
  if (!error || error.status === 401) return null;
  return <Message kind="err">{error.message}</Message>;
}

export function FlagBadge({ reason }) {
  if (!reason) return null;
  return <div className="flag" title={reason}>⚠ {reason}</div>;
}
