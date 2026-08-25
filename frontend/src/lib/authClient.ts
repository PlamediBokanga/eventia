import { API_URL } from "./config";

export async function hasActiveSession() {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      credentials: "include"
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function logoutSession() {
  if (typeof window === "undefined") return;
  await fetch(`${API_URL}/auth/sessions`, {
    method: "DELETE",
    credentials: "include"
  }).catch(() => undefined);
}