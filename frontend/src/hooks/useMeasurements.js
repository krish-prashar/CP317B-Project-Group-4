import { useCallback, useEffect, useState } from "react";

/**
 * Fetches GET /measurements with the given query params (newest first).
 * Re-fetches whenever the params change; responses for old params are ignored.
 * Pass `params = null` to skip fetching (e.g. while a form is invalid).
 */
export function useMeasurements(api, params = {}) {
  const query = params === null ? null : new URLSearchParams(params).toString();
  const [state, setState] = useState({ data: [], error: null, loading: query !== null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (query === null) { setState({ data: [], error: null, loading: false }); return; }
    let active = true;
    setState(s => ({ ...s, loading: true, error: null }));
    api("/measurements" + (query ? "?" + query : ""))
      .then(data => { if (active) setState({ data, error: null, loading: false }); })
      .catch(error => { if (active) setState({ data: [], error, loading: false }); });
    return () => { active = false; };
  }, [api, query, reloadKey]);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);
  return { ...state, reload };
}
