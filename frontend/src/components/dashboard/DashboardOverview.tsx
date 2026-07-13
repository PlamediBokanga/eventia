"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }
  if (kind === "cancel") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
  }
  if (kind === "pending") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-slate-950" fill="none" stroke="currentColor" strokeWidth="2">
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
  const diff = target - Date.now();
  if (!Number.isFinite(diff)) return "Date inconnue";
  if (diff <= 0) return "Evenement termine";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} jour${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} heure${hours > 1 ? "s" : ""}`;
  return `${Math.max(1, minutes)} minute${minutes > 1 ? "s" : ""}`;
}

function metricTone(value: number) {
  if (value >= 80) return "emerald";
  if (value >= 50) return "sky";
  if (value >= 25) return "amber";
  return "slate";
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

function ActionLink({ href, label, variant = "soft" }: { href: string; label: string; variant?: "soft" | "solid" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        variant === "solid"
          ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:-translate-y-0.5 hover:bg-slate-900"
          : "border border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardOverview({ title }: { title: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  function seatingModeLabel(mode: "TABLE" | "ZONE" | "NONE") {
    if (mode === "ZONE") return "Mode: Zones / Sections";
    if (mode === "NONE") return "Mode: Sans tables / sections";
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
  const confirmed = stats?.guests.confirmed ?? 0;
  const canceled = stats?.guests.canceled ?? 0;
  const pending = stats?.guests.pending ?? 0;
  const responseRate = totalGuests > 0 ? (confirmed / totalGuests) * 100 : 0;
  const canceledRate = totalGuests > 0 ? (canceled / totalGuests) * 100 : 0;
  const pendingRate = totalGuests > 0 ? (pending / totalGuests) * 100 : 0;
  const invitationsSent = stats?.invitations?.sent ?? 0;
  const invitationsTotal = stats?.invitations?.total ?? totalGuests;
  const drinkTotal = stats?.drinks.reduce((sum, drink) => sum + (drink.totalQuantity ?? 0), 0) ?? 0;
  const topDrinks = stats?.drinks
    ? [...stats.drinks].sort((a, b) => (b.totalQuantity ?? 0) - (a.totalQuantity ?? 0)).slice(0, 3)
    : [];
  const seatingMode = selectedEvent?.seatingMode ?? "TABLE";
  const seatingLabel = seatingMode === "ZONE" ? "Zones" : seatingMode === "NONE" ? "Sans tables" : "Tables";
  const countdownLabel = selectedEvent ? formatCountdown(selectedEvent.dateTime) : "";
  const eventMeta = useMemo(() => {
    if (!selectedEvent) return [];
    return [
      selectedEvent.type || "Evenement",
      selectedEvent.location,
      selectedEvent.dateTime ? new Date(selectedEvent.dateTime).toLocaleDateString("fr-FR") : null
    ].filter(Boolean) as string[];
  }, [selectedEvent]);

  return (
    <main className="page-enter relative space-y-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_26%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_22%),linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))]" />
      <Header title={title} />

      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f172a,#0ea5e9,#14b8a6,#f59e0b)]" />
        <div className="absolute -right-20 top-10 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-slate-900/5 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Vue executif
            </div>

            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">Pilotage</p>
              <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-slate-950 md:text-5xl">
                Controlez vos evenements avec une vue claire, premium et actionnable.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Suivez les invites, les confirmations, les tables et les performances en un seul espace, sans surcharge visuelle.
              </p>
            </div>

            {selectedEvent ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Evenement actif</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{selectedEvent.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{seatingModeLabel(selectedEvent.seatingMode ?? "TABLE")}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Compte a rebours</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{countdownLabel || "Date inconnue"}</p>
                  <p className="mt-1 text-sm text-slate-600">Jusqu'a l'ouverture de l'evenement</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Lieu</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{selectedEvent.location}</p>
                  <p className="mt-1 text-sm text-slate-600">{selectedEvent.dateTime ? new Date(selectedEvent.dateTime).toLocaleDateString("fr-FR") : ""}</p>
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Etat</p>
                  <p className="mt-2 text-lg font-semibold text-emerald-600">Actif</p>
                  <p className="mt-1 text-sm text-slate-600">{eventMeta.join(" · ")}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-5">
                {loading ? (
                  <p className="text-sm text-slate-600">Chargement des evenements...</p>
                ) : (
                  <EmptyState
                    title="Aucun evenement trouve"
                    description="Cree un evenement pour activer cette vue de pilotage et afficher les statistiques en temps reel."
                    action={<ActionLink href="/dashboard/events" label="Creer un evenement" variant="solid" />}
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <ActionLink href="/dashboard/events" label="Evenements" variant="solid" />
              <ActionLink href="/dashboard/invitations" label="Invitations" />
              <ActionLink href="/dashboard/checkin" label="Check-in" />
              <ActionLink href="/dashboard/profile" label="Profil" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Selection</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">Choisir un evenement</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                  {events.length} total
                </span>
              </div>
              <div className="mt-4">
                {loading ? (
                  <p className="text-sm text-slate-600">Chargement...</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucun evenement disponible.</p>
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
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[28px] border border-slate-200/80 bg-slate-950 px-5 py-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/55">Taux de reponse</p>
                <p className="mt-2 text-3xl font-semibold">{formatPercent(responseRate)}</p>
                <p className="mt-1 text-sm text-white/70">Confirmations parmi les invites crees</p>
              </div>
              <div className="rounded-[28px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Invitations envoyees</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {invitationsSent}/{invitationsTotal}
                </p>
                <p className="mt-1 text-sm text-slate-600">Diffusion completee sur les invites</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Invites", value: totalGuests, icon: "guests", tone: metricTone(totalGuests) },
          { label: "Confirmes", value: confirmed, icon: "ok", tone: metricTone(confirmed) },
          { label: "En attente", value: pending, icon: "pending", tone: metricTone(pending) },
          { label: "Annules", value: canceled, icon: "cancel", tone: metricTone(canceled) }
        ].map(card => (
          <div key={card.label} className="rounded-[26px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`grid h-10 w-10 place-items-center rounded-2xl border text-sm ${card.tone === "emerald" ? "border-emerald-100 bg-emerald-50" : card.tone === "sky" ? "border-sky-100 bg-sky-50" : card.tone === "amber" ? "border-amber-100 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                  <StatIcon kind={card.icon as "guests" | "ok" | "cancel" | "pending"} />
                </span>
                <p className="text-sm font-medium text-slate-600">{card.label}</p>
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-slate-950">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Performance</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Reponses et tendances</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {seatingLabel}
            </span>
          </div>

          {!selectedEvent ? (
            <p className="mt-4 text-sm text-slate-600">Selectionnez un evenement pour afficher les statistiques.</p>
          ) : !stats ? (
            <p className="mt-4 text-sm text-slate-600">Chargement des statistiques...</p>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: "Confirmes", value: confirmed, percent: responseRate, color: "bg-emerald-500" },
                  { label: "En attente", value: pending, percent: pendingRate, color: "bg-amber-500" },
                  { label: "Annules", value: canceled, percent: canceledRate, color: "bg-rose-500" }
                ].map(item => (
                  <div key={item.label} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>{item.label}</span>
                      <span>{formatPercent(item.percent)}</span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: formatPercent(item.percent) }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Boissons</p>
                  {topDrinks.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-600">Aucune selection pour le moment.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {topDrinks.map(drink => {
                        const total = drink.totalQuantity ?? 0;
                        const ratio = drinkTotal > 0 ? Math.round((total / drinkTotal) * 100) : 0;
                        return (
                          <div key={drink.id}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                              <span className="truncate font-medium text-slate-700">{drink.name}</span>
                              <span className="text-slate-500">{total}</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200">
                              <div className="h-2 rounded-full bg-slate-950" style={{ width: `${ratio}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Apercu rapide</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <span>Total boisson choisies</span>
                      <span className="font-semibold text-slate-950">{drinkTotal}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <span>Invitations envoyees</span>
                      <span className="font-semibold text-slate-950">{invitationsSent}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <span>Tables / zones</span>
                      <span className="font-semibold text-slate-950">{seatingMode === "NONE" ? "-" : stats.tables.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Actions rapides</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Aller plus vite</h2>
          <div className="mt-4 grid gap-3">
            <ActionLink href="/dashboard/events" label="Gerer les evenements" variant="solid" />
            <ActionLink href="/dashboard/invitations" label="Relancer les invitations" />
            <ActionLink href="/dashboard/checkin" label="Ouvrir le check-in" />
            <ActionLink href="/dashboard/profile" label="Mettre a jour le profil" />
            <ActionLink href="/dashboard/settings" label="Ajuster les parametres" />
            <ActionLink href="/dashboard/billing" label="Suivre la facturation" />
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Lecture rapide</p>
            <div className="mt-3 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Taux de reponse</span>
                <span className="font-semibold text-slate-950">{formatPercent(responseRate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Invites en attente</span>
                <span className="font-semibold text-slate-950">{pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Invite confirmes</span>
                <span className="font-semibold text-slate-950">{confirmed}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
