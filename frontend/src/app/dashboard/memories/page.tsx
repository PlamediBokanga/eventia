"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem,
  type EventMemoryItem
} from "@/lib/dashboard";

export default function DashboardMemoriesPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [memories, setMemories] = useState<EventMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { pushToast } = useToast();

  async function loadEvents() {
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
  }

  async function loadMemories(eventId: number) {
    const res = await authFetch(`/events/${eventId}/memories`);
    if (!res.ok) {
      setMemories([]);
      return;
    }
    setMemories((await res.json()) as EventMemoryItem[]);
  }

  useEffect(() => {
    async function init() {
      try {
        await loadEvents();
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    void loadMemories(selectedEvent.id);
  }, [selectedEvent?.id]);

  async function removeMemory(memoryId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/memories/${memoryId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      return;
    }
    setMemories(prev => prev.filter(m => m.id !== memoryId));
    pushToast("Souvenir supprime.");
  }

  return (
    <main className="space-y-4">
      <Header title="Album Souvenirs" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,1.9fr]">
        <section className="card p-4">
          {loading ? (
            <p className="text-small">Chargement...</p>
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
        <section className="card p-4">
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : memories.length === 0 ? (
            <EmptyState
              title="Aucun souvenir"
              description="Les photos/videos publiees par les invites apparaissent ici."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memories.map(item => (
                <div key={item.id} className="rounded-xl border border-primary/10 bg-background/60 p-2 space-y-2">
                  {item.mediaType === "IMAGE" ? (
                    <img
                      src={item.mediaUrl}
                      alt={item.caption || "Souvenir"}
                      className="h-36 w-full rounded-lg object-cover border border-primary/10"
                    />
                  ) : (
                    <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="underline text-small">
                      Ouvrir la video
                    </a>
                  )}
                  {item.caption ? <p className="text-body-muted">{item.caption}</p> : null}
                  <p className="text-small">
                    Par {item.uploadedByName || "Invite"} - {new Date(item.createdAt).toLocaleString("fr-FR")}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-[10px]"
                    onClick={() => {
                      void removeMemory(item.id);
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
