"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

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
    features: [
      "1 evenement",
      "Jusqu'a 100 invites",
      "QR code invitation",
      "Confirmation presence",
      "Choix boissons",
      "Livre d'or numerique",
      "Dashboard organisateur"
    ]
  },
  {
    code: "STANDARD",
    name: "Pack Standard",
    price: 35,
    description: "Le plus vendu",
    type: "EVENT",
    features: [
      "1 evenement",
      "Jusqu'a 300 invites",
      "Toutes les fonctions Basic",
      "Statistiques completes",
      "Export PDF invites",
      "Export livre d'or"
    ]
  },
  {
    code: "PREMIUM",
    name: "Pack Premium",
    price: 75,
    description: "Pour evenements importants",
    type: "EVENT",
    features: [
      "1 evenement",
      "Jusqu'a 700 invites",
      "Toutes les fonctions Standard",
      "Scan QR code le jour J",
      "Theme personnalise",
      "Support prioritaire"
    ]
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
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch("/events");
        if (!res.ok) return;
        const data = (await res.json()) as EventItem[];
        setEvents(data);
        if (data.length > 0) {
          const savedId = getSelectedEventId();
          const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
          setSelectedEvent(chosen);
          setSelectedEventId(chosen.id);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const eventRequired = useMemo(() => EVENT_PLANS.some(p => p.type === "EVENT"), []);

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
        body: JSON.stringify({
          planCode: plan.code,
          planType: plan.type,
          eventId: plan.type === "EVENT" ? selectedEvent?.id : undefined
        })
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

  return (
    <main className="space-y-4">
      <Header title="Paiement & Abonnements" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4 space-y-3">
          <h2 className="title-4">Evenement cible</h2>
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : events.length === 0 ? (
            <EmptyState title="Aucun evenement" description="Creez un evenement pour acheter un pack." />
          ) : eventRequired ? (
            <EventPicker
              events={events}
              selectedEventId={selectedEvent?.id}
              onSelect={event => {
                setSelectedEvent(event);
                setSelectedEventId(event.id);
              }}
            />
          ) : null}
        </section>
        <section className="card p-4 space-y-5">
          <div>
            <h2 className="title-4">Offres evenement unique</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {EVENT_PLANS.map(plan => (
                <div key={plan.code} className="dashboard-card space-y-2">
                  <div>
                    <p className="text-small">{plan.description}</p>
                    <p className="text-lg font-semibold">{plan.name}</p>
                    <p className="text-2xl font-semibold">${plan.price}</p>
                  </div>
                  <ul className="space-y-1 text-small">
                    {plan.features.map(feature => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => startPayment(plan)}
                    disabled={paying === plan.code}
                  >
                    {paying === plan.code ? "Redirection..." : "Acheter"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="title-4">Abonnements</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {SUB_PLANS.map(plan => (
                <div key={plan.code} className="dashboard-card space-y-2">
                  <div>
                    <p className="text-small">{plan.description}</p>
                    <p className="text-lg font-semibold">{plan.name}</p>
                    <p className="text-2xl font-semibold">${plan.price}/mois</p>
                  </div>
                  <ul className="space-y-1 text-small">
                    {plan.features.map(feature => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => startPayment(plan)}
                    disabled={paying === plan.code}
                  >
                    {paying === plan.code ? "Redirection..." : "Souscrire"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="title-4">Options premium</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {ADDONS.map(addon => (
                <div key={addon.code} className="rounded-xl border border-primary/10 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{addon.name}</span>
                    <span className="text-textSecondary">${addon.price}</span>
                  </div>
                  <p className="text-small">Disponible apres paiement principal.</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
