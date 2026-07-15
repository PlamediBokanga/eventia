"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";
import { normalizePublicUrl } from "@/lib/url";

export default function DashboardInvitationsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
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
    void init();
  }, []);

  const coverImage = useMemo(() => normalizePublicUrl(selectedEvent?.coverImageUrl), [selectedEvent?.coverImageUrl]);
  const logoImage = useMemo(() => normalizePublicUrl(selectedEvent?.logoUrl), [selectedEvent?.logoUrl]);
  const dateLabel = selectedEvent?.dateTime
    ? new Date(selectedEvent.dateTime).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  return (
    <main className="space-y-4">
      <Header title="Invitations" />

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="overflow-hidden rounded-[28px] border border-white/40 bg-white/85 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="border-b border-slate-200/70 bg-white/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Gestion</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choisir l'evenement</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les invitations sont li?es ? un ?v?nement actif. S?lectionnez celui que vous souhaitez partager.
            </p>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                Chargement des evenements...
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title="Aucun ?v?nement"
                description="Cr?ez un ?v?nement pour configurer vos invitations."
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
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-white/40 bg-white/85 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="border-b border-slate-200/70 bg-white/70 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Aperçu</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Aper?u et partage</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Un aperçu rapide des elements qui seront visibles par vos invites.
            </p>
          </div>

          {!selectedEvent ? (
            <div className="p-5">
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                S?lectionnez un ?v?nement pour voir son invitation.
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-lg">
                <div className="relative h-56 sm:h-64">
                  {coverImage ? (
                    <img src={coverImage} alt={`Couverture ${selectedEvent.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600">
                      <div className="px-6 text-center">
                        <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">Invitation premium</p>
                        <h3 className="mt-3 text-3xl font-semibold">{selectedEvent.name}</h3>
                        <p className="mt-2 text-sm text-white/80">Aucune image de couverture configuree.</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="max-w-2xl space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">Invitation officielle</p>
                      <h3 className="text-3xl font-semibold leading-tight">{selectedEvent.hostNames || selectedEvent.name}</h3>
                      <p className="text-sm text-white/85">{dateLabel || "Date non definie"}</p>
                    </div>
                  </div>
                  {logoImage ? (
                    <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/85 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
                      <img src={logoImage} alt="Logo evenement" className="h-8 w-auto max-w-[150px] object-contain" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Mode</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEvent.seatingMode ?? "TABLE"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Theme</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEvent.themePreset ?? "classic"}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Lieu</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{selectedEvent.location}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Actions rapides</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/events"
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    Ouvrir l'?diteur
                  </Link>
                  <Link
                    href="/dashboard/guests"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Aller aux invit?s
                  </Link>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Bon r?flexe</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Le partage individuel des liens se fait dans l'onglet Invit?s. Depuis cette page, vous gardez une vue d'ensemble et un acc?s rapide ? l'?dition.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
