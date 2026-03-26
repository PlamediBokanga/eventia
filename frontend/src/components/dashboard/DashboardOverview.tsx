"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem,
  type EventStats
} from "@/lib/dashboard";

function StatIcon({ kind }: { kind: "guests" | "ok" | "cancel" | "pending" }) {
  if (kind === "ok") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }
  if (kind === "cancel") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  if (kind === "pending") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="3" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.75" />
    </svg>
  );
}

function formatCountdown(dateTime?: string | null) {
  if (!dateTime) return "Date inconnue";
  const target = new Date(dateTime).getTime();
  const now = Date.now();
  const diff = target - now;
  if (!Number.isFinite(diff)) return "Date inconnue";
  if (diff <= 0) return "Evenement termine";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} jour(s)`;
  if (hours > 0) return `${hours} heure(s)`;
  return `${Math.max(1, minutes)} minute(s)`;
}

export function DashboardOverview({ title }: { title: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  function seatingModeLabel(mode: "TABLE" | "ZONE" | "NONE") {
    if (mode === "ZONE") return "Mode: Zones/Sections";
    if (mode === "NONE") return "Mode: Sans tables/sections";
    return "Mode: Tables";
  }

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

  const totalGuests = stats?.guests.total ?? 0;
  const confirmedRate = totalGuests > 0 ? Math.round((stats!.guests.confirmed / totalGuests) * 100) : 0;
  const canceledRate = totalGuests > 0 ? Math.round((stats!.guests.canceled / totalGuests) * 100) : 0;
  const pendingRate = totalGuests > 0 ? Math.round((stats!.guests.pending / totalGuests) * 100) : 0;
  const invitationsSent = stats?.invitations?.sent ?? 0;
  const invitationsTotal = stats?.invitations?.total ?? totalGuests;
  const seatingMode = selectedEvent?.seatingMode ?? "TABLE";
  const seatingLabel = seatingMode === "ZONE" ? "Zones" : seatingMode === "NONE" ? "Sans tables" : "Tables";
  const drinkTotal = stats?.drinks.reduce((sum, d) => sum + (d.totalQuantity ?? 0), 0) ?? 0;
  const topDrinks = stats?.drinks
    ? [...stats.drinks].sort((a, b) => (b.totalQuantity ?? 0) - (a.totalQuantity ?? 0)).slice(0, 3)
    : [];
  const countdownLabel = selectedEvent ? formatCountdown(selectedEvent.dateTime) : "";

  return (
    <main className="space-y-4">
      <Header title={title} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4 space-y-3">
          <h2 className="title-4">Evenements</h2>
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : events.length === 0 ? (
            <EmptyState
              title="Aucun evenement"
              description="Cree d'abord un evenement pour visualiser les statistiques et piloter tes invites."
            />
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
          {selectedEvent ? (
            <p className="text-small">{seatingModeLabel(selectedEvent.seatingMode ?? "TABLE")}</p>
          ) : null}
        </section>

        <section className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="title-4">Statistiques</h2>
            {selectedEvent ? (
              <span className="text-small">Temps avant: {countdownLabel}</span>
            ) : null}
          </div>
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : !stats ? (
            <p className="text-small">Chargement des statistiques...</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="guests" />
                    <p className="text-small">Invites</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">{stats.guests.total}</p>
                </div>
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="ok" />
                    <p className="text-small">Invitations envoyees</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">
                    {invitationsSent}/{invitationsTotal}
                  </p>
                </div>
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="pending" />
                    <p className="text-small">{seatingLabel}</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">
                    {seatingMode === "NONE" ? "-" : stats.tables.length}
                  </p>
                </div>
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="pending" />
                    <p className="text-small">Temps avant</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">{countdownLabel}</p>
                </div>
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="pending" />
                    <p className="text-small">Boissons choisies</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">{drinkTotal}</p>
                </div>
                <div className="dashboard-card">
                  <div className="flex items-center gap-2">
                    <StatIcon kind="ok" />
                    <p className="text-small">Confirmes</p>
                  </div>
                  <p className="mt-1 text-xl font-semibold">{stats.guests.confirmed}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="dashboard-card space-y-2">
                  <p className="text-small font-medium uppercase tracking-wide text-text/60">Reponses</p>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-small">
                        <span>Confirmes</span>
                        <span>{confirmedRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-primary/10">
                        <div
                          className="h-2 rounded-full bg-green-500 transition-all"
                          style={{ width: `${confirmedRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-small">
                        <span>En attente</span>
                        <span>{pendingRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-primary/10">
                        <div
                          className="h-2 rounded-full bg-amber-500 transition-all"
                          style={{ width: `${pendingRate}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-small">
                        <span>Annules</span>
                        <span>{canceledRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-primary/10">
                        <div
                          className="h-2 rounded-full bg-red-500 transition-all"
                          style={{ width: `${canceledRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card space-y-2">
                  <p className="text-small font-medium uppercase tracking-wide text-text/60">Boissons populaires</p>
                  {topDrinks.length === 0 ? (
                    <p className="text-small">Aucune selection pour l'instant.</p>
                  ) : (
                    <div className="space-y-2 text-small">
                      {topDrinks.map(drink => {
                        const total = drink.totalQuantity ?? 0;
                        const ratio = drinkTotal > 0 ? Math.round((total / drinkTotal) * 100) : 0;
                        return (
                          <div key={drink.id}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="truncate">{drink.name}</span>
                              <span>{total}</span>
                            </div>
                            <div className="h-2 rounded-full bg-primary/10">
                              <div
                                className="h-2 rounded-full bg-primary transition-all"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
