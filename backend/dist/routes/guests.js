"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestsRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const crypto_1 = __importDefault(require("crypto"));
const auth_1 = require("../middleware/auth");
exports.guestsRouter = (0, express_1.Router)();
function buildInvitationUrl(token) {
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    return `${appUrl.replace(/\/+$/, "")}/invitation/${token}`;
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
async function organizerOwnsEvent(organizerId, eventId) {
    const event = await prisma_1.prisma.event.findUnique({
        where: { id: eventId },
        select: { organizerId: true, seatingMode: true }
    });
    if (!event)
        return { ok: false, code: 404, message: "Evenement introuvable." };
    if (event.organizerId !== organizerId) {
        const coHost = await prisma_1.prisma.eventCoOrganizer.findFirst({
            where: {
                eventId,
                organizerId
            },
            select: { id: true }
        });
        if (!coHost) {
            return { ok: false, code: 403, message: "Acces refuse a cet evenement." };
        }
    }
    return { ok: true, seatingMode: event.seatingMode };
}
function parseId(raw) {
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : null;
}
function toPositiveInt(raw, fallback) {
    const value = Number(raw);
    if (!Number.isFinite(value))
        return fallback;
    const rounded = Math.floor(value);
    return rounded > 0 ? rounded : fallback;
}
function renderReminderMessage(template, vars) {
    return template
        .replace(/\{name\}/g, vars.name)
        .replace(/\{event\}/g, vars.event)
        .replace(/\{date\}/g, vars.date)
        .replace(/\{link\}/g, vars.link);
}
// Ajout d'un invite a un evenement
exports.guestsRouter.post("/", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const { eventId, lastName, middleName, firstName, sex, category, guestType, phone, email, plusOneCount, tableId } = req.body;
        const parsedEventId = parseId(eventId);
        const parsedTableId = tableId == null ? null : parseId(tableId);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        if (!parsedEventId) {
            return res.status(400).json({ message: "eventId est obligatoire." });
        }
        if (typeof lastName !== "string" || !lastName.trim()) {
            return res.status(400).json({ message: "Le nom est obligatoire." });
        }
        if (typeof middleName !== "string" || !middleName.trim()) {
            return res.status(400).json({ message: "Le postnom est obligatoire." });
        }
        if (typeof firstName !== "string" || !firstName.trim()) {
            return res.status(400).json({ message: "Le prenom est obligatoire." });
        }
        if (sex !== "M" && sex !== "F") {
            return res.status(400).json({ message: "Le sexe est obligatoire." });
        }
        if (typeof category !== "string" || !category.trim()) {
            return res.status(400).json({ message: "La categorie est obligatoire." });
        }
        if (!["COUPLE", "MR", "MME", "MLLE"].includes(guestType)) {
            return res.status(400).json({ message: "Le type d'invite est obligatoire." });
        }
        const parsedPlusOne = Number(plusOneCount);
        if (!Number.isFinite(parsedPlusOne) || parsedPlusOne < 1) {
            return res.status(400).json({ message: "Le nombre de personnes est obligatoire." });
        }
        const ownership = await organizerOwnsEvent(organizerId, parsedEventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        if (ownership.seatingMode === "NONE" && parsedTableId) {
            return res.status(400).json({ message: "Cet evenement est configure sans tables/sections." });
        }
        if (tableId != null && !parsedTableId) {
            return res.status(400).json({ message: "Table invalide." });
        }
        if (parsedTableId) {
            const table = await prisma_1.prisma.table.findUnique({
                where: { id: parsedTableId },
                include: { _count: { select: { guests: true } } }
            });
            if (!table || table.eventId !== parsedEventId) {
                return res.status(400).json({ message: "Table invalide pour cet evenement." });
            }
            if (table.capacity > 0 && table._count.guests >= table.capacity) {
                return res.status(400).json({ message: "La table selectionnee est pleine." });
            }
        }
        const guest = await prisma_1.prisma.guest.create({
            data: {
                fullName: composeGuestFullName({
                    guestType,
                    lastName,
                    middleName,
                    firstName
                }).slice(0, 180),
                lastName: lastName.trim().slice(0, 80),
                middleName: middleName.trim().slice(0, 80),
                firstName: firstName.trim().slice(0, 80),
                sex,
                category: category.trim().slice(0, 80),
                guestType,
                phone: typeof phone === "string" ? phone.trim().slice(0, 40) : null,
                email: typeof email === "string" ? email.trim().slice(0, 120) || null : null,
                plusOneCount: Math.max(1, Math.floor(parsedPlusOne)),
                eventId: parsedEventId,
                tableId: parsedTableId,
                invitation: {
                    create: {
                        token: crypto_1.default.randomBytes(16).toString("hex")
                    }
                }
            },
            include: {
                invitation: true
            }
        });
        res.status(201).json(guest);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la creation de l'invite." });
    }
});
// Liste des invites pour un evenement donne
exports.guestsRouter.get("/by-event/:eventId", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const eventId = parseId(req.params.eventId);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await organizerOwnsEvent(organizerId, eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        const guests = await prisma_1.prisma.guest.findMany({
            where: { eventId },
            include: {
                invitation: true,
                table: true
            },
            orderBy: { createdAt: "desc" }
        });
        res.json(guests.map(guest => {
            var _a, _b, _c, _d, _e, _f, _g;
            return ({
                ...guest,
                invitationUrl: ((_a = guest.invitation) === null || _a === void 0 ? void 0 : _a.token) ? buildInvitationUrl(guest.invitation.token) : null,
                invitationSentAt: (_c = (_b = guest.invitation) === null || _b === void 0 ? void 0 : _b.sentAt) !== null && _c !== void 0 ? _c : null,
                invitationOpenedAt: (_e = (_d = guest.invitation) === null || _d === void 0 ? void 0 : _d.openedAt) !== null && _e !== void 0 ? _e : null,
                invitationOpenCount: (_g = (_f = guest.invitation) === null || _f === void 0 ? void 0 : _f.openCount) !== null && _g !== void 0 ? _g : 0
            });
        }));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la recuperation des invites." });
    }
});
// Selection intelligente des rappels RSVP a envoyer
exports.guestsRouter.post("/events/:eventId/reminders/preview", auth_1.authMiddleware, async (req, res) => {
    var _a, _b;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const eventId = parseId(req.params.eventId);
        if (!eventId)
            return res.status(400).json({ message: "Id evenement invalide." });
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const ownership = await organizerOwnsEvent(organizerId, eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        const { pendingOnly = true, onlyNotOpened = false, minHoursSinceSent = 24, maxRecipients = 50, messageTemplate } = ((_b = req.body) !== null && _b !== void 0 ? _b : {});
        const event = await prisma_1.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true, name: true, dateTime: true }
        });
        if (!event) {
            return res.status(404).json({ message: "Evenement introuvable." });
        }
        const defaultTemplate = "Rappel RSVP - Bonjour {name}, merci de confirmer votre presence pour {event} ({date}). Lien: {link}";
        const template = typeof messageTemplate === "string" && messageTemplate.trim()
            ? messageTemplate.trim().slice(0, 600)
            : defaultTemplate;
        const hoursThreshold = toPositiveInt(minHoursSinceSent, 24);
        const maxTake = Math.min(toPositiveInt(maxRecipients, 50), 250);
        const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);
        const guests = await prisma_1.prisma.guest.findMany({
            where: {
                eventId,
                ...(pendingOnly ? { status: "PENDING" } : {})
            },
            include: {
                invitation: true
            },
            orderBy: {
                createdAt: "asc"
            }
        });
        const skipped = {
            missingInvitation: 0,
            neverSent: 0,
            sentTooRecently: 0,
            alreadyOpened: 0
        };
        const candidates = guests
            .map(guest => {
            const invitation = guest.invitation;
            if (!invitation) {
                skipped.missingInvitation += 1;
                return null;
            }
            if (!invitation.sentAt) {
                skipped.neverSent += 1;
                return null;
            }
            if (invitation.sentAt > thresholdDate) {
                skipped.sentTooRecently += 1;
                return null;
            }
            if (onlyNotOpened && invitation.openedAt) {
                skipped.alreadyOpened += 1;
                return null;
            }
            const invitationUrl = buildInvitationUrl(invitation.token);
            const renderedMessage = renderReminderMessage(template, {
                name: guest.fullName,
                event: event.name,
                date: event.dateTime.toLocaleString("fr-FR"),
                link: invitationUrl
            });
            return {
                guestId: guest.id,
                fullName: guest.fullName,
                phone: guest.phone,
                invitationUrl,
                message: renderedMessage,
                status: guest.status,
                invitationSentAt: invitation.sentAt,
                invitationOpenedAt: invitation.openedAt,
                invitationOpenCount: invitation.openCount,
                invitationRespondedAt: invitation.respondedAt
            };
        })
            .filter((item) => item !== null)
            .slice(0, maxTake);
        return res.json({
            event: {
                id: event.id,
                name: event.name,
                dateTime: event.dateTime
            },
            rules: {
                pendingOnly: Boolean(pendingOnly),
                onlyNotOpened: Boolean(onlyNotOpened),
                minHoursSinceSent: hoursThreshold,
                maxRecipients: maxTake
            },
            totalGuests: guests.length,
            candidatesCount: candidates.length,
            skipped,
            candidates
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la preparation des rappels RSVP." });
    }
});
// Marquer l'invitation d'un invite comme envoyee
exports.guestsRouter.post("/:id/invitation/sent", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id invite invalide." });
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const guest = await prisma_1.prisma.guest.findUnique({
            where: { id },
            include: { invitation: true }
        });
        if (!guest || !guest.invitation) {
            return res.status(404).json({ message: "Invitation introuvable." });
        }
        const ownership = await organizerOwnsEvent(organizerId, guest.eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        const invitation = await prisma_1.prisma.guestInvitation.update({
            where: { id: guest.invitation.id },
            data: { sentAt: new Date() }
        });
        return res.json({ sentAt: invitation.sentAt });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la mise a jour de l'historique d'envoi." });
    }
});
// Mise a jour de la table d'un invite
exports.guestsRouter.patch("/:id/table", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id invite invalide." });
        const { tableId } = req.body;
        const parsedTableId = tableId == null ? null : parseId(tableId);
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const guest = await prisma_1.prisma.guest.findUnique({
            where: { id },
            select: { id: true, eventId: true }
        });
        if (!guest) {
            return res.status(404).json({ message: "Invite introuvable." });
        }
        const ownership = await organizerOwnsEvent(organizerId, guest.eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        if (ownership.seatingMode === "NONE" && parsedTableId) {
            return res.status(400).json({ message: "Cet evenement est configure sans tables/sections." });
        }
        if (tableId != null && !parsedTableId) {
            return res.status(400).json({ message: "Table invalide." });
        }
        if (parsedTableId) {
            const table = await prisma_1.prisma.table.findUnique({
                where: { id: parsedTableId },
                include: { _count: { select: { guests: true } } }
            });
            if (!table || table.eventId !== guest.eventId) {
                return res.status(400).json({ message: "Table invalide pour cet evenement." });
            }
            if (table.capacity > 0 && table._count.guests >= table.capacity) {
                return res.status(400).json({ message: "La table selectionnee est pleine." });
            }
        }
        const updated = await prisma_1.prisma.guest.update({
            where: { id },
            data: {
                tableId: parsedTableId
            },
            include: {
                table: true
            }
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la mise a jour de la table." });
    }
});
// Mise a jour des informations d'un invite
exports.guestsRouter.patch("/:id", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id invite invalide." });
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const guest = await prisma_1.prisma.guest.findUnique({
            where: { id },
            select: { id: true, eventId: true }
        });
        if (!guest) {
            return res.status(404).json({ message: "Invite introuvable." });
        }
        const ownership = await organizerOwnsEvent(organizerId, guest.eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        const { lastName, middleName, firstName, sex, category, guestType, phone, email, status, plusOneCount, allergies, mealPreference } = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        const data = {};
        if (typeof lastName === "string") {
            data.lastName = lastName.trim().slice(0, 80) || null;
        }
        if (typeof middleName === "string") {
            data.middleName = middleName.trim().slice(0, 80) || null;
        }
        if (typeof firstName === "string") {
            data.firstName = firstName.trim().slice(0, 80) || null;
        }
        if (sex === "M" || sex === "F") {
            data.sex = sex;
        }
        if (typeof category === "string") {
            data.category = category.trim().slice(0, 80) || null;
        }
        if (guestType === "COUPLE" || guestType === "MR" || guestType === "MME" || guestType === "MLLE") {
            data.guestType = guestType;
        }
        if (typeof phone === "string") {
            data.phone = phone.trim().slice(0, 40) || null;
        }
        if (typeof email === "string") {
            data.email = email.trim().slice(0, 120) || null;
        }
        if (status === "PENDING" || status === "CONFIRMED" || status === "CANCELED") {
            data.status = status;
        }
        if (plusOneCount != null) {
            const parsed = Number(plusOneCount);
            if (Number.isFinite(parsed))
                data.plusOneCount = Math.max(1, Math.floor(parsed));
        }
        if (typeof allergies === "string") {
            data.allergies = allergies.trim().slice(0, 200) || null;
        }
        if (typeof mealPreference === "string") {
            data.mealPreference = mealPreference.trim().slice(0, 120) || null;
        }
        const hasNameChange = Object.prototype.hasOwnProperty.call(data, "lastName") ||
            Object.prototype.hasOwnProperty.call(data, "middleName") ||
            Object.prototype.hasOwnProperty.call(data, "firstName") ||
            Object.prototype.hasOwnProperty.call(data, "guestType");
        if (Object.keys(data).length === 0) {
            return res.status(400).json({ message: "Aucune donnee a mettre a jour." });
        }
        if (hasNameChange) {
            const current = await prisma_1.prisma.guest.findUnique({
                where: { id },
                select: { lastName: true, middleName: true, firstName: true, guestType: true, fullName: true }
            });
            data.fullName = composeGuestFullName({
                guestType: (_d = ((_c = data.guestType) !== null && _c !== void 0 ? _c : current === null || current === void 0 ? void 0 : current.guestType)) !== null && _d !== void 0 ? _d : null,
                lastName: (_f = ((_e = data.lastName) !== null && _e !== void 0 ? _e : current === null || current === void 0 ? void 0 : current.lastName)) !== null && _f !== void 0 ? _f : null,
                middleName: (_h = ((_g = data.middleName) !== null && _g !== void 0 ? _g : current === null || current === void 0 ? void 0 : current.middleName)) !== null && _h !== void 0 ? _h : null,
                firstName: (_k = ((_j = data.firstName) !== null && _j !== void 0 ? _j : current === null || current === void 0 ? void 0 : current.firstName)) !== null && _k !== void 0 ? _k : null,
                fallback: (_l = current === null || current === void 0 ? void 0 : current.fullName) !== null && _l !== void 0 ? _l : null
            }).slice(0, 180);
        }
        const updated = await prisma_1.prisma.guest.update({
            where: { id },
            data,
            include: {
                table: true,
                invitation: true
            }
        });
        return res.json({
            ...updated,
            invitationUrl: ((_m = updated.invitation) === null || _m === void 0 ? void 0 : _m.token) ? buildInvitationUrl(updated.invitation.token) : null,
            invitationSentAt: (_p = (_o = updated.invitation) === null || _o === void 0 ? void 0 : _o.sentAt) !== null && _p !== void 0 ? _p : null,
            invitationOpenedAt: (_r = (_q = updated.invitation) === null || _q === void 0 ? void 0 : _q.openedAt) !== null && _r !== void 0 ? _r : null,
            invitationOpenCount: (_t = (_s = updated.invitation) === null || _s === void 0 ? void 0 : _s.openCount) !== null && _t !== void 0 ? _t : 0
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la mise a jour de l'invite." });
    }
});
// Suppression d'un invite
exports.guestsRouter.delete("/:id", auth_1.authMiddleware, async (req, res) => {
    var _a;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        const id = parseId(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Id invite invalide." });
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const guest = await prisma_1.prisma.guest.findUnique({
            where: { id },
            select: { id: true, eventId: true }
        });
        if (!guest) {
            return res.status(404).json({ message: "Invite introuvable." });
        }
        const ownership = await organizerOwnsEvent(organizerId, guest.eventId);
        if (!ownership.ok) {
            return res.status(ownership.code).json({ message: ownership.message });
        }
        await prisma_1.prisma.guest.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de la suppression de l'invite." });
    }
});
