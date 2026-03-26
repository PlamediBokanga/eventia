"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

type GuestBookMessage = {
  id: number;
  message: string;
  createdAt: string;
  guest?: {
    fullName?: string | null;
  } | null;
};

export default function GuestbookLivePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [messages, setMessages] = useState<GuestBookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  async function loadMessages(eventId: number) {
    const res = await authFetch(`/events/${eventId}/guestbook?visible=1&limit=60`);
    if (!res.ok) return;
    setMessages((await res.json()) as GuestBookMessage[]);
  }

  useEffect(() => {
    if (!selectedEvent) return;
    void loadMessages(selectedEvent.id);
  }, [selectedEvent?.id]);

  useEffect(() => {
    if (!selectedEvent || !autoRefresh) return;
    const handle = window.setInterval(() => {
      void loadMessages(selectedEvent.id);
    }, 5000);
    return () => window.clearInterval(handle);
  }, [selectedEvent?.id, autoRefresh]);

  const formattedMessages = useMemo(() => messages.slice(0, 18), [messages]);

  return (
    <main className="space-y-4">
      <Header title="Ecran LIVE - Livre d'or" />
      <section className="card p-4 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="title-4">Ecran LIVE</h2>
            <p className="text-small text-textSecondary">
              Affichez les messages en direct pendant l'evenement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <div className="min-w-[220px] rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
                Chargement des evenements...
              </div>
            ) : events.length === 0 ? (
              <div className="min-w-[220px] rounded-full border border-primary/10 bg-background/70 px-3 py-2 text-[11px] text-text/60">
                Aucun evenement disponible
              </div>
            ) : (
              <select
                className="min-w-[220px] rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs"
                value={selectedEvent?.id ?? ""}
                onChange={e => {
                  const value = Number(e.target.value);
                  const event = events.find(item => item.id === value);
                  if (!event) return;
                  setSelectedEvent(event);
                  setSelectedEventId(event.id);
                }}
              >
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs"
              onClick={() => {
                if (document.fullscreenElement) {
                  void document.exitFullscreen();
                } else {
                  void document.documentElement.requestFullscreen();
                }
              }}
            >
              Plein ecran
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-2 text-xs"
              onClick={() => setAutoRefresh(prev => !prev)}
            >
              {autoRefresh ? "Pause" : "Reprendre"}
            </Button>
          </div>
        </div>

        {selectedEvent ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formattedMessages.length === 0 ? (
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-6 text-center text-sm text-text/70">
                Aucun message pour le moment.
              </div>
            ) : (
              formattedMessages.map(item => (
                <div key={item.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm">
                  <p className="text-xs text-text/60">
                    {item.guest?.fullName || "Invite anonyme"} •{" "}
                    {new Date(item.createdAt).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-text">{item.message}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <p className="text-small">Selectionnez un evenement.</p>
        )}
      </section>
    </main>
  );
}
