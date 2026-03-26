"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem
} from "@/lib/dashboard";

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

  return (
    <main className="space-y-4">
      <Header title="Invitations" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4">
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : events.length === 0 ? (
            <EmptyState
              title="Aucun evenement"
              description="Creez un evenement pour configurer vos invitations."
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
        </section>

        <section className="card p-4 space-y-3">
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="title-4">Configuration de l'invitation</h2>
                <p className="text-body-muted">
                  Modifiez le message, le theme et les visuels de l'invitation avant de la partager.
                </p>
              </div>
              <div className="rounded-xl border border-primary/10 bg-background/60 p-3 text-small space-y-2">
                <div className="flex items-center justify-between">
                  <span>Evenement</span>
                  <span className="font-medium">{selectedEvent.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Mode</span>
                  <span className="font-medium">{selectedEvent.seatingMode ?? "TABLE"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Theme</span>
                  <span className="font-medium">{selectedEvent.themePreset ?? "classic"}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/dashboard/events" className="btn-primary px-4 py-2 text-xs">
                  Modifier l'invitation
                </a>
                <a href="/dashboard/guests" className="btn-ghost px-4 py-2 text-xs">
                  Partager aux invites
                </a>
              </div>
              <p className="text-small">
                Astuce: le partage individuel des liens se fait dans l'onglet Invites.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
