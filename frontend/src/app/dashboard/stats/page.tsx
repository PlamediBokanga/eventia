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
    async function loadStats() {
      const res = await authFetch(`/events/${selectedEvent.id}/stats`);
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

  return (
    <main className="space-y-4">
      <Header title="Statistiques" />
      <section className="card p-4 space-y-3">
        <h2 className="title-4">Evenement cible</h2>
        {loading ? (
          <p className="text-small">Chargement...</p>
        ) : events.length === 0 ? (
          <EmptyState title="Aucun evenement" description="Creez un evenement pour afficher les statistiques." />
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
        <section className="card p-4">
          <p className="text-small">Aucune statistique disponible.</p>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Invites total</p>
              <p className="mt-1 text-2xl font-semibold">{stats.guests.total}</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-green-700">Confirmes</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{stats.guests.confirmed}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">Presents</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700">{stats.guests.present}</p>
            </div>
            <div className="rounded-2xl border border-primary/10 bg-background/70 p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Taux participation</p>
              <p className="mt-1 text-2xl font-semibold">{stats.guests.attendanceRate}%</p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr]">
            <div className="card p-4 space-y-3">
              <h3 className="title-4">Confirmations par jour</h3>
              {stats.confirmationsSeries.length === 0 ? (
                <p className="text-small">Pas encore de confirmations.</p>
              ) : (
                <div className="space-y-2">
                  {stats.confirmationsSeries.map(item => (
                    <div key={item.day} className="flex items-center gap-2 text-xs">
                      <span className="w-24 text-text/70">{item.day}</span>
                      <div className="flex-1 rounded-full bg-primary/10">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{ width: `${maxConfirm ? (item.count / maxConfirm) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="title-4">Statistiques QR Scan</h3>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Entrees scannees</span>
                  <span className="font-semibold">{stats.qr.scanned}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Refusees</span>
                  <span className="font-semibold">{stats.qr.refused}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>En attente</span>
                  <span className="font-semibold">{stats.qr.pending}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.1fr,1fr]">
            <div className="card p-4 space-y-3">
              <h3 className="title-4">Statistiques tables</h3>
              {stats.tables.length === 0 ? (
                <p className="text-small">Aucune table.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {stats.tables.map(table => (
                    <div key={table.id} className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                      <span>{table.label}</span>
                      <span className="font-semibold">
                        {table.guestCount}/{table.capacity || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-4 space-y-3">
              <h3 className="title-4">Activite</h3>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Messages chat</span>
                  <span className="font-semibold">{stats.activity.messages}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Messages livre d'or</span>
                  <span className="font-semibold">{stats.activity.guestbookMessages}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Photos partagees</span>
                  <span className="font-semibold">{stats.activity.photos}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                  <span>Videos</span>
                  <span className="font-semibold">{stats.activity.videos}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="card p-4 space-y-3">
            <h3 className="title-4">Revenus</h3>
            <div className="grid gap-2 text-xs md:grid-cols-2">
              <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text/60">Total paye</p>
                <p className="mt-1 text-lg font-semibold">${stats.revenue.amount}</p>
              </div>
              <div className="rounded-xl border border-primary/10 bg-background/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text/60">Plan utilise</p>
                <p className="mt-1 text-lg font-semibold">{stats.revenue.plan}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
