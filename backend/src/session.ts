import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "eventia_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseCookieHeader(value: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!value) return cookies;

  value.split(";").forEach(part => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) return;
    const key = trimmed.slice(0, separatorIndex);
    const rawValue = trimmed.slice(separatorIndex + 1);
    cookies[key] = decodeURIComponent(rawValue);
  });

  return cookies;
}

export function sessionCookieOptions(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const secure = req.secure || req.protocol === "https" || forwardedProto === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS
  };
}

export function readSessionToken(req: Request) {
  return parseCookieHeader(req.headers.cookie)[SESSION_COOKIE_NAME] || "";
}

export function setSessionCookie(res: Response, req: Request, token: string) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions(req));
}

export function clearSessionCookie(res: Response, req: Request) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions(req));
}
