import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware, signToken } from "../middleware/auth";
import { createSimpleRateLimiter } from "../middleware/rateLimit";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { appConfig } from "../config";
import { clearSessionCookie, setSessionCookie } from "../session";

export const authRouter = Router();
const loginRateLimiter = createSimpleRateLimiter(10 * 60 * 1000, 7);
const OAUTH_STATE_COOKIE = "eventia_oauth_state";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_EXCHANGE_TTL_MS = 2 * 60 * 1000;
const oauthExchangeCodes = new Map<string, { token: string; next: string; expiresAt: number }>();

type OAuthMode = "login" | "register";
type OAuthProvider = "google" | "facebook";

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

function buildOauthState(provider: OAuthProvider, mode: OAuthMode) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const issuedAt = Date.now().toString();
  const payload = `${provider}:${mode}:${nonce}:${issuedAt}`;
  const signature = crypto.createHmac("sha256", appConfig.jwtSecret).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

function verifyOauthState(rawState: string | undefined, provider: OAuthProvider) {
  if (!rawState) return null;

  const parts = rawState.split(":");
  if (parts.length !== 5) return null;

  const [providerName, mode, nonce, issuedAt, signature] = parts;
  if (providerName !== provider) return null;
  if (mode !== "login" && mode !== "register") return null;
  if (!/^[a-f0-9]{32}$/i.test(nonce)) return null;
  if (!/^\d{10,}$/.test(issuedAt)) return null;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return null;

  const payload = `${providerName}:${mode}:${nonce}:${issuedAt}`;
  const expectedSignature = crypto.createHmac("sha256", appConfig.jwtSecret).update(payload).digest("hex");
  const providedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > OAUTH_STATE_TTL_MS) return null;

  return { mode: mode as OAuthMode };
}

function oauthCookieOptions(req: AuthRequest) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const secure = req.secure || req.protocol === "https" || forwardedProto === "https";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/auth",
    maxAge: OAUTH_STATE_TTL_MS
  };
}

function readOauthStateCookie(req: AuthRequest) {
  return parseCookieHeader(req.headers.cookie)[OAUTH_STATE_COOKIE] || "";
}

function issueOauthExchangeCode(token: string, next = "/dashboard") {
  const now = Date.now();
  for (const [key, value] of oauthExchangeCodes.entries()) {
    if (value.expiresAt <= now) {
      oauthExchangeCodes.delete(key);
    }
  }

  const code = crypto.randomBytes(24).toString("hex");
  oauthExchangeCodes.set(code, {
    token,
    next,
    expiresAt: now + OAUTH_EXCHANGE_TTL_MS
  });
  return code;
}

function consumeOauthExchangeCode(code: string) {
  const found = oauthExchangeCodes.get(code);
  if (!found) return null;

  oauthExchangeCodes.delete(code);
  if (found.expiresAt <= Date.now()) {
    return null;
  }

  return found;
}


function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanNullableString(value: unknown, maxLen: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

function cleanPhone(value: unknown) {
  const cleaned = cleanNullableString(value, 30);
  if (!cleaned) return null;
  const normalized = cleaned.replace(/[^\d+().\-\s]/g, "").trim();
  return normalized || null;
}

function cleanWebsite(value: unknown) {
  const cleaned = cleanNullableString(value, 220);
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned)) return null;
  return cleaned;
}

function cleanDate(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function validateStrongPassword(password: string) {
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    return "Le mot de passe doit contenir au moins 6 caracteres.";
  }
  if (!/[a-z]/.test(trimmed)) {
    return "Le mot de passe doit contenir au moins une minuscule.";
  }
  if (!/[A-Z]/.test(trimmed)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }
  if (!/[0-9]/.test(trimmed)) {
    return "Le mot de passe doit contenir au moins un chiffre.";
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return "Le mot de passe doit contenir au moins un caractere special.";
  }
  return null;
}

function cleanTime(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!/^\d{2}:\d{2}$/.test(cleaned)) return null;
  return cleaned;
}

function shouldRequireEmailVerification() {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
}

function shouldReturnVerificationLink() {
  return process.env.EMAIL_VERIFICATION_RETURN_LINK === "true" || process.env.NODE_ENV !== "production";
}

function cleanAvatarUrl(value: unknown) {
  const cleaned = cleanNullableString(value, 500);
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith("/uploads/")) {
    return null;
  }
  return cleaned;
}

