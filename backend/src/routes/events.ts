import { Router } from "express";
import { prisma } from "../prisma";
import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import type { AuthRequest } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

export const eventsRouter = Router();

function getOrganizerId(req: AuthRequest) {
  return req.user?.id;
}

function parseIdParam(rawId: string) {
  const value = Number(rawId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function isValidDate(value: unknown) {
  if (typeof value !== "string") return false;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms);
}

function toNonNegativeInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

function cleanOptionalText(value: unknown, maxLen: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLen);
}

function cleanOptionalHexColor(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  const normalized = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toUpperCase() : null;
}

function cleanOptionalThemePreset(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;
  const allowed = ["classic", "elegant", "vibrant", "minimal"];
  return allowed.includes(cleaned) ? cleaned : null;
}

function cleanOptionalFontFamily(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 80);
}

function cleanOptionalAnimationStyle(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;
  const allowed = ["none", "soft", "float"];
  return allowed.includes(cleaned) ? cleaned : null;
}

function buildCoOrganizerInviteUrl(token: string) {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/+$/, "")}/co-organizer/accept/${token}`;
}

function isValidToken(token: string) {
  return /^[a-f0-9]{32}$/i.test(token);
}

function cleanSeatingMode(value: unknown) {
  if (typeof value !== "string") return "TABLE";
  const cleaned = value.trim().toUpperCase();
  if (cleaned === "ZONE" || cleaned === "NONE") return cleaned;
  return "TABLE";
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

function cleanOptionalInvitationHtml(value: unknown, maxLen: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;

  let html = cleaned.slice(0, maxLen);
  html = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  html = html.replace(
    /<(\/?)(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|div)\b[^>]*>/gi,
    "<$1$2>"
  );

  html = html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    const hrefMatch = attrs.match(/href\s*=\s*("([^"]+)"|'([^']+)'|([^\s>]+))/i);
    const href = (hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || "").trim();
    const safeHref = /^(https?:|mailto:|tel:)/i.test(href) ? href : "#";
    return `<a href="${safeHref}" target="_blank" rel="noreferrer">`;
  });

  html = html.replace(/<\/a>/gi, "</a>");
  html = html.replace(/<(?!\/?(p|br|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|a|div)\b)[^>]*>/gi, "");
  html = html.replace(/&lt;\//gi, "");
  html = html.replace(/<\/(?!p|strong|b|em|i|u|ul|ol|li|h1|h2|h3|blockquote|a|div)\w+>/gi, "");
  html = html.replace(/<div>\s*<\/div>/gi, "");
  html = html.replace(/\s{3,}/g, " ");
  html = html.replace(/\n{3,}/g, "\n\n");

  return html;
}

function normalizeProgramItems(items: unknown) {
  if (!Array.isArray(items)) return null;
  const cleaned = items
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as { timeLabel?: unknown; title?: unknown; description?: unknown };
      const timeLabel = typeof raw.timeLabel === "string" ? raw.timeLabel.trim().slice(0, 20) : "";
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 120) : "";
      const description =
        typeof raw.description === "string" && raw.description.trim()
          ? raw.description.trim().slice(0, 240)
          : null;
      if (!timeLabel && !title) return null;
      return {
        timeLabel: timeLabel || "Heure",
        title: title || "Programme",
        description,
        order: index
      };
    })
    .filter(Boolean) as { timeLabel: string; title: string; description: string | null; order: number }[];

  if (cleaned.length === 0) return [];
  return cleaned.slice(0, 30);
}

function uploadBaseUrl(req: AuthRequest) {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  if (appUrl) return appUrl;
  return `${req.protocol}://${req.get("host")}`;
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

function cleanChatMessage(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1000);
}

async function convertWebpToJpg(buffer: Buffer): Promise<Buffer> {
  const converted = await sharp(buffer).jpeg({ quality: 88 }).toBuffer();
  return converted as Buffer;
}

function registerPdfFonts(doc: any) {
  const fallback = {
    regular: "Helvetica",
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique"
  };
  try {
    const winDir = process.env.WINDIR || "C:\\Windows";
    const fontDir = path.join(winDir, "Fonts");
    const regular = path.join(fontDir, "arial.ttf");
    const bold = path.join(fontDir, "arialbd.ttf");
    const italic = path.join(fontDir, "ariali.ttf");
    doc.registerFont("Eventia", regular);
    doc.registerFont("EventiaBold", bold);
    doc.registerFont("EventiaItalic", italic);
    return { regular: "Eventia", bold: "EventiaBold", italic: "EventiaItalic" };
  } catch {
    return fallback;
  }
}

async function ensureEventAccess(eventId: number, organizerId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true }
  });

  if (!event) {
    return { error: { code: 404, message: "Evenement introuvable." } as const };
  }

  if (event.organizerId === organizerId) {
    return { event, role: "OWNER" as const };
  }

  const coHost = await prisma.eventCoOrganizer.findFirst({
    where: {
      eventId,
      organizerId
    },
    select: { id: true }
  });
  if (!coHost) {
    return { error: { code: 403, message: "Acces refuse a cet evenement." } as const };
  }

  return { event, role: "CO_ORGANIZER" as const };
}

