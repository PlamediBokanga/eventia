"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EventPicker } from "@/components/layout/EventPicker";
import { NavIcon } from "@/components/layout/dashboardNav";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem, type EventStats, type OrganizerProfile } from "@/lib/dashboard";

type DashboardRole = "user" | "organizer" | "agency" | "company" | "superadmin";

const ROLE_LABELS: Record<DashboardRole, string> = {
  user: "Compte standard",
  organizer: "Organisateur",
  agency: "Agence",
  company: "Entreprise",
  superadmin: "Super administrateur"
};

const QUICK_ACTIONS = [
  { href: "/dashboard/guests", label: "Gérer les invités", detail: "Invitations et réponses", icon: "users" },
  { href: "/dashboard/invitations", label: "Voir les invitations", detail: "Accès et diffusion", icon: "mail" },
  { href: "/dashboard/checkin", label: "Ouvrir le contrôle d’accès", detail: "Scanner les entrées", icon: "qr" },
  { href: "/dashboard/stats", label: "Consulter les statistiques", detail: "Suivre la participation", icon: "chart" }
] as const;

function dateLabel(value?: string | null) {
  if (!value) return "Date à confirmer";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date à confirmer";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function MetricCard({ label, value, note, tone }: { label: string; value: string; note: string; tone: "navy" | "green" | "amber" | "blue" }) {
  const tones = {
    navy: "border-[#526b5c] bg-[#526b5c] text-white",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-sky-200 bg-sky-50 text-sky-950"
  };
  return (
    <article className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${tones[tone]}`}>
      <p className={`text-sm font-medium ${tone === "navy" ? "text-white/70" : "text-slate-600"}`}>{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className={`mt-1 text-xs ${tone === "navy" ? "text-white/60" : "text-slate-600"}`}>{note}</p>
    </article>
  );
}

export function DashboardOverview({ title: _title, role: roleProp }: { title: string; role?: DashboardRole }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const role = roleProp ?? ((profile?.role as DashboardRole | undefined) || "organizer");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      setLoading(true);
      setLoadError("");
      try {
        const [eventsRes, profileRes] = await Promise.all([authFetch("/events"), authFetch("/auth/me")]);
        if (!active) return;
        if (!eventsRes.ok) throw new Error("Impossible de charger les événements.");
        const items = (await eventsRes.json()) as EventItem[];
        setEvents(items);
        if (profileRes.ok) {
          const payload = (await profileRes.json()) as { organizer?: OrganizerProfile };
          setProfile(payload.organizer ?? null);
        }
        if (items.length) {
          const savedId = getSelectedEventId();
          const current = (savedId && items.find(item => item.id === savedId)) || items[0];
          setSelectedEvent(current);
          setSelectedEventId(current.id);
        } else {
          setSelectedEvent(null);
          setStats(null);
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Une erreur est survenue au chargement.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    let active = true;
    setStatsLoading(true);
    setStats(null);
    async function loadStats() {
      try {
        const response = await authFetch(`/events/${selectedEvent!.id}/stats`);
        if (!response.ok) throw new Error("Les statistiques de cet événement sont indisponibles.");
        const data = (await response.json()) as EventStats;
        if (active) setStats(data);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Impossible de charger les statistiques.");
      } finally {
        if (active) setStatsLoading(false);
      }
    }
    void loadStats();
    return () => { active = false; };
  }, [selectedEvent?.id]);

  const guestCounts = stats?.guests;
  const totalGuests = guestCounts?.total ?? 0;
  const confirmed = guestCounts?.confirmed ?? 0;
  const pending = guestCounts?.pending ?? 0;
  const invitationsSent = stats?.invitations?.sent ?? 0;
  const invitationTotal = stats?.invitations?.total ?? totalGuests;
  const responseRate = totalGuests ? Math.round((confirmed / totalGuests) * 100) : 0;
  const tableSummary = useMemo(() => (stats?.tables ?? []).slice(0, 5), [stats?.tables]);
  const displayName = profile?.name?.trim().split(/\s+/)[0];
  const formattedCounts = (value: number) => statsLoading ? "—" : new Intl.NumberFormat("fr-FR").format(value);

  return (
    <main className="space-y-7 pb-8 font-sans">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{ROLE_LABELS[role] ?? ROLE_LABELS.organizer}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{displayName ? `Bonjour ${displayName}` : "Tableau de bord"}</h1>
          <p className="mt-1 text-sm text-slate-600">Les informations essentielles pour piloter votre événement.</p>
        </div>
        <Link href="/dashboard/events" className="site-button-primary">
          + Créer un événement
        </Link>
      </header>

      {loadError ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-lg border border-rose-300 bg-white px-3 font-semibold text-rose-900 hover:bg-rose-100">Réessayer</button>
        </div>
      ) : null}

      <section aria-label="Événement sélectionné" className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Événement actif</p>
          {loading ? <div className="mt-3 h-8 w-2/3 animate-pulse rounded-lg bg-slate-100" /> : events.length ? (
            <>
              <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">{selectedEvent?.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{dateLabel(selectedEvent?.dateTime)}{selectedEvent?.location ? ` · ${selectedEvent.location}` : ""}</p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Aucun événement pour le moment</h2>
              <p className="mt-1 text-sm text-slate-600">Créez un événement pour suivre les réponses et organiser les invités.</p>
            </>
          )}
        </div>
        {events.length > 1 ? (
          <div>
            <label htmlFor="dashboard-event-picker" className="mb-2 block text-xs font-semibold text-slate-600">Changer d’événement</label>
            <EventPicker id="dashboard-event-picker" events={events} selectedEventId={selectedEvent?.id} onSelect={event => { setSelectedEvent(event); setSelectedEventId(event.id); }} />
          </div>
        ) : null}
      </section>

      <section aria-label="Indicateurs de l’événement" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Invités" value={formattedCounts(totalGuests)} note="Invités enregistrés" tone="navy" />
        <MetricCard label="Présences confirmées" value={formattedCounts(confirmed)} note={`${responseRate}% du total des invités`} tone="green" />
        <MetricCard label="Réponses attendues" value={formattedCounts(pending)} note="Invitations encore en attente" tone="amber" />
        <MetricCard label="Invitations envoyées" value={statsLoading ? "—" : `${formattedCounts(invitationsSent)} / ${formattedCounts(invitationTotal)}`} note="Progression de la diffusion" tone="blue" />
      </section>

      <section aria-labelledby="dashboard-actions-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="dashboard-actions-title" className="text-lg font-semibold text-slate-950">Accès rapides</h2>
            <p className="mt-1 text-sm text-slate-600">Les actions les plus utilisées pour votre événement.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href} className="group flex min-h-24 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#edf2ee] text-[#43584b]"><NavIcon type={action.icon} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{action.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{action.detail}</span>
              </span>
              <span aria-hidden="true" className="ml-auto text-slate-400 transition group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
        </div>
      </section>

      {selectedEvent ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-950">Réponses des invités</h2><p className="mt-1 text-sm text-slate-600">État des confirmations pour cet événement.</p></div>
              <Link href="/dashboard/guests" className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">Voir les invités</Link>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { label: "Confirmées", count: confirmed, color: "bg-emerald-600" },
                { label: "En attente", count: pending, color: "bg-amber-500" },
                { label: "Refusées", count: guestCounts?.canceled ?? 0, color: "bg-slate-400" }
              ].map(item => {
                const percent = totalGuests ? Math.round((item.count / totalGuests) * 100) : 0;
                return <div key={item.label}>
                  <div className="mb-1.5 flex justify-between text-sm"><span className="text-slate-600">{item.label}</span><span className="font-medium tabular-nums text-slate-900">{formattedCounts(item.count)} <span className="text-slate-500">({statsLoading ? "—" : `${percent}%`})</span></span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color} transition-[width] duration-500`} style={{ width: `${statsLoading ? 0 : percent}%` }} /></div>
                </div>;
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-lg font-semibold text-slate-950">Disposition des tables</h2><p className="mt-1 text-sm text-slate-600">Occupation des espaces configurés.</p></div>
              <Link href="/dashboard/tables" className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">Gérer les tables</Link>
            </div>
            {statsLoading ? <p className="mt-5 text-sm text-slate-500">Chargement des données…</p> : tableSummary.length ? (
              <div className="mt-4 divide-y divide-slate-100">
                {tableSummary.map(table => {
                  const capacity = Math.max(0, table.capacity);
                  const percent = capacity ? Math.min(100, Math.round((table.guestCount / capacity) * 100)) : 0;
                  return <div key={table.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                    <div className="min-w-0 flex-1"><div className="flex justify-between gap-3 text-sm"><span className="truncate font-medium text-slate-900">{table.label}</span><span className="shrink-0 tabular-nums text-slate-600">{table.guestCount}{capacity ? ` / ${capacity}` : ""}</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#526b5c]" style={{ width: `${percent}%` }} /></div></div>
                  </div>;
                })}
              </div>
            ) : <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">Aucune table configurée pour cet événement.</div>}
          </article>
        </section>
      ) : null}
    </main>
  );
}
