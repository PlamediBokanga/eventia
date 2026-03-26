"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem
} from "@/lib/dashboard";

export default function DashboardNotificationsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(
    "Rappel : Vous etes invite(e) a l'evenement {event} le {date}. Lieu: {location}."
  );

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
      <Header title="Notifications" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4">
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : events.length === 0 ? (
            <EmptyState
              title="Aucun evenement"
              description="Creez un evenement pour configurer les notifications."
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
                <h2 className="title-4">Rappels automatiques</h2>
                <p className="text-body-muted">
                  Configurez les notifications a envoyer a vos invites avant l'evenement.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-small">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  7 jours avant
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  3 jours avant
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  1 jour avant
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked />
                  Jour J
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-small">Message</label>
                <textarea
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                  rows={4}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                />
                <p className="text-small">
                  Variables: {"{event}"} {"{date}"} {"{location}"} {"{name}"}
                </p>
              </div>

              <div className="rounded-xl border border-primary/10 bg-background/60 p-3 text-small space-y-2">
                <p className="font-medium">Canaux disponibles (MVP)</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    WhatsApp
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked />
                    SMS
                  </label>
                </div>
                <p className="text-small">
                  L'envoi automatique sera active via API apres la phase MVP.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" className="px-4 py-2 text-xs" disabled>
                  Activer les notifications
                </Button>
                <Button type="button" variant="ghost" className="px-4 py-2 text-xs">
                  Envoi manuel
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
