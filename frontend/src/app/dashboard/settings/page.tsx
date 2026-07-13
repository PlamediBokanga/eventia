"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem, type OrganizerSettings, type ReferralCommission } from "@/lib/dashboard";
import { useToast } from "@/components/ui/Toast";

export default function DashboardSettingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
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
        const [eventsRes, settingsRes, meRes, commissionsRes] = await Promise.all([
          authFetch("/events"),
          authFetch("/auth/settings"),
          authFetch("/auth/me"),
          authFetch("/auth/commissions")
        ]);

        if (eventsRes.ok) {
          const eventData = (await eventsRes.json()) as EventItem[];
          setEvents(eventData);
          if (eventData.length > 0) {
            const savedId = getSelectedEventId();
            const chosen = (savedId && eventData.find(event => event.id === savedId)) || eventData[0];
            setSelectedEvent(chosen);
            setSelectedEventId(chosen.id);
          }
        }

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
      pushToast("Parametres enregistres.");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Parametres" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Preferences compte</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Notifications et parametres par defaut</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Ajustez vos rappels, vos canaux de communication et les preferences qui s'appliquent automatiquement a vos prochains evenements.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Rappels</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Actifs</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Mode</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Personnalise</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Partenaire</p>
                <p className="mt-1 text-lg font-semibold">Disponible</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr,1.4fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Evenement</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choisir le contexte</h2>
            </div>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : events.length === 0 ? (
              <EmptyState title="Aucun evenement" description="Creez un evenement pour personnaliser vos parametres." />
            ) : (
              <EventPicker
                events={events}
                selectedEventId={selectedEvent?.id}
                onSelect={event => {
                  setSelectedEvent(event);
                  setSelectedEventId(event.id);
                }}
              />
            )}

            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Programme partenaire</p>
              <p className="text-sm leading-6 text-slate-600">Invitez d'autres organisateurs et suivez vos gains depuis le meme tableau de bord.</p>
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
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Paye</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">${commissionTotals.paid}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">En attente</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">${commissionTotals.pending}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-5">
            {!selectedEvent ? (
              <EmptyState title="Selection requise" description="Choisissez un evenement pour charger ses parametres." />
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Rappels automatiques</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Programmation des messages</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Definissez les rappels, les canaux et les preferences par defaut pour gagner du temps sur chaque nouvel evenement.
                  </p>
                </div>

                <form onSubmit={saveSettings} className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {["7 jours avant", "3 jours avant", "1 jour avant", "Jour J"].map(label => (
                      <label key={label} className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm">
                        <span>{label}</span>
                        <input type="checkbox" defaultChecked className="accent-slate-900" />
                      </label>
                    ))}
                  </div>

                  <div className="rounded-[22px] border border-slate-200/80 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Message par defaut</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Le systeme utilise vos preferences pour generer des rappels coherents et professionnels.
                    </p>
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      Apercu: rappel pour votre evenement <span className="font-semibold text-slate-900">{settings?.defaultEventType || "mariage"}</span> a <span className="font-semibold text-slate-900">{settings?.defaultEventTime || "18:00"}</span>.
                    </div>
                    <p className="mt-3 text-sm text-slate-500">Variables: {"{event}"} {"{date}"} {"{location}"} {"{name}"}</p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200/80 bg-slate-50 p-4 space-y-4">
                    <p className="text-sm font-semibold text-slate-900">Canaux disponibles</p>
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      {["WhatsApp", "SMS"].map(label => (
                        <label key={label} className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2">
                          <input type="checkbox" defaultChecked className="accent-slate-900" />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
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
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Heure par defaut</label>
                      <Input value={settings?.defaultEventTime ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, defaultEventTime: e.target.value } : prev))} placeholder="18:00" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Type evenement</label>
                      <Input value={settings?.defaultEventType ?? ""} onChange={e => setSettings(prev => (prev ? { ...prev, defaultEventType: e.target.value } : prev))} placeholder="mariage" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">QR code actif</label>
                      <label className="flex items-center justify-between rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <span>Activer le QR code par defaut</span>
                        <input type="checkbox" className="accent-slate-900" checked={settings?.defaultQrEnabled ?? false} onChange={e => setSettings(prev => (prev ? { ...prev, defaultQrEnabled: e.target.checked } : prev))} />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Les parametres s'appliquent a vos futurs evenements et restent modifiables a tout moment.</p>
                    <Button type="submit" className="rounded-2xl px-5 py-3 text-sm" disabled={savingSettings || !settings}>
                      {savingSettings ? "Enregistrement..." : "Enregistrer les parametres"}
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
            <p className="text-sm text-slate-500">{commissions.length} mouvement(s) enregistres</p>
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