"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const pdfkit_1 = __importDefault(require("pdfkit"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const sharp_1 = __importDefault(require("sharp"));
const auth_1 = require("../middleware/auth");
exports.eventsRouter = (0, express_1.Router)();
function getOrganizerId(req) {
    var _a;
    return (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
}
function parseIdParam(rawId) {
    const value = Number(rawId);
    return Number.isInteger(value) && value > 0 ? value : null;
}
function isValidDate(value) {
    if (typeof value !== "string")
        return false;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms);
}
function toNonNegativeInt(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return fallback;
    return Math.max(0, Math.floor(parsed));
}
function cleanOptionalText(value, maxLen) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim();
    if (!cleaned)
        return null;
    return cleaned.slice(0, maxLen);
}
function cleanOptionalHexColor(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim();
    if (!cleaned)
        return null;
    const normalized = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}
function cleanOptionalThemePreset(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim().toLowerCase();
    if (!cleaned)
        return null;
    const allowed = ["classic", "elegant", "vibrant", "minimal"];
    return allowed.includes(cleaned) ? cleaned : null;
}
function cleanOptionalFontFamily(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim();
    if (!cleaned)
        return null;
    return cleaned.slice(0, 80);
}
function cleanOptionalAnimationStyle(value) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim().toLowerCase();
    if (!cleaned)
        return null;
    const allowed = ["none", "soft", "float"];
    return allowed.includes(cleaned) ? cleaned : null;
}
function buildCoOrganizerInviteUrl(token) {
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    return `${appUrl.replace(/\/+$/, "")}/co-organizer/accept/${token}`;
}
function isValidToken(token) {
    return /^[a-f0-9]{32}$/i.test(token);
}
function cleanSeatingMode(value) {
    if (typeof value !== "string")
        return "TABLE";
    const cleaned = value.trim().toUpperCase();
    if (cleaned === "ZONE" || cleaned === "NONE")
        return cleaned;
    return "TABLE";
}
function guestTypeLabel(guestType) {
    if (guestType === "COUPLE")
        return "Couple";
    if (guestType === "MR")
        return "Mr";
    if (guestType === "MME")
        return "Mme";
    if (guestType === "MLLE")
        return "Mlle";
    return "";
}
function composeGuestFullName(params) {
    var _a;
    const label = guestTypeLabel(params.guestType);
    const parts = [label, params.lastName, params.middleName, params.firstName]
        .map(value => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : ((_a = params.fallback) === null || _a === void 0 ? void 0 : _a.trim()) || "Invite";
}
function cleanOptionalInvitationHtml(value, maxLen) {
    if (typeof value !== "string")
        return null;
    const cleaned = value.trim();
    if (!cleaned)
        return null;
    let html = cleaned.slice(0, maxLen);
    html = html
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/<!--[\s\S]*?-->/g, "");
    html = html.replace(/<(\/?)(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|div)\b[^>]*>/gi, "<$1$2>");
    html = html.replace(/<a\b([^>]*)>/gi, (_full, attrs) => {
        const hrefMatch = attrs.match(/href\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/i);
        const href = ((hrefMatch === null || hrefMatch === void 0 ? void 0 : hrefMatch[2]) || (hrefMatch === null || hrefMatch === void 0 ? void 0 : hrefMatch[3]) || (hrefMatch === null || hrefMatch === void 0 ? void 0 : hrefMatch[4]) || "").trim();
        const safeHref = /^(https?:|mailto:|tel:)/i.test(href) ? href : "#";
        return `<a href="${safeHref}" target="_blank" rel="noreferrer">`;
    });
    html = html.replace(/<\/a>/gi, "</a>");
    html = html.replace(/<(?!\/?(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|a|div)\b)[^>]*>/gi, "");
    return html;
}
function normalizeProgramItems(items) {
    if (!Array.isArray(items))
        return null;
    const cleaned = items
        .map((item, index) => {
        if (!item || typeof item !== "object")
            return null;
        const raw = item;
        const timeLabel = typeof raw.timeLabel === "string" ? raw.timeLabel.trim().slice(0, 20) : "";
        const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 120) : "";
        const description = typeof raw.description === "string" && raw.description.trim()
            ? raw.description.trim().slice(0, 240)
            : null;
        if (!timeLabel && !title)
            return null;
        return {
            timeLabel: timeLabel || "Heure",
            title: title || "Programme",
            description,
            order: index
        };
    })
        .filter(Boolean);
    if (cleaned.length === 0)
        return [];
    return cleaned.slice(0, 30);
}
function uploadBaseUrl(req) {
    var _a;
    const appUrl = (_a = process.env.APP_URL) === null || _a === void 0 ? void 0 : _a.replace(/\/+$/, "");
    if (appUrl)
        return appUrl;
    return `${req.protocol}://${req.get("host")}`;
}
function parseImageDataUrl(dataUrl) {
    if (typeof dataUrl !== "string")
        return null;
    const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!match)
        return null;
    const mime = match[1].toLowerCase();
    const rawBase64 = match[3];
    const buffer = Buffer.from(rawBase64, "base64");
    if (!buffer.length)
        return null;
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return { buffer, ext };
}
function cleanChatMessage(value) {
    if (typeof value !== "string")
        return "";
    return value.trim().slice(0, 1000);
}
async function convertWebpToJpg(buffer) {
    const converted = await (0, sharp_1.default)(buffer).jpeg({ quality: 88 }).toBuffer();
    return converted;
}
function registerPdfFonts(doc) {
    const fallback = {
        regular: "Helvetica",
        bold: "Helvetica-Bold",
        italic: "Helvetica-Oblique"
    };
    try {
        const winDir = process.env.WINDIR || "C:\\Windows";
        const fontDir = path_1.default.join(winDir, "Fonts");
        const regular = path_1.default.join(fontDir, "arial.ttf");
        const bold = path_1.default.join(fontDir, "arialbd.ttf");
        const italic = path_1.default.join(fontDir, "ariali.ttf");
        doc.registerFont("Eventia", regular);
        doc.registerFont("EventiaBold", bold);
        doc.registerFont("EventiaItalic", italic);
        return { regular: "Eventia", bold: "EventiaBold", italic: "EventiaItalic" };
    }
    catch {
        return fallback;
    }
}
async function ensureEventAccess(eventId, organizerId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, organizerId: true }
    });
    if (!event) {
        return { error: { code: 404, message: "Evenement introuvable." } };
    }
    if (event.organizerId === organizerId) {
        return { event, role: "OWNER" };
    }
    const coHost = await prisma_1.prisma.eventCoOrganizer.findFirst({
        where: {
            eventId,
            organizerId
        },
        select: { id: true }
    });
    if (!coHost) {
        return { error: { code: 403, message: "Acces refuse a cet evenement." } };
    }
    return { event, role: "CO_ORGANIZER" };
}
// Liste des evenements de l'organisateur connecte
exports.eventsRouter.get("/", auth_1.authMiddleware, async (req, res) => {
    try {
        const organizerId = getOrganizerId(req);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const events = await prisma_1.prisma.event.findMany({
            where: {
                OR: [
                    { organizerId },
                    {
                        coOrganizers: {
                            some: { organizerId }
                        }
                    }
                ]
            },
            include: {
                coOrganizers: {
                    select: { id: true }
                },
                programItems: {
                    orderBy: { order: "asc" }
                }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json(events.map(event => ({
            ...event,
            isOwner: event.organizerId === organizerId,
            coOrganizerCount: event.coOrganizers.length
        })));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation des evenements." });
    }
});
// Creation d'un evenement
exports.eventsRouter.post("/", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const { name, type, dateTime, location, address, details, program, programItems, invitationMessage, coverImageUrl, hostNames, seatingMode, logoUrl, themePreset, primaryColor, accentColor, fontFamily, animationStyle, tableCount, capacityPerTable } = req.body;
        const cleanedName = String(name).trim();
        const cleanedType = String(type).trim();
        const cleanedLocation = String(location).trim();
        if (!cleanedName || !cleanedType || !dateTime || !cleanedLocation) {
            return res.status(400).json({ message: "Champs obligatoires manquants." });
        }
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        if (!isValidDate(dateTime))
            return res.status(400).json({ message: "Date invalide." });
        const seatingModeFinal = cleanSeatingMode(seatingMode);
        const tableCountFinal = seatingModeFinal === "NONE" ? 0 : toNonNegativeInt(tableCount, 0);
        const capacityPerTableFinal = seatingModeFinal === "NONE" ? 0 : toNonNegativeInt(capacityPerTable, 0);
        const tableLabelPrefix = seatingModeFinal === "ZONE" ? "Zone" : "Table";
        const normalizedProgramItems = normalizeProgramItems(programItems);
        const event = await prisma_1.prisma.event.create({
            data: {
                name: cleanedName.slice(0, 140),
                type: cleanedType.slice(0, 60),
                dateTime: new Date(dateTime),
                location: cleanedLocation.slice(0, 180),
                address: cleanOptionalText(address, 220),
                details: cleanOptionalText(details, 1200),
                program: cleanOptionalText(program, 2000),
                invitationMessage: cleanOptionalInvitationHtml(invitationMessage, 4000),
                coverImageUrl: cleanOptionalText(coverImageUrl, 500),
                hostNames: cleanOptionalText(hostNames, 200),
                seatingMode: seatingModeFinal,
                logoUrl: cleanOptionalText(logoUrl, 500),
                themePreset: cleanOptionalThemePreset(themePreset),
                primaryColor: cleanOptionalHexColor(primaryColor),
                accentColor: cleanOptionalHexColor(accentColor),
                fontFamily: cleanOptionalFontFamily(fontFamily),
                animationStyle: cleanOptionalAnimationStyle(animationStyle),
                tableCount: tableCountFinal,
                capacityPerTable: capacityPerTableFinal,
                organizerId,
                programItems: normalizedProgramItems
                    ? {
                        createMany: {
                            data: normalizedProgramItems
                        }
                    }
                    : undefined,
                tables: tableCountFinal > 0
                    ? {
                        create: Array.from({ length: tableCountFinal }, (_, index) => ({
                            label: `${tableLabelPrefix} ${index + 1}`,
                            capacity: capacityPerTableFinal
                        }))
                    }
                    : undefined
            },
            include: { tables: true }
        });
        res.status(201).json(event);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation de l'evenement." });
    }
});
// Upload de photo de couverture pour une invitation
exports.eventsRouter.post("/upload-cover", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const { fileName, dataUrl } = req.body;
        if (!fileName || !dataUrl) {
            return res.status(400).json({ message: "Fichier image manquant." });
        }
        const parsed = parseImageDataUrl(dataUrl);
        if (!parsed) {
            return res.status(400).json({ message: "Format image invalide. Utilisez PNG, JPG ou WEBP." });
        }
        let finalBuffer = parsed.buffer;
        let finalExt = parsed.ext;
        if (parsed.ext === "webp") {
            try {
                finalBuffer = await convertWebpToJpg(parsed.buffer);
                finalExt = "jpg";
            }
            catch (error) {
                console.error("WEBP conversion failed:", error);
                return res.status(400).json({ message: "Conversion WEBP impossible. Utilisez JPG ou PNG." });
            }
        }
        if (parsed.buffer.length > 4 * 1024 * 1024) {
            return res.status(400).json({ message: "Image trop lourde (max 4MB)." });
        }
        const safeBase = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "cover";
        const filename = `${Date.now()}-${crypto_1.default.randomBytes(4).toString("hex")}-${safeBase}.${finalExt}`;
        const uploadDir = path_1.default.join(process.cwd(), "uploads");
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(uploadDir, filename), finalBuffer);
        const url = `${uploadBaseUrl(authReq)}/uploads/${filename}`;
        return res.status(201).json({ url });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'upload de la photo." });
    }
});
// Mise a jour d'un evenement
exports.eventsRouter.put("/:id", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const id = parseIdParam(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(id, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const { name, type, dateTime, location, address, details, program, programItems, invitationMessage, coverImageUrl, hostNames, seatingMode, logoUrl, themePreset, primaryColor, accentColor, fontFamily, animationStyle, tableCount, capacityPerTable } = req.body;
        const seatingModeFinal = seatingMode ? cleanSeatingMode(seatingMode) : undefined;
        const targetTableCount = seatingModeFinal === "NONE"
            ? 0
            : tableCount != null
                ? toNonNegativeInt(tableCount, 0)
                : undefined;
        const targetCapacityPerTable = seatingModeFinal === "NONE"
            ? 0
            : capacityPerTable != null
                ? toNonNegativeInt(capacityPerTable, 0)
                : undefined;
        if (typeof dateTime === "string" && dateTime && !isValidDate(dateTime)) {
            return res.status(400).json({ message: "Date invalide." });
        }
        const eventBeforeUpdate = await prisma_1.prisma.event.findUnique({
            where: { id },
            select: { capacityPerTable: true }
        });
        const effectiveCapacityPerTable = (_a = targetCapacityPerTable !== null && targetCapacityPerTable !== void 0 ? targetCapacityPerTable : eventBeforeUpdate === null || eventBeforeUpdate === void 0 ? void 0 : eventBeforeUpdate.capacityPerTable) !== null && _a !== void 0 ? _a : 0;
        const existingTables = await prisma_1.prisma.table.findMany({
            where: { eventId: id },
            include: {
                _count: {
                    select: { guests: true }
                }
            },
            orderBy: { id: "asc" }
        });
        if (targetTableCount != null && targetTableCount < existingTables.length) {
            const toRemoveCount = existingTables.length - targetTableCount;
            const removableTables = [...existingTables]
                .reverse()
                .filter(t => t._count.guests === 0)
                .slice(0, toRemoveCount);
            if (removableTables.length < toRemoveCount) {
                return res.status(400).json({
                    message: "Impossible de reduire le nombre de tables: certaines tables a supprimer contiennent des invites."
                });
            }
        }
        const normalizedProgramItems = normalizeProgramItems(programItems);
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            if (seatingModeFinal === "NONE") {
                await tx.guest.updateMany({
                    where: { eventId: id },
                    data: { tableId: null }
                });
            }
            if (targetCapacityPerTable != null) {
                await tx.table.updateMany({
                    where: { eventId: id },
                    data: { capacity: effectiveCapacityPerTable }
                });
            }
            if (targetTableCount != null && targetTableCount > existingTables.length) {
                const toCreate = targetTableCount - existingTables.length;
                if (toCreate > 0) {
                    await tx.table.createMany({
                        data: Array.from({ length: toCreate }, (_, index) => ({
                            eventId: id,
                            label: `Table ${existingTables.length + index + 1}`,
                            capacity: effectiveCapacityPerTable
                        }))
                    });
                }
            }
            else if (targetTableCount != null && targetTableCount < existingTables.length) {
                const toRemoveCount = existingTables.length - targetTableCount;
                const removableTableIds = [...existingTables]
                    .reverse()
                    .filter(t => t._count.guests === 0)
                    .slice(0, toRemoveCount)
                    .map(t => t.id);
                if (removableTableIds.length > 0) {
                    await tx.table.deleteMany({
                        where: { id: { in: removableTableIds } }
                    });
                }
            }
            const updatedEvent = await tx.event.update({
                where: { id },
                data: {
                    name: typeof name === "string" ? name.trim().slice(0, 140) : undefined,
                    type: typeof type === "string" ? type.trim().slice(0, 60) : undefined,
                    dateTime: typeof dateTime === "string"
                        ? isValidDate(dateTime)
                            ? new Date(dateTime)
                            : undefined
                        : undefined,
                    location: typeof location === "string" ? location.trim().slice(0, 180) : undefined,
                    address: typeof address === "string" || address === null ? cleanOptionalText(address, 220) : undefined,
                    details: typeof details === "string" || details === null ? cleanOptionalText(details, 1200) : undefined,
                    program: typeof program === "string" || program === null ? cleanOptionalText(program, 2000) : undefined,
                    invitationMessage: typeof invitationMessage === "string" || invitationMessage === null
                        ? cleanOptionalInvitationHtml(invitationMessage, 4000)
                        : undefined,
                    coverImageUrl: typeof coverImageUrl === "string" || coverImageUrl === null
                        ? cleanOptionalText(coverImageUrl, 500)
                        : undefined,
                    hostNames: typeof hostNames === "string" || hostNames === null
                        ? cleanOptionalText(hostNames, 200)
                        : undefined,
                    seatingMode: seatingModeFinal,
                    logoUrl: typeof logoUrl === "string" || logoUrl === null
                        ? cleanOptionalText(logoUrl, 500)
                        : undefined,
                    themePreset: typeof themePreset === "string" || themePreset === null
                        ? cleanOptionalThemePreset(themePreset)
                        : undefined,
                    primaryColor: typeof primaryColor === "string" || primaryColor === null
                        ? cleanOptionalHexColor(primaryColor)
                        : undefined,
                    accentColor: typeof accentColor === "string" || accentColor === null
                        ? cleanOptionalHexColor(accentColor)
                        : undefined,
                    fontFamily: typeof fontFamily === "string" || fontFamily === null
                        ? cleanOptionalFontFamily(fontFamily)
                        : undefined,
                    animationStyle: typeof animationStyle === "string" || animationStyle === null
                        ? cleanOptionalAnimationStyle(animationStyle)
                        : undefined,
                    tableCount: targetTableCount,
                    capacityPerTable: targetCapacityPerTable
                }
            });
            if (normalizedProgramItems) {
                await tx.eventProgramItem.deleteMany({ where: { eventId: id } });
                if (normalizedProgramItems.length > 0) {
                    await tx.eventProgramItem.createMany({
                        data: normalizedProgramItems.map(item => ({ ...item, eventId: id }))
                    });
                }
            }
            return updatedEvent;
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour de l'evenement." });
    }
});
// Suppression d'un evenement
exports.eventsRouter.delete("/:id", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const id = parseIdParam(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(id, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.guestDrinkChoice.deleteMany({
                where: {
                    guest: {
                        eventId: id
                    }
                }
            }),
            prisma_1.prisma.guestBookMessage.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.guestInvitation.deleteMany({
                where: {
                    guest: {
                        eventId: id
                    }
                }
            }),
            prisma_1.prisma.guest.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.table.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.drinkOption.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.eventMemory.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.eventProgramItem.deleteMany({
                where: { eventId: id }
            }),
            prisma_1.prisma.event.delete({ where: { id } })
        ]);
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la suppression de l'evenement." });
    }
});
// Detail d'un evenement (incluant tables et boissons)
exports.eventsRouter.get("/:id", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const id = parseIdParam(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(id, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id },
            include: {
                tables: {
                    include: {
                        guests: true
                    }
                },
                drinks: true,
                gifts: {
                    orderBy: { createdAt: "desc" }
                },
                memories: {
                    orderBy: { createdAt: "desc" }
                },
                programItems: {
                    orderBy: { order: "asc" }
                },
                coOrganizers: {
                    include: {
                        organizer: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        },
                        invitedBy: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!event) {
            return res.status(404).json({ message: "Evenement introuvable." });
        }
        res.json(event);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation de l'evenement." });
    }
});
// Liste des co-organisateurs d'un evenement
exports.eventsRouter.get("/:id/co-organizers", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                organizerId: true,
                organizer: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                coOrganizers: {
                    include: {
                        organizer: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        },
                        invitedBy: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" }
                }
            }
        });
        return res.json({
            owner: (_a = event === null || event === void 0 ? void 0 : event.organizer) !== null && _a !== void 0 ? _a : null,
            canManage: ownership.role === "OWNER",
            coOrganizers: (_b = event === null || event === void 0 ? void 0 : event.coOrganizers) !== null && _b !== void 0 ? _b : []
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation des co-organisateurs." });
    }
});
// Ajouter un co-organisateur par email
exports.eventsRouter.post("/:id/co-organizers", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        if (ownership.role !== "OWNER") {
            return res.status(403).json({ message: "Seul le proprietaire peut ajouter des co-organisateurs." });
        }
        const emailRaw = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.email) !== null && _b !== void 0 ? _b : "").trim().toLowerCase();
        if (!emailRaw || !emailRaw.includes("@")) {
            return res.status(400).json({ message: "Email invalide." });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { organizerId: true }
        });
        if (!event) {
            return res.status(404).json({ message: "Evenement introuvable." });
        }
        const targetOrganizer = await prisma_1.prisma.organizer.findUnique({
            where: { email: emailRaw },
            select: { id: true, email: true, name: true }
        });
        if (!targetOrganizer) {
            return res.status(404).json({ message: "Aucun organisateur avec cet email." });
        }
        if (targetOrganizer.id === event.organizerId) {
            return res.status(400).json({ message: "Le proprietaire est deja organisateur principal." });
        }
        const existing = await prisma_1.prisma.eventCoOrganizer.findFirst({
            where: {
                eventId,
                organizerId: targetOrganizer.id
            },
            select: { id: true }
        });
        if (existing) {
            return res.status(409).json({ message: "Cet organisateur est deja co-organisateur." });
        }
        const created = await prisma_1.prisma.eventCoOrganizer.create({
            data: {
                eventId,
                organizerId: targetOrganizer.id,
                invitedById: organizerId
            },
            include: {
                organizer: {
                    select: { id: true, email: true, name: true }
                },
                invitedBy: {
                    select: { id: true, email: true, name: true }
                }
            }
        });
        return res.status(201).json(created);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'ajout du co-organisateur." });
    }
});
// Creer une invitation de co-organisateur (email)
exports.eventsRouter.post("/:id/co-organizers/invite", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        if (ownership.role !== "OWNER") {
            return res.status(403).json({ message: "Seul le proprietaire peut inviter des co-organisateurs." });
        }
        const emailRaw = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.email) !== null && _b !== void 0 ? _b : "").trim().toLowerCase();
        if (!emailRaw || !emailRaw.includes("@")) {
            return res.status(400).json({ message: "Email invalide." });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { organizerId: true }
        });
        if (!event) {
            return res.status(404).json({ message: "Evenement introuvable." });
        }
        const existingInvite = await prisma_1.prisma.eventCoOrganizerInvite.findFirst({
            where: { eventId, email: emailRaw }
        });
        if (existingInvite && !existingInvite.acceptedAt) {
            return res.status(409).json({
                message: "Une invitation est deja en attente pour cet email.",
                inviteLink: buildCoOrganizerInviteUrl(existingInvite.token)
            });
        }
        const targetOrganizer = await prisma_1.prisma.organizer.findUnique({
            where: { email: emailRaw },
            select: { id: true }
        });
        if (targetOrganizer) {
            if (targetOrganizer.id === event.organizerId) {
                return res.status(400).json({ message: "Le proprietaire est deja organisateur principal." });
            }
            const existing = await prisma_1.prisma.eventCoOrganizer.findFirst({
                where: { eventId, organizerId: targetOrganizer.id },
                select: { id: true }
            });
            if (existing) {
                return res.status(409).json({ message: "Cet organisateur est deja co-organisateur." });
            }
            const created = await prisma_1.prisma.eventCoOrganizer.create({
                data: {
                    eventId,
                    organizerId: targetOrganizer.id,
                    invitedById: organizerId
                }
            });
            return res.status(201).json({ mode: "direct", coOrganizer: created });
        }
        const token = crypto_1.default.randomBytes(16).toString("hex");
        const invite = await prisma_1.prisma.eventCoOrganizerInvite.create({
            data: {
                eventId,
                email: emailRaw,
                token,
                invitedById: organizerId
            }
        });
        return res.status(201).json({
            mode: "invite",
            inviteLink: buildCoOrganizerInviteUrl(invite.token),
            invite: {
                id: invite.id,
                email: invite.email,
                createdAt: invite.createdAt
            }
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'invitation du co-organisateur." });
    }
});
// Liste des invitations en attente
exports.eventsRouter.get("/:id/co-organizers/invites", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const invites = await prisma_1.prisma.eventCoOrganizerInvite.findMany({
            where: { eventId, acceptedAt: null },
            orderBy: { createdAt: "desc" }
        });
        return res.json(invites.map(invite => ({
            id: invite.id,
            email: invite.email,
            createdAt: invite.createdAt,
            inviteLink: buildCoOrganizerInviteUrl(invite.token)
        })));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation des invitations." });
    }
});
// Retirer une invitation
exports.eventsRouter.delete("/:id/co-organizers/invites/:inviteId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const inviteId = parseIdParam(req.params.inviteId);
        if (!eventId || !inviteId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        if (ownership.role !== "OWNER") {
            return res.status(403).json({ message: "Seul le proprietaire peut retirer une invitation." });
        }
        const invite = await prisma_1.prisma.eventCoOrganizerInvite.findUnique({ where: { id: inviteId } });
        if (!invite || invite.eventId !== eventId) {
            return res.status(404).json({ message: "Invitation introuvable." });
        }
        await prisma_1.prisma.eventCoOrganizerInvite.delete({ where: { id: inviteId } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression de l'invitation." });
    }
});
// Accepter une invitation de co-organisateur (utilisateur connecte)
exports.eventsRouter.post("/co-organizers/accept/:token", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const token = String((_a = req.params.token) !== null && _a !== void 0 ? _a : "").trim();
        if (!token)
            return res.status(400).json({ message: "Token invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const invite = await prisma_1.prisma.eventCoOrganizerInvite.findUnique({
            where: { token },
            include: { event: { select: { organizerId: true } } }
        });
        if (!invite) {
            return res.status(404).json({ message: "Invitation introuvable." });
        }
        if (invite.acceptedAt) {
            return res.status(409).json({ message: "Invitation deja acceptee." });
        }
        if (invite.event.organizerId === organizerId) {
            return res.status(400).json({ message: "Le proprietaire est deja organisateur principal." });
        }
        const existing = await prisma_1.prisma.eventCoOrganizer.findFirst({
            where: { eventId: invite.eventId, organizerId }
        });
        if (!existing) {
            await prisma_1.prisma.eventCoOrganizer.create({
                data: {
                    eventId: invite.eventId,
                    organizerId,
                    invitedById: invite.invitedById
                }
            });
        }
        await prisma_1.prisma.eventCoOrganizerInvite.update({
            where: { id: invite.id },
            data: { acceptedAt: new Date(), acceptedById: organizerId }
        });
        return res.json({ success: true, eventId: invite.eventId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'acceptation." });
    }
});
// Retirer un co-organisateur
exports.eventsRouter.delete("/:id/co-organizers/:coOrganizerId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const coOrganizerId = parseIdParam(req.params.coOrganizerId);
        if (!eventId || !coOrganizerId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        if (ownership.role !== "OWNER") {
            return res.status(403).json({ message: "Seul le proprietaire peut retirer un co-organisateur." });
        }
        const row = await prisma_1.prisma.eventCoOrganizer.findFirst({
            where: {
                eventId,
                organizerId: coOrganizerId
            },
            select: { id: true }
        });
        if (!row) {
            return res.status(404).json({ message: "Co-organisateur introuvable." });
        }
        await prisma_1.prisma.eventCoOrganizer.delete({ where: { id: row.id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression du co-organisateur." });
    }
});
// Liste des souvenirs (photos/videos) d'un evenement
exports.eventsRouter.get("/:id/memories", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const memories = await prisma_1.prisma.eventMemory.findMany({
            where: { eventId },
            orderBy: { createdAt: "desc" }
        });
        return res.json(memories);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation des souvenirs." });
    }
});
// Suppression d'un souvenir
exports.eventsRouter.delete("/:id/memories/:memoryId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const memoryId = parseIdParam(req.params.memoryId);
        if (!eventId || !memoryId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const memory = await prisma_1.prisma.eventMemory.findUnique({ where: { id: memoryId } });
        if (!memory || memory.eventId !== eventId) {
            return res.status(404).json({ message: "Souvenir introuvable." });
        }
        await prisma_1.prisma.eventMemory.delete({ where: { id: memoryId } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression du souvenir." });
    }
});
// Ajout d'un cadeau / cagnotte pour un evenement
exports.eventsRouter.post("/:id/gifts", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const { title, description, url, isCashFund } = req.body;
        if (!title || !url) {
            return res.status(400).json({ message: "Titre et lien sont obligatoires." });
        }
        const safeUrl = String(url).trim();
        if (!/^https?:\/\//i.test(safeUrl)) {
            return res.status(400).json({ message: "Lien invalide (http:// ou https://)." });
        }
        const gift = await prisma_1.prisma.giftItem.create({
            data: {
                eventId,
                title: String(title).trim().slice(0, 120),
                description: typeof description === "string" && description.trim() ? description.trim().slice(0, 300) : null,
                url: safeUrl.slice(0, 500),
                isCashFund: Boolean(isCashFund)
            }
        });
        return res.status(201).json(gift);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'ajout du cadeau." });
    }
});
// Suppression d'un cadeau
exports.eventsRouter.delete("/:id/gifts/:giftId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const giftId = parseIdParam(req.params.giftId);
        if (!eventId || !giftId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const gift = await prisma_1.prisma.giftItem.findUnique({ where: { id: giftId } });
        if (!gift || gift.eventId !== eventId) {
            return res.status(404).json({ message: "Cadeau introuvable." });
        }
        await prisma_1.prisma.giftItem.delete({ where: { id: giftId } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression du cadeau." });
    }
});
// Ajout d'une option de boisson pour un evenement
exports.eventsRouter.post("/:id/drinks", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const { name, category, availableQuantity, maxPerGuest } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        if (!name || !category) {
            return res.status(400).json({ message: "Nom et categorie de boisson sont obligatoires." });
        }
        if (category !== "ALCOHOLIC" && category !== "SOFT") {
            return res.status(400).json({ message: "Categorie de boisson invalide." });
        }
        const drink = await prisma_1.prisma.drinkOption.create({
            data: {
                name: String(name).trim().slice(0, 80),
                category,
                availableQuantity: typeof availableQuantity === "number" && availableQuantity >= 0
                    ? Math.floor(availableQuantity)
                    : null,
                maxPerGuest: typeof maxPerGuest === "number" && maxPerGuest > 0 ? Math.floor(maxPerGuest) : null,
                eventId
            }
        });
        res.status(201).json(drink);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation de la boisson." });
    }
});
// Mise a jour d'une boisson
exports.eventsRouter.patch("/:id/drinks/:drinkId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const drinkId = parseIdParam(req.params.drinkId);
        if (!eventId || !drinkId)
            return res.status(400).json({ message: "Id invalide." });
        const { name, category, availableQuantity, maxPerGuest } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const drink = await prisma_1.prisma.drinkOption.findUnique({ where: { id: drinkId } });
        if (!drink || drink.eventId !== eventId) {
            return res.status(404).json({ message: "Boisson introuvable." });
        }
        if (category && category !== "ALCOHOLIC" && category !== "SOFT") {
            return res.status(400).json({ message: "Categorie de boisson invalide." });
        }
        const updated = await prisma_1.prisma.drinkOption.update({
            where: { id: drinkId },
            data: {
                name: typeof name === "string" ? name.trim().slice(0, 80) : undefined,
                category: category !== null && category !== void 0 ? category : undefined,
                availableQuantity: typeof availableQuantity === "number" && availableQuantity >= 0
                    ? Math.floor(availableQuantity)
                    : availableQuantity === null
                        ? null
                        : undefined,
                maxPerGuest: typeof maxPerGuest === "number" && maxPerGuest > 0
                    ? Math.floor(maxPerGuest)
                    : maxPerGuest === null
                        ? null
                        : undefined
            }
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour de la boisson." });
    }
});
// Suppression d'une boisson
exports.eventsRouter.delete("/:id/drinks/:drinkId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const drinkId = parseIdParam(req.params.drinkId);
        if (!eventId || !drinkId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const drink = await prisma_1.prisma.drinkOption.findUnique({ where: { id: drinkId } });
        if (!drink || drink.eventId !== eventId) {
            return res.status(404).json({ message: "Boisson introuvable." });
        }
        await prisma_1.prisma.drinkOption.delete({ where: { id: drinkId } });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la suppression de la boisson." });
    }
});
// Activer/desactiver le choix des boissons pour un evenement
exports.eventsRouter.patch("/:id/drinks/settings", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const { drinksEnabled } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const updated = await prisma_1.prisma.event.update({
            where: { id: eventId },
            data: { drinksEnabled: Boolean(drinksEnabled) }
        });
        res.json({ drinksEnabled: updated.drinksEnabled });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour des boissons." });
    }
});
// Creation d'une table pour un evenement
exports.eventsRouter.post("/:id/tables", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const { label, capacity, location, positionX, positionY } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { seatingMode: true }
        });
        if ((event === null || event === void 0 ? void 0 : event.seatingMode) === "NONE") {
            return res.status(400).json({ message: "Cet evenement est configure sans tables/sections." });
        }
        if (!label) {
            return res.status(400).json({ message: "Le nom (label) de la table est obligatoire." });
        }
        const table = await prisma_1.prisma.table.create({
            data: {
                label: String(label).trim().slice(0, 60),
                capacity: toNonNegativeInt(capacity, 0),
                location: cleanOptionalText(location, 160),
                positionX: typeof positionX === "number" ? positionX : null,
                positionY: typeof positionY === "number" ? positionY : null,
                eventId
            }
        });
        res.status(201).json(table);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation de la table." });
    }
});
// Scanner un QR code d'invitation (check-in)
exports.eventsRouter.get("/:id/checkin/stats", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const totalGuests = await prisma_1.prisma.guest.count({ where: { eventId } });
        const present = await prisma_1.prisma.guestInvitation.count({
            where: {
                guest: { eventId },
                checkedInAt: { not: null }
            }
        });
        return res.json({
            totalGuests,
            present,
            remaining: Math.max(totalGuests - present, 0)
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
    }
});
exports.eventsRouter.get("/:id/checkin/search", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const query = String((_b = (_a = req.query) === null || _a === void 0 ? void 0 : _a.q) !== null && _b !== void 0 ? _b : "").trim();
        if (!query)
            return res.json([]);
        const guests = (await prisma_1.prisma.guest.findMany({
            where: {
                eventId,
                OR: [
                    { fullName: { contains: query } },
                    { lastName: { contains: query } },
                    { middleName: { contains: query } },
                    { firstName: { contains: query } },
                    { phone: { contains: query } }
                ]
            },
            take: 8,
            include: {
                table: true,
                invitation: true
            }
        }));
        res.json(guests.map(guest => ({
            id: guest.id,
            fullName: guest.fullName,
            status: guest.status,
            phone: guest.phone,
            table: guest.table ? { id: guest.table.id, label: guest.table.label } : null,
            invitation: guest.invitation
                ? {
                    id: guest.invitation.id,
                    token: guest.invitation.token,
                    checkedInAt: guest.invitation.checkedInAt
                }
                : null
        })));
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recherche." });
    }
});
exports.eventsRouter.post("/checkin/scan", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const authReq = req;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const token = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.token) !== null && _b !== void 0 ? _b : "").trim();
        const action = String((_d = (_c = req.body) === null || _c === void 0 ? void 0 : _c.action) !== null && _d !== void 0 ? _d : "IN").toUpperCase();
        if (!isValidToken(token)) {
            return res.status(400).json({ message: "Token invalide." });
        }
        if (action !== "IN" && action !== "OUT") {
            return res.status(400).json({ message: "Action invalide." });
        }
        const invitation = await prisma_1.prisma.guestInvitation.findUnique({
            where: { token },
            include: {
                guest: {
                    include: {
                        event: true,
                        table: true
                    }
                }
            }
        });
        if (!invitation) {
            return res.status(404).json({ message: "Invitation introuvable." });
        }
        const ownership = await ensureEventAccess(invitation.guest.eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const alreadyCheckedIn = Boolean(invitation.checkedInAt);
        const isCheckIn = action === "IN";
        if (isCheckIn && alreadyCheckedIn) {
            const updated = await prisma_1.prisma.guestInvitation.update({
                where: { id: invitation.id },
                data: {
                    checkInCount: { increment: 1 }
                }
            });
            return res.json({
                ok: true,
                alreadyCheckedIn: true,
                checkedInAt: updated.checkedInAt,
                checkInCount: updated.checkInCount,
                guest: {
                    id: invitation.guest.id,
                    fullName: invitation.guest.fullName,
                    status: invitation.guest.status,
                    plusOneCount: invitation.guest.plusOneCount,
                    table: invitation.guest.table ? { id: invitation.guest.table.id, label: invitation.guest.table.label } : null
                },
                event: {
                    id: invitation.guest.event.id,
                    name: invitation.guest.event.name,
                    dateTime: invitation.guest.event.dateTime
                }
            });
        }
        const updated = await prisma_1.prisma.guestInvitation.update({
            where: { id: invitation.id },
            data: {
                checkedInAt: isCheckIn ? new Date() : null,
                checkInCount: { increment: 1 }
            }
        });
        return res.json({
            ok: true,
            alreadyCheckedIn,
            checkedInAt: updated.checkedInAt,
            checkInCount: updated.checkInCount,
            guest: {
                id: invitation.guest.id,
                fullName: invitation.guest.fullName,
                status: invitation.guest.status,
                plusOneCount: invitation.guest.plusOneCount,
                table: invitation.guest.table ? { id: invitation.guest.table.id, label: invitation.guest.table.label } : null
            },
            event: {
                id: invitation.guest.event.id,
                name: invitation.guest.event.name,
                dateTime: invitation.guest.event.dateTime
            }
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors du scan." });
    }
});
// Liste des choix de boissons avec les invites
exports.eventsRouter.get("/:id/drinks/choices", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const choices = await prisma_1.prisma.guestDrinkChoice.findMany({
            where: {
                guest: { eventId }
            },
            include: {
                guest: true,
                drinkOption: true
            },
            orderBy: {
                guest: { createdAt: "asc" }
            }
        });
        const payload = choices.map(choice => ({
            id: choice.id,
            guestId: choice.guestId,
            guestName: composeGuestFullName({
                guestType: choice.guest.guestType,
                lastName: choice.guest.lastName,
                middleName: choice.guest.middleName,
                firstName: choice.guest.firstName,
                fallback: choice.guest.fullName
            }),
            drinkOptionId: choice.drinkOptionId,
            drinkName: choice.drinkOption.name,
            category: choice.drinkOption.category,
            quantity: choice.quantity
        }));
        return res.json(payload);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation des choix boissons." });
    }
});
// Mise a jour d'une table (label/capacite)
exports.eventsRouter.patch("/:id/tables/:tableId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const tableId = parseIdParam(req.params.tableId);
        if (!eventId || !tableId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const { label, capacity, location, positionX, positionY } = req.body;
        const table = await prisma_1.prisma.table.findUnique({
            where: { id: tableId },
            include: { _count: { select: { guests: true } } }
        });
        if (!table || table.eventId !== eventId) {
            return res.status(404).json({ message: "Table introuvable." });
        }
        const nextCapacity = capacity != null ? toNonNegativeInt(capacity, table.capacity) : table.capacity;
        if (nextCapacity > 0 && table._count.guests > nextCapacity) {
            return res.status(400).json({
                message: "Capacite trop faible: il y a deja plus d'invites a cette table."
            });
        }
        const updated = await prisma_1.prisma.table.update({
            where: { id: tableId },
            data: {
                label: typeof label === "string" ? label.trim().slice(0, 60) : undefined,
                capacity: nextCapacity,
                location: typeof location === "string" || location === null ? cleanOptionalText(location, 160) : undefined,
                positionX: typeof positionX === "number" ? positionX : undefined,
                positionY: typeof positionY === "number" ? positionY : undefined
            }
        });
        return res.json(updated);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la mise a jour de la table." });
    }
});
// Suppression d'une table (si vide)
exports.eventsRouter.delete("/:id/tables/:tableId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const tableId = parseIdParam(req.params.tableId);
        if (!eventId || !tableId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const table = await prisma_1.prisma.table.findUnique({
            where: { id: tableId },
            include: { _count: { select: { guests: true } } }
        });
        if (!table || table.eventId !== eventId) {
            return res.status(404).json({ message: "Table introuvable." });
        }
        if (table._count.guests > 0) {
            return res.status(400).json({ message: "Table non vide: retirez les invites d'abord." });
        }
        await prisma_1.prisma.table.delete({ where: { id: tableId } });
        return res.status(204).send();
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression de la table." });
    }
});
// Liste des tables d'un evenement (avec invites)
exports.eventsRouter.get("/:id/tables", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { activeTableLayoutId: true }
        });
        const tables = await prisma_1.prisma.table.findMany({
            where: { eventId },
            include: {
                guests: true
            },
            orderBy: { id: "asc" }
        });
        let positionsMap = new Map();
        if (event === null || event === void 0 ? void 0 : event.activeTableLayoutId) {
            const positions = await prisma_1.prisma.tableLayoutPosition.findMany({
                where: { layoutId: event.activeTableLayoutId }
            });
            positionsMap = new Map(positions.map(pos => [pos.tableId, { positionX: pos.positionX, positionY: pos.positionY }]));
        }
        res.json(tables.map(table => {
            var _a, _b, _c, _d;
            const position = positionsMap.get(table.id);
            return {
                ...table,
                positionX: (_b = (_a = position === null || position === void 0 ? void 0 : position.positionX) !== null && _a !== void 0 ? _a : table.positionX) !== null && _b !== void 0 ? _b : null,
                positionY: (_d = (_c = position === null || position === void 0 ? void 0 : position.positionY) !== null && _c !== void 0 ? _c : table.positionY) !== null && _d !== void 0 ? _d : null
            };
        }));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation des tables." });
    }
});
// Plans de salle (layouts)
exports.eventsRouter.get("/:id/table-layouts", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { activeTableLayoutId: true }
        });
        const layouts = await prisma_1.prisma.tableLayout.findMany({
            where: { eventId },
            orderBy: { createdAt: "asc" }
        });
        res.json({ activeLayoutId: (_a = event === null || event === void 0 ? void 0 : event.activeTableLayoutId) !== null && _a !== void 0 ? _a : null, layouts });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation des plans." });
    }
});
exports.eventsRouter.post("/:id/table-layouts", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const { name } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.create({
            data: {
                name: String(name !== null && name !== void 0 ? name : "Plan").trim().slice(0, 80) || "Plan",
                eventId
            }
        });
        await prisma_1.prisma.event.update({
            where: { id: eventId },
            data: { activeTableLayoutId: layout.id }
        });
        res.status(201).json(layout);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation du plan." });
    }
});
exports.eventsRouter.post("/:id/table-layouts/:layoutId/duplicate", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const layoutId = parseIdParam(req.params.layoutId);
        if (!eventId || !layoutId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.findUnique({ where: { id: layoutId } });
        if (!layout || layout.eventId !== eventId) {
            return res.status(404).json({ message: "Plan introuvable." });
        }
        const existingNames = await prisma_1.prisma.tableLayout.findMany({
            where: { eventId },
            select: { name: true }
        });
        const baseName = `${layout.name} (copie)`;
        let name = baseName;
        let idx = 2;
        while (existingNames.some(item => item.name === name)) {
            name = `${baseName} ${idx}`;
            idx += 1;
        }
        const cloned = await prisma_1.prisma.tableLayout.create({
            data: {
                name,
                eventId
            }
        });
        const positions = await prisma_1.prisma.tableLayoutPosition.findMany({
            where: { layoutId }
        });
        if (positions.length > 0) {
            await prisma_1.prisma.tableLayoutPosition.createMany({
                data: positions.map(pos => ({
                    layoutId: cloned.id,
                    tableId: pos.tableId,
                    positionX: pos.positionX,
                    positionY: pos.positionY
                }))
            });
        }
        res.status(201).json(cloned);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la duplication du plan." });
    }
});
exports.eventsRouter.patch("/:id/table-layouts/:layoutId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const layoutId = parseIdParam(req.params.layoutId);
        if (!eventId || !layoutId)
            return res.status(400).json({ message: "Id invalide." });
        const { name } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.findUnique({ where: { id: layoutId } });
        if (!layout || layout.eventId !== eventId) {
            return res.status(404).json({ message: "Plan introuvable." });
        }
        const trimmed = String(name !== null && name !== void 0 ? name : "").trim().slice(0, 80);
        if (!trimmed) {
            return res.status(400).json({ message: "Nom invalide." });
        }
        const updated = await prisma_1.prisma.tableLayout.update({
            where: { id: layoutId },
            data: { name: trimmed }
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors du renommage du plan." });
    }
});
exports.eventsRouter.delete("/:id/table-layouts/:layoutId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const layoutId = parseIdParam(req.params.layoutId);
        if (!eventId || !layoutId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.findUnique({ where: { id: layoutId } });
        if (!layout || layout.eventId !== eventId) {
            return res.status(404).json({ message: "Plan introuvable." });
        }
        const [event, totalLayouts] = await Promise.all([
            prisma_1.prisma.event.findUnique({
                where: { id: eventId },
                select: { activeTableLayoutId: true }
            }),
            prisma_1.prisma.tableLayout.count({ where: { eventId } })
        ]);
        if ((event === null || event === void 0 ? void 0 : event.activeTableLayoutId) === layoutId) {
            return res.status(400).json({ message: "Impossible de supprimer le plan actif." });
        }
        if (totalLayouts <= 1) {
            return res.status(400).json({ message: "Impossible de supprimer le dernier plan." });
        }
        await prisma_1.prisma.tableLayoutPosition.deleteMany({ where: { layoutId } });
        await prisma_1.prisma.tableLayout.delete({ where: { id: layoutId } });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la suppression du plan." });
    }
});
exports.eventsRouter.patch("/:id/table-layouts/:layoutId/select", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const layoutId = parseIdParam(req.params.layoutId);
        if (!eventId || !layoutId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.findUnique({ where: { id: layoutId } });
        if (!layout || layout.eventId !== eventId) {
            return res.status(404).json({ message: "Plan introuvable." });
        }
        await prisma_1.prisma.event.update({
            where: { id: eventId },
            data: { activeTableLayoutId: layoutId }
        });
        res.json({ ok: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la selection du plan." });
    }
});
exports.eventsRouter.patch("/:id/table-layouts/:layoutId/positions", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const layoutId = parseIdParam(req.params.layoutId);
        if (!eventId || !layoutId)
            return res.status(400).json({ message: "Id invalide." });
        const { tableId, positionX, positionY } = req.body;
        if (!tableId || typeof positionX !== "number" || typeof positionY !== "number") {
            return res.status(400).json({ message: "Positions invalides." });
        }
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const layout = await prisma_1.prisma.tableLayout.findUnique({ where: { id: layoutId } });
        if (!layout || layout.eventId !== eventId) {
            return res.status(404).json({ message: "Plan introuvable." });
        }
        const table = await prisma_1.prisma.table.findUnique({ where: { id: tableId } });
        if (!table || table.eventId !== eventId) {
            return res.status(404).json({ message: "Table introuvable." });
        }
        const pos = await prisma_1.prisma.tableLayoutPosition.upsert({
            where: { layoutId_tableId: { layoutId, tableId } },
            update: { positionX, positionY },
            create: { layoutId, tableId, positionX, positionY }
        });
        res.json(pos);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la sauvegarde du plan." });
    }
});
// Repartition automatique des invites sans table
exports.eventsRouter.post("/:id/tables/auto-assign", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { seatingMode: true }
        });
        if ((event === null || event === void 0 ? void 0 : event.seatingMode) === "NONE") {
            return res.status(400).json({ message: "Mode sans tables/sections: repartition impossible." });
        }
        const tables = await prisma_1.prisma.table.findMany({
            where: { eventId },
            include: { _count: { select: { guests: true } } },
            orderBy: { id: "asc" }
        });
        const guests = await prisma_1.prisma.guest.findMany({
            where: {
                eventId,
                tableId: null,
                status: { not: "CANCELED" }
            },
            orderBy: { createdAt: "asc" }
        });
        const tableSlots = tables.map(t => ({
            id: t.id,
            capacity: t.capacity,
            used: t._count.guests
        }));
        let assigned = 0;
        const updates = [];
        for (const guest of guests) {
            const target = tableSlots.find(t => t.capacity === 0 || t.used < t.capacity);
            if (!target)
                break;
            updates.push(prisma_1.prisma.guest.update({
                where: { id: guest.id },
                data: { tableId: target.id }
            }));
            target.used += 1;
            assigned += 1;
        }
        if (updates.length > 0) {
            await prisma_1.prisma.$transaction(updates);
        }
        return res.json({
            assigned,
            remaining: guests.length - assigned
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la repartition automatique." });
    }
});
// Recuperer le chat de l'evenement (organisateur)
exports.eventsRouter.get("/:id/chat", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const guestId = parseIdParam(String((_a = req.query.guestId) !== null && _a !== void 0 ? _a : ""));
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const messages = await prisma_1.prisma.eventChatMessage.findMany({
            where: guestId ? { eventId, guestId } : { eventId },
            include: { guest: true },
            orderBy: { createdAt: "asc" },
            take: 300
        });
        return res.json(messages);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la recuperation du chat." });
    }
});
// Envoyer un message dans le chat (organisateur)
exports.eventsRouter.post("/:id/chat", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const message = cleanChatMessage((_a = req.body) === null || _a === void 0 ? void 0 : _a.message);
        const guestId = parseIdParam(String((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.guestId) !== null && _c !== void 0 ? _c : ""));
        if (!message)
            return res.status(400).json({ message: "Message vide." });
        if (!guestId)
            return res.status(400).json({ message: "Invite manquant." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const guest = await prisma_1.prisma.guest.findUnique({
            where: { id: guestId },
            select: { id: true, eventId: true, fullName: true }
        });
        if (!guest || guest.eventId !== eventId) {
            return res.status(404).json({ message: "Invite introuvable." });
        }
        const organizer = await prisma_1.prisma.organizer.findUnique({
            where: { id: organizerId },
            select: { name: true, email: true }
        });
        const created = await prisma_1.prisma.eventChatMessage.create({
            data: {
                eventId,
                guestId,
                senderType: "HOST",
                senderName: (organizer === null || organizer === void 0 ? void 0 : organizer.name) || (organizer === null || organizer === void 0 ? void 0 : organizer.email) || "Organisateur",
                message
            }
        });
        return res.status(201).json(created);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'envoi du message." });
    }
});
// Statistiques globales de l'evenement
exports.eventsRouter.get("/:id/stats", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const [totalGuests, confirmed, canceled, tables, drinkChoices, invitationsSent] = await Promise.all([
            prisma_1.prisma.guest.count({ where: { eventId } }),
            prisma_1.prisma.guest.count({
                where: { eventId, status: "CONFIRMED" }
            }),
            prisma_1.prisma.guest.count({
                where: { eventId, status: "CANCELED" }
            }),
            prisma_1.prisma.table.findMany({
                where: { eventId },
                include: { guests: true }
            }),
            prisma_1.prisma.guestDrinkChoice.groupBy({
                by: ["drinkOptionId"],
                where: {
                    guest: {
                        eventId
                    }
                },
                _sum: { quantity: true }
            }),
            prisma_1.prisma.guestInvitation.count({
                where: {
                    sentAt: { not: null },
                    guest: { eventId }
                }
            })
        ]);
        const pending = totalGuests - confirmed - canceled;
        const tableStats = tables.map(t => ({
            id: t.id,
            label: t.label,
            capacity: t.capacity,
            guestCount: t.guests.length
        }));
        const drinks = await prisma_1.prisma.drinkOption.findMany({
            where: { eventId }
        });
        const drinkStats = drinks.map(d => {
            var _a;
            const row = drinkChoices.find(rc => rc.drinkOptionId === d.id);
            return {
                id: d.id,
                name: d.name,
                category: d.category,
                totalQuantity: (_a = row === null || row === void 0 ? void 0 : row._sum.quantity) !== null && _a !== void 0 ? _a : 0
            };
        });
        res.json({
            guests: {
                total: totalGuests,
                confirmed,
                canceled,
                pending
            },
            invitations: {
                total: totalGuests,
                sent: invitationsSent
            },
            tables: tableStats,
            drinks: drinkStats
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
    }
});
// Liste des messages du livre d'or
exports.eventsRouter.get("/:id/guestbook", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const visibleOnly = typeof req.query.visible === "string" &&
            ["1", "true", "yes"].includes(req.query.visible.toLowerCase());
        const limit = toNonNegativeInt(req.query.limit, 0);
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const messages = await prisma_1.prisma.guestBookMessage.findMany({
            where: visibleOnly ? { eventId, isHidden: false } : { eventId },
            include: { guest: true },
            orderBy: { createdAt: "desc" },
            take: limit > 0 ? limit : undefined
        });
        res.json(messages);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation du livre d'or." });
    }
});
// Marquer les messages d'un invite comme lus (organisateur)
exports.eventsRouter.patch("/:id/chat/read", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const guestId = parseIdParam(String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.guestId) !== null && _b !== void 0 ? _b : ""));
        if (!guestId)
            return res.status(400).json({ message: "Invite manquant." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        await prisma_1.prisma.eventChatMessage.updateMany({
            where: {
                eventId,
                guestId,
                senderType: "GUEST",
                readAt: null
            },
            data: {
                readAt: new Date()
            }
        });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour du statut lu." });
    }
});
// Reponses rapides (organisateur)
exports.eventsRouter.get("/:id/quick-replies", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const replies = await prisma_1.prisma.eventQuickReply.findMany({
            where: { eventId },
            orderBy: { createdAt: "asc" }
        });
        res.json(replies);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors du chargement des reponses rapides." });
    }
});
exports.eventsRouter.post("/:id/quick-replies", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const text = cleanChatMessage((_a = req.body) === null || _a === void 0 ? void 0 : _a.text);
        if (!text)
            return res.status(400).json({ message: "Texte vide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const created = await prisma_1.prisma.eventQuickReply.create({
            data: {
                eventId,
                text
            }
        });
        res.status(201).json(created);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation." });
    }
});
exports.eventsRouter.delete("/:id/quick-replies/:replyId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const replyId = parseIdParam(req.params.replyId);
        if (!eventId || !replyId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const existing = await prisma_1.prisma.eventQuickReply.findUnique({ where: { id: replyId } });
        if (!existing || existing.eventId !== eventId) {
            return res.status(404).json({ message: "Reponse introuvable." });
        }
        await prisma_1.prisma.eventQuickReply.delete({ where: { id: replyId } });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la suppression." });
    }
});
// Parametres du livre d'or (moderation)
exports.eventsRouter.patch("/:id/guestbook/settings", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const { guestbookRequiresApproval } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const updated = await prisma_1.prisma.event.update({
            where: { id: eventId },
            data: { guestbookRequiresApproval: Boolean(guestbookRequiresApproval) }
        });
        res.json({ guestbookRequiresApproval: updated.guestbookRequiresApproval });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour des parametres." });
    }
});
// Masquer/afficher un message du livre d'or
exports.eventsRouter.patch("/:id/guestbook/:messageId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const messageId = parseIdParam(req.params.messageId);
        if (!eventId || !messageId)
            return res.status(400).json({ message: "Id invalide." });
        const { isHidden } = req.body;
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const message = await prisma_1.prisma.guestBookMessage.findUnique({ where: { id: messageId } });
        if (!message || message.eventId !== eventId) {
            return res.status(404).json({ message: "Message introuvable." });
        }
        const updated = await prisma_1.prisma.guestBookMessage.update({
            where: { id: messageId },
            data: { isHidden: Boolean(isHidden) }
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour du message." });
    }
});
// Suppression d'un message du livre d'or
exports.eventsRouter.delete("/:id/guestbook/:messageId", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        const messageId = parseIdParam(req.params.messageId);
        if (!eventId || !messageId)
            return res.status(400).json({ message: "Id invalide." });
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const message = await prisma_1.prisma.guestBookMessage.findUnique({ where: { id: messageId } });
        if (!message || message.eventId !== eventId) {
            return res.status(404).json({ message: "Message introuvable." });
        }
        await prisma_1.prisma.guestBookMessage.delete({ where: { id: messageId } });
        res.status(204).send();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la suppression du message." });
    }
});
// Export du livre d'or au format PDF (protege)
exports.eventsRouter.get("/:id/guestbook/pdf", auth_1.authMiddleware, async (req, res) => {
    try {
        const authReq = req;
        const eventId = parseIdParam(req.params.id);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        const visibleOnly = typeof req.query.visible === "string" &&
            ["1", "true", "yes"].includes(req.query.visible.toLowerCase());
        const organizerId = getOrganizerId(authReq);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await ensureEventAccess(eventId, organizerId);
        if ("error" in ownership) {
            return res.status(ownership.error.code).json({ message: ownership.error.message });
        }
        const messageWhere = visibleOnly ? { isHidden: false } : {};
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            include: {
                messages: {
                    where: messageWhere,
                    include: {
                        guest: true
                    },
                    orderBy: { createdAt: "asc" }
                }
            }
        });
        if (!event) {
            return res.status(404).json({ message: "Evenement introuvable." });
        }
        const doc = new pdfkit_1.default({ size: "A4", margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="livre-dor-event-${eventId}.pdf"`);
        doc.pipe(res);
        const font = registerPdfFonts(doc);
        doc.font(font.bold).fontSize(20).text(`Livre d'or`, { align: "left" });
        doc.moveDown(0.2);
        doc.font(font.regular).fontSize(12).text(`${event.name}`, { align: "left" });
        doc.moveDown(0.5);
        doc
            .font(font.regular)
            .fontSize(10)
            .fillColor("#666666")
            .text(`Date : ${event.dateTime.toISOString()}`);
        doc.text(`Lieu : ${event.location}`);
        doc.fillColor("#000000");
        doc.moveDown();
        if (event.messages.length === 0) {
            doc.font(font.regular).fontSize(12).text("Aucun message pour le moment.");
        }
        else {
            event.messages.forEach(message => {
                var _a, _b;
                doc.moveDown(0.6);
                doc.font(font.bold).fontSize(11).text((_b = (_a = message.guest) === null || _a === void 0 ? void 0 : _a.fullName) !== null && _b !== void 0 ? _b : "Invite anonyme");
                doc
                    .font(font.italic)
                    .fontSize(9)
                    .fillColor("#777777")
                    .text(new Date(message.createdAt).toLocaleString("fr-FR"));
                doc.fillColor("#000000");
                doc.moveDown(0.3);
                doc
                    .font(font.regular)
                    .fontSize(10)
                    .text(message.message, { indent: 8, lineGap: 2 });
                doc.moveDown(0.6);
                doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor("#E0E0E0").stroke();
            });
        }
        doc.end();
    }
    catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Erreur lors de la generation du PDF du livre d'or." });
        }
    }
});
