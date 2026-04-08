import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware, signToken } from "../middleware/auth";
import { createSimpleRateLimiter } from "../middleware/rateLimit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const authRouter = Router();
const loginRateLimiter = createSimpleRateLimiter(10 * 60 * 1000, 7);

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

function cleanTime(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!/^\d{2}:\d{2}$/.test(cleaned)) return null;
  return cleaned;
}

function cleanAvatarUrl(value: unknown) {
  const cleaned = cleanNullableString(value, 500);
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith("/uploads/")) {
    return null;
  }
  return cleaned;
}

function generateReferralCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
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

// Inscription organisateur
authRouter.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeString(req.body?.password);
    const name = normalizeString(req.body?.name);
    const phone = cleanPhone(req.body?.phone);
    const referralCode = normalizeString(req.body?.referralCode);

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe sont obligatoires." });
    }
    if (!email.includes("@") || email.length > 190) {
      return res.status(400).json({ message: "Email invalide." });
    }
    if (password.length < 6 || password.length > 72) {
      return res
        .status(400)
        .json({ message: "Le mot de passe doit contenir entre 6 et 72 caracteres." });
    }

    const existing = await prisma.organizer.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Un compte existe déjà avec cet email." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const organizer = await prisma.organizer.create({
      data: {
        email,
        password: hashed,
        name: name || null,
        phone,
        referralCode: generateReferralCode()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        referralCode: true
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

    const token = signToken({ id: organizer.id, email: organizer.email });

    res.status(201).json({ organizer, token });
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

    res.json({
      organizer: {
        id: organizer.id,
        email: organizer.email,
        name: organizer.name,
        phone: organizer.phone
      },
      token
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Erreur lors de la connexion de l’organisateur." });
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
      const clean = cleanAvatarUrl(avatarUrl);
      if (avatarUrl && !clean) {
        return res.status(400).json({ message: "URL photo invalide (https://...)." });
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
    const baseUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    const url = `${baseUrl.replace(/\/+$/, "")}/uploads/avatars/${filename}`;
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

