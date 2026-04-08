"use client";

import { useEffect, useState } from "react";
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

  async function approvePayment(id: number) {
    const res = await authFetch(`/payments/admin/${id}/approve`, { method: "PATCH" });
    if (!res.ok) return;
    const listRes = await authFetch("/payments/admin/list");
    if (listRes.ok) {
      const payload = (await listRes.json()) as { payments: AdminPayment[] };
      setPayments(payload.payments ?? []);
    }
    const statsRes = await authFetch("/payments/admin/stats");
    if (statsRes.ok) {
      setStats((await statsRes.json()) as AdminStats);
    }
  }

  async function markCommissionPaid(id: number) {
    const res = await authFetch(`/payments/admin/commissions/${id}/paid`, { method: "PATCH" });
    if (!res.ok) return;
    const commRes = await authFetch("/payments/admin/commissions");
    if (commRes.ok) {
      const payload = (await commRes.json()) as { commissions: AdminCommission[] };
      setCommissions(payload.commissions ?? []);
    }
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <Header title="Super Admin" />
        <section className="card p-4 text-small">Chargement...</section>
      </main>
    );
  }

  if (me?.role !== "superadmin") {
    return (
      <main className="space-y-4">
        <Header title="Super Admin" />
        <section className="card p-4">
          <EmptyState title="Acces refuse" description="Cette section est reservee au super admin." />
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <Header title="Super Admin" />

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Revenus</p>
          <p className="mt-1 text-2xl font-semibold">${stats?.revenue ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Paiements</p>
          <p className="mt-1 text-2xl font-semibold">{stats?.payments ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Evenements</p>
          <p className="mt-1 text-2xl font-semibold">{stats?.events ?? 0}</p>
        </div>
      </section>

      {stats?.monthly && stats.monthly.length > 0 ? (
        <section className="card p-4 space-y-2">
          <h2 className="title-4">Revenus par mois</h2>
          <div className="grid gap-2 text-xs">
            {stats.monthly.map(item => (
              <div key={item.month} className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                <span>{item.month}</span>
                <span className="font-semibold">${item.amount}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="title-4">Paiements</h2>
          <span className="text-small text-textSecondary">{payments.length} transaction(s)</span>
        </div>
        {payments.length === 0 ? (
          <EmptyState title="Aucun paiement" description="Aucune transaction pour le moment." />
        ) : (
          <div className="space-y-2 text-xs">
            {payments.map(payment => (
              <div key={payment.id} className="rounded-xl border border-primary/10 bg-white/70 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {payment.organizer?.name || payment.organizer?.email || "Organisateur"}
                    </p>
                    <p className="text-[11px] text-text/60">
                      {payment.planCode} · {payment.planType} · {payment.provider}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${payment.amount}</p>
                    <p className="text-[11px] text-text/60">{payment.status}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-text/70">
                  <span>{payment.event?.name ?? "Sans evenement"}</span>
                  <span>{new Date(payment.createdAt).toLocaleString("fr-FR")}</span>
                </div>
                {payment.status !== "PAID" ? (
                  <div className="mt-2">
                    <Button className="px-3 py-1 text-xs" onClick={() => approvePayment(payment.id)}>
                      Valider paiement
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="title-4">Commissions partenaires</h2>
          <span className="text-small text-textSecondary">{commissions.length} commission(s)</span>
        </div>
        {commissions.length === 0 ? (
          <EmptyState title="Aucune commission" description="Aucune commission generee." />
        ) : (
          <div className="space-y-2 text-xs">
            {commissions.map(item => (
              <div key={item.id} className="rounded-xl border border-primary/10 bg-white/70 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.partner?.name || item.partner?.email || "Partenaire"}</p>
                    <p className="text-[11px] text-text/60">
                      Invite: {item.referred?.name || item.referred?.email || "Client"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${item.amount}</p>
                    <p className="text-[11px] text-text/60">{item.status}</p>
                  </div>
                </div>
                {item.status !== "PAID" ? (
                  <div className="mt-2">
                    <Button className="px-3 py-1 text-xs" onClick={() => markCommissionPaid(item.id)}>
                      Marquer payee
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
