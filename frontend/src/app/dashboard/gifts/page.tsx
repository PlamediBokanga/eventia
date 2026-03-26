"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem,
  type GiftRegistryItem
} from "@/lib/dashboard";

export default function DashboardGiftsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [gifts, setGifts] = useState<GiftRegistryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [isCashFund, setIsCashFund] = useState(false);
  const [saving, setSaving] = useState(false);
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

  async function loadGifts(eventId: number) {
    const res = await authFetch(`/events/${eventId}`);
    if (!res.ok) {
      setGifts([]);
      return;
    }
    const data = (await res.json()) as EventItem & { gifts?: GiftRegistryItem[] };
    setGifts(data.gifts ?? []);
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
    void loadGifts(selectedEvent.id);
  }, [selectedEvent?.id]);

  async function addGift(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}/gifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, url, isCashFund })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        pushToast(payload?.message ?? "Ajout cadeau impossible.", "error");
        return;
      }
      setTitle("");
      setDescription("");
      setUrl("");
      setIsCashFund(false);
      pushToast("Cadeau ajoute.");
      await loadGifts(selectedEvent.id);
    } finally {
      setSaving(false);
    }
  }

  async function removeGift(giftId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/gifts/${giftId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      return;
    }
    pushToast("Cadeau supprime.");
    await loadGifts(selectedEvent.id);
  }

  return (
    <main className="space-y-4">
      <Header title="Liste de Cadeaux" />
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

        <section className="card p-4 space-y-3">
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : (
            <>
              <form onSubmit={addGift} className="grid gap-2 text-xs">
                <Input placeholder="Titre du cadeau / cagnotte" value={title} onChange={e => setTitle(e.target.value)} />
                <Input placeholder="Lien (https://...)" value={url} onChange={e => setUrl(e.target.value)} />
                <Input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)} />
                <label className="flex items-center gap-2 text-small">
                  <input type="checkbox" checked={isCashFund} onChange={e => setIsCashFund(e.target.checked)} />
                  Cagnotte / contribution financiere
                </label>
                <Button className="w-full sm:w-fit" disabled={saving}>
                  {saving ? "Ajout..." : "Ajouter"}
                </Button>
              </form>

              {gifts.length === 0 ? (
                <EmptyState
                  title="Aucun cadeau"
                  description="Ajoutez une liste de cadeaux ou cagnottes a partager avec les invites."
                />
              ) : (
                <div className="space-y-2">
                  {gifts.map(gift => (
                    <div key={gift.id} className="rounded-xl border border-primary/10 bg-background/60 px-3 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{gift.title}</p>
                          {gift.description ? <p className="text-body-muted">{gift.description}</p> : null}
                          <a href={gift.url} target="_blank" rel="noreferrer" className="underline text-[11px]">
                            Ouvrir le lien
                          </a>
                          <p className="text-small">{gift.isCashFund ? "Cagnotte" : "Cadeau"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-[10px]"
                          onClick={() => {
                            void removeGift(gift.id);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
