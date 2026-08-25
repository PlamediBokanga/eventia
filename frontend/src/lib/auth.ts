export { hasActiveSession, logoutSession } from "./authClient";

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("eventia_token");
  window.localStorage.removeItem("eventia_session_token");
  window.sessionStorage.removeItem("eventia_token");
  window.sessionStorage.removeItem("eventia_session_token");
}