"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";
import { normalizePublicUrl } from "@/lib/url";

const THEME_LABELS: Record<string, string> = {
  classic: "Classique",
  elegant: "Élégant",
  vibrant: "Vibrant",
  minimal: "Minimaliste"
};

export default function DashboardInvitationsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadEvents() {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await authFetch("/events");
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = (await res.json()) as EventItem[];
      setEvents(data);
      if (data.length > 0) {
        const savedId = getSelectedEventId();
        const chosen = (savedId && data.find(e => e.id === savedId)) || data[0];
        setSelectedEvent(chosen);
        setSelectedEventId(chosen.id);
      } else {
        setSelectedEvent(null);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
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
    <main className="space-y-6 pb-8 font-sans">
      <Header title="Invitations" description="Prévisualisez votre invitation et accédez rapidement au partage des liens individuels." />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.28fr)]">
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contexte</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Événement</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">Choisissez l’événement dont vous voulez vérifier l’invitation.</p>
            <label htmlFor="invitation-event-picker" className="mt-3 block text-xs font-medium text-slate-700">Liste de vos événements</label>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="animate-pulse rounded-xl bg-slate-100 px-4 py-8 text-center text-sm text-slate-600" role="status">
                Chargement des événements…
              </div>
            ) : loadError ? (
              <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4" role="alert">
                <p className="text-sm font-medium text-rose-900">Impossible de charger les événements.</p>
                <Button type="button" variant="ghost" className="min-h-10" onClick={() => void loadEvents()}>
                  Réessayer
                </Button>
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title="Aucun événement"
                description="Créez un événement pour configurer vos invitations."
              />
            ) : (
              <EventPicker
                id="invitation-event-picker"
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

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Aperçu invité</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Invitation sélectionnée</h2>
            </div>
            {selectedEvent ? <p className="text-sm text-slate-500">{selectedEvent.name}</p> : null}
          </div>

          {!selectedEvent ? (
            <div className="p-5">
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600">
                Sélectionnez un événement pour voir son invitation.
              </div>
            </div>
          ) : (
            <div className="space-y-5 p-4 sm:p-5">
              <div className="overflow-hidden rounded-[22px] border border-[#43584b] bg-[#526b5c] text-white shadow-sm">
                <div className="relative h-56 sm:h-72">
                  {coverImage ? (
                    <img src={coverImage} alt={`Couverture ${selectedEvent.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600">
                      <div className="px-6 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Aperçu de l’invitation</p>
                        <h3 className="mt-3 text-2xl font-semibold sm:text-3xl">{selectedEvent.name}</h3>
                        <p className="mt-2 text-sm text-white/80">Ajoutez une image de couverture depuis l’éditeur d’événement.</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="max-w-2xl space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Invitation officielle</p>
                      <h3 className="break-words text-2xl font-semibold leading-tight sm:text-3xl">{selectedEvent.hostNames || selectedEvent.name}</h3>
                      <p className="text-sm text-white/90">{dateLabel || "Date non définie"}</p>
                    </div>
                  </div>
                  {logoImage ? (
                    <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/85 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
                      <img src={logoImage} alt="Logo evenement" className="h-8 w-auto max-w-[150px] object-contain" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Placement</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{selectedEvent.seatingMode === "ZONE" ? "Zones / sections" : selectedEvent.seatingMode === "NONE" ? "Sans placement" : "Tables"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Thème</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{THEME_LABELS[selectedEvent.themePreset ?? "classic"] ?? "Personnalisé"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-medium text-slate-500">Lieu</p>
                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">{selectedEvent.location || "À préciser"}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard/events"
                    className="site-button-primary px-4 text-center"
                  >
                    Modifier l’invitation
                  </Link>
                  <Link
                    href="/dashboard/guests"
                    className="site-button-secondary px-4 text-center"
                  >
                    Gérer les invités et les liens
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
