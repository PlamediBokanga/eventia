import { Router } from "express";
import { prisma } from "../prisma";
import crypto from "crypto";
import { authMiddleware } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";

export const guestsRouter = Router();

function buildInvitationUrl(token: string) {
  const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/+$/, "")}/invitation/${token}`;
}

function guestTypeLabel(guestType?: "COUPLE" | "MR" | "MME" | "MLLE" | null) {
  if (guestType === "COUPLE") return "Couple";
  if (guestType === "MR") return "Mr";
  if (guestType === "MME") return "Mme";
  if (guestType === "MLLE") return "Mlle";
  return "";
}

function composeGuestFullName(params: {
  guestType?: "COUPLE" | "MR" | "MME" | "MLLE" | null;
  lastName?: string | null;
  middleName?: string | null;
  firstName?: string | null;
  fallback?: string | null;
}) {
  const label = guestTypeLabel(params.guestType);
  const parts = [label, params.lastName, params.middleName, params.firstName]
    .map(value => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : params.fallback?.trim() || "Invite";
}

type OwnershipResult =
  | { ok: true; seatingMode: "TABLE" | "ZONE" | "NONE" }
  | { ok: false; code: number; message: string };

async function organizerOwnsEvent(organizerId: number, eventId: number): Promise<OwnershipResult> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, seatingMode: true }
  });

  if (!event) return { ok: false, code: 404, message: "Evenement introuvable." };
  if (event.organizerId !== organizerId) {
    const coHost = await prisma.eventCoOrganizer.findFirst({
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

function parseId(raw: unknown) {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function toPositiveInt(raw: unknown, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.floor(value);
  return rounded > 0 ? rounded : fallback;
}

function renderReminderMessage(
  template: string,
  vars: { name: string; event: string; date: string; link: string }
) {
  return template
    .replace(/\{name\}/g, vars.name)
    .replace(/\{event\}/g, vars.event)
    .replace(/\{date\}/g, vars.date)
    .replace(/\{link\}/g, vars.link);
}

async function resolveGuestLimit(organizerId: number, eventId: number) {
  const now = new Date();
  const subscription = await prisma.organizerSubscription.findFirst({
    where: {
      organizerId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: now }
    }
  });
  if (subscription) {
    if (subscription.planCode === "ENTERPRISE") return 99999;
    if (subscription.planCode === "AGENCY") return 500;
    if (subscription.planCode === "PRO_ORGANIZER") return 300;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { paidPlanCode: true }
  });
  if (event?.paidPlanCode === "PREMIUM") return 700;
  if (event?.paidPlanCode === "STANDARD") return 300;
  if (event?.paidPlanCode === "BASIC") return 100;
  return 100;
}

// Ajout d'un invite a un evenement
guestsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const {
      eventId,
      lastName,
      middleName,
      firstName,
      sex,
      category,
      guestType,
      phone,
      email,
      plusOneCount,
      tableId
    } = req.body;
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
      const table = await prisma.table.findUnique({
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

    const guestLimit = await resolveGuestLimit(organizerId, parsedEventId);
    const existingCount = await prisma.guest.count({ where: { eventId: parsedEventId } });
    if (existingCount + 1 > guestLimit) {
      return res.status(403).json({
        message: `Limite de ${guestLimit} invites atteinte pour votre plan.`
      });
    }

    const guest = await prisma.guest.create({
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
            token: crypto.randomBytes(16).toString("hex")
          }
        }
      },
      include: {
        invitation: true
      }
    });

    res.status(201).json(guest);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation de l'invite." });
  }
});

// Liste des invites pour un evenement donne
guestsRouter.get("/by-event/:eventId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const eventId = parseId(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await organizerOwnsEvent(organizerId, eventId);
    if (!ownership.ok) {
      return res.status(ownership.code).json({ message: ownership.message });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      include: {
        invitation: true,
        table: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(
      guests.map(guest => ({
        ...guest,
        invitationUrl: guest.invitation?.token ? buildInvitationUrl(guest.invitation.token) : null,
        invitationSentAt: guest.invitation?.sentAt ?? null,
        invitationOpenedAt: guest.invitation?.openedAt ?? null,
        invitationOpenCount: guest.invitation?.openCount ?? 0
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation des invites." });
  }
});

// Selection intelligente des rappels RSVP a envoyer
guestsRouter.post("/events/:eventId/reminders/preview", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const eventId = parseId(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await organizerOwnsEvent(organizerId, eventId);
    if (!ownership.ok) {
      return res.status(ownership.code).json({ message: ownership.message });
    }

    const {
      pendingOnly = true,
      onlyNotOpened = false,
      minHoursSinceSent = 24,
      maxRecipients = 50,
      messageTemplate
    } = (req.body ?? {}) as {
      pendingOnly?: boolean;
      onlyNotOpened?: boolean;
      minHoursSinceSent?: number;
      maxRecipients?: number;
      messageTemplate?: string;
    };

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, dateTime: true }
    });
    if (!event) {
      return res.status(404).json({ message: "Evenement introuvable." });
    }

    const defaultTemplate =
      "Rappel RSVP - Bonjour {name}, merci de confirmer votre presence pour {event} ({date}). Lien: {link}";
    const template =
      typeof messageTemplate === "string" && messageTemplate.trim()
        ? messageTemplate.trim().slice(0, 600)
        : defaultTemplate;
    const hoursThreshold = toPositiveInt(minHoursSinceSent, 24);
    const maxTake = Math.min(toPositiveInt(maxRecipients, 50), 250);
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const guests = await prisma.guest.findMany({
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
      .filter((item): item is NonNullable<typeof item> => item !== null)
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la preparation des rappels RSVP." });
  }
});

// Marquer l'invitation d'un invite comme envoyee
guestsRouter.post("/:id/invitation/sent", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Id invite invalide." });

    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const guest = await prisma.guest.findUnique({
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

    const invitation = await prisma.guestInvitation.update({
      where: { id: guest.invitation.id },
      data: { sentAt: new Date() }
    });

    return res.json({ sentAt: invitation.sentAt });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour de l'historique d'envoi." });
  }
});

// Mise a jour de la table d'un invite
guestsRouter.patch("/:id/table", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Id invite invalide." });
    const { tableId } = req.body as { tableId: number | null };
    const parsedTableId = tableId == null ? null : parseId(tableId);

    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const guest = await prisma.guest.findUnique({
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
      const table = await prisma.table.findUnique({
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

    const updated = await prisma.guest.update({
      where: { id },
      data: {
        tableId: parsedTableId
      },
      include: {
        table: true
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour de la table." });
  }
});

// Mise a jour des informations d'un invite
guestsRouter.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Id invite invalide." });

    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const guest = await prisma.guest.findUnique({
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

    const {
      lastName,
      middleName,
      firstName,
      sex,
      category,
      guestType,
      phone,
      email,
      status,
      plusOneCount,
      allergies,
      mealPreference
    } = req.body ?? {};

    const data: {
      fullName?: string;
      lastName?: string | null;
      middleName?: string | null;
      firstName?: string | null;
      sex?: "M" | "F";
      category?: string | null;
      guestType?: "COUPLE" | "MR" | "MME" | "MLLE";
      phone?: string | null;
      email?: string | null;
      status?: "PENDING" | "CONFIRMED" | "CANCELED";
      plusOneCount?: number;
      allergies?: string | null;
      mealPreference?: string | null;
    } = {};

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
      if (Number.isFinite(parsed)) data.plusOneCount = Math.max(1, Math.floor(parsed));
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
      const current = await prisma.guest.findUnique({
        where: { id },
        select: { lastName: true, middleName: true, firstName: true, guestType: true, fullName: true }
      });
      data.fullName = composeGuestFullName({
        guestType: (data.guestType ?? current?.guestType) ?? null,
        lastName: (data.lastName ?? current?.lastName) ?? null,
        middleName: (data.middleName ?? current?.middleName) ?? null,
        firstName: (data.firstName ?? current?.firstName) ?? null,
        fallback: current?.fullName ?? null
      }).slice(0, 180);
    }

    const updated = await prisma.guest.update({
      where: { id },
      data,
      include: {
        table: true,
        invitation: true
      }
    });

    return res.json({
      ...updated,
      invitationUrl: updated.invitation?.token ? buildInvitationUrl(updated.invitation.token) : null,
      invitationSentAt: updated.invitation?.sentAt ?? null,
      invitationOpenedAt: updated.invitation?.openedAt ?? null,
      invitationOpenCount: updated.invitation?.openCount ?? 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour de l'invite." });
  }
});

// Suppression d'un invite
guestsRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "Id invite invalide." });

    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const guest = await prisma.guest.findUnique({
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

    await prisma.guest.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression de l'invite." });
  }
});
