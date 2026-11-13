// Small wrapper around fetch for the FastAPI backend.
// Set VITE_API_URL in frontend/.env if the backend runs somewhere else.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// FastAPI returns either a string or a list of field errors in `detail`.
function errorMessage(body, status) {
  const { detail } = body;
  if (Array.isArray(detail)) {
    return detail.map(d => (d.loc?.slice(1).join(".") || "input") + ": " + d.msg).join("; ");
  }
  return detail || `Something went wrong (${status}).`;
}

/**
 * Returns an `api(path, options)` function bound to the current session.
 * `onUnauthorized` runs when a signed-in request gets 401 (expired token).
 */
export function makeApi(token, onUnauthorized) {
  return async function api(path, { method = "GET", json } = {}) {
    const headers = {};
    if (token) headers.Authorization = "Bearer " + token;
    if (json !== undefined) headers["Content-Type"] = "application/json";

    let res;
    try {
      res = await fetch(API_URL + path, {
        method,
        headers,
        body: json !== undefined ? JSON.stringify(json) : undefined,
      });
    } catch {
      throw new ApiError(`Cannot reach the server. Check that the backend is running at ${API_URL}.`, 0);
    }

    if (res.status === 401 && token) {
      onUnauthorized?.();
      throw new ApiError("Session expired", 401);
    }
    if (res.status === 204) return null;

    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(errorMessage(body, res.status), res.status);
    return body;
  };
}
