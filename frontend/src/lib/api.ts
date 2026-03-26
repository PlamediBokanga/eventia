import { API_URL } from "./config";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    throw new Error(`Erreur API ${res.status} sur ${url}`);
  }

  return res.json() as Promise<T>;
}