function normalizeStoredUploadUrl(value: unknown) {
  if (typeof value !== "string") return cleanNullableString(value, 500);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("/uploads/")) return cleaned.slice(0, 500);
  try {
    const url = new URL(cleaned);
    if (url.pathname.startsWith("/uploads/")) {
      return url.pathname.slice(0, 500);
    }
  } catch {
    // ignore malformed urls
  }
  return cleanNullableString(cleaned, 500);
}

function generateReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function normalizeAccountRole(value: unknown) {
  const cleaned = normalizeString(value).toLowerCase();
  if (cleaned === "agency" || cleaned === "company" || cleaned === "organizer") {
    return cleaned;
  }
  return "organizer";
}

function parseImageDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const rawBase64 = match[3];
  const buffer = Buffer.from(rawBase64, "base64");
  if (!buffer.length) return null;
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  return { buffer, ext };
}

function uploadBaseUrl(req: AuthRequest) {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  if (appUrl) return appUrl;
  return `${req.protocol}://${req.get("host")}`;
}

function frontendBaseUrl() {
  return (
    appConfig.frontendAppUrl?.replace(/\/+$/, "") ||
    appConfig.frontendUrl?.replace(/\/+$/, "") ||
    appConfig.corsOrigin.replace(/\/+$/, "")
  );
}

function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

function isFacebookAuthConfigured() {
  return Boolean(
    process.env.FACEBOOK_CLIENT_ID &&
      process.env.FACEBOOK_CLIENT_SECRET &&
      process.env.FACEBOOK_REDIRECT_URI
  );
}

function googleAuthUrl(mode: OAuthMode, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "select_account",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function facebookAuthUrl(mode: OAuthMode, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID || "",
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI || "",
    response_type: "code",
    scope: "email,public_profile",
    state
  });
  return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
}

