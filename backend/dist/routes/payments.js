"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentsRouter = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
exports.paymentsRouter = (0, express_1.Router)();
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
function getPlan(planCode, planType) {
    const list = planType === "EVENT" ? EVENT_PLANS : SUB_PLANS;
    return list.find(p => p.code === planCode);
}
function buildRedirectUrl() {
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000";
    return `${appUrl.replace(/\/+$/, "")}/dashboard/billing`;
}
// Initier un paiement Flutterwave
exports.paymentsRouter.post("/flutterwave/initialize", auth_1.authMiddleware, async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        const authReq = req;
        const organizerId = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!organizerId) {
            return res.status(401).json({ message: "Organisateur non authentifie." });
        }
        const { planCode, planType, eventId } = req.body;
        if (!planCode || !planType) {
            return res.status(400).json({ message: "Plan invalide." });
        }
        const plan = getPlan(planCode, planType);
        if (!plan) {
            return res.status(404).json({ message: "Plan inconnu." });
        }
        let linkedEventId = null;
        if (planType === "EVENT") {
            const event = await prisma_1.prisma.event.findUnique({ where: { id: Number(eventId) } });
            if (!event || event.organizerId !== organizerId) {
                return res.status(403).json({ message: "Evenement invalide pour ce paiement." });
            }
            linkedEventId = event.id;
        }
        const organizer = await prisma_1.prisma.organizer.findUnique({
            where: { id: organizerId },
            select: { email: true, name: true, phone: true }
        });
        const txRef = `EVT-${Date.now()}-${crypto_1.default.randomBytes(4).toString("hex")}`;
        const payment = await prisma_1.prisma.payment.create({
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
                email: (_b = organizer === null || organizer === void 0 ? void 0 : organizer.email) !== null && _b !== void 0 ? _b : "client@eventia.app",
                name: (_c = organizer === null || organizer === void 0 ? void 0 : organizer.name) !== null && _c !== void 0 ? _c : "Client Eventia",
                phonenumber: (_d = organizer === null || organizer === void 0 ? void 0 : organizer.phone) !== null && _d !== void 0 ? _d : ""
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
            const errPayload = (await fwRes.json().catch(() => ({})));
            return res.status(502).json({ message: (_e = errPayload === null || errPayload === void 0 ? void 0 : errPayload.message) !== null && _e !== void 0 ? _e : "Echec initialisation paiement." });
        }
        const fwPayload = (await fwRes.json());
        const paymentLink = (_f = fwPayload === null || fwPayload === void 0 ? void 0 : fwPayload.data) === null || _f === void 0 ? void 0 : _f.link;
        if (!paymentLink) {
            return res.status(502).json({ message: "Lien de paiement indisponible." });
        }
        await prisma_1.prisma.payment.update({
            where: { id: payment.id },
            data: { paymentLink }
        });
        return res.json({ paymentLink });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur lors de l'initialisation du paiement." });
    }
});
// Webhook Flutterwave
exports.paymentsRouter.post("/flutterwave/webhook", async (req, res) => {
    var _a, _b, _c;
    try {
        const hash = req.headers["verif-hash"];
        const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
        if (!expected || hash !== expected) {
            return res.status(401).json({ message: "Signature invalide." });
        }
        const payload = req.body;
        const txRef = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.tx_ref;
        if (!txRef)
            return res.status(400).json({ message: "tx_ref manquant." });
        const payment = await prisma_1.prisma.payment.findUnique({ where: { txRef } });
        if (!payment)
            return res.status(404).json({ message: "Paiement introuvable." });
        const status = ((_b = payload.data) === null || _b === void 0 ? void 0 : _b.status) === "successful" ? "PAID" : "FAILED";
        const providerRef = ((_c = payload.data) === null || _c === void 0 ? void 0 : _c.id) ? String(payload.data.id) : null;
        const updated = await prisma_1.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status,
                providerRef: providerRef !== null && providerRef !== void 0 ? providerRef : payment.providerRef
            }
        });
        if (status === "PAID") {
            if (updated.planType === "EVENT" && updated.eventId) {
                await prisma_1.prisma.event.update({
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
                const existing = await prisma_1.prisma.organizerSubscription.findFirst({
                    where: { organizerId: updated.organizerId }
                });
                if (existing) {
                    await prisma_1.prisma.organizerSubscription.update({
                        where: { id: existing.id },
                        data: {
                            planCode: updated.planCode,
                            status: "ACTIVE",
                            currentPeriodStart: now,
                            currentPeriodEnd: next
                        }
                    });
                }
                else {
                    await prisma_1.prisma.organizerSubscription.create({
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur webhook." });
    }
});
