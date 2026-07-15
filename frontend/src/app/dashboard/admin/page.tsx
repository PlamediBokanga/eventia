"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { authFetch, type OrganizerProfile } from "@/lib/dashboard";

type AdminStats = {
  revenue: number;
  payments: number;
  events: number;
  monthly?: Array<{ month: string; amount: number }>;
};

type AdminPayment = {
  id: number;
  amount: number;
  currency: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELED";
  planCode: string;
  planType: "EVENT" | "SUBSCRIPTION";
  provider: string;
  method?: string | null;
  createdAt: string;
  organizer?: { id: number; email: string; name?: string | null };
  event?: { id: number; name: string };
};

type AdminCommission = {
  id: number;
  amount: number;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELED";
  createdAt: string;
  partner?: { id: number; email: string; name?: string | null };
  referred?: { id: number; email: string; name?: string | null };
};

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function statusClass(status: AdminPayment["status"] | AdminCommission["status"]) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700";
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

export default function AdminDashboardPage() {
  const [me, setMe] = useState<OrganizerProfile | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [commissions, setCommissions] = useState<AdminCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await authFetch("/auth/me");
        if (meRes.ok) {
          const payload = (await meRes.json()) as { organizer: OrganizerProfile };
          setMe(payload.organizer);
        }
        const statsRes = await authFetch("/payments/admin/stats");
        if (statsRes.ok) {
          setStats((await statsRes.json()) as AdminStats);
        }
        const listRes = await authFetch("/payments/admin/list");
        if (listRes.ok) {
          const payload = (await listRes.json()) as { payments: AdminPayment[] };
          setPayments(payload.payments ?? []);
        }
        const commRes = await authFetch("/payments/admin/commissions");
        if (commRes.ok) {
          const payload = (await commRes.json()) as { commissions: AdminCommission[] };
          setCommissions(payload.commissions ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function refreshData() {
    const [statsRes, listRes, commRes] = await Promise.all([
      authFetch("/payments/admin/stats"),
      authFetch("/payments/admin/list"),
      authFetch("/payments/admin/commissions")
    ]);
    if (statsRes.ok) setStats((await statsRes.json()) as AdminStats);
    if (listRes.ok) {
      const payload = (await listRes.json()) as { payments: AdminPayment[] };
      setPayments(payload.payments ?? []);
    }
    if (commRes.ok) {
      const payload = (await commRes.json()) as { commissions: AdminCommission[] };
      setCommissions(payload.commissions ?? []);
    }
  }

  async function approvePayment(id: number) {
    const res = await authFetch(`/payments/admin/${id}/approve`, { method: "PATCH" });
    if (!res.ok) return;
    await refreshData();
  }

  async function markCommissionPaid(id: number) {
    const res = await authFetch(`/payments/admin/commissions/${id}/paid`, { method: "PATCH" });
    if (!res.ok) return;
    await refreshData();
  }

  const summaryCards = useMemo(
    () => [
      { label: "Revenus", value: money(stats?.revenue ?? 0), tone: "bg-slate-950 text-white" },
      { label: "Paiements", value: String(stats?.payments ?? 0), tone: "bg-white text-slate-900" },
      { label: "Evenements", value: String(stats?.events ?? 0), tone: "bg-white text-slate-900" }
    ],
    [stats]
  );

  if (loading) {
    return (
      <main className="space-y-4">
        <Header title="Super Admin" />
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl">Chargement...</section>
      </main>
    );
  }

  if (me?.role !== "superadmin") {
    return (
      <main className="space-y-4">
        <Header title="Super Admin" />
        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl">
          <EmptyState title="Accès refusé" description="Cette section est réservée au super admin." />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Super Admin" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Gouvernance</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Vision globale des paiements, revenus et commissions</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                La console super admin rassemble les validations de paiement, le suivi des revenus, les commissions partenaires et les signaux de pilotage.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
              {summaryCards.map(card => (
                <div key={card.label} className={`rounded-[22px] border border-slate-200/80 px-4 py-3 shadow-sm ${card.tone}`}>
                  <p className={`text-[10px] uppercase tracking-[0.24em] ${card.tone.includes("text-white") ? "text-white/60" : "text-slate-500"}`}>{card.label}</p>
                  <p className={`mt-1 text-2xl font-semibold ${card.tone.includes("text-white") ? "text-white" : "text-slate-900"}`}>{card.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {stats?.monthly && stats.monthly.length > 0 ? (
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Revenus</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Revenus par mois</h2>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
              {stats.monthly.map(item => (
                <div key={item.month} className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3">
                  <span className="text-slate-600">{item.month}</span>
                  <span className="font-semibold text-slate-900">{money(item.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Paiements</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Transactions à valider</h2>
              </div>
              <span className="text-small text-slate-500">{payments.length} transaction(s)</span>
            </div>
            {payments.length === 0 ? (
              <EmptyState title="Aucun paiement" description="Aucune transaction pour le moment." />
            ) : (
              <div className="space-y-2 text-xs">
                {payments.map(payment => (
                  <div key={payment.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{payment.organizer?.name || payment.organizer?.email || "Organisateur"}</p>
                        <p className="text-[11px] text-slate-500">{payment.planCode} · {payment.planType === "EVENT" ? "Evenement" : "Abonnement"} · {payment.provider}</p>
                        <p className="mt-1 text-sm text-slate-600">{payment.event?.name ?? payment.method ?? "Sans evenement"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">{money(payment.amount)}</p>
                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusClass(payment.status)}`}>{payment.status}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                      <span>{new Date(payment.createdAt).toLocaleString("fr-FR")}</span>
                      {payment.status !== "PAID" ? (
                        <Button className="px-3 py-1 text-xs" onClick={() => approvePayment(payment.id)}>
                          Valider paiement
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Commissions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Flux partenaires</h2>
            </div>
            {commissions.length === 0 ? (
              <EmptyState title="Aucune commission" description="Aucune commission générée." />
            ) : (
              <div className="space-y-2 text-xs">
                {commissions.map(item => (
                  <div key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.partner?.name || item.partner?.email || "Partenaire"}</p>
                        <p className="text-[11px] text-slate-500">Invite: {item.referred?.name || item.referred?.email || "Client"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-slate-900">{money(item.amount)}</p>
                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                      <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                      {item.status !== "PAID" ? (
                        <Button className="px-3 py-1 text-xs" onClick={() => markCommissionPaid(item.id)}>
                          Marquer payée
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