function authRedirectUrl(
  path: "/auth/login" | "/auth/register" | "/auth/callback",
  params: Record<string, string>
) {
  const url = new URL(`${frontendBaseUrl()}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url.toString();
}

function generateRandomPassword() {
  return crypto.randomBytes(24).toString("hex");
}

function passwordResetSecret() {
  return appConfig.passwordResetSecret;
}

function signPasswordResetToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, passwordResetSecret(), { expiresIn: "30m" });
}

function verifyPasswordResetToken(token: string) {
  return jwt.verify(token, passwordResetSecret()) as { id: number; email: string };
}

function passwordResetLink(token: string) {
  return `${frontendBaseUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

function emailVerificationSecret() {
  return appConfig.emailVerificationSecret;
}

function signEmailVerificationToken(payload: { id: number; email: string }) {
  return jwt.sign(payload, emailVerificationSecret(), { expiresIn: "24h" });
}

function verifyEmailVerificationToken(token: string) {
  return jwt.verify(token, emailVerificationSecret()) as { id: number; email: string };
}

function emailVerificationLink(token: string) {
  return `${frontendBaseUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

type FacebookUserInfo = {
  id?: string;
  name?: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
  verified?: boolean;
};

async function fetchGoogleUserInfo(code: string): Promise<GoogleUserInfo> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
      grant_type: "authorization_code"
    }).toString()
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${details}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("Google access token missing.");
  }

  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  if (!userResponse.ok) {
    const details = await userResponse.text();
    throw new Error(`Google userinfo failed: ${details}`);
  }

  return (await userResponse.json()) as GoogleUserInfo;
}

async function fetchFacebookUserInfo(code: string): Promise<FacebookUserInfo> {
  const tokenResponse = await fetch("https://graph.facebook.com/v20.0/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.FACEBOOK_CLIENT_ID || "",
      client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
      redirect_uri: process.env.FACEBOOK_REDIRECT_URI || ""
    }).toString()
  });

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text();
    throw new Error(`Facebook token exchange failed: ${details}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error("Facebook access token missing.");
  }

  const userResponse = await fetch("https://graph.facebook.com/v20.0/me?fields=id,name,email,picture.type(large),verified", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`
    }
  });

  if (!userResponse.ok) {
    const details = await userResponse.text();
    throw new Error(`Facebook userinfo failed: ${details}`);
  }

  return (await userResponse.json()) as FacebookUserInfo;
}

authRouter.get("/providers", (_req, res) => {
  res.json({
    google: {
      enabled: isGoogleAuthConfigured()
    },
    facebook: {
      enabled: isFacebookAuthConfigured()
    }
  });
});

authRouter.post("/oauth/exchange", async (req, res) => {
  try {
    const code = normalizeString(req.body?.code);
    if (!code) {
      return res.status(400).json({ message: "Code OAuth manquant." });
    }

    const exchange = consumeOauthExchangeCode(code);
    if (!exchange) {
      return res.status(400).json({ message: "Code OAuth invalide ou expire." });
    }

    setSessionCookie(res, req, exchange.token);
    return res.json({ sessionEstablished: true, token: exchange.token, next: exchange.next });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Impossible de finaliser la session OAuth." });
  }
});

authRouter.post("/password/forgot", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: "Email invalide." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    if (!organizer) {
      return res.json({
        message: "Si un compte existe, un lien de reinitialisation sera envoye."
      });
    }

    const token = signPasswordResetToken({ id: organizer.id, email: organizer.email });
    const resetUrl = passwordResetLink(token);
    const shouldReturnLink =
      process.env.PASSWORD_RESET_RETURN_LINK === "true" || process.env.NODE_ENV !== "production";

    return res.json({
      message: "Si un compte existe, un lien de reinitialisation a ete prepare.",
      ...(shouldReturnLink ? { resetUrl } : {})
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Impossible de preparer la reinitialisation." });
  }
});

authRouter.post("/password/reset", async (req, res) => {
  try {
    const token = normalizeString(req.body?.token);
    const password = normalizeString(req.body?.password);

    if (!token || !password) {
      return res.status(400).json({ message: "Token et mot de passe sont obligatoires." });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const payload = verifyPasswordResetToken(token);
    const organizer = await prisma.organizer.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true }
    });

    if (!organizer || organizer.email !== payload.email) {
      return res.status(400).json({ message: "Lien de reinitialisation invalide." });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.organizer.update({
      where: { id: organizer.id },
      data: {
        password: hashed,
        failedLoginCount: 0,
        lockUntil: null
      }
    });

    return res.json({ message: "Mot de passe mis a jour avec succes." });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Lien de reinitialisation invalide ou expire." });
  }
});

authRouter.post("/email/verification/request", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: "Email invalide." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerifiedAt: true }
    });

    if (!organizer || organizer.emailVerifiedAt) {
      return res.json({
        message: "Si un compte existe, un lien de verification sera prepare."
      });
    }

    const token = signEmailVerificationToken({ id: organizer.id, email: organizer.email });
    const verificationUrl = emailVerificationLink(token);

    return res.json({
      message: "Si un compte existe, un lien de verification a ete prepare.",
      ...(shouldReturnVerificationLink() ? { verificationUrl } : {})
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Impossible de preparer la verification email." });
  }
});

authRouter.post("/email/verify", async (req, res) => {
  try {
    const token = normalizeString(req.body?.token);
    if (!token) {
      return res.status(400).json({ message: "Token de verification manquant." });
    }

    const payload = verifyEmailVerificationToken(token);
    const organizer = await prisma.organizer.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, emailVerifiedAt: true }
    });

    if (!organizer || organizer.email !== payload.email) {
      return res.status(400).json({ message: "Lien de verification invalide." });
    }

    if (!organizer.emailVerifiedAt) {
      await prisma.organizer.update({
        where: { id: organizer.id },
        data: { emailVerifiedAt: new Date() }
      });
    }

    return res.json({ message: "Adresse email verifiee avec succes." });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: "Lien de verification invalide ou expire." });
  }
});

authRouter.get("/google", (req, res) => {
  if (!isGoogleAuthConfigured()) {
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "google_not_configured"
      })
    );
  }

  const mode: OAuthMode = req.query.mode === "register" ? "register" : "login";
  const state = buildOauthState("google", mode);
  res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions(req as AuthRequest));
  return res.redirect(googleAuthUrl(mode, state));
});

authRouter.get("/facebook", (req, res) => {
  if (!isFacebookAuthConfigured()) {
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "facebook_not_configured"
      })
    );
  }

  const mode: OAuthMode = req.query.mode === "register" ? "register" : "login";
  const state = buildOauthState("facebook", mode);
  res.cookie(OAUTH_STATE_COOKIE, state, oauthCookieOptions(req as AuthRequest));
  return res.redirect(facebookAuthUrl(mode, state));
});

authRouter.get("/google/callback", async (req, res) => {
  const authReq = req as AuthRequest;
  const state = normalizeString(req.query.state);
  const cookieState = readOauthStateCookie(authReq);
  const validatedState = verifyOauthState(state, "google");
  res.clearCookie(OAUTH_STATE_COOKIE, oauthCookieOptions(authReq));

  if (!validatedState || !cookieState || cookieState !== state) {
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "google_state_invalid"
      })
    );
  }

  try {
    if (!isGoogleAuthConfigured()) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "google_not_configured"
        })
      );
    }

    const code = normalizeString(req.query.code);
    if (!code) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "google_code_missing"
        })
      );
    }

    const googleUser = await fetchGoogleUserInfo(code);
    const email = normalizeEmail(googleUser.email);
    if (!email || googleUser.email_verified !== true) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "google_email_unverified"
        })
      );
    }

    let organizer = await prisma.organizer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerifiedAt: true
      }
    });

    if (!organizer) {
      const hashed = await bcrypt.hash(generateRandomPassword(), 10);
      organizer = await prisma.organizer.create({
        data: {
          email,
          password: hashed,
          name: cleanNullableString(googleUser.name, 120),
          avatarUrl: cleanAvatarUrl(googleUser.picture),
          referralCode: generateReferralCode(),
          role: "organizer",
          emailVerifiedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          emailVerifiedAt: true
        }
      });
    } else if (!organizer.emailVerifiedAt) {
      await prisma.organizer.update({
        where: { id: organizer.id },
        data: {
          emailVerifiedAt: new Date()
        }
      });
    }

    const activeOrganizer = organizer;
    if (!activeOrganizer) {
      throw new Error("Google organizer creation failed.");
    }

    const token = signToken({ id: activeOrganizer.id, email: activeOrganizer.email });
    const exchangeCode = issueOauthExchangeCode(token, "/dashboard");
    return res.redirect(
      authRedirectUrl("/auth/callback", {
        code: exchangeCode,
        next: "/dashboard"
      })
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "google_login_failed"
      })
    );
  }
});
authRouter.get("/facebook/callback", async (req, res) => {
  const authReq = req as AuthRequest;
  const state = normalizeString(req.query.state);
  const cookieState = readOauthStateCookie(authReq);
  const validatedState = verifyOauthState(state, "facebook");
  res.clearCookie(OAUTH_STATE_COOKIE, oauthCookieOptions(authReq));

  if (!validatedState || !cookieState || cookieState !== state) {
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "facebook_state_invalid"
      })
    );
  }

  try {
    if (!isFacebookAuthConfigured()) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "facebook_not_configured"
        })
      );
    }

    const code = normalizeString(req.query.code);
    if (!code) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "facebook_code_missing"
        })
      );
    }

    const facebookUser = await fetchFacebookUserInfo(code);
    const email = normalizeEmail(facebookUser.email);
    if (!email) {
      return res.redirect(
        authRedirectUrl("/auth/login", {
          error: "facebook_email_missing"
        })
      );
    }

    let organizer = await prisma.organizer.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        emailVerifiedAt: true
      }
    });

    if (!organizer) {
      const hashed = await bcrypt.hash(generateRandomPassword(), 10);
      organizer = await prisma.organizer.create({
        data: {
          email,
          password: hashed,
          name: cleanNullableString(facebookUser.name, 120),
          avatarUrl: cleanAvatarUrl(facebookUser.picture?.data?.url),
          referralCode: generateReferralCode(),
          role: "organizer",
          emailVerifiedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          emailVerifiedAt: true
        }
      });
    } else if (!organizer.emailVerifiedAt) {
      await prisma.organizer.update({
        where: { id: organizer.id },
        data: {
          emailVerifiedAt: new Date()
        }
      });
    }

    const token = signToken({ id: organizer.id, email: organizer.email });
    const exchangeCode = issueOauthExchangeCode(token, "/dashboard");
    return res.redirect(
      authRedirectUrl("/auth/callback", {
        code: exchangeCode,
        next: "/dashboard"
      })
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      authRedirectUrl("/auth/login", {
        error: "facebook_login_failed"
      })
    );
  }
});

// Inscription organisateur
authRouter.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeString(req.body?.password);
    const name = normalizeString(req.body?.name);
    const phone = cleanPhone(req.body?.phone);
    const companyName = cleanNullableString(req.body?.companyName, 120);
    const jobTitle = cleanNullableString(req.body?.jobTitle, 120);
    const city = cleanNullableString(req.body?.city, 80);
    const country = cleanNullableString(req.body?.country, 80);
    const websiteRaw = req.body?.website;
    const website =
      websiteRaw === undefined || websiteRaw === null || websiteRaw === ""
        ? null
        : cleanWebsite(websiteRaw);
    const referralCode = normalizeString(req.body?.referralCode);
    const accountType = normalizeAccountRole(req.body?.accountType);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe sont obligatoires." });
    }
    if (!name) {
      return res.status(400).json({ message: "Le nom complet est obligatoire." });
    }
    if (!phone) {
      return res.status(400).json({ message: "Le numero de telephone est obligatoire." });
    }
    if (!companyName) {
      return res.status(400).json({ message: "Le nom de votre organisation est obligatoire." });
    }
    if (!country) {
      return res.status(400).json({ message: "Le pays est obligatoire." });
    }
    if (websiteRaw && !website) {
      return res.status(400).json({ message: "Le site web est invalide. Utilisez http:// ou https://." });
    }
    if (!email.includes("@") || email.length > 190) {
      return res.status(400).json({ message: "Email invalide." });
    }
    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const existing = await prisma.organizer.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Un compte existe deja avec cet email." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const requireVerification = shouldRequireEmailVerification();

    const organizer = await prisma.organizer.create({
      data: {
        email,
        password: hashed,
        name: name || null,
        phone,
        companyName,
        jobTitle,
        city,
        country,
        website,
        referralCode: generateReferralCode(),
        role: accountType,
        emailVerifiedAt: requireVerification ? null : new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        jobTitle: true,
        city: true,
        country: true,
        website: true,
        referralCode: true,
        emailVerifiedAt: true
      }
    });

    if (referralCode) {
      const partner = await prisma.organizer.findUnique({
        where: { referralCode }
      });
      if (partner && partner.id !== organizer.id) {
        await prisma.referralCommission.create({
          data: {
            partnerId: partner.id,
            referredId: organizer.id,
            amount: 5,
            status: "PENDING"
          }
        });
      }
    }

    if (requireVerification) {
      const verificationToken = signEmailVerificationToken({
        id: organizer.id,
        email: organizer.email
      });

      return res.status(201).json({
        organizer,
        verificationRequired: true,
        message: "Compte cree. Verifiez votre email pour activer l'acces.",
        ...(shouldReturnVerificationLink()
          ? { verificationUrl: emailVerificationLink(verificationToken) }
          : {})
      });
    }

    const token = signToken({ id: organizer.id, email: organizer.email });
    setSessionCookie(res, req, token);

    res.status(201).json({ organizer, sessionEstablished: true, token });
  } catch (err) {
    console.error(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res.status(409).json({ message: "Un compte existe deja avec cet email." });
      }
      if (err.code === "P2021") {
        return res
          .status(500)
          .json({ message: "Table Organizer introuvable. Migrations non appliquees." });
      }
    }
    res.status(500).json({ message: "Erreur lors de la creation du compte organisateur." });
  }
});

// Connexion organisateur
authRouter.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeString(req.body?.password);
    const ipKey = req.ip || req.socket.remoteAddress || "unknown";
    const rate = loginRateLimiter(`${ipKey}:${email}`);
    if (rate.limited) {
      res.setHeader("Retry-After", String(rate.retryAfterSec));
      return res.status(429).json({ message: "Trop de tentatives. Reessayez plus tard." });
    }

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe sont obligatoires." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { email }
    });

    if (!organizer) {
      await prisma.organizerLogin
        .create({
          data: {
            organizerId: null,
            ip: ipKey,
            userAgent: req.get("user-agent") || null,
            success: false
          }
        })
        .catch(() => undefined);
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    if (shouldRequireEmailVerification() && !organizer.emailVerifiedAt) {
      const verificationToken = signEmailVerificationToken({
        id: organizer.id,
        email: organizer.email
      });
      return res.status(403).json({
        message: "Votre email doit etre verifie avant la connexion.",
        code: "EMAIL_NOT_VERIFIED",
        verificationRequired: true,
        ...(shouldReturnVerificationLink()
          ? { verificationUrl: emailVerificationLink(verificationToken) }
          : {})
      });
    }

    if (organizer.lockUntil && organizer.lockUntil.getTime() > Date.now()) {
      return res.status(429).json({
        message: "Compte temporairement bloque. Reessayez plus tard."
      });
    }

    const valid = await bcrypt.compare(password, organizer.password);
    if (!valid) {
      const nextFailed = (organizer.failedLoginCount ?? 0) + 1;
      const shouldLock = nextFailed >= 5;
      await prisma.organizer.update({
        where: { id: organizer.id },
        data: {
          failedLoginCount: shouldLock ? 0 : nextFailed,
          lockUntil: shouldLock ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      });
      await prisma.organizerLogin.create({
        data: {
          organizerId: organizer.id,
          ip: ipKey,
          userAgent: req.get("user-agent") || null,
          success: false
        }
      });
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    await prisma.organizer.update({
      where: { id: organizer.id },
      data: {
        failedLoginCount: 0,
        lockUntil: null
      }
    });

    await prisma.organizerLogin.create({
      data: {
        organizerId: organizer.id,
        ip: ipKey,
        userAgent: req.get("user-agent") || null,
        success: true
      }
    });

    const token = signToken({ id: organizer.id, email: organizer.email });
    setSessionCookie(res, req, token);

    res.json({
      organizer: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name,
        phone: organizer.phone
      },
      sessionEstablished: true,
      token
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erreur lors de la connexion de lÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢organisateur." });
  }
});

// Profil organisateur connecte
authRouter.get("/me", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        securityAlerts: true,
        role: true,
        referralCode: true,
        language: true,
        timezone: true,
        dateFormat: true,
        emailNotifications: true,
        messageNotifications: true,
        eventAlerts: true,
        marketingNotifications: true,
        defaultEventType: true,
        defaultEventTime: true,
        defaultQrEnabled: true,
        companyName: true,
        jobTitle: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
        website: true,
        bio: true,
        dateOfBirth: true,
        createdAt: true
      }
    });

    if (!organizer) {
      return res.status(404).json({ message: "Organisateur introuvable." });
    }

    return res.json({ organizer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation du profil." });
  }
});

// Mise a jour du profil organisateur
authRouter.put("/me", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const {
      name,
      password,
      phone,
      avatarUrl,
      securityAlerts,
      companyName,
      jobTitle,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      country,
      website,
      bio,
      dateOfBirth
    } = req.body as {
      name?: string;
      password?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      securityAlerts?: boolean;
      companyName?: string | null;
      jobTitle?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      postalCode?: string | null;
      country?: string | null;
      website?: string | null;
      bio?: string | null;
      dateOfBirth?: string | null;
    };
    const data: {
      name?: string | null;
      password?: string;
      phone?: string | null;
      avatarUrl?: string | null;
      securityAlerts?: boolean;
      companyName?: string | null;
      jobTitle?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      postalCode?: string | null;
      country?: string | null;
      website?: string | null;
      bio?: string | null;
      dateOfBirth?: Date | null;
    } = {};

    if (typeof name === "string") {
      data.name = cleanNullableString(name, 120);
    }

    if (typeof password === "string" && password.trim().length > 0) {
      if (password.trim().length < 6 || password.trim().length > 72) {
        return res
          .status(400)
          .json({ message: "Le mot de passe doit contenir entre 6 et 72 caracteres." });
      }
      data.password = await bcrypt.hash(password.trim(), 10);
    }

    if (phone !== undefined) data.phone = cleanPhone(phone);
    if (avatarUrl !== undefined) {
      const clean = normalizeStoredUploadUrl(avatarUrl);
      if (avatarUrl && !clean) {
        return res.status(400).json({ message: "URL photo invalide." });
      }
      data.avatarUrl = clean;
    }
    if (typeof securityAlerts === "boolean") {
      data.securityAlerts = securityAlerts;
    }
    if (companyName !== undefined) data.companyName = cleanNullableString(companyName, 120);
    if (jobTitle !== undefined) data.jobTitle = cleanNullableString(jobTitle, 120);
    if (addressLine1 !== undefined) data.addressLine1 = cleanNullableString(addressLine1, 160);
    if (addressLine2 !== undefined) data.addressLine2 = cleanNullableString(addressLine2, 160);
    if (city !== undefined) data.city = cleanNullableString(city, 80);
    if (postalCode !== undefined) data.postalCode = cleanNullableString(postalCode, 20);
    if (country !== undefined) data.country = cleanNullableString(country, 80);
    if (website !== undefined) {
      const clean = cleanWebsite(website);
      if (website && !clean) {
        return res.status(400).json({ message: "Site web invalide (utilisez http:// ou https://)." });
      }
      data.website = clean;
    }
    if (bio !== undefined) data.bio = cleanNullableString(bio, 1000);
    if (dateOfBirth !== undefined) {
      const date = cleanDate(dateOfBirth);
      if (dateOfBirth && !date) {
        return res.status(400).json({ message: "Date de naissance invalide." });
      }
      data.dateOfBirth = date;
    }

    const organizer = await prisma.organizer.update({
      where: { id: organizerId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        securityAlerts: true,
        role: true,
        referralCode: true,
        language: true,
        timezone: true,
        dateFormat: true,
        emailNotifications: true,
        messageNotifications: true,
        eventAlerts: true,
        marketingNotifications: true,
        defaultEventType: true,
        defaultEventTime: true,
        defaultQrEnabled: true,
        companyName: true,
        jobTitle: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
        website: true,
        bio: true,
        dateOfBirth: true
      }
    });

    return res.json({ organizer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour du profil." });
  }
});

// Parametres utilisateur
authRouter.get("/settings", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: {
        id: true,
        language: true,
        timezone: true,
        dateFormat: true,
        emailNotifications: true,
        messageNotifications: true,
        eventAlerts: true,
        marketingNotifications: true,
        defaultEventType: true,
        defaultEventTime: true,
        defaultQrEnabled: true
      }
    });

    if (!organizer) {
      return res.status(404).json({ message: "Organisateur introuvable." });
    }

    return res.json({ settings: organizer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors du chargement des parametres." });
  }
});

authRouter.put("/settings", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const {
      language,
      timezone,
      dateFormat,
      emailNotifications,
      messageNotifications,
      eventAlerts,
      marketingNotifications,
      defaultEventType,
      defaultEventTime,
      defaultQrEnabled
    } = req.body as {
      language?: string;
      timezone?: string;
      dateFormat?: string;
      emailNotifications?: boolean;
      messageNotifications?: boolean;
      eventAlerts?: boolean;
      marketingNotifications?: boolean;
      defaultEventType?: string;
      defaultEventTime?: string;
      defaultQrEnabled?: boolean;
    };

    const data: {
      language?: string;
      timezone?: string;
      dateFormat?: string;
      emailNotifications?: boolean;
      messageNotifications?: boolean;
      eventAlerts?: boolean;
      marketingNotifications?: boolean;
      defaultEventType?: string;
      defaultEventTime?: string;
      defaultQrEnabled?: boolean;
    } = {};

    if (typeof language === "string") data.language = language.trim().slice(0, 20);
    if (typeof timezone === "string") data.timezone = timezone.trim().slice(0, 60);
    if (typeof dateFormat === "string") data.dateFormat = dateFormat.trim().slice(0, 20);
    if (typeof emailNotifications === "boolean") data.emailNotifications = emailNotifications;
    if (typeof messageNotifications === "boolean") data.messageNotifications = messageNotifications;
    if (typeof eventAlerts === "boolean") data.eventAlerts = eventAlerts;
    if (typeof marketingNotifications === "boolean") data.marketingNotifications = marketingNotifications;
    if (typeof defaultEventType === "string") data.defaultEventType = defaultEventType.trim().slice(0, 30);
    if (defaultEventTime !== undefined) {
      const clean = cleanTime(defaultEventTime);
      if (defaultEventTime && !clean) {
        return res.status(400).json({ message: "Heure par defaut invalide (HH:MM)." });
      }
      data.defaultEventTime = clean ?? "18:00";
    }
    if (typeof defaultQrEnabled === "boolean") data.defaultQrEnabled = defaultQrEnabled;

    const organizer = await prisma.organizer.update({
      where: { id: organizerId },
      data,
      select: {
        id: true,
        language: true,
        timezone: true,
        dateFormat: true,
        emailNotifications: true,
        messageNotifications: true,
        eventAlerts: true,
        marketingNotifications: true,
        defaultEventType: true,
        defaultEventTime: true,
        defaultQrEnabled: true
      }
    });

    return res.json({ settings: organizer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour des parametres." });
  }
});

// Activer programme partenaire
authRouter.post("/referral/activate", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const current = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { referralCode: true }
    });
    if (current?.referralCode) {
      return res.json({ referralCode: current.referralCode });
    }
    let referralCode = "";
    for (let i = 0; i < 5; i += 1) {
      const candidate = generateReferralCode();
      try {
        const updated = await prisma.organizer.update({
          where: { id: organizerId },
          data: { referralCode: candidate },
          select: { referralCode: true }
        });
        referralCode = updated.referralCode || candidate;
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          continue;
        }
        throw err;
      }
    }
    if (!referralCode) {
      return res.status(500).json({ message: "Impossible de generer un code partenaire." });
    }
    return res.json({ referralCode });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur activation programme partenaire." });
  }
});

// Commissions partenaires
authRouter.get("/commissions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const commissions = await prisma.referralCommission.findMany({
      where: { partnerId: organizerId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        referred: { select: { id: true, email: true, name: true } }
      }
    });
    const totals = commissions.reduce(
      (acc, item) => {
        acc.total += item.amount;
        if (item.status === "PAID") acc.paid += item.amount;
        if (item.status === "PENDING") acc.pending += item.amount;
        return acc;
      },
      { total: 0, paid: 0, pending: 0 }
    );
    return res.json({ commissions, totals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur chargement commissions." });
  }
});

// Upload avatar (dataUrl) for organizer
authRouter.post("/me/avatar", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
    if (!fileName || !dataUrl) {
      return res.status(400).json({ message: "Fichier image manquant." });
    }
    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Format image invalide. Utilisez PNG ou JPG." });
    }
    if (parsed.buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ message: "Image trop lourde (max 3MB)." });
    }
    const safeBase = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "avatar";
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeBase}.${parsed.ext}`;
    const uploadDir = path.join(process.cwd(), "uploads", "avatars");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), parsed.buffer);
    const url = `/uploads/avatars/${filename}`;
    const organizer = await prisma.organizer.update({
      where: { id: organizerId },
      data: { avatarUrl: url },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true
      }
    });
    return res.json({ organizer, avatarUrl: url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'upload de la photo." });
  }
});

