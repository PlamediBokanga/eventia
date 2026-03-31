import { Router } from "express";
import { prisma } from "../prisma";
import PDFDocument from "pdfkit";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import http from "http";
import https from "https";
import sharp from "sharp";

export const invitationsRouter = Router();

function isValidToken(token: string) {
  return /^[a-f0-9]{32}$/i.test(token);
}

function buildInvitationUrl(token: string) {
  const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/+$/, "")}/invitation/${token}`;
}

function buildQrCodeUrl(content: string) {
  return `https://quickchart.io/qr?size=220&text=${encodeURIComponent(content)}`;
}

function buildMapsUrl(location: string, address?: string | null) {
  const q = encodeURIComponent(address?.trim() || location);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function toCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(event: {
  name: string;
  dateTime: Date;
  location: string;
  details?: string | null;
  address?: string | null;
}) {
  const start = toCalendarDate(event.dateTime);
  const end = toCalendarDate(new Date(event.dateTime.getTime() + 2 * 60 * 60 * 1000));
  const text = encodeURIComponent(event.name);
  const details = encodeURIComponent(event.details || "");
  const location = encodeURIComponent(event.address || event.location);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function toPlainText(html: string) {
  return html
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<\/blockquote>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const client = url.startsWith("https://") ? https : http;

  return new Promise((resolve, reject) => {
    client
      .get(url, response => {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on("data", chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });
}

function uploadBaseUrl(req: any) {
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

function resolveAbsoluteUrl(req: any, rawUrl: string) {
  const base = `${req.protocol}://${req.get("host")}`;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (rawUrl.startsWith("/")) return `${base}${rawUrl}`;
  return `${base}/${rawUrl.replace(/^\/+/, "")}`;
}

async function fetchAssetBuffer(req: any, rawUrl: string): Promise<Buffer> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Empty URL");

  const dataImage = parseImageDataUrl(trimmed);
  if (dataImage) {
    return dataImage.buffer;
  }

  if (trimmed.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), trimmed.replace(/^\//, ""));
    return fs.readFile(filePath);
  }

  const absoluteUrl = resolveAbsoluteUrl(req, trimmed);
  return fetchBuffer(absoluteUrl);
}

function drawInfoRow(doc: any, label: string, value: string) {
  doc.font("Helvetica-Bold").fontSize(11).text(`${label}: `, { continued: true });
  doc.font("Helvetica").fontSize(11).text(value);
}

async function convertWebpToJpg(buffer: Buffer) {
  return sharp(buffer).jpeg({ quality: 88 }).toBuffer();
}

function isPngOrJpg(buffer: Buffer) {
  if (buffer.length < 4) return false;
  const pngSig = buffer.slice(0, 8).toString("hex");
  if (pngSig === "89504e470d0a1a0a") return true;
  const jpgSig = buffer.slice(0, 2).toString("hex");
  return jpgSig === "ffd8";
}

async function ensurePdfImageBuffer(buffer: Buffer, rawUrl: string) {
  if (isPngOrJpg(buffer)) return buffer;
  try {
    return await convertWebpToJpg(buffer);
  } catch (error) {
    console.error("Image conversion failed:", rawUrl, error);
    throw error;
  }
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

// Recuperer les infos d'invitation par token (cote invite)
invitationsRouter.get("/:token", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: {
        guest: {
          include: {
            event: true,
            choices: {
              include: { drinkOption: true }
            }
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    await prisma.guestInvitation.update({
      where: { id: invitation.id },
      data: {
        openedAt: new Date(),
        openCount: { increment: 1 }
      }
    });

    const drinksEnabled = invitation.guest.event.drinksEnabled ?? true;
    const drinks = drinksEnabled
      ? await prisma.drinkOption.findMany({
          where: { eventId: invitation.guest.eventId }
        })
      : [];
    const guestbookMessages = await prisma.guestBookMessage.findMany({
      where: { eventId: invitation.guest.eventId, isHidden: false },
      include: { guest: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    const programItems = await prisma.eventProgramItem.findMany({
      where: { eventId: invitation.guest.eventId },
      orderBy: { order: "asc" }
    });
    const gifts = await prisma.giftItem.findMany({
      where: { eventId: invitation.guest.eventId },
      orderBy: { createdAt: "desc" }
    });
    const memories = await prisma.eventMemory.findMany({
      where: { eventId: invitation.guest.eventId },
      orderBy: { createdAt: "desc" }
    });
    const invitationUrl = buildInvitationUrl(invitation.token);
    const qrCodeUrl = buildQrCodeUrl(invitationUrl);

    res.json({
      invitation: {
        token: invitation.token,
        respondedAt: invitation.respondedAt,
        openedAt: invitation.openedAt,
        openCount: invitation.openCount,
        invitationUrl,
        qrCodeUrl,
        mapsUrl: buildMapsUrl(invitation.guest.event.location, invitation.guest.event.address),
        googleCalendarUrl: buildGoogleCalendarUrl(invitation.guest.event)
      },
      guest: {
        id: invitation.guest.id,
        fullName: invitation.guest.fullName,
        status: invitation.guest.status,
        plusOneCount: invitation.guest.plusOneCount,
        allergies: invitation.guest.allergies,
        mealPreference: invitation.guest.mealPreference
      },
      event: {
        id: invitation.guest.event.id,
        name: invitation.guest.event.name,
        type: invitation.guest.event.type,
        dateTime: invitation.guest.event.dateTime,
        location: invitation.guest.event.location,
        address: invitation.guest.event.address,
        details: invitation.guest.event.details,
        program: invitation.guest.event.program,
        invitationMessage: invitation.guest.event.invitationMessage,
        coverImageUrl: invitation.guest.event.coverImageUrl,
        hostNames: invitation.guest.event.hostNames,
        logoUrl: invitation.guest.event.logoUrl,
        themePreset: invitation.guest.event.themePreset,
        primaryColor: invitation.guest.event.primaryColor,
        accentColor: invitation.guest.event.accentColor,
        fontFamily: invitation.guest.event.fontFamily,
        animationStyle: invitation.guest.event.animationStyle,
        drinksEnabled
      },
      programItems,
      drinks,
      gifts,
      memories,
      choices: invitation.guest.choices,
      guestbookMessages: guestbookMessages.map(item => ({
        id: item.id,
        message: item.message,
        createdAt: item.createdAt,
        guestName: item.guest?.fullName ?? "Invite anonyme"
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la recuperation de l'invitation." });
  }
});

// Upload d'une photo souvenir par token invite
invitationsRouter.post("/:token/upload-media", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    const { fileName, dataUrl } = req.body as { fileName?: string; dataUrl?: string };
    if (!fileName || !dataUrl) {
      return res.status(400).json({ message: "Fichier image manquant." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: { guest: true }
    });
    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const parsed = parseImageDataUrl(dataUrl);
    if (!parsed) {
      return res.status(400).json({ message: "Format image invalide. Utilisez PNG, JPG ou WEBP." });
    }
    if (parsed.buffer.length > 6 * 1024 * 1024) {
      return res.status(400).json({ message: "Image trop lourde (max 6MB)." });
    }

    const safeBase = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 40) || "memory";
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${safeBase}.${parsed.ext}`;
    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(path.join(uploadDir, filename), parsed.buffer);
    const url = `${uploadBaseUrl(req)}/uploads/${filename}`;

    return res.status(201).json({ url, mediaType: "IMAGE" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'upload du souvenir." });
  }
});

// Enregistrer un souvenir photo/video
invitationsRouter.post("/:token/memories", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    const { mediaType, mediaUrl, caption } = req.body as {
      mediaType?: "IMAGE" | "VIDEO";
      mediaUrl?: string;
      caption?: string | null;
    };

    if (!mediaType || !mediaUrl) {
      return res.status(400).json({ message: "Type et lien media obligatoires." });
    }
    if (mediaType !== "IMAGE" && mediaType !== "VIDEO") {
      return res.status(400).json({ message: "Type media invalide." });
    }
    const safeUrl = String(mediaUrl).trim();
    if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith("/uploads/")) {
      return res.status(400).json({ message: "Lien media invalide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: { guest: true }
    });
    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const memory = await prisma.eventMemory.create({
      data: {
        eventId: invitation.guest.eventId,
        mediaType,
        mediaUrl: safeUrl.slice(0, 500),
        caption: typeof caption === "string" && caption.trim() ? caption.trim().slice(0, 240) : null,
        uploadedByName: invitation.guest.fullName
      }
    });

    return res.status(201).json(memory);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'ajout du souvenir." });
  }
});

// Recuperer le chat de l'evenement (vue invite)
invitationsRouter.get("/:token/chat", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: { guest: true }
    });
    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const messages = await prisma.eventChatMessage.findMany({
      where: { eventId: invitation.guest.eventId, guestId: invitation.guestId },
      orderBy: { createdAt: "asc" },
      take: 200
    });

    return res.json(messages);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de la recuperation du chat." });
  }
});

// Envoyer un message dans le chat (invite)
invitationsRouter.post("/:token/chat", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    const message = cleanChatMessage(req.body?.message);
    if (!message) {
      return res.status(400).json({ message: "Message vide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: { guest: true }
    });
    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const created = await prisma.eventChatMessage.create({
      data: {
        eventId: invitation.guest.eventId,
        guestId: invitation.guestId,
        senderType: "GUEST",
        senderName: invitation.guest.fullName,
        message,
        readAt: null
      }
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'envoi du message." });
  }
});

async function setGuestStatusFromToken(token: string, status: "CONFIRMED" | "CANCELED") {
  if (!isValidToken(token)) return null;
  const invitation = await prisma.guestInvitation.findUnique({ where: { token } });
  if (!invitation) return null;

  const updatedGuest = await prisma.guest.update({
    where: { id: invitation.guestId },
    data: { status }
  });

  await prisma.guestInvitation.update({
    where: { id: invitation.id },
    data: { respondedAt: new Date() }
  });

  return updatedGuest;
}

async function updateGuestRsvpData(
  guestId: number,
  payload: { plusOneCount?: number; allergies?: string | null; mealPreference?: string | null }
) {
  const data: { plusOneCount?: number; allergies?: string | null; mealPreference?: string | null } = {};
  if (payload.plusOneCount != null) {
    data.plusOneCount = Math.max(0, Math.floor(Number(payload.plusOneCount) || 0));
  }
  if (payload.allergies !== undefined) {
    data.allergies = typeof payload.allergies === "string" && payload.allergies.trim()
      ? payload.allergies.trim().slice(0, 300)
      : null;
  }
  if (payload.mealPreference !== undefined) {
    data.mealPreference = typeof payload.mealPreference === "string" && payload.mealPreference.trim()
      ? payload.mealPreference.trim().slice(0, 120)
      : null;
  }
  if (Object.keys(data).length === 0) return;
  await prisma.guest.update({
    where: { id: guestId },
    data
  });
}

// Confirmer presence
invitationsRouter.post("/:token/confirm", async (req, res) => {
  try {
    const guest = await setGuestStatusFromToken(req.params.token, "CONFIRMED");
    if (!guest) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }
    await updateGuestRsvpData(guest.id, req.body as { plusOneCount?: number; allergies?: string | null; mealPreference?: string | null });
    res.json({ guest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de la confirmation de presence." });
  }
});

// Annuler presence
invitationsRouter.post("/:token/cancel", async (req, res) => {
  try {
    const guest = await setGuestStatusFromToken(req.params.token, "CANCELED");
    if (!guest) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }
    await updateGuestRsvpData(guest.id, req.body as { plusOneCount?: number; allergies?: string | null; mealPreference?: string | null });
    res.json({ guest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'annulation de presence." });
  }
});

// Enregistrer les choix de boissons
invitationsRouter.post("/:token/drinks", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    const { choices } = req.body as {
      choices: { drinkOptionId: number; quantity: number }[];
    };

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: {
        guest: {
          select: { eventId: true, event: { select: { drinksEnabled: true } } }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const guestId = invitation.guestId;
    if (invitation.guest.event?.drinksEnabled === false) {
      return res.status(400).json({ message: "Le choix des boissons est desactive." });
    }

    await prisma.guestDrinkChoice.deleteMany({
      where: { guestId }
    });

    if (Array.isArray(choices) && choices.length > 20) {
      return res.status(400).json({ message: "Trop de choix envoyes." });
    }

    if (Array.isArray(choices) && choices.length > 0) {
      const normalizedChoices = choices
        .map(choice => ({
          drinkOptionId: Number(choice.drinkOptionId),
          quantity: Number(choice.quantity)
        }))
        .filter(choice => Number.isInteger(choice.drinkOptionId) && choice.drinkOptionId > 0)
        .map(choice => ({
          drinkOptionId: choice.drinkOptionId,
          quantity:
            Number.isInteger(choice.quantity) && choice.quantity > 0 && choice.quantity <= 20
              ? choice.quantity
              : 1
        }));

      const allowedDrinks = await prisma.drinkOption.findMany({
        where: { eventId: invitation.guest.eventId },
        select: { id: true, maxPerGuest: true }
      });
      const allowedDrinkIds = new Set(allowedDrinks.map(d => d.id));

      const invalidChoice = normalizedChoices.find(c => !allowedDrinkIds.has(c.drinkOptionId));
      if (invalidChoice) {
        return res.status(400).json({ message: "Boisson invalide pour cet evenement." });
      }

      const maxPerGuestMap = new Map(allowedDrinks.map(d => [d.id, d.maxPerGuest ?? null]));
      await prisma.guestDrinkChoice.createMany({
        data: normalizedChoices.map(c => {
          const maxAllowed = maxPerGuestMap.get(c.drinkOptionId);
          const finalQty = maxAllowed && c.quantity > maxAllowed ? maxAllowed : c.quantity;
          return {
            guestId,
            drinkOptionId: c.drinkOptionId,
            quantity: finalQty
          };
        })
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement des boissons." });
  }
});

// Enregistrer un message livre d'or
invitationsRouter.post("/:token/guestbook", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }
    const { message } = req.body as { message: string };

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Le message du livre d'or est obligatoire." });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ message: "Le message ne doit pas depasser 500 caracteres." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: {
        guest: true
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }

    const event = await prisma.event.findUnique({
      where: { id: invitation.guest.eventId },
      select: { guestbookRequiresApproval: true }
    });

    const saved = await prisma.guestBookMessage.create({
      data: {
        message: message.trim(),
        guestId: invitation.guestId,
        eventId: invitation.guest.eventId,
        isHidden: Boolean(event?.guestbookRequiresApproval)
      }
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'enregistrement du message." });
  }
});

// Invitation individuelle au format PDF (cote invite)
invitationsRouter.get("/:token/pdf", async (req, res) => {
  try {
    const { token } = req.params;
    if (!isValidToken(token)) {
      return res.status(400).json({ message: "Token invalide." });
    }

    const invitation = await prisma.guestInvitation.findUnique({
      where: { token },
      include: {
        guest: {
          include: {
            event: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation introuvable." });
    }
    const invitationData = invitation;

    const doc = new PDFDocument({ size: "A4", margin: 46 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invitation-${invitationData.guest.fullName}.pdf"`
    );
    doc.pipe(res);

    const invitationUrl = buildInvitationUrl(invitationData.token);
    const qrCodeUrl = buildQrCodeUrl(invitationUrl);
    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const contentW = pageW - 92;
    const fonts = registerPdfFonts(doc);

    const primary = "#0B1C2C";
    const accent = "#D4AF37";
    const text = "#1F2937";
    const muted = "#6B7280";
    const cardBg = "#F9FAFB";
    const cardBorder = "#EFE7D1";

    async function drawCoverPage() {
      doc.rect(0, 0, pageW, pageH).fill("#F6F4F0");
      if (invitationData.guest.event.coverImageUrl) {
        try {
          const rawCoverUrl = invitationData.guest.event.coverImageUrl.trim();
          const cover = await fetchAssetBuffer(req, rawCoverUrl);
          const finalCover = await ensurePdfImageBuffer(cover, rawCoverUrl);
          doc.image(finalCover, 0, 0, { fit: [pageW, pageH], align: "center", valign: "center" });
        } catch (error) {
          console.error("Cover image failed:", error);
          doc.rect(46, 120, contentW, 160).fill("#FFFFFF").stroke("#E5E7EB");
          doc.fillColor(primary).font(fonts.bold).fontSize(12).text("Image non chargee", 64, 150);
          doc
            .font(fonts.regular)
            .fontSize(10)
            .fillColor(muted)
            .text("Veuillez utiliser une image JPG ou PNG.", 64, 170);
        }
      }
      doc.rect(0, 0, pageW, pageH).fillOpacity(0.35).fill("#0B1C2C").fillOpacity(1);

      doc.fillColor("#FFFFFF").font(fonts.bold).fontSize(28);
      doc.text(invitationData.guest.event.hostNames || invitationData.guest.event.name, 46, pageH - 220, {
        width: contentW
      });
      doc.font(fonts.regular).fontSize(12).fillColor("#E5E7EB");
      doc.text(
        invitationData.guest.event.dateTime.toLocaleString("fr-FR"),
        46,
        pageH - 180,
        { width: contentW }
      );
      doc.font(fonts.regular).fontSize(11).fillColor("#E5E7EB");
      doc.text(invitationData.guest.event.location, 46, pageH - 160, { width: contentW });
      doc.fillColor(accent).font(fonts.bold).fontSize(11).text("INVITATION OFFICIELLE", 46, 52);
    }

    function drawInvitationPage() {
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill("#FFFFFF");
      doc.fillColor(accent).font(fonts.bold).fontSize(10).text("INVITATION OFFICIELLE", 46, 48);
      doc.fillColor(primary).font(fonts.bold).fontSize(20).text("Message officiel", 46, 64);

      const greetingTop = 120;
      doc.roundedRect(46, greetingTop, contentW, 120, 14).fill(cardBg).stroke(cardBorder);
      doc.fillColor(primary).font(fonts.bold).fontSize(12).text(
        `Cher(e) ${invitationData.guest.fullName},`,
        64,
        greetingTop + 16
      );
      doc.font(fonts.regular).fontSize(11).fillColor(text).text(
        `Vous etes invite(e) a ${invitationData.guest.event.name}.`,
        64,
        greetingTop + 38,
        { width: contentW - 36 }
      );
      if (invitationData.guest.event.invitationMessage) {
        const msg = toPlainText(invitationData.guest.event.invitationMessage);
        doc.font(fonts.italic).fontSize(10.5).fillColor(muted).text(msg, 64, greetingTop + 62, {
          width: contentW - 36
        });
      }

      const infoTop = greetingTop + 150;
      doc.roundedRect(46, infoTop, contentW, 150, 14).fill("#FFFFFF").stroke("#E5E7EB");
      doc.fillColor(primary).font(fonts.bold).fontSize(11).text("Informations", 64, infoTop + 14);
      doc.font(fonts.regular).fontSize(11).fillColor(text);
      doc.text(`Date: ${invitationData.guest.event.dateTime.toLocaleString("fr-FR")}`, 64, infoTop + 40, {
        width: contentW - 36
      });
      doc.text(`Lieu: ${invitationData.guest.event.location}`, 64, infoTop + 60, { width: contentW - 36 });
      if (invitationData.guest.event.address) {
        doc.text(`Adresse: ${invitationData.guest.event.address}`, 64, infoTop + 80, { width: contentW - 36 });
      }
    }

    async function drawQrPage() {
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill("#F8FAFC");
      doc.fillColor(accent).font(fonts.bold).fontSize(10).text("CONTROLE D'ACCES", 46, 50);
      doc.fillColor(primary).font(fonts.bold).fontSize(20).text("Votre QR Code", 46, 66);
      doc.font(fonts.regular).fontSize(11).fillColor(muted).text(
        "Presentez ce code a l'entree.",
        46,
        92
      );
      const qrBox = 220;
      const qrX = (pageW - qrBox) / 2;
      const qrY = 150;
      doc.roundedRect(qrX - 18, qrY - 18, qrBox + 36, qrBox + 36, 20).stroke(accent);
      try {
        const qrImage = await fetchBuffer(qrCodeUrl);
        doc.image(qrImage, qrX, qrY, { fit: [qrBox, qrBox], align: "center" });
      } catch (error) {
        console.error("QR generation failed:", error);
        doc.fillColor("#111827").font(fonts.regular).fontSize(10).text(invitationUrl, qrX, qrY + 90, {
          width: qrBox,
          align: "center"
        });
      }
      doc.font(fonts.regular).fontSize(10).fillColor(muted).text(invitationUrl, 46, 450, {
        width: contentW,
        align: "center"
      });
    }

    async function drawProgramPage() {
      doc.addPage();
      doc.rect(0, 0, pageW, pageH).fill("#FFFFFF");
      doc.fillColor(accent).font(fonts.bold).fontSize(10).text("PROGRAMME", 46, 50);
      doc.fillColor(primary).font(fonts.bold).fontSize(20).text("Deroulement", 46, 66);
      doc.font(fonts.regular).fontSize(11).fillColor(muted).text(
        "Deroulement de l'evenement",
        46,
        92
      );
      const programItems = await prisma.eventProgramItem.findMany({
        where: { eventId: invitationData.guest.eventId },
        orderBy: { order: "asc" }
      });
      const program = invitationData.guest.event.program || invitationData.guest.event.details;
      if (programItems.length > 0) {
        let y = 130;
        const timelineX = 112;
        const textX = 136;
        const textW = contentW - (textX - 46);
        programItems.forEach((item, index) => {
          doc.font(fonts.bold).fontSize(11).fillColor(primary).text(item.timeLabel, 46, y);

          doc.fillColor(accent);
          doc.circle(timelineX, y + 6, 3).fill();
          if (index < programItems.length - 1) {
            doc
              .lineWidth(1.2)
              .strokeColor("#E7D4A6")
              .moveTo(timelineX, y + 12)
              .lineTo(timelineX, y + 64)
              .stroke();
          }

          doc.roundedRect(textX, y - 6, textW, 40, 10).fill(cardBg).stroke(cardBorder);
          doc.font(fonts.bold).fontSize(11).fillColor(text).text(item.title, textX + 12, y + 2, {
            width: textW
          });
          let blockHeight = 18;
          if (item.description) {
            const descHeight = doc.heightOfString(item.description, { width: textW } as any);
            doc.font(fonts.regular).fontSize(10).fillColor(muted).text(item.description, textX + 12, y + 18, {
              width: textW
            });
            blockHeight = Math.max(blockHeight, 16 + descHeight);
          }
          y += blockHeight + 22;
        });
      } else if (program) {
        doc.font(fonts.regular).fontSize(11).fillColor("#374151").text(
          toPlainText(program),
          46,
          120,
          { width: contentW }
        );
      } else {
        doc.font(fonts.regular).fontSize(11).fillColor("#6B7280").text(
          "Le programme detaille sera communique par l'organisateur.",
          46,
          120,
          { width: contentW }
        );
      }
      doc
        .font(fonts.italic)
        .fontSize(10)
        .fillColor("#6B7280")
        .text(`Lien invitation: ${invitationUrl}`, 46, pageH - 80, { width: contentW, align: "center" });
    }

    await drawCoverPage();
    drawInvitationPage();
    await drawQrPage();
    await drawProgramPage();

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Erreur lors de la generation du PDF d'invitation." });
    }
  }
});
