"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type BillingOverview,
  type EventItem
} from "@/lib/dashboard";

type Plan = {
  code: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  type: "EVENT" | "SUBSCRIPTION";
};

const EVENT_PLANS: Plan[] = [
  {
    code: "BASIC",
    name: "Pack Basic",
    price: 15,
    description: "Pour petits evenements",
    type: "EVENT",
    features: ["1 evenement", "Jusqu'a 100 invites", "QR code invitation", "Confirmation presence", "Choix boissons", "Livre d'or numerique", "Dashboard organisateur"]
  },
  {
    code: "STANDARD",
    name: "Pack Standard",
    price: 35,
    description: "Le plus vendu",
    type: "EVENT",
    features: ["1 evenement", "Jusqu'a 300 invites", "Toutes les fonctions Basic", "Statistiques completes", "Export PDF invites", "Export livre d'or"]
  },
  {
    code: "PREMIUM",
    name: "Pack Premium",
    price: 75,
    description: "Pour evenements importants",
    type: "EVENT",
    features: ["1 evenement", "Jusqu'a 700 invites", "Toutes les fonctions Standard", "Scan QR code le jour J", "Theme personnalise", "Support prioritaire"]
  }
];

const SUB_PLANS: Plan[] = [
  {
    code: "PRO_ORGANIZER",
    name: "Pro Organizer",
    price: 19,
    description: "Wedding planners",
    type: "SUBSCRIPTION",
    features: ["Jusqu'a 5 evenements / mois", "300 invites / evenement", "Statistiques completes", "Export donnees"]
  },
  {
    code: "AGENCY",
    name: "Agency",
    price: 49,
    description: "Agences evenementielles",
    type: "SUBSCRIPTION",
    features: ["Evenements illimites", "Jusqu'a 500 invites", "Theme personnalise", "Branding agence"]
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    price: 99,
    description: "Grandes structures",
    type: "SUBSCRIPTION",
    features: ["Invites illimites", "Support VIP", "API future", "Multi-utilisateurs"]
  }
];

const ADDONS = [
  { code: "WHATSAPP_SMS", name: "Notification WhatsApp / SMS", price: 5 },
  { code: "THEME_CUSTOM", name: "Theme personnalise", price: 10 },
  { code: "PDF_PREMIUM", name: "Invitation PDF premium", price: 5 },
  { code: "REPORT", name: "Rapport evenement", price: 7 }
];

