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

async function ensureSuperAdmin(organizerId: number) {
  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { role: true }
  });
  return organizer?.role === "superadmin";
}

async function activatePayment(payment: {
  id: number;
  planType: "EVENT" | "SUBSCRIPTION";
  planCode: string;
  eventId: number | null;
  organizerId: number;
}) {
  if (payment.planType === "EVENT" && payment.eventId) {
    await prisma.event.update({
      where: { id: payment.eventId },
      data: {
        paidPlanCode: payment.planCode,
        paidAt: new Date()
      }
    });
  }
  if (payment.planType === "SUBSCRIPTION") {
    const now = new Date();
    const next = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const existing = await prisma.organizerSubscription.findFirst({
      where: { organizerId: payment.organizerId }
    });
    if (existing) {
      await prisma.organizerSubscription.update({
        where: { id: existing.id },
        data: {
          planCode: payment.planCode,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: next
        }
      });
    } else {
      await prisma.organizerSubscription.create({
        data: {
          organizerId: payment.organizerId,
          planCode: payment.planCode,
          status: "ACTIVE",
          currentPeriodStart: now,
          currentPeriodEnd: next
        }
      });
    }
  }
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
      await activatePayment({
        id: updated.id,
        planType: updated.planType,
        planCode: updated.planCode,
        eventId: updated.eventId ?? null,
        organizerId: updated.organizerId
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur webhook." });
  }
});

// Paiement manuel (mobile money)
paymentsRouter.post("/manual/create", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });

    const { planCode, planType, eventId, method } = req.body as {
      planCode?: string;
      planType?: "EVENT" | "SUBSCRIPTION";
      eventId?: number;
      method?: string;
    };

    if (!planCode || !planType) return res.status(400).json({ message: "Plan invalide." });
    const plan = getPlan(planCode, planType);
    if (!plan) return res.status(404).json({ message: "Plan inconnu." });

    let linkedEventId: number | null = null;
    if (planType === "EVENT") {
      const event = await prisma.event.findUnique({ where: { id: Number(eventId) } });
      if (!event || event.organizerId !== organizerId) {
        return res.status(403).json({ message: "Evenement invalide pour ce paiement." });
      }
      linkedEventId = event.id;
    }

    const txRef = `MANUAL-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const payment = await prisma.payment.create({
      data: {
        organizerId,
        eventId: linkedEventId,
        planCode,
        planType,
        amount: plan.price,
        currency: "USD",
        provider: "MANUAL",
        method: method ? String(method).slice(0, 40) : null,
        txRef
      }
    });

    const payNumber = process.env.MOBILE_MONEY_NUMBER || "+243000000000";
    const payName = process.env.MOBILE_MONEY_NAME || "EVENTIA";

    return res.json({
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      number: payNumber,
      name: payName
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur creation paiement." });
  }
});

paymentsRouter.post("/manual/confirm", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const { paymentId } = req.body as { paymentId?: number };
    if (!paymentId) return res.status(400).json({ message: "Paiement invalide." });
    const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });
    if (!payment || payment.organizerId !== organizerId) {
      return res.status(404).json({ message: "Paiement introuvable." });
    }
    if (payment.status !== "PENDING") {
      return res.status(400).json({ message: "Paiement deja traite." });
    }
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: "USER_CONFIRMED" }
    });
    return res.json({ message: "Paiement en attente de validation." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur confirmation paiement." });
  }
});

paymentsRouter.get("/user", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const payments = await prisma.payment.findMany({
      where: { organizerId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return res.json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur chargement paiements." });
  }
});

// Admin stats
paymentsRouter.get("/admin/stats", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const isAdmin = await ensureSuperAdmin(organizerId);
    if (!isAdmin) return res.status(403).json({ message: "Acces interdit." });

    const totals = await prisma.payment.aggregate({
      where: { status: "PAID" },
      _sum: { amount: true },
      _count: { _all: true }
    });
    const eventsCount = await prisma.event.count();
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    const monthly = await prisma.payment.findMany({
      where: { status: "PAID", createdAt: { gte: since } },
      select: { amount: true, createdAt: true }
    });
    const byMonth = monthly.reduce<Record<string, number>>((acc, item) => {
      const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, "0")}`;
      acc[key] = (acc[key] ?? 0) + item.amount;
      return acc;
    }, {});
    return res.json({
      revenue: totals._sum.amount ?? 0,
      payments: totals._count._all ?? 0,
      events: eventsCount,
      monthly: Object.entries(byMonth)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([month, amount]) => ({ month, amount }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur stats admin." });
  }
});

paymentsRouter.get("/admin/list", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const isAdmin = await ensureSuperAdmin(organizerId);
    if (!isAdmin) return res.status(403).json({ message: "Acces interdit." });
    const status = req.query.status ? String(req.query.status) : undefined;
    const payments = await prisma.payment.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        organizer: { select: { id: true, email: true, name: true } },
        event: { select: { id: true, name: true } }
      }
    });
    return res.json({ payments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur liste paiements." });
  }
});

paymentsRouter.patch("/admin/:id/approve", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const isAdmin = await ensureSuperAdmin(organizerId);
    if (!isAdmin) return res.status(403).json({ message: "Acces interdit." });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Id invalide." });
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return res.status(404).json({ message: "Paiement introuvable." });
    if (payment.status === "PAID") {
      return res.json({ message: "Paiement deja valide." });
    }
    const updated = await prisma.payment.update({
      where: { id },
      data: { status: "PAID", providerRef: payment.providerRef ?? "ADMIN_APPROVED" }
    });
    await activatePayment({
      id: updated.id,
      planType: updated.planType,
      planCode: updated.planCode,
      eventId: updated.eventId ?? null,
      organizerId: updated.organizerId
    });
    return res.json({ message: "Paiement valide." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur validation paiement." });
  }
});

paymentsRouter.get("/admin/commissions", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const isAdmin = await ensureSuperAdmin(organizerId);
    if (!isAdmin) return res.status(403).json({ message: "Acces interdit." });
    const commissions = await prisma.referralCommission.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        partner: { select: { id: true, email: true, name: true } },
        referred: { select: { id: true, email: true, name: true } }
      }
    });
    return res.json({ commissions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur chargement commissions." });
  }
});

paymentsRouter.patch("/admin/commissions/:id/paid", authMiddleware, async (req, res) => {
  try {
    const authReq = req as AuthRequest;
    const organizerId = authReq.user?.id;
    if (!organizerId) return res.status(401).json({ message: "Organisateur non authentifie." });
    const isAdmin = await ensureSuperAdmin(organizerId);
    if (!isAdmin) return res.status(403).json({ message: "Acces interdit." });
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Id invalide." });
    const commission = await prisma.referralCommission.findUnique({ where: { id } });
    if (!commission) return res.status(404).json({ message: "Commission introuvable." });
    await prisma.referralCommission.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date() }
    });
    return res.json({ message: "Commission marquee comme payee." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur mise a jour commission." });
  }
});