// Liste des evenements de l'organisateur connecte
eventsRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const organizerId = getOrganizerId(req as AuthRequest);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const events = await prisma.event.findMany({
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
    res.json(
      events.map(event => ({
        ...event,
        isOwner: event.organizerId === organizerId,
        coOrganizerCount: event.coOrganizers.length
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation des evenements." });
  }
});

// Creation d'un evenement
eventsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const {
      name,
      type,
      dateTime,
      location,
      address,
      details,
      program,
      programItems,
      invitationMessage,
      coverImageUrl,
      hostNames,
      seatingMode,
      logoUrl,
      themePreset,
      primaryColor,
      accentColor,
      fontFamily,
      animationStyle,
      tableCount,
      capacityPerTable
    } = req.body;

    const cleanedName = String(name).trim();
    const cleanedType = String(type).trim();
    const cleanedLocation = String(location).trim();

    if (!cleanedName || !cleanedType || !dateTime || !cleanedLocation) {
      return res.status(400).json({ message: "Champs obligatoires manquants." });
    }

    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    if (!isValidDate(dateTime)) return res.status(400).json({ message: "Date invalide." });

    const seatingModeFinal = cleanSeatingMode(seatingMode);
    const tableCountFinal = seatingModeFinal === "NONE" ? 0 : toNonNegativeInt(tableCount, 0);
    const capacityPerTableFinal = seatingModeFinal === "NONE" ? 0 : toNonNegativeInt(capacityPerTable, 0);
    const tableLabelPrefix = seatingModeFinal === "ZONE" ? "Zone" : "Table";

    const normalizedProgramItems = normalizeProgramItems(programItems);
    const event = await prisma.event.create({
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
        programItems:
          normalizedProgramItems
            ? {
                createMany: {
                  data: normalizedProgramItems
                }
              }
            : undefined,
        tables:
          tableCountFinal > 0
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation de l'evenement." });
  }
});

// Upload de photo de couverture pour une invitation
eventsRouter.post("/upload-cover", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
    if (!fileName || !dataUrl) {
      return res.status(400).json({ message: "Fichier image manquant." });
    }

    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Format image invalide. Utilisez PNG, JPG ou WEBP." });
    }
    let finalBuffer: Buffer = parsed.buffer as Buffer;
    let finalExt = parsed.ext;
    if (parsed.ext === "webp") {
      try {
        finalBuffer = await convertWebpToJpg(parsed.buffer);
        finalExt = "jpg";
      } catch (error) {
        console.error("WEBP conversion failed:", error);
        return res.status(400).json({ message: "Conversion WEBP impossible. Utilisez JPG ou PNG." });
      }
    }
    if (parsed.buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ message: "Image trop lourde (max 4MB)." });
    }

    const safeBase = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "cover";
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeBase}.${finalExt}`;
    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), finalBuffer);

    const url = `${uploadBaseUrl(authReq)}/uploads/${filename}`;
    return res.status(201).json({ url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'upload de la photo." });
  }
});

// Mise a jour d'un evenement
eventsRouter.put("/:id", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(id, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }
    const {
      name,
      type,
      dateTime,
      location,
      address,
      details,
      program,
      programItems,
      invitationMessage,
      coverImageUrl,
      hostNames,
      seatingMode,
      logoUrl,
      themePreset,
      primaryColor,
      accentColor,
      fontFamily,
      animationStyle,
      tableCount,
      capacityPerTable
    } = req.body as {
      name?: string;
      type?: string;
      dateTime?: string;
      location?: string;
      address?: string | null;
      details?: string | null;
      program?: string | null;
      programItems?: Array<{ timeLabel?: string; title?: string; description?: string | null }>;
      invitationMessage?: string | null;
      coverImageUrl?: string | null;
      hostNames?: string | null;
      seatingMode?: "TABLE" | "ZONE" | "NONE";
      logoUrl?: string | null;
      themePreset?: string | null;
      primaryColor?: string | null;
      accentColor?: string | null;
      fontFamily?: string | null;
      animationStyle?: string | null;
      tableCount?: number;
      capacityPerTable?: number;
    };

    const seatingModeFinal = seatingMode ? cleanSeatingMode(seatingMode) : undefined;
    const targetTableCount =
      seatingModeFinal === "NONE"
        ? 0
        : tableCount != null
          ? toNonNegativeInt(tableCount, 0)
          : undefined;
    const targetCapacityPerTable =
      seatingModeFinal === "NONE"
        ? 0
        : capacityPerTable != null
          ? toNonNegativeInt(capacityPerTable, 0)
          : undefined;
    if (typeof dateTime === "string" && dateTime && !isValidDate(dateTime)) {
      return res.status(400).json({ message: "Date invalide." });
    }
    const eventBeforeUpdate = await prisma.event.findUnique({
      where: { id },
      select: { capacityPerTable: true }
    });
    const effectiveCapacityPerTable =
      targetCapacityPerTable ?? eventBeforeUpdate?.capacityPerTable ?? 0;

    const existingTables = await prisma.table.findMany({
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
          message:
            "Impossible de reduire le nombre de tables: certaines tables a supprimer contiennent des invites."
        });
      }
    }

    const normalizedProgramItems = normalizeProgramItems(programItems);
    const updated = await prisma.$transaction(async tx => {
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
      } else if (targetTableCount != null && targetTableCount < existingTables.length) {
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
          dateTime:
            typeof dateTime === "string"
              ? isValidDate(dateTime)
                ? new Date(dateTime)
                : undefined
              : undefined,
          location: typeof location === "string" ? location.trim().slice(0, 180) : undefined,
          address: typeof address === "string" || address === null ? cleanOptionalText(address, 220) : undefined,
          details: typeof details === "string" || details === null ? cleanOptionalText(details, 1200) : undefined,
          program: typeof program === "string" || program === null ? cleanOptionalText(program, 2000) : undefined,
          invitationMessage:
            typeof invitationMessage === "string" || invitationMessage === null
              ? cleanOptionalInvitationHtml(invitationMessage, 4000)
              : undefined,
          coverImageUrl:
            typeof coverImageUrl === "string" || coverImageUrl === null
              ? cleanOptionalText(coverImageUrl, 500)
              : undefined,
          hostNames:
            typeof hostNames === "string" || hostNames === null
              ? cleanOptionalText(hostNames, 200)
              : undefined,
          seatingMode: seatingModeFinal,
          logoUrl:
            typeof logoUrl === "string" || logoUrl === null
              ? cleanOptionalText(logoUrl, 500)
              : undefined,
          themePreset:
            typeof themePreset === "string" || themePreset === null
              ? cleanOptionalThemePreset(themePreset)
              : undefined,
          primaryColor:
            typeof primaryColor === "string" || primaryColor === null
              ? cleanOptionalHexColor(primaryColor)
              : undefined,
          accentColor:
            typeof accentColor === "string" || accentColor === null
              ? cleanOptionalHexColor(accentColor)
              : undefined,
          fontFamily:
            typeof fontFamily === "string" || fontFamily === null
              ? cleanOptionalFontFamily(fontFamily)
              : undefined,
          animationStyle:
            typeof animationStyle === "string" || animationStyle === null
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour de l'evenement." });
  }
});

// Suppression d'un evenement
eventsRouter.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(id, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    await prisma.$transaction([
      prisma.guestDrinkChoice.deleteMany({
        where: {
          guest: {
            eventId: id
          }
        }
      }),
      prisma.guestBookMessage.deleteMany({
        where: { eventId: id }
      }),
      prisma.guestInvitation.deleteMany({
        where: {
          guest: {
            eventId: id
          }
        }
      }),
      prisma.guest.deleteMany({
        where: { eventId: id }
      }),
      prisma.table.deleteMany({
        where: { eventId: id }
      }),
      prisma.drinkOption.deleteMany({
        where: { eventId: id }
      }),
      prisma.eventMemory.deleteMany({
        where: { eventId: id }
      }),
      prisma.eventProgramItem.deleteMany({
        where: { eventId: id }
      }),
      prisma.event.delete({ where: { id } })
    ]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression de l'evenement." });
  }
});

// Detail d'un evenement (incluant tables et boissons)
eventsRouter.get("/:id", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const id = parseIdParam(req.params.id);
    if (!id) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(id, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation de l'evenement." });
  }
});

// Liste des co-organisateurs d'un evenement
eventsRouter.get("/:id/co-organizers", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
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
      owner: event?.organizer ?? null,
      canManage: ownership.role === "OWNER",
      coOrganizers: event?.coOrganizers ?? []
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation des co-organisateurs." });
  }
});

// Ajouter un co-organisateur par email
eventsRouter.post("/:id/co-organizers", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }
    if (ownership.role !== "OWNER") {
      return res.status(403).json({ message: "Seul le proprietaire peut ajouter des co-organisateurs." });
    }

    const emailRaw = String(req.body?.email ?? "").trim().toLowerCase();
    if (!emailRaw || !emailRaw.includes("@")) {
      return res.status(400).json({ message: "Email invalide." });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true }
    });
    if (!event) {
      return res.status(404).json({ message: "Evenement introuvable." });
    }

    const targetOrganizer = await prisma.organizer.findUnique({
      where: { email: emailRaw },
      select: { id: true, email: true, name: true }
    });
    if (!targetOrganizer) {
      return res.status(404).json({ message: "Aucun organisateur avec cet email." });
    }
    if (targetOrganizer.id === event.organizerId) {
      return res.status(400).json({ message: "Le proprietaire est deja organisateur principal." });
    }

    const existing = await prisma.eventCoOrganizer.findFirst({
      where: {
        eventId,
        organizerId: targetOrganizer.id
      },
      select: { id: true }
    });
    if (existing) {
      return res.status(409).json({ message: "Cet organisateur est deja co-organisateur." });
    }

    const created = await prisma.eventCoOrganizer.create({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'ajout du co-organisateur." });
  }
});

// Creer une invitation de co-organisateur (email)
eventsRouter.post("/:id/co-organizers/invite", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }
    if (ownership.role !== "OWNER") {
      return res.status(403).json({ message: "Seul le proprietaire peut inviter des co-organisateurs." });
    }

    const emailRaw = String(req.body?.email ?? "").trim().toLowerCase();
    if (!emailRaw || !emailRaw.includes("@")) {
      return res.status(400).json({ message: "Email invalide." });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { organizerId: true }
    });
    if (!event) {
      return res.status(404).json({ message: "Evenement introuvable." });
    }

    const existingInvite = await prisma.eventCoOrganizerInvite.findFirst({
      where: { eventId, email: emailRaw }
    });
    if (existingInvite && !existingInvite.acceptedAt) {
      return res.status(409).json({
        message: "Une invitation est deja en attente pour cet email.",
        inviteLink: buildCoOrganizerInviteUrl(existingInvite.token)
      });
    }

    const targetOrganizer = await prisma.organizer.findUnique({
      where: { email: emailRaw },
      select: { id: true }
    });
    if (targetOrganizer) {
      if (targetOrganizer.id === event.organizerId) {
        return res.status(400).json({ message: "Le proprietaire est deja organisateur principal." });
      }
      const existing = await prisma.eventCoOrganizer.findFirst({
        where: { eventId, organizerId: targetOrganizer.id },
        select: { id: true }
      });
      if (existing) {
        return res.status(409).json({ message: "Cet organisateur est deja co-organisateur." });
      }
      const created = await prisma.eventCoOrganizer.create({
        data: {
          eventId,
          organizerId: targetOrganizer.id,
          invitedById: organizerId
        }
      });
      return res.status(201).json({ mode: "direct", coOrganizer: created });
    }

    const token = crypto.randomBytes(16).toString("hex");
    const invite = await prisma.eventCoOrganizerInvite.create({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'invitation du co-organisateur." });
  }
});

// Liste des invitations en attente
eventsRouter.get("/:id/co-organizers/invites", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const invites = await prisma.eventCoOrganizerInvite.findMany({
      where: { eventId, acceptedAt: null },
      orderBy: { createdAt: "desc" }
    });

    return res.json(
      invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        createdAt: invite.createdAt,
        inviteLink: buildCoOrganizerInviteUrl(invite.token)
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation des invitations." });
  }
});

// Retirer une invitation
eventsRouter.delete("/:id/co-organizers/invites/:inviteId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const inviteId = parseIdParam(req.params.inviteId);
    if (!eventId || !inviteId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }
    if (ownership.role !== "OWNER") {
      return res.status(403).json({ message: "Seul le proprietaire peut retirer une invitation." });
    }

    const invite = await prisma.eventCoOrganizerInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.eventId !== eventId) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }
    await prisma.eventCoOrganizerInvite.delete({ where: { id: inviteId } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression de l'invitation." });
  }
});

// Accepter une invitation de co-organisateur (utilisateur connecte)
eventsRouter.post("/co-organizers/accept/:token", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const token = String(req.params.token ?? "").trim();
    if (!token) return res.status(400).json({ message: "Token invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const invite = await prisma.eventCoOrganizerInvite.findUnique({
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

    const existing = await prisma.eventCoOrganizer.findFirst({
      where: { eventId: invite.eventId, organizerId }
    });
    if (!existing) {
      await prisma.eventCoOrganizer.create({
        data: {
          eventId: invite.eventId,
          organizerId,
          invitedById: invite.invitedById
        }
      });
    }

    await prisma.eventCoOrganizerInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedById: organizerId }
    });

    return res.json({ success: true, eventId: invite.eventId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'acceptation." });
  }
});

// Retirer un co-organisateur
eventsRouter.delete("/:id/co-organizers/:coOrganizerId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const coOrganizerId = parseIdParam(req.params.coOrganizerId);
    if (!eventId || !coOrganizerId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }
    if (ownership.role !== "OWNER") {
      return res.status(403).json({ message: "Seul le proprietaire peut retirer un co-organisateur." });
    }

    const row = await prisma.eventCoOrganizer.findFirst({
      where: {
        eventId,
        organizerId: coOrganizerId
      },
      select: { id: true }
    });
    if (!row) {
      return res.status(404).json({ message: "Co-organisateur introuvable." });
    }

    await prisma.eventCoOrganizer.delete({ where: { id: row.id } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression du co-organisateur." });
  }
});

// Liste des souvenirs (photos/videos) d'un evenement
eventsRouter.get("/:id/memories", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const memories = await prisma.eventMemory.findMany({
      where: { eventId },
      orderBy: { createdAt: "desc" }
    });
    return res.json(memories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation des souvenirs." });
  }
});

// Suppression d'un souvenir
eventsRouter.delete("/:id/memories/:memoryId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const memoryId = parseIdParam(req.params.memoryId);
    if (!eventId || !memoryId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const memory = await prisma.eventMemory.findUnique({ where: { id: memoryId } });
    if (!memory || memory.eventId !== eventId) {
      return res.status(404).json({ message: "Souvenir introuvable." });
    }

    await prisma.eventMemory.delete({ where: { id: memoryId } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression du souvenir." });
  }
});

// Ajout d'un cadeau / cagnotte pour un evenement
eventsRouter.post("/:id/gifts", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const { title, description, url, isCashFund } = req.body as {
      title?: string;
      description?: string | null;
      url?: string;
      isCashFund?: boolean;
    };

    if (!title || !url) {
      return res.status(400).json({ message: "Titre et lien sont obligatoires." });
    }
    const safeUrl = String(url).trim();
    if (!/^https?:\/\//i.test(safeUrl)) {
      return res.status(400).json({ message: "Lien invalide (http:// ou https://)." });
    }

    const gift = await prisma.giftItem.create({
      data: {
        eventId,
        title: String(title).trim().slice(0, 120),
        description: typeof description === "string" && description.trim() ? description.trim().slice(0, 300) : null,
        url: safeUrl.slice(0, 500),
        isCashFund: Boolean(isCashFund)
      }
    });

    return res.status(201).json(gift);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'ajout du cadeau." });
  }
});

// Suppression d'un cadeau
eventsRouter.delete("/:id/gifts/:giftId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const giftId = parseIdParam(req.params.giftId);
    if (!eventId || !giftId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const gift = await prisma.giftItem.findUnique({ where: { id: giftId } });
    if (!gift || gift.eventId !== eventId) {
      return res.status(404).json({ message: "Cadeau introuvable." });
    }

    await prisma.giftItem.delete({ where: { id: giftId } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression du cadeau." });
  }
});

// Ajout d'une option de boisson pour un evenement
eventsRouter.post("/:id/drinks", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const { name, category, availableQuantity, maxPerGuest } = req.body as {
      name: string;
      category: "ALCOHOLIC" | "SOFT";
      availableQuantity?: number | null;
      maxPerGuest?: number | null;
    };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    if (!name || !category) {
      return res.status(400).json({ message: "Nom et categorie de boisson sont obligatoires." });
    }
    if (category !== "ALCOHOLIC" && category !== "SOFT") {
      return res.status(400).json({ message: "Categorie de boisson invalide." });
    }

    const drink = await prisma.drinkOption.create({
      data: {
        name: String(name).trim().slice(0, 80),
        category,
        availableQuantity:
          typeof availableQuantity === "number" && availableQuantity >= 0
            ? Math.floor(availableQuantity)
            : null,
        maxPerGuest:
          typeof maxPerGuest === "number" && maxPerGuest > 0 ? Math.floor(maxPerGuest) : null,
        eventId
      }
    });

    res.status(201).json(drink);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation de la boisson." });
  }
});

// Mise a jour d'une boisson
eventsRouter.patch("/:id/drinks/:drinkId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const drinkId = parseIdParam(req.params.drinkId);
    if (!eventId || !drinkId) return res.status(400).json({ message: "Id invalide." });
    const { name, category, availableQuantity, maxPerGuest } = req.body as {
      name?: string;
      category?: "ALCOHOLIC" | "SOFT";
      availableQuantity?: number | null;
      maxPerGuest?: number | null;
    };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const drink = await prisma.drinkOption.findUnique({ where: { id: drinkId } });
    if (!drink || drink.eventId !== eventId) {
      return res.status(404).json({ message: "Boisson introuvable." });
    }

    if (category && category !== "ALCOHOLIC" && category !== "SOFT") {
      return res.status(400).json({ message: "Categorie de boisson invalide." });
    }

    const updated = await prisma.drinkOption.update({
      where: { id: drinkId },
      data: {
        name: typeof name === "string" ? name.trim().slice(0, 80) : undefined,
        category: category ?? undefined,
        availableQuantity:
          typeof availableQuantity === "number" && availableQuantity >= 0
            ? Math.floor(availableQuantity)
            : availableQuantity === null
              ? null
              : undefined,
        maxPerGuest:
          typeof maxPerGuest === "number" && maxPerGuest > 0
            ? Math.floor(maxPerGuest)
            : maxPerGuest === null
              ? null
              : undefined
      }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour de la boisson." });
  }
});

// Suppression d'une boisson
eventsRouter.delete("/:id/drinks/:drinkId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const drinkId = parseIdParam(req.params.drinkId);
    if (!eventId || !drinkId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const drink = await prisma.drinkOption.findUnique({ where: { id: drinkId } });
    if (!drink || drink.eventId !== eventId) {
      return res.status(404).json({ message: "Boisson introuvable." });
    }

    await prisma.drinkOption.delete({ where: { id: drinkId } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression de la boisson." });
  }
});

// Activer/desactiver le choix des boissons pour un evenement
eventsRouter.patch("/:id/drinks/settings", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const { drinksEnabled } = req.body as { drinksEnabled?: boolean };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { drinksEnabled: Boolean(drinksEnabled) }
    });

    res.json({ drinksEnabled: updated.drinksEnabled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour des boissons." });
  }
});

// Creation d'une table pour un evenement
eventsRouter.post("/:id/tables", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const { label, capacity, location, positionX, positionY } = req.body as {
      label: string;
      capacity: number;
      location?: string | null;
      positionX?: number | null;
      positionY?: number | null;
    };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { seatingMode: true }
    });
    if (event?.seatingMode === "NONE") {
      return res.status(400).json({ message: "Cet evenement est configure sans tables/sections." });
    }

    if (!label) {
      return res.status(400).json({ message: "Le nom (label) de la table est obligatoire." });
    }

    const table = await prisma.table.create({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation de la table." });
  }
});

// Scanner un QR code d'invitation (check-in)
eventsRouter.get("/:id/checkin/stats", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const totalGuests = await prisma.guest.count({ where: { eventId } });
    const present = await prisma.guestInvitation.count({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
  }
});

eventsRouter.get("/:id/checkin/search", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const query = String(req.query?.q ?? "").trim();
    if (!query) return res.json([]);

    const guests = (await prisma.guest.findMany({
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
    })) as Array<{
      id: number;
      fullName: string;
      status: string;
      phone: string | null;
      table: { id: number; label: string } | null;
      invitation: { id: number; token: string; checkedInAt: Date | null } | null;
    }>;

    res.json(
      guests.map(guest => ({
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
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recherche." });
  }
});

eventsRouter.post("/checkin/scan", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const token = String(req.body?.token ?? "").trim();
    const action = String(req.body?.action ?? "IN").toUpperCase();
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    if (action !== "IN" && action !== "OUT") {
      return res.status(400).json({ message: "Action invalide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
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
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const alreadyCheckedIn = Boolean(invitation.checkedInAt);
    const isCheckIn = action === "IN";
    if (isCheckIn && alreadyCheckedIn) {
      const updated = await prisma.guestInvitation.update({
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

    const updated = await prisma.guestInvitation.update({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors du scan." });
  }
});

// Liste des choix de boissons avec les invites
eventsRouter.get("/:id/drinks/choices", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const choices = await prisma.guestDrinkChoice.findMany({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation des choix boissons." });
  }
});

// Mise a jour d'une table (label/capacite)
eventsRouter.patch("/:id/tables/:tableId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const tableId = parseIdParam(req.params.tableId);
    if (!eventId || !tableId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const { label, capacity, location, positionX, positionY } = req.body as {
      label?: string;
      capacity?: number;
      location?: string | null;
      positionX?: number | null;
      positionY?: number | null;
    };
    const table = await prisma.table.findUnique({
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

    const updated = await prisma.table.update({
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la mise a jour de la table." });
  }
});

// Suppression d'une table (si vide)
eventsRouter.delete("/:id/tables/:tableId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const tableId = parseIdParam(req.params.tableId);
    if (!eventId || !tableId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: { _count: { select: { guests: true } } }
    });
    if (!table || table.eventId !== eventId) {
      return res.status(404).json({ message: "Table introuvable." });
    }
    if (table._count.guests > 0) {
      return res.status(400).json({ message: "Table non vide: retirez les invites d'abord." });
    }

    await prisma.table.delete({ where: { id: tableId } });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la suppression de la table." });
  }
});

// Liste des tables d'un evenement (avec invites)
eventsRouter.get("/:id/tables", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { activeTableLayoutId: true }
    });

    const tables = await prisma.table.findMany({
      where: { eventId },
      include: {
        guests: true
      },
      orderBy: { id: "asc" }
    });

    let positionsMap = new Map<number, { positionX: number; positionY: number }>();
    if (event?.activeTableLayoutId) {
      const positions = await prisma.tableLayoutPosition.findMany({
        where: { layoutId: event.activeTableLayoutId }
      });
      positionsMap = new Map(positions.map(pos => [pos.tableId, { positionX: pos.positionX, positionY: pos.positionY }]));
    }

    res.json(
      tables.map(table => {
        const position = positionsMap.get(table.id);
        return {
          ...table,
          positionX: position?.positionX ?? table.positionX ?? null,
          positionY: position?.positionY ?? table.positionY ?? null
        };
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation des tables." });
  }
});

// Plans de salle (layouts)
eventsRouter.get("/:id/table-layouts", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { activeTableLayoutId: true }
    });
    const layouts = await prisma.tableLayout.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" }
    });
    res.json({ activeLayoutId: event?.activeTableLayoutId ?? null, layouts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation des plans." });
  }
});

eventsRouter.post("/:id/table-layouts", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const { name } = req.body as { name?: string };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.create({
      data: {
        name: String(name ?? "Plan").trim().slice(0, 80) || "Plan",
        eventId
      }
    });

    await prisma.event.update({
      where: { id: eventId },
      data: { activeTableLayoutId: layout.id }
    });

    res.status(201).json(layout);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation du plan." });
  }
});

eventsRouter.post("/:id/table-layouts/:layoutId/duplicate", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const layoutId = parseIdParam(req.params.layoutId);
    if (!eventId || !layoutId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.eventId !== eventId) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    const existingNames = await prisma.tableLayout.findMany({
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

    const cloned = await prisma.tableLayout.create({
      data: {
        name,
        eventId
      }
    });

    const positions = await prisma.tableLayoutPosition.findMany({
      where: { layoutId }
    });
    if (positions.length > 0) {
      await prisma.tableLayoutPosition.createMany({
        data: positions.map(pos => ({
          layoutId: cloned.id,
          tableId: pos.tableId,
          positionX: pos.positionX,
          positionY: pos.positionY
        }))
      });
    }

    res.status(201).json(cloned);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la duplication du plan." });
  }
});

eventsRouter.patch("/:id/table-layouts/:layoutId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const layoutId = parseIdParam(req.params.layoutId);
    if (!eventId || !layoutId) return res.status(400).json({ message: "Id invalide." });
    const { name } = req.body as { name?: string };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.eventId !== eventId) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    const trimmed = String(name ?? "").trim().slice(0, 80);
    if (!trimmed) {
      return res.status(400).json({ message: "Nom invalide." });
    }

    const updated = await prisma.tableLayout.update({
      where: { id: layoutId },
      data: { name: trimmed }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors du renommage du plan." });
  }
});

eventsRouter.delete("/:id/table-layouts/:layoutId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const layoutId = parseIdParam(req.params.layoutId);
    if (!eventId || !layoutId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.eventId !== eventId) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    const [event, totalLayouts] = await Promise.all([
      prisma.event.findUnique({
        where: { id: eventId },
        select: { activeTableLayoutId: true }
      }),
      prisma.tableLayout.count({ where: { eventId } })
    ]);
    if (event?.activeTableLayoutId === layoutId) {
      return res.status(400).json({ message: "Impossible de supprimer le plan actif." });
    }
    if (totalLayouts <= 1) {
      return res.status(400).json({ message: "Impossible de supprimer le dernier plan." });
    }

    await prisma.tableLayoutPosition.deleteMany({ where: { layoutId } });
    await prisma.tableLayout.delete({ where: { id: layoutId } });

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression du plan." });
  }
});

eventsRouter.patch("/:id/table-layouts/:layoutId/select", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const layoutId = parseIdParam(req.params.layoutId);
    if (!eventId || !layoutId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.eventId !== eventId) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { activeTableLayoutId: layoutId }
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la selection du plan." });
  }
});

eventsRouter.patch("/:id/table-layouts/:layoutId/positions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const layoutId = parseIdParam(req.params.layoutId);
    if (!eventId || !layoutId) return res.status(400).json({ message: "Id invalide." });
    const { tableId, positionX, positionY } = req.body as {
      tableId?: number;
      positionX?: number;
      positionY?: number;
    };
    if (!tableId || typeof positionX !== "number" || typeof positionY !== "number") {
      return res.status(400).json({ message: "Positions invalides." });
    }

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const layout = await prisma.tableLayout.findUnique({ where: { id: layoutId } });
    if (!layout || layout.eventId !== eventId) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table || table.eventId !== eventId) {
      return res.status(404).json({ message: "Table introuvable." });
    }

    const pos = await prisma.tableLayoutPosition.upsert({
      where: { layoutId_tableId: { layoutId, tableId } },
      update: { positionX, positionY },
      create: { layoutId, tableId, positionX, positionY }
    });

    res.json(pos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la sauvegarde du plan." });
  }
});

// Repartition automatique des invites sans table
eventsRouter.post("/:id/tables/auto-assign", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { seatingMode: true }
    });
    if (event?.seatingMode === "NONE") {
      return res.status(400).json({ message: "Mode sans tables/sections: repartition impossible." });
    }

    const tables = await prisma.table.findMany({
      where: { eventId },
      include: { _count: { select: { guests: true } } },
      orderBy: { id: "asc" }
    });
    const guests = await prisma.guest.findMany({
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
      if (!target) break;
      updates.push(
        prisma.guest.update({
          where: { id: guest.id },
          data: { tableId: target.id }
        })
      );
      target.used += 1;
      assigned += 1;
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return res.json({
      assigned,
      remaining: guests.length - assigned
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la repartition automatique." });
  }
});

// Recuperer le chat de l'evenement (organisateur)
eventsRouter.get("/:id/chat", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const guestId = parseIdParam(String(req.query.guestId ?? ""));

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const messages = await prisma.eventChatMessage.findMany({
      where: guestId ? { eventId, guestId } : { eventId },
      include: { guest: true },
      orderBy: { createdAt: "asc" },
      take: 300
    });
    return res.json(messages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation du chat." });
  }
});

// Envoyer un message dans le chat (organisateur)
eventsRouter.post("/:id/chat", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const message = cleanChatMessage(req.body?.message);
    const guestId = parseIdParam(String(req.body?.guestId ?? ""));
    if (!message) return res.status(400).json({ message: "Message vide." });
    if (!guestId) return res.status(400).json({ message: "Invite manquant." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { id: true, eventId: true, fullName: true }
    });
    if (!guest || guest.eventId !== eventId) {
      return res.status(404).json({ message: "Invite introuvable." });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { name: true, email: true }
    });

    const created = await prisma.eventChatMessage.create({
      data: {
        eventId,
        guestId,
        senderType: "HOST",
        senderName: organizer?.name || organizer?.email || "Organisateur",
        message
      }
    });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'envoi du message." });
  }
});

// Statistiques globales de l'evenement
eventsRouter.get("/:id/stats", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const [totalGuests, confirmed, canceled, tables, drinkChoices, invitationsSent] = await Promise.all([
      prisma.guest.count({ where: { eventId } }),
      prisma.guest.count({
        where: { eventId, status: "CONFIRMED" }
      }),
      prisma.guest.count({
        where: { eventId, status: "CANCELED" }
      }),
      prisma.table.findMany({
        where: { eventId },
        include: { guests: true }
      }),
      prisma.guestDrinkChoice.groupBy({
        by: ["drinkOptionId"],
        where: {
          guest: {
            eventId
          }
        },
        _sum: { quantity: true }
      }),
      prisma.guestInvitation.count({
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

    const drinks = await prisma.drinkOption.findMany({
      where: { eventId }
    });

    const drinkStats = drinks.map(d => {
      const row = drinkChoices.find(rc => rc.drinkOptionId === d.id);
      return {
        id: d.id,
        name: d.name,
        category: d.category,
        totalQuantity: row?._sum.quantity ?? 0
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors du calcul des statistiques." });
  }
});

// Liste des messages du livre d'or
eventsRouter.get("/:id/guestbook", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const visibleOnly =
      typeof req.query.visible === "string" &&
      ["1", "true", "yes"].includes(req.query.visible.toLowerCase());
    const limit = toNonNegativeInt(req.query.limit, 0);

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const messages = await prisma.guestBookMessage.findMany({
      where: visibleOnly ? { eventId, isHidden: false } : { eventId },
      include: { guest: true },
      orderBy: { createdAt: "desc" },
      take: limit > 0 ? limit : undefined
    });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation du livre d'or." });
  }
});

// Marquer les messages d'un invite comme lus (organisateur)
eventsRouter.patch("/:id/chat/read", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const guestId = parseIdParam(String(req.body?.guestId ?? ""));
    if (!guestId) return res.status(400).json({ message: "Invite manquant." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    await prisma.eventChatMessage.updateMany({
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour du statut lu." });
  }
});

// Reponses rapides (organisateur)
eventsRouter.get("/:id/quick-replies", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const replies = await prisma.eventQuickReply.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" }
    });
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors du chargement des reponses rapides." });
  }
});

eventsRouter.post("/:id/quick-replies", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const text = cleanChatMessage(req.body?.text);
    if (!text) return res.status(400).json({ message: "Texte vide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const created = await prisma.eventQuickReply.create({
      data: {
        eventId,
        text
      }
    });
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la creation." });
  }
});

eventsRouter.delete("/:id/quick-replies/:replyId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const replyId = parseIdParam(req.params.replyId);
    if (!eventId || !replyId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }
    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const existing = await prisma.eventQuickReply.findUnique({ where: { id: replyId } });
    if (!existing || existing.eventId !== eventId) {
      return res.status(404).json({ message: "Reponse introuvable." });
    }

    await prisma.eventQuickReply.delete({ where: { id: replyId } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
});

// Parametres du livre d'or (moderation)
eventsRouter.patch("/:id/guestbook/settings", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const { guestbookRequiresApproval } = req.body as { guestbookRequiresApproval?: boolean };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const updated = await prisma.event.update({
      where: { id: eventId },
      data: { guestbookRequiresApproval: Boolean(guestbookRequiresApproval) }
    });

    res.json({ guestbookRequiresApproval: updated.guestbookRequiresApproval });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour des parametres." });
  }
});

// Masquer/afficher un message du livre d'or
eventsRouter.patch("/:id/guestbook/:messageId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const messageId = parseIdParam(req.params.messageId);
    if (!eventId || !messageId) return res.status(400).json({ message: "Id invalide." });
    const { isHidden } = req.body as { isHidden?: boolean };

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const message = await prisma.guestBookMessage.findUnique({ where: { id: messageId } });
    if (!message || message.eventId !== eventId) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    const updated = await prisma.guestBookMessage.update({
      where: { id: messageId },
      data: { isHidden: Boolean(isHidden) }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la mise a jour du message." });
  }
});

// Suppression d'un message du livre d'or
eventsRouter.delete("/:id/guestbook/:messageId", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    const messageId = parseIdParam(req.params.messageId);
    if (!eventId || !messageId) return res.status(400).json({ message: "Id invalide." });

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const message = await prisma.guestBookMessage.findUnique({ where: { id: messageId } });
    if (!message || message.eventId !== eventId) {
      return res.status(404).json({ message: "Message introuvable." });
    }

    await prisma.guestBookMessage.delete({ where: { id: messageId } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la suppression du message." });
  }
});

// Export du livre d'or au format PDF (protege)
eventsRouter.get("/:id/guestbook/pdf", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const eventId = parseIdParam(req.params.id);
    if (!eventId) return res.status(400).json({ message: "Id evenement invalide." });
    const visibleOnly =
      typeof req.query.visible === "string" &&
      ["1", "true", "yes"].includes(req.query.visible.toLowerCase());

    const organizerId = getOrganizerId(authReq);
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const ownership = await ensureEventAccess(eventId, organizerId);
    if ("error" in ownership) {
      return res.status(ownership.error!.code).json({ message: ownership.error!.message });
    }

    const messageWhere = visibleOnly ? { isHidden: false } : {};
    const event = await prisma.event.findUnique({
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

    const doc = new PDFDocument({ size: "A4", margin: 50 });
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
    } else {
      event.messages.forEach(message => {
        doc.moveDown(0.6);
        doc.font(font.bold).fontSize(11).text(message.guest?.fullName ?? "Invite anonyme");
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
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erreur lors de la generation du PDF du livre d'or." });
    }
  }
});

