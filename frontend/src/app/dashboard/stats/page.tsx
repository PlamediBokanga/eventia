"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

type EventStats = {
  guests: {
    total: number;
    confirmed: number;
    canceled: number;
    pending: number;
    present: number;
    attendanceRate: number;
  };
  qr: {
    scanned: number;
    refused: number;
    pending: number;
  };
  invitations: {
    total: number;
    sent: number;
  };
  tables: Array<{ id: number; label: string; capacity: number; guestCount: number }>;
  activity: {
    messages: number;
    guestbookMessages: number;
    memories: number;
    photos: number;
    videos: number;
  };
  confirmationsSeries: Array<{ day: string; count: number }>;
  revenue: {
    amount: number;
    plan: string;
  };
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function pct(current: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, (current / total) * 100));
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

export default function DashboardStatsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!selectedEvent) return;
    const eventId = selectedEvent.id;
    async function loadStats() {
      const res = await authFetch(`/events/${eventId}/stats`);
      if (!res.ok) {
        setStats(null);
        return;
      }
      setStats((await res.json()) as EventStats);
    }
    void loadStats();
  }, [selectedEvent?.id]);

  const maxConfirm = useMemo(() => {
    if (!stats?.confirmationsSeries?.length) return 0;
    return Math.max(...stats.confirmationsSeries.map(item => item.count));
  }, [stats?.confirmationsSeries]);

  const tableLoad = useMemo(() => {
    if (!stats?.tables?.length) return 0;
    return stats.tables.reduce((total, table) => total + pct(table.guestCount, table.capacity || table.guestCount || 1), 0) / stats.tables.length;
  }, [stats?.tables]);

  const confirmationsGrowth = useMemo(() => {
    if (!stats?.confirmationsSeries?.length) return 0;
    if (stats.confirmationsSeries.length === 1) return stats.confirmationsSeries[0].count;
    const last = stats.confirmationsSeries.at(-1)?.count ?? 0;
    const prev = stats.confirmationsSeries.at(-2)?.count ?? 0;
    return last - prev;
  }, [stats?.confirmationsSeries]);

  const estimatedAttendance = useMemo(() => {
    if (!stats) return 0;
    const momentum = Math.max(stats.guests.confirmed, stats.qr.scanned, stats.guests.present);
    return Math.min(stats.guests.total, Math.round(momentum + stats.guests.pending * 0.2));
  }, [stats]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Statistiques" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Pilotage événement</p>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">Statistiques en temps réel</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Suivi des confirmations, des scans QR, des tables, de l’activité et des revenus dans une vue claire, exploitable le jour J.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Participation</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{stats?.guests.attendanceRate ?? 0}%</p>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Tables remplies</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{Math.round(tableLoad)}%</p>
              </div>
              <div className="rounded-[22px] border border-slate-200/80 bg-slate-950 px-4 py-3 shadow-sm text-white">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Prévision</p>
                <p className="mt-1 text-2xl font-semibold">{stats ? estimatedAttendance : 0}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-4 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Événement cible</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Choisir le contexte des statistiques</h3>
            </div>
            {loading ? <p className="text-sm text-slate-600">Chargement...</p> : null}
          </div>
          {loading ? (
            <p className="text-sm text-slate-600">Chargement des événements...</p>
          ) : events.length === 0 ? (
            <EmptyState title="Aucun événement" description="Créez un événement pour afficher les statistiques." />
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
        </section>

        {!stats ? (
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl">
            <EmptyState
              title="Aucune statistique disponible"
              description="Sélectionnez un événement pour afficher le résumé, les graphiques et les détails opérationnels."
            />
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Invités total", value: stats.guests.total, barClass: "bg-slate-200" },
                { label: "Confirmés", value: stats.guests.confirmed, barClass: "bg-emerald-200" },
                { label: "Présents", value: stats.guests.present, barClass: "bg-amber-200" },
                { label: "Taux participation", value: `${stats.guests.attendanceRate}%`, barClass: "bg-indigo-200" }
              ].map(card => (
                <div key={card.label} className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{card.value}</p>
                  <div className={`mt-3 h-1.5 rounded-full ${card.barClass}`} />
                </div>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Évolution</p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-900">Confirmations par jour</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                    {stats.confirmationsSeries.length} jours
                  </span>
                </div>
                {stats.confirmationsSeries.length === 0 ? (
                  <p className="text-sm text-slate-600">Pas encore de confirmations.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.confirmationsSeries.map(item => (
                      <div key={item.day} className="grid grid-cols-[84px,1fr,40px] items-center gap-3 text-xs">
                        <span className="text-slate-600">{item.day}</span>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-slate-950 to-indigo-500"
                            style={{ width: `${maxConfirm ? (item.count / maxConfirm) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-right font-semibold text-slate-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">QR scan</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Flux check-in</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Entrées scannées", value: stats.qr.scanned, color: "text-emerald-700" },
                    { label: "Refusées", value: stats.qr.refused, color: "text-rose-700" },
                    { label: "En attente", value: stats.qr.pending, color: "text-amber-700" }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">{item.label}</span>
                      <span className={`text-lg font-semibold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-950 px-4 py-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Insight</p>
                  <p className="mt-2 text-sm leading-6 text-white/88">
                    {stats.qr.refused > 0
                      ? "Certaines invitations ont été refusées: surveillez les doublons, les QR expirés ou les invitations non valides."
                      : "Le flux QR est fluide. Continuez à surveiller l'arrivée des invités en direct."}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Tables</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Occupation par table</h3>
                </div>
                {stats.tables.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucune table.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.tables.map(table => {
                      const occupancy = pct(table.guestCount, table.capacity || table.guestCount || 1);
                      return (
                        <div key={table.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{table.label}</p>
                              <p className="mt-1 text-xs text-slate-500">{table.guestCount}/{table.capacity || "-"} places</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                              {Math.round(occupancy)}%
                            </span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200">
                            <div className="h-2 rounded-full bg-gradient-to-r from-slate-950 to-indigo-500" style={{ width: `${occupancy}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Activité</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Messages et souvenirs</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Messages chat", value: stats.activity.messages },
                    { label: "Livre d'or", value: stats.activity.guestbookMessages },
                    { label: "Photos partagées", value: stats.activity.photos },
                    { label: "Vidéos", value: stats.activity.videos }
                  ].map(item => (
                    <div key={item.label} className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-950 px-4 py-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Volume total</p>
                  <p className="mt-2 text-sm leading-6 text-white/85">
                    {stats.activity.photos + stats.activity.videos} médias et {stats.activity.messages + stats.activity.guestbookMessages} messages recueillis.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Revenus</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Monétisation</h3>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Total payé</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(stats.revenue.amount)}</p>
                  </div>
                  <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Plan utilisé</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.revenue.plan}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Vue globale</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Lecture rapide</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Total invités", value: stats.guests.total },
                    { label: "Confirmés", value: stats.guests.confirmed },
                    { label: "En attente", value: stats.guests.pending },
                    { label: "Annulés", value: stats.guests.canceled },
                    { label: "QR valides", value: stats.qr.scanned },
                    { label: "QR refusés", value: stats.qr.refused }
                  ].map(item => (
                    <div key={item.label} className="rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-4 py-4 text-white">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Projection</p>
                  <p className="mt-2 text-sm leading-6 text-white/88">
                    Projection d'assistance: {estimatedAttendance} personnes. Variation récente: {formatSigned(confirmationsGrowth)} confirmation(s).
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
