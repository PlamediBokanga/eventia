import { API_URL } from "./config";

const SESSION_TOKEN_KEY = "eventia_session_token";
const SESSION_TOKEN_ALT_KEY = "eventia_token";

export function getStoredSessionToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem(SESSION_TOKEN_KEY) ||
    window.sessionStorage.getItem(SESSION_TOKEN_KEY) ||
    window.localStorage.getItem(SESSION_TOKEN_ALT_KEY) ||
    window.sessionStorage.getItem(SESSION_TOKEN_ALT_KEY) ||
    ""
  );
}

export function storeSessionToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  window.localStorage.setItem(SESSION_TOKEN_ALT_KEY, token);
  window.sessionStorage.setItem(SESSION_TOKEN_ALT_KEY, token);
}

export function clearStoredSessionToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
  window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.localStorage.removeItem(SESSION_TOKEN_ALT_KEY);
  window.sessionStorage.removeItem(SESSION_TOKEN_ALT_KEY);
}

export async function hasActiveSession() {
  if (typeof window === "undefined") return false;
  try {
    const token = getStoredSessionToken();
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function logoutSession() {
  if (typeof window === "undefined") return;
  const token = getStoredSessionToken();
  await fetch(`${API_URL}/auth/sessions`, {
    method: "DELETE",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  }).catch(() => undefined);
  clearStoredSessionToken();
}