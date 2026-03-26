"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

type GuestBookMessage = {
  id: number;
  message: string;
  createdAt: string;
  isHidden?: boolean;
  guest?: {
    fullName?: string | null;
  } | null;
};

export default function DashboardGuestBookPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [messages, setMessages] = useState<GuestBookMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "WEEK">("ALL");
  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const { pushToast } = useToast();

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
    const res = await authFetch(`/events/${eventId}/guestbook`);
    if (!res.ok) {
      pushToast("Chargement du livre d'or impossible.", "error");
      return;
    }
    setMessages((await res.json()) as GuestBookMessage[]);
  }

  useEffect(() => {
    if (!selectedEvent) return;
    void loadMessages(selectedEvent.id);
    setRequiresApproval(Boolean(selectedEvent.guestbookRequiresApproval));
  }, [selectedEvent?.id]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter(item => {
      if (filter === "TODAY" && new Date(item.createdAt) < todayStart) return false;
      if (filter === "WEEK" && new Date(item.createdAt) < weekStart) return false;
      const name = item.guest?.fullName ?? "";
      return !q || name.toLowerCase().includes(q) || item.message.toLowerCase().includes(q);
    });
  }, [messages, search, filter, todayStart, weekStart]);

  const stats = useMemo(() => {
    const total = messages.length;
    const todayCount = messages.filter(m => new Date(m.createdAt) >= todayStart).length;
    return { total, todayCount };
  }, [messages, todayStart]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedMessages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, start + maxVisible - 1);
    const adjustedStart = Math.max(1, end - maxVisible + 1);
    const pages: number[] = [];
    for (let i = adjustedStart; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, pageCount]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  async function downloadGuestbookPdf() {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/guestbook/pdf`);
    if (!res.ok) {
      pushToast("Export PDF impossible.", "error");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `livre-dor-${selectedEvent.id}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function toggleHide(message: GuestBookMessage) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/guestbook/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHidden: !message.isHidden })
    });
    if (!res.ok) {
      pushToast("Mise a jour impossible.", "error");
      return;
    }
    await loadMessages(selectedEvent.id);
  }

  async function deleteMessage(message: GuestBookMessage) {
    if (!selectedEvent) return;
    if (!window.confirm("Supprimer ce message ?")) return;
    const res = await authFetch(`/events/${selectedEvent.id}/guestbook/${message.id}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      return;
    }
    await loadMessages(selectedEvent.id);
  }

  async function toggleApproval(nextValue: boolean) {
    if (!selectedEvent) return;
    setRequiresApproval(nextValue);
    const res = await authFetch(`/events/${selectedEvent.id}/guestbook/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestbookRequiresApproval: nextValue })
    });
    if (!res.ok) {
      pushToast("Mise a jour des parametres impossible.", "error");
      setRequiresApproval(!nextValue);
      return;
    }
    const payload = (await res.json()) as { guestbookRequiresApproval: boolean };
    setRequiresApproval(Boolean(payload.guestbookRequiresApproval));
  }

  return (
    <main className="space-y-4">
      <Header title="Livre d'or" />
      <section className="card p-4 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="title-4">Livre d'or</h2>
            <p className="text-small text-textSecondary">Conservez les messages et souvenirs de vos invites.</p>
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
            <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={downloadGuestbookPdf}>
              Exporter PDF
            </Button>
            <Link href="/dashboard/guestbook/live" className="btn-ghost px-3 py-2 text-xs">
              Ecran LIVE
            </Link>
          </div>
        </div>

        {!selectedEvent ? (
          <p className="text-small">Selectionnez un evenement.</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Total messages</p>
                <p className="mt-1 text-lg font-semibold">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700">Nouveaux aujourd'hui</p>
                <p className="mt-1 text-lg font-semibold text-amber-700">{stats.todayCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">Affiches</p>
                <p className="mt-1 text-lg font-semibold text-emerald-700">
                  {messages.filter(item => !item.isHidden).length}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/10 bg-background/70 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-text/60">Moderation</p>
                  <p className="mt-1 text-xs text-text/70">
                    {requiresApproval ? "Validation avant affichage" : "Affichage immediat"}
                  </p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requiresApproval ? "bg-primary" : "bg-primary/20"
                  }`}
                  onClick={() => toggleApproval(!requiresApproval)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      requiresApproval ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-full md:w-72 text-xs"
                  placeholder="Rechercher un message ou un invite..."
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                  value={filter}
                  onChange={e => {
                    setFilter(e.target.value as typeof filter);
                    setPage(1);
                  }}
                >
                  <option value="ALL">Tous</option>
                  <option value="TODAY">Aujourd'hui</option>
                  <option value="WEEK">Cette semaine</option>
                </select>
                <select
                  className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={16}>16</option>
                </select>
              </div>
              <p className="text-[11px] text-text/60">
                {filtered.length} message{filtered.length > 1 ? "s" : ""} trouves
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text/60">
                <span>Messages recents</span>
                <span>Moderez en masquant les messages inappropries.</span>
              </div>
              {filtered.length === 0 ? (
                <EmptyState
                  title="Aucun message"
                  description="Les invites n'ont pas encore laisse de message."
                />
              ) : (
                pagedMessages.map(item => (
                  <div key={item.id} className="rounded-2xl border border-primary/10 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-text">{item.guest?.fullName || "Invite anonyme"}</p>
                        <p className="text-[11px] text-text/60">
                          {new Date(item.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                          item.isHidden
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.isHidden ? "Masque" : "Visible"}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text/80 whitespace-pre-wrap">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-[11px]"
                        onClick={() => toggleHide(item)}
                      >
                        {item.isHidden ? "Afficher" : "Masquer"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-3 py-1 text-[11px] text-red-600"
                        onClick={() => deleteMessage(item)}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filtered.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-small">
                <span>
                  Page {page} / {pageCount}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Precedent
                  </Button>
                  <div className="flex items-center gap-1">
                    {pageNumbers.map(p => (
                      <button
                        key={p}
                        type="button"
                        className={`rounded-full px-3 py-1 text-[11px] ${
                          p === page
                            ? "bg-primary text-white shadow-sm"
                            : "border border-primary/15 bg-white text-text"
                        }`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-1 text-[11px]"
                    onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
