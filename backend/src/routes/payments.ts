import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../prisma";
import { authMiddleware } from "../middleware/auth";
import type { AuthRequest } from "../middleware/auth";

export const paymentsRouter = Router();

const FLUTTERWAVE_BASE = "https://api.flutterwave.com/v3";

const EVENT_PLANS = [
  { code: "BASIC", name: "Pack Basic", price: 15, guestLimit: 100 },
  { code: "STANDARD", name: "Pack Standard", price: 35, guestLimit: 300 },
  { code: "PREMIUM", name: "Pack Premium", price: 75, guestLimit: 700 }
];

const SUB_PLANS = [
  { code: "PRO_ORGANIZER", name: "Pro Organizer", price: 19, eventLimit: 5, guestLimit: 300 },
  { code: "AGENCY", name: "Agency", price: 49, eventLimit: 999, guestLimit: 500 },
  { code: "ENTERPRISE", name: "Enterprise", price: 99, eventLimit: 9999, guestLimit: 99999 }
];

function getPlan(planCode: string, planType: "EVENT" | "SUBSCRIPTION") {
  const list = planType === "EVENT" ? EVENT_PLANS : SUB_PLANS;
  return list.find(p => p.code === planCode);
}

function buildRedirectUrl() {
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  return `${appUrl.replace(/\/+$/, "")}/dashboard/billing`;
}

// Initier un paiement Flutterwave
paymentsRouter.post("/flutterwave/initialize", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) {
      return res.status(401).json({ message: "Organisateur non authentifie." });
    }

    const { planCode, planType, eventId } = req.body as {
      planCode?: string;
      planType?: "EVENT" | "SUBSCRIPTION";
      eventId?: number;
    };

    if (!planCode || !planType) {
      return res.status(400).json({ message: "Plan invalide." });
    }

    const plan = getPlan(planCode, planType);
    if (!plan) {
      return res.status(404).json({ message: "Plan inconnu." });
    }

    let linkedEventId: number | null = null;
    if (planType === "EVENT") {
      const event = await prisma.event.findUnique({ where: { id: Number(eventId) } });
      if (!event || event.organizerId !== organizerId) {
        return res.status(403).json({ message: "Evenement invalide pour ce paiement." });
      }
      linkedEventId = event.id;
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: organizerId },
      select: { email: true, name: true, phone: true }
    });

    const txRef = `EVT-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const payment = await prisma.payment.create({
      data: {
        organizerId,
        eventId: linkedEventId,
        planCode,
        planType,
        amount: plan.price,
        currency: "USD",
        provider: "FLUTTERWAVE",
        txRef
      }
    });

    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) {
      return res.status(500).json({ message: "Configuration Flutterwave manquante." });
    }

    const payload = {
      tx_ref: payment.txRef,
      amount: payment.amount,
      currency: payment.currency,
      redirect_url: buildRedirectUrl(),
      customer: {
        email: organizer?.email ?? "client@eventia.app",
        name: organizer?.name ?? "Client Eventia",
        phonenumber: organizer?.phone ?? ""
      },
      customizations: {
        title: plan.name,
        description: planType === "EVENT" ? "Paiement evenement unique" : "Abonnement Eventia"
      }
    };

    const fwRes = await fetch(`${FLUTTERWAVE_BASE}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`
      },
      body: JSON.stringify(payload)
    });

    if (!fwRes.ok) {
      const errPayload = (await fwRes.json().catch(() => ({}))) as { message?: string };
      return res.status(502).json({ message: errPayload?.message ?? "Echec initialisation paiement." });
    }
    const fwPayload = (await fwRes.json()) as { data?: { link?: string } };
    const paymentLink = fwPayload?.data?.link;
    if (!paymentLink) {
      return res.status(502).json({ message: "Lien de paiement indisponible." });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentLink }
    });

    return res.json({ paymentLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur lors de l'initialisation du paiement." });
  }
});

// Webhook Flutterwave
paymentsRouter.post("/flutterwave/webhook", async (req, res) => {
  try {
    const hash = req.headers["verif-hash"];
    const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
    if (!expected || hash !== expected) {
      return res.status(401).json({ message: "Signature invalide." });
    }

    const payload = req.body as {
      data?: {
        status?: string;
        tx_ref?: string;
        id?: number;
        amount?: number;
        currency?: string;
      };
    };

    const txRef = payload.data?.tx_ref;
    if (!txRef) return res.status(400).json({ message: "tx_ref manquant." });

    const payment = await prisma.payment.findUnique({ where: { txRef } });
    if (!payment) return res.status(404).json({ message: "Paiement introuvable." });

    const status = payload.data?.status === "successful" ? "PAID" : "FAILED";
    const providerRef = payload.data?.id ? String(payload.data.id) : null;

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status,
        providerRef: providerRef ?? payment.providerRef
      }
    });

    if (status === "PAID") {
      if (updated.planType === "EVENT" && updated.eventId) {
        await prisma.event.update({
          where: { id: updated.eventId },
          data: {
            paidPlanCode: updated.planCode,
            paidAt: new Date()
          }
        });
      }
      if (updated.planType === "SUBSCRIPTION") {
        const now = new Date();
        const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const existing = await prisma.organizerSubscription.findFirst({
          where: { organizerId: updated.organizerId }
        });
        if (existing) {
          await prisma.organizerSubscription.update({
            where: { id: existing.id },
            data: {
              planCode: updated.planCode,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: next
            }
          });
        } else {
          await prisma.organizerSubscription.create({
            data: {
              organizerId: updated.organizerId,
              planCode: updated.planCode,
              status: "ACTIVE",
              currentPeriodStart: now,
              currentPeriodEnd: next
            }
          });
        }
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur webhook." });
  }
});