export default function BillingPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Airtel Money");
  const [manualStep, setManualStep] = useState<"FORM" | "INSTRUCTIONS">("FORM");
  const [manualInfo, setManualInfo] = useState<{ paymentId: number; number: string; name: string } | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, overviewRes] = await Promise.all([authFetch("/events"), authFetch("/payments/overview")]);

        if (eventsRes.ok) {
          const data = (await eventsRes.json()) as EventItem[];
          setEvents(data);
          if (data.length > 0) {
            const savedId = getSelectedEventId();
            const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
            setSelectedEvent(chosen);
            setSelectedEventId(chosen.id);
          }
        }

        if (overviewRes.ok) {
          const payload = (await overviewRes.json()) as BillingOverview;
          setOverview(payload);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function startPayment(plan: Plan) {
    setPaying(plan.code);
    try {
      if (plan.type === "EVENT" && !selectedEvent) {
        pushToast("Selectionnez un evenement.", "error");
        return;
      }
      const res = await authFetch("/payments/flutterwave/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan.code, planType: plan.type, eventId: plan.type === "EVENT" ? selectedEvent?.id : undefined })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Paiement impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { paymentLink: string };
      window.location.href = payload.paymentLink;
    } finally {
      setPaying(null);
    }
  }

  async function startManualPayment() {
    if (!selectedPlan) return;
    if (selectedPlan.type === "EVENT" && !selectedEvent) {
      pushToast("Selectionnez un evenement.", "error");
      return;
    }
    setPaying("manual");
    try {
      const res = await authFetch("/payments/manual/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: selectedPlan.code,
          planType: selectedPlan.type,
          eventId: selectedPlan.type === "EVENT" ? selectedEvent?.id : undefined,
          method: paymentMethod
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Paiement impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { paymentId: number; number: string; name: string };
      setManualInfo(payload);
      setManualStep("INSTRUCTIONS");
    } finally {
      setPaying(null);
    }
  }

  async function confirmManualPayment() {
    if (!manualInfo) return;
    const res = await authFetch("/payments/manual/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: manualInfo.paymentId })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      pushToast(payload?.message ?? "Confirmation impossible.", "error");
      return;
    }
    pushToast("Paiement en attente de validation.");
    setManualStep("FORM");
    setManualInfo(null);
    const overviewRes = await authFetch("/payments/overview");
    if (overviewRes.ok) {
      const payload = (await overviewRes.json()) as BillingOverview;
      setOverview(payload);
    }
  }

  const activeSubscription = overview?.subscription;
  const paymentHistory = overview?.payments ?? [];
  const selectedEventPlan = selectedEvent?.paidPlanCode ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Paiement & Abonnements" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Monétisation</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Plans événement, abonnements et validation manuelle</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Le parcours paiement reste simple: choisir un plan, lancer le paiement, confirmer manuellement si besoin, puis activer l'accès.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Plan actif</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{activeSubscription?.plan?.name ?? activeSubscription?.planCode ?? "Aucun"}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Paiements</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{paymentHistory.length}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Statut</p>
                <p className="mt-1 text-lg font-semibold">{activeSubscription ? "Actif" : "A activer"}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.05fr,1.95fr]">
          <div className="space-y-4">
            <section className="rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-3">
              <h2 className="title-4">Événement cible</h2>
              {loading ? (
                <p className="text-small">Chargement...</p>
              ) : events.length === 0 ? (
                <EmptyState title="Aucun evenement" description="Creez un evenement pour acheter un pack." />
              ) : (
                <>
                  <EventPicker
                    events={events}
                    selectedEventId={selectedEvent?.id}
                    onSelect={event => {
                      setSelectedEvent(event);
                      setSelectedEventId(event.id);
                    }}
                  />
                  {selectedEvent ? (
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pack événement actuel</p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{selectedEventPlan || "Aucun pack actif"}</p>
                      <p className="text-slate-600">
                        {selectedEventPlan ? "Cet evenement dispose deja d'un plan paye." : "Choisissez un pack pour debloquer les fonctions avancees."}
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-3">
              <h2 className="title-4">Abonnement actif</h2>
              {!activeSubscription ? (
                <EmptyState title="Aucun abonnement actif" description="Vous pouvez continuer avec des packs événement ou activer un abonnement mensuel." />
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Plan courant</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{activeSubscription.plan?.name ?? activeSubscription.planCode}</p>
                    <p className="text-slate-600">Actif jusqu'au {new Date(activeSubscription.currentPeriodEnd).toLocaleDateString("fr-FR")}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Evenements utilises</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{overview?.usage?.eventsUsed ?? 0}{overview?.usage?.eventLimit ? ` / ${overview.usage.eventLimit}` : ""}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Capacite invites</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{overview?.usage?.guestLimit ? overview.usage.guestLimit : "Selon plan"}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="title-4">Historique récent</h2>
                <span className="text-small">{paymentHistory.length} paiement(s)</span>
              </div>
              {paymentHistory.length === 0 ? (
                <EmptyState title="Aucun paiement" description="Vos transactions apparaitront ici." />
              ) : (
                <div className="space-y-2">
                  {paymentHistory.map(payment => (
                    <div key={payment.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{payment.planCode} · {payment.planType === "EVENT" ? "Evenement" : "Abonnement"}</p>
                        <p className="text-slate-600">{payment.event?.name ?? payment.method ?? payment.provider}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="font-semibold text-slate-900">${payment.amount} {payment.currency}</p>
                        <p className={`text-slate-600 ${payment.status === "PAID" ? "text-emerald-600" : payment.status === "PENDING" ? "text-amber-600" : "text-rose-600"}`}>{payment.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Offres et validation</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choisir un plan puis confirmer le paiement</h2>
            </div>

            <div>
              <h3 className="title-4">Offres événement unique</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {EVENT_PLANS.map(plan => (
                  <div key={plan.code} className={`rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 space-y-2 ${selectedPlan?.code === plan.code ? "ring-2 ring-slate-950/20" : ""}`}>
                    <div>
                      <p className="text-small">{plan.description}</p>
                      <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                      <p className="text-2xl font-semibold text-slate-900">${plan.price}</p>
                    </div>
                    <ul className="space-y-1 text-small text-slate-600">
                      {plan.features.map(feature => (
                        <li key={feature}>- {feature}</li>
                      ))}
                    </ul>
                    <Button type="button" className="w-full" onClick={() => setSelectedPlan(plan)} disabled={paying === plan.code}>
                      {selectedPlan?.code === plan.code ? "Sélectionné" : "Choisir"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => startPayment(plan)} disabled={paying === plan.code}>
                      {paying === plan.code ? "Ouverture..." : "Payer en ligne"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="title-4">Abonnements</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {SUB_PLANS.map(plan => (
                  <div key={plan.code} className={`rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 space-y-2 ${selectedPlan?.code === plan.code ? "ring-2 ring-slate-950/20" : ""}`}>
                    <div>
                      <p className="text-small">{plan.description}</p>
                      <p className="text-lg font-semibold text-slate-900">{plan.name}</p>
                      <p className="text-2xl font-semibold text-slate-900">${plan.price}/mois</p>
                    </div>
                    <ul className="space-y-1 text-small text-slate-600">
                      {plan.features.map(feature => (
                        <li key={feature}>- {feature}</li>
                      ))}
                    </ul>
                    <Button type="button" variant="ghost" className="w-full" onClick={() => setSelectedPlan(plan)} disabled={paying === plan.code}>
                      {selectedPlan?.code === plan.code ? "Sélectionné" : "Choisir"}
                    </Button>
                    <Button type="button" className="w-full" onClick={() => startPayment(plan)} disabled={paying === plan.code}>
                      {paying === plan.code ? "Ouverture..." : "Payer l'abonnement"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="title-4">Options premium</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {ADDONS.map(addon => (
                  <div key={addon.code} className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900">{addon.name}</span>
                      <span className="text-slate-600">${addon.price}</span>
                    </div>
                    <p className="text-small text-slate-500">Disponible apres paiement principal.</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-4 space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Paiement Mobile Money</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Validation manuelle MVP</h3>
              </div>
              {!selectedPlan ? (
                <p className="text-small text-slate-600">Selectionnez un plan pour afficher le paiement.</p>
              ) : manualStep === "FORM" ? (
                <div className="space-y-3 text-xs">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Plan choisi</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{selectedPlan.name}</p>
                    <p className="text-slate-600">${selectedPlan.price} USD</p>
                    <p className="text-slate-600">{selectedPlan.type === "EVENT" ? `Evenement: ${selectedEvent?.name ?? "Non selectionne"}` : "Abonnement mensuel"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Méthode</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {["Airtel Money", "M-Pesa", "Orange Money"].map(method => (
                        <label key={method} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <input type="radio" name="method" checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                          <span>{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full sm:w-fit" disabled={paying === "manual"} onClick={startManualPayment}>
                    {paying === "manual" ? "Creation..." : "Payer maintenant"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-xs space-y-3">
                  <p className="font-semibold text-slate-900">Envoyez {selectedPlan.price}$ au numéro :</p>
                  <p className="text-lg font-semibold text-slate-900">{manualInfo?.number}</p>
                  <p className="text-slate-600">Nom: {manualInfo?.name}</p>
                  <Button className="w-full sm:w-fit" onClick={confirmManualPayment}>
                    J'ai payé
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