// Changer mot de passe
authRouter.put("/password", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const currentPassword = normalizeString(req.body?.currentPassword);
    const newPassword = normalizeString(req.body?.newPassword);
    const confirmPassword = normalizeString(req.body?.confirmPassword);
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "La confirmation ne correspond pas." });
    }
    if (newPassword.length < 6 || newPassword.length > 72) {
      return res.status(400).json({ message: "Le mot de passe doit contenir entre 6 et 72 caracteres." });
    }
    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId }
    });
    if (!organizer) {
      return res.status(404).json({ message: "Organisateur introuvable." });
    }
    const valid = await bcrypt.compare(currentPassword, organizer.password);
    if (!valid) {
      return res.status(400).json({ message: "Ancien mot de passe incorrect." });
    }
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.organizer.update({
      where: { id: organizerId },
      data: { password: hashed }
    });
    return res.json({ message: "Mot de passe mis a jour." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour du mot de passe." });
  }
});

// Sessions actives (MVP)
authRouter.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const sessions = await prisma.organizerLogin.findMany({
      where: { organizerId, success: true },
      orderBy: { createdAt: "desc" },
      take: 5
    });
    return res.json({
      sessions: sessions.map(item => ({
        id: String(item.id),
        device: item.userAgent || "Navigateur",
        ip: item.ip,
        location: null,
        lastActive: item.createdAt.toISOString()
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors du chargement des sessions." });
  }
});

// Deconnexion de tous les appareils (MVP)
authRouter.delete("/sessions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    clearSessionCookie(res, req);
    return res.json({ message: "Deconnexion demandee." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la deconnexion." });
  }
});

// Stats profil organisateur
authRouter.get("/me/stats", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const events = await prisma.event.findMany({
      where: { organizerId },
      select: { id: true, type: true }
    });
    const eventIds = events.map(e => e.id);
    const totalEvents = eventIds.length;
    const guestTotals = await prisma.guest.groupBy({
      by: ["status"],
      where: { eventId: { in: eventIds } },
      _count: { _all: true }
    });
    const totalGuests = guestTotals.reduce((sum, item) => sum + item._count._all, 0);
    const confirmed = guestTotals.find(item => item.status === "CONFIRMED")?._count._all ?? 0;
    const pending = guestTotals.find(item => item.status === "PENDING")?._count._all ?? 0;
    const canceled = guestTotals.find(item => item.status === "CANCELED")?._count._all ?? 0;
    const types = events.reduce<Record<string, number>>((acc, evt) => {
      const key = evt.type || "Autre";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return res.json({
      totalEvents,
      totalGuests,
      confirmed,
      pending,
      canceled,
      types
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors du chargement des statistiques." });
  }
});



