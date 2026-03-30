import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware, signToken } from "../middleware/auth";
import { createSimpleRateLimiter } from "../middleware/rateLimit";

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

// Inscription organisateur
authRouter.post("/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = normalizeString(req.body?.password);
    const name = normalizeString(req.body?.name);
    const phone = cleanPhone(req.body?.phone);

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
        phone
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true
      }
    });

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
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    const valid = await bcrypt.compare(password, organizer.password);
    if (!valid) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

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

