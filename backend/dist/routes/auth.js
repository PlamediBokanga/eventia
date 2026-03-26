"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const rateLimit_1 = require("../middleware/rateLimit");
exports.authRouter = (0, express_1.Router)();
const loginRateLimiter = (0, rateLimit_1.createSimpleRateLimiter)(10 * 60 * 1000, 7);
function normalizeEmail(value) {
    if (typeof value !== "string")
        return "";
    return value.trim().toLowerCase();
}
function normalizeString(value) {
    if (typeof value !== "string")
        return "";
    return value.trim();
}
function cleanNullableString(value, maxLen) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim();
    if (!cleaned)
        return null;
    return cleaned.slice(0, maxLen);
}
function cleanPhone(value) {
    const cleaned = cleanNullableString(value, 30);
    if (!cleaned)
        return null;
    const normalized = cleaned.replace(/[^\d+().\-\s]/g, "").trim();
    return normalized || null;
}
function cleanWebsite(value) {
    const cleaned = cleanNullableString(value, 220);
    if (!cleaned)
        return null;
    if (!/^https?:\/\//i.test(cleaned))
        return null;
    return cleaned;
}
function cleanDate(value) {
    if (value == null || value === "")
        return null;
    if (typeof value !== "string")
        return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime()))
        return null;
    return date;
}
// Inscription organisateur
exports.authRouter.post("/register", async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const email = normalizeEmail((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
        const password = normalizeString((_b = req.body) === null || _b === void 0 ? void 0 : _b.password);
        const name = normalizeString((_c = req.body) === null || _c === void 0 ? void 0 : _c.name);
        const phone = cleanPhone((_d = req.body) === null || _d === void 0 ? void 0 : _d.phone);
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
        const existing = await prisma_1.prisma.organizer.findUnique({ where: { email } });
        if (existing) {
            return res
                .status(409)
                .json({ message: "Un compte existe déjà avec cet email." });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const organizer = await prisma_1.prisma.organizer.create({
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
        const token = (0, auth_1.signToken)({ id: organizer.id, email: organizer.email });
        res.status(201).json({ organizer, token });
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ message: "Erreur lors de la création du compte organisateur." });
    }
});
// Connexion organisateur
exports.authRouter.post("/login", async (req, res) => {
    var _a, _b;
    try {
        const email = normalizeEmail((_a = req.body) === null || _a === void 0 ? void 0 : _a.email);
        const password = normalizeString((_b = req.body) === null || _b === void 0 ? void 0 : _b.password);
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
        const organizer = await prisma_1.prisma.organizer.findUnique({
            where: { email }
        });
        if (!organizer) {
            return res.status(401).json({ message: "Identifiants invalides." });
        }
        const valid = await bcryptjs_1.default.compare(password, organizer.password);
        if (!valid) {
            return res.status(401).json({ message: "Identifiants invalides." });
        }
        const token = (0, auth_1.signToken)({ id: organizer.id, email: organizer.email });
        res.json({
            organizer: {
                id: organizer.id,
                email: organizer.email,
                name: organizer.name,
                phone: organizer.phone
            },
            token
        });
    }
    catch (err) {
        console.error(err);
        res
            .status(500)
            .json({ message: "Erreur lors de la connexion de l’organisateur." });
    }
});
// Profil organisateur connecte
exports.authRouter.get("/me", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const organizer = await prisma_1.prisma.organizer.findUnique({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation du profil." });
    }
});
// Mise a jour du profil organisateur
exports.authRouter.put("/me", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const { name, password, phone, companyName, jobTitle, addressLine1, addressLine2, city, postalCode, country, website, bio, dateOfBirth } = req.body;
        const data = {};
        if (typeof name === "string") {
            data.name = cleanNullableString(name, 120);
        }
        if (typeof password === "string" && password.trim().length > 0) {
            if (password.trim().length < 6 || password.trim().length > 72) {
                return res
                    .status(400)
                    .json({ message: "Le mot de passe doit contenir entre 6 et 72 caracteres." });
            }
            data.password = await bcryptjs_1.default.hash(password.trim(), 10);
        }
        if (phone !== undefined)
            data.phone = cleanPhone(phone);
        if (companyName !== undefined)
            data.companyName = cleanNullableString(companyName, 120);
        if (jobTitle !== undefined)
            data.jobTitle = cleanNullableString(jobTitle, 120);
        if (addressLine1 !== undefined)
            data.addressLine1 = cleanNullableString(addressLine1, 160);
        if (addressLine2 !== undefined)
            data.addressLine2 = cleanNullableString(addressLine2, 160);
        if (city !== undefined)
            data.city = cleanNullableString(city, 80);
        if (postalCode !== undefined)
            data.postalCode = cleanNullableString(postalCode, 20);
        if (country !== undefined)
            data.country = cleanNullableString(country, 80);
        if (website !== undefined) {
            const clean = cleanWebsite(website);
            if (website && !clean) {
                return res.status(400).json({ message: "Site web invalide (utilisez http:// ou https://)." });
            }
            data.website = clean;
        }
        if (bio !== undefined)
            data.bio = cleanNullableString(bio, 1000);
        if (dateOfBirth !== undefined) {
            const date = cleanDate(dateOfBirth);
            if (dateOfBirth && !date) {
                return res.status(400).json({ message: "Date de naissance invalide." });
            }
            data.dateOfBirth = date;
        }
        const organizer = await prisma_1.prisma.organizer.update({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la mise a jour du profil." });
    }
});
