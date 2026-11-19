"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { AccountSectionTabs } from "@/components/dashboard/AccountSectionTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authFetch, type OrganizerSettings, type ReferralCommission } from "@/lib/dashboard";
import { useToast } from "@/components/ui/Toast";

export default function DashboardSettingsPage() {
  const [settings, setSettings] = useState<OrganizerSettings | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [commissionTotals, setCommissionTotals] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activatingReferral, setActivatingReferral] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    async function init() {
      try {
        const [settingsRes, meRes, commissionsRes] = await Promise.all([
          authFetch("/auth/settings"),
          authFetch("/auth/me"),
          authFetch("/auth/commissions")
        ]);

        if (settingsRes.ok) {
          const payload = (await settingsRes.json()) as { settings: OrganizerSettings };
          setSettings(payload.settings);
        }

        if (meRes.ok) {
          const payload = (await meRes.json()) as { organizer?: { referralCode?: string | null } };
          setReferralCode(payload.organizer?.referralCode ?? null);
        }

        if (commissionsRes.ok) {
          const payload = (await commissionsRes.json()) as { commissions: ReferralCommission[]; totals: { total: number; paid: number; pending: number } };
          setCommissions(payload.commissions || []);
          setCommissionTotals(payload.totals || { total: 0, paid: 0, pending: 0 });
        }
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await authFetch("/auth/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Mise a jour impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { settings: OrganizerSettings };
      setSettings(payload.settings);
      pushToast("Préférences enregistrées.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function activateReferral() {
    setActivatingReferral(true);
    try {
      const res = await authFetch("/auth/referral/activate", { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Activation impossible.", "error");
        return;
      }
      const payload = (await res.json()) as { referralCode: string };
      setReferralCode(payload.referralCode);
      pushToast("Programme partenaire active.");
    } finally {
      setActivatingReferral(false);
    }
  }

  return (
    <main className="space-y-6 pb-8 font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Préférences" description="Configurez les notifications, les paramètres par défaut et vos préférences d’utilisation." />

        <AccountSectionTabs active="settings" />

        <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr]">
          <section className="order-2 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:order-2">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Programme partenaire</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Invitez des organisateurs</h2>
              </div>
              <p className="text-sm leading-6 text-slate-600">Suivez votre code de parrainage et les commissions associées à vos invitations.</p>
              {referralCode ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Code: <span className="font-semibold text-slate-900">{referralCode}</span>
                </div>
              ) : (
                <Button type="button" className="w-full rounded-2xl px-5 py-3 text-sm" onClick={activateReferral} disabled={activatingReferral}>
                  {activatingReferral ? "Activation..." : "Activer le programme"}
                </Button>
              )}
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">${commissionTotals.total}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Payé</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">${commissionTotals.paid}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">En attente</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">${commissionTotals.pending}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 space-y-5 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:order-1">
            {!settings ? (
              <EmptyState title={loading ? "Chargement des préférences" : "Préférences indisponibles"} description={loading ? "Vos réglages sont en cours de chargement." : "Impossible de charger vos réglages pour le moment."} />
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Préférences du compte</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Notifications et paramètres par défaut</h2>
                  <p className="text-sm leading-6 text-slate-600">Les changements sont enregistrés uniquement après validation du formulaire.</p>
                </div>

                <form onSubmit={saveSettings} className="space-y-6">
                  <section className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Canaux et alertes</h3>
                      <p className="mt-1 text-sm text-slate-600">Choisissez les communications que vous souhaitez recevoir.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["emailNotifications", "Notifications par e-mail", "Informations et rappels importants."],
                        ["messageNotifications", "Nouveaux messages", "Alertes lorsque des invités vous écrivent."],
                        ["eventAlerts", "Alertes événement", "Mises à jour liées à vos événements."],
                        ["marketingNotifications", "Actualités EVENTIA", "Conseils et nouveautés produit."],
                      ] as const).map(([key, label, description]) => (
                        <label key={key} className="flex min-h-[76px] items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300">
                          <span>
                            <span className="block text-sm font-medium text-slate-900">{label}</span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={settings[key]}
                            onChange={e => setSettings(previous => previous ? { ...previous, [key]: e.target.checked } : previous)}
                          />
                          <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-slate-900 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-5 peer-focus-visible:ring-4 peer-focus-visible:ring-slate-200" />
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Langue et format</h3>
                      <p className="mt-1 text-sm text-slate-600">Définissez les conventions utilisées dans votre espace.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Langue</label>
                      <Input value={settings?.language ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, language: e.target.value } : prev))} placeholder="fr" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Fuseau horaire</label>
                      <Input value={settings?.timezone ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, timezone: e.target.value } : prev))} placeholder="Africa/Kinshasa" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Format date</label>
                      <Input value={settings?.dateFormat ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, dateFormat: e.target.value } : prev))} placeholder="DD/MM/YYYY" />
                    </div>
                    </div>
                  </section>

                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Valeurs d’événement par défaut</h3>
                      <p className="mt-1 text-sm text-slate-600">Ces valeurs préremplissent la création de vos prochains événements.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Heure par defaut</label>
                      <Input value={settings?.defaultEventTime ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, defaultEventTime: e.target.value } : prev))} placeholder="18:00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Type d’événement</label>
                      <Input value={settings?.defaultEventType ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, defaultEventType: e.target.value } : prev))} placeholder="mariage" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">QR code actif</label>
                      <label className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <span>Activer QR code par defaut</span>
                        <input type="checkbox" className="accent-slate-900" checked={settings?.defaultQrEnabled ?? false} onChange={e => setSettings(prev => (prev ? { ...prev, defaultQrEnabled: e.target.checked } : prev))} />
                      </label>
                    </div>
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Enregistrement manuel : vos modifications restent en attente jusqu’à validation.</p>
                    <Button type="submit" className="rounded-2xl px-5 py-3 text-sm" disabled={savingSettings || !settings}>
                      {savingSettings ? "Enregistrement…" : "Enregistrer les préférences"}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Performance partenaire</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Suivi des commissions</h2>
            </div>
            <p className="text-sm text-slate-500">{commissions.length} mouvement(s) enregistré(s)</p>
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200/80 bg-slate-50">
            {commissions.length === 0 ? (
              <EmptyState title="Aucune commission" description="Invitez un organisateur pour commencer." />
            ) : (
              <div className="space-y-2 p-4 text-sm">
                {commissions.map(item => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-[18px] border border-white bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">${item.amount}</p>
                      <p className="text-slate-500">{item.referred?.name || item.referred?.email || "Organisateur refere"}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-slate-700">{item.status}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}




