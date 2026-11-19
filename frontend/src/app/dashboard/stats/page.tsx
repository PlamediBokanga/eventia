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

export default function DashboardStatsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [retryStats, setRetryStats] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await authFetch("/events");
        if (!res.ok) throw new Error("events_load_failed");
        const data = (await res.json()) as EventItem[];
        if (!active) return;
        setEvents(data);
        if (data.length > 0) {
          const savedId = getSelectedEventId();
          const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
          setSelectedEvent(chosen);
          setSelectedEventId(chosen.id);
        }
      } catch {
        if (active) setEventsError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedEvent) {
      setStats(null);
      return;
    }
    let active = true;
    const eventId = selectedEvent.id;
    async function loadStats() {
      setStatsLoading(true);
      setStatsError(false);
      setStats(null);
      try {
        const res = await authFetch(`/events/${eventId}/stats`);
        if (!res.ok) throw new Error("stats_load_failed");
        const data = (await res.json()) as EventStats;
        if (active) setStats(data);
      } catch {
        if (active) setStatsError(true);
      } finally {
        if (active) setStatsLoading(false);
      }
    }
    void loadStats();
    return () => { active = false; };
  }, [selectedEvent?.id, retryStats]);

  const maxConfirm = useMemo(() => {
    if (!stats?.confirmationsSeries?.length) return 0;
    return Math.max(...stats.confirmationsSeries.map(item => item.count));
  }, [stats?.confirmationsSeries]);

  return (
    <main className="space-y-6 pb-8 font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Statistiques" description="Suivez les réponses, la participation et l’organisation de votre événement." />

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contexte</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">Statistiques de l’événement</h3>
            </div>
            {loading ? <p className="text-sm text-slate-600">Chargement...</p> : null}
          </div>
          {loading ? (
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" role="status">Chargement des événements…</div>
          ) : eventsError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900" role="alert">
              Impossible de charger les événements. Actualisez la page pour réessayer.
            </p>
          ) : events.length === 0 ? (
            <EmptyState title="Aucun événement" description="Créez un événement pour afficher les statistiques." />
          ) : (
            <EventPicker
              events={events}
              selectedEventId={selectedEvent?.id}
              onSelect={event => {
                setSelectedEvent(event);
                setSelectedEventId(event.id);
                setStats(null);
              }}
            />
          )}
        </section>

        {statsLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" role="status">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-48 rounded bg-slate-200" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map(item => <div key={item} className="h-28 rounded-2xl bg-slate-100" />)}
              </div>
              <p className="text-sm text-slate-600">Chargement des statistiques…</p>
            </div>
          </section>
        ) : statsError ? (
          <section className="flex flex-col gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div>
              <h2 className="font-semibold text-rose-950">Statistiques indisponibles</h2>
              <p className="mt-1 text-sm text-rose-900">Les données de cet événement n’ont pas pu être récupérées.</p>
            </div>
            <button type="button" onClick={() => setRetryStats(value => value + 1)} className="min-h-11 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100">
              Réessayer
            </button>
          </section>
        ) : !selectedEvent ? (
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl">
            <EmptyState
              title={eventsError ? "Événements indisponibles" : "Aucun événement sélectionné"}
              description={eventsError ? "Vérifiez votre connexion et actualisez la page." : "Créez ou sélectionnez un événement pour consulter ses indicateurs."}
            />
          </section>
        ) : !stats ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <EmptyState title="Aucune statistique disponible" description="Les indicateurs apparaîtront dès que l’événement aura des données." />
          </section>
        ) : (
          <>
            <section aria-label="Indicateurs clés" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Invités", value: stats.guests.total, note: "Inscrits à l’événement", barClass: "bg-slate-800", progress: 100 },
                { label: "Confirmés", value: stats.guests.confirmed, note: `${Math.round(pct(stats.guests.confirmed, stats.guests.total))}% du total`, barClass: "bg-emerald-600", progress: pct(stats.guests.confirmed, stats.guests.total) },
                { label: "Présents", value: stats.guests.present, note: "Entrées enregistrées", barClass: "bg-amber-500", progress: pct(stats.guests.present, stats.guests.total) },
                { label: "Taux de présence", value: `${stats.guests.attendanceRate}%`, note: "Présents sur le total des invités", barClass: "bg-blue-700", progress: stats.guests.attendanceRate }
              ].map(card => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-950">{card.value}</p>
                  <p className="mt-1 min-h-5 text-xs text-slate-600">{card.note}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(card.progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`${card.label}: ${Math.round(card.progress)}%`}>
                    <div className={`h-full rounded-full transition-[width] ${card.barClass}`} style={{ width: `${Math.min(100, Math.max(0, card.progress))}%` }} />
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Évolution</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-900">Réponses des invités par jour</h3>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
                    {stats.confirmationsSeries.length} jours
                  </span>
                </div>
                {stats.confirmationsSeries.length === 0 ? (
                  <p className="text-sm text-slate-600">Pas encore de confirmations.</p>
                ) : (
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {stats.confirmationsSeries.map(item => (
                      <div key={item.day} className="grid grid-cols-[84px,1fr,40px] items-center gap-3 text-xs">
                        <span className="text-slate-600">{item.day}</span>
                        <div className="h-2 rounded-full bg-slate-100" role="progressbar" aria-valuenow={item.count} aria-valuemin={0} aria-valuemax={maxConfirm || 1} aria-label={`${item.count} réponses le ${item.day}`}>
                          <div className="h-2 rounded-full bg-slate-800" style={{ width: `${maxConfirm ? Math.max(2, (item.count / maxConfirm) * 100) : 0}%` }} />
                        </div>
                        <span className="text-right font-semibold text-slate-900">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">QR scan</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Flux check-in</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Entrées enregistrées", value: stats.qr.scanned, color: "text-emerald-800" },
                    { label: "Non encore pointés", value: stats.qr.pending, color: "text-amber-800" }
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3">
                      <span className="text-slate-600">{item.label}</span>
                      <span className={`text-lg font-semibold ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">Refus de scan</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Cette donnée n’est pas encore suivie par le système. Les refus ne sont donc pas comptabilisés ici.</p>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Tables</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Occupation par table</h3>
                </div>
                {stats.tables.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucune table.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.tables.map(table => {
                      const occupancy = table.capacity > 0 ? pct(table.guestCount, table.capacity) : null;
                      return (
                        <div key={table.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">{table.label}</p>
                              <p className="mt-1 text-xs text-slate-600">{table.capacity > 0 ? `${table.guestCount}/${table.capacity} places` : `${table.guestCount} invité(s) attribué(s) · capacité non définie`}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900 shadow-sm">
                              {occupancy === null ? "—" : `${Math.round(occupancy)}%`}
                            </span>
                          </div>
                          {occupancy !== null ? (
                            <div className="mt-3 h-2 rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(occupancy)} aria-valuemin={0} aria-valuemax={100} aria-label={`${table.label}: ${Math.round(occupancy)}% de capacité utilisée`}>
                              <div className="h-2 rounded-full bg-slate-800" style={{ width: `${occupancy}%` }} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Volume total</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {stats.activity.photos + stats.activity.videos} médias et {stats.activity.messages + stats.activity.guestbookMessages} messages recueillis.
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Vue globale</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">Lecture rapide</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { label: "Confirmés", value: stats.guests.confirmed },
                    { label: "En attente de réponse", value: stats.guests.pending },
                    { label: "Indisponibles", value: stats.guests.canceled },
                    { label: "Invitations envoyées", value: stats.invitations.sent },
                    { label: "Entrées enregistrées", value: stats.qr.scanned }
                  ].map(item => (
                    <div key={item.label} className="rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-5 text-slate-500">Les réponses par jour regroupent les invitations ayant reçu une réponse, qu’elle soit positive ou négative.</p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
