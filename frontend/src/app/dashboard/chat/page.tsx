"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  authFetch,
  getSelectedEventId,
  setSelectedEventId,
  type EventItem,
  type EventChatMessage,
  type EventQuickReply
} from "@/lib/dashboard";

type ChatThread = {
  guestId: number | null;
  guestName: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
  lastSender: "HOST" | "GUEST";
};

export default function DashboardChatPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [messages, setMessages] = useState<EventChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [message, setMessage] = useState("");
  const [quickReplies, setQuickReplies] = useState<EventQuickReply[]>([]);
  const [newQuickReply, setNewQuickReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "REPLIED">("ALL");
  const { pushToast } = useToast();
  const lastUnreadRef = useRef(0);

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

  async function loadChat(eventId: number) {
    const res = await authFetch(`/events/${eventId}/chat`);
    if (!res.ok) {
      setMessages([]);
      return;
    }
    setMessages((await res.json()) as EventChatMessage[]);
  }

  async function loadQuickReplies(eventId: number) {
    const res = await authFetch(`/events/${eventId}/quick-replies`);
    if (!res.ok) {
      setQuickReplies([]);
      return;
    }
    setQuickReplies((await res.json()) as EventQuickReply[]);
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
    void loadChat(selectedEvent.id);
    void loadQuickReplies(selectedEvent.id);
    const id = window.setInterval(() => {
      void loadChat(selectedEvent.id);
    }, 8000);
    return () => window.clearInterval(id);
  }, [selectedEvent?.id]);

  const threads = useMemo(() => {
    const map = new Map<number, EventChatMessage[]>();
    messages.forEach(msg => {
      const id = msg.guestId ?? 0;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(msg);
    });
    const data: ChatThread[] = [];
    map.forEach((items, id) => {
      const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = sorted[sorted.length - 1];
      const unreadCount = sorted.filter(m => m.senderType === "GUEST" && !m.readAt).length;
      const guestName = last.guest?.fullName || last.senderName || "Invite";
      data.push({
        guestId: id === 0 ? null : id,
        guestName,
        lastMessage: last.message,
        lastAt: last.createdAt,
        unreadCount,
        lastSender: last.senderType
      });
    });
    return data.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [messages]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter(thread => {
      if (filter === "UNREAD" && thread.unreadCount === 0) return false;
      if (filter === "REPLIED" && thread.unreadCount > 0) return false;
      return !q || thread.guestName.toLowerCase().includes(q) || thread.lastMessage.toLowerCase().includes(q);
    });
  }, [threads, search, filter]);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedThread(null);
      return;
    }
    if (!selectedThread || !filteredThreads.some(t => t.guestId === selectedThread.guestId)) {
      setSelectedThread(filteredThreads[0]);
    }
  }, [filteredThreads, selectedThread]);

  const activeMessages = useMemo(() => {
    if (!selectedThread) return [];
    return messages.filter(m => (m.guestId ?? null) === selectedThread.guestId);
  }, [messages, selectedThread]);

  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => sum + t.unreadCount, 0);
  }, [threads]);

  useEffect(() => {
    if (totalUnread > lastUnreadRef.current) {
      try {
        const AudioContextRef = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextRef) {
          const ctx = new AudioContextRef();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 880;
          gain.gain.value = 0.08;
          oscillator.connect(gain);
          gain.connect(ctx.destination);
          oscillator.start();
          setTimeout(() => {
            oscillator.stop();
            ctx.close();
          }, 160);
        }
      } catch {
        // ignore audio errors
      }
    }
    lastUnreadRef.current = totalUnread;
  }, [totalUnread]);

  async function markThreadRead(thread: ChatThread) {
    if (!selectedEvent || !thread.guestId) return;
    await authFetch(`/events/${selectedEvent.id}/chat/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId: thread.guestId })
    });
    setMessages(prev =>
      prev.map(item =>
        item.guestId === thread.guestId && item.senderType === "GUEST" && !item.readAt
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )
    );
  }

  async function addQuickReply() {
    if (!selectedEvent || !newQuickReply.trim()) return;
    const res = await authFetch(`/events/${selectedEvent.id}/quick-replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newQuickReply })
    });
    if (!res.ok) {
      pushToast("Creation impossible.", "error");
      return;
    }
    setNewQuickReply("");
    await loadQuickReplies(selectedEvent.id);
  }

  async function removeQuickReply(replyId: number) {
    if (!selectedEvent) return;
    const res = await authFetch(`/events/${selectedEvent.id}/quick-replies/${replyId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      pushToast("Suppression impossible.", "error");
      return;
    }
    await loadQuickReplies(selectedEvent.id);
  }

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedEvent || !selectedThread || !message.trim()) return;
    if (!selectedThread.guestId) {
      pushToast("Impossible d'envoyer sans inviter lie.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await authFetch(`/events/${selectedEvent.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, guestId: selectedThread.guestId })
      });
      if (!res.ok) {
        pushToast("Envoi impossible.", "error");
        return;
      }
      setMessage("");
      await loadChat(selectedEvent.id);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="space-y-4">
      <Header title="Chat - Invites" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr,2fr]">
        <section className="card p-4 space-y-4">
          <div className="flex flex-col gap-2">
            {loading ? (
              <p className="text-small">Chargement...</p>
            ) : (
              <select
                className="rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs"
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
            <Input
              className="text-xs"
              placeholder="Rechercher une conversation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {(["ALL", "UNREAD", "REPLIED"] as const).map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`rounded-full px-3 py-1 text-[11px] ${
                    filter === tag ? "bg-primary text-white" : "border border-primary/20 bg-white"
                  }`}
                  onClick={() => setFilter(tag)}
                >
                  {tag === "ALL" ? "Tous" : tag === "UNREAD" ? "Non lus" : "Repondus"}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-text/60">
              <span>Notifications</span>
              <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] text-red-600">
                {totalUnread} non lu(s)
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
            {filteredThreads.length === 0 ? (
              <p className="text-small text-text/70">Aucune conversation.</p>
            ) : (
              filteredThreads.map(thread => (
                <button
                  key={`${thread.guestId ?? "general"}`}
                  type="button"
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selectedThread?.guestId === thread.guestId
                      ? "border-primary/40 bg-primary/5"
                      : "border-primary/10 bg-white"
                  }`}
                  onClick={() => {
                    setSelectedThread(thread);
                    if (thread.unreadCount > 0) void markThreadRead(thread);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {thread.guestName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text">{thread.guestName}</p>
                        <p className="text-[11px] text-text/60 line-clamp-1">{thread.lastMessage}</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-text/60">
                      <p>{new Date(thread.lastAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p>
                      {thread.unreadCount > 0 ? (
                        <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                          {thread.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="card p-4 space-y-3">
          {!selectedEvent ? (
            <p className="text-small">Selectionnez un evenement.</p>
          ) : !selectedThread ? (
            <p className="text-small">Selectionnez une conversation.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{selectedThread.guestName}</p>
                  <p className="text-[11px] text-text/60">Conversation privee</p>
                </div>
                {selectedThread.unreadCount > 0 ? (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] text-red-600">
                    {selectedThread.unreadCount} non lu(s)
                  </span>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-auto rounded-2xl border border-primary/10 bg-background/50 p-3 space-y-3">
                {activeMessages.length === 0 ? (
                  <p className="text-small text-text/60">Aucun message pour le moment.</p>
                ) : (
                  activeMessages.map(m => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${
                        m.senderType === "HOST"
                          ? "ml-auto bg-primary/10 text-text"
                          : "mr-auto bg-white/80 text-text"
                      }`}
                    >
                      <p className="font-semibold">{m.senderType === "HOST" ? "Vous" : m.senderName}</p>
                      <p className="text-body-muted whitespace-pre-wrap">{m.message}</p>
                      <p className="text-[10px] text-text/60">
                        {new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {!selectedThread.guestId ? (
                <p className="text-[11px] text-amber-700">
                  Cette conversation provient d'anciens messages. Vous ne pouvez pas repondre tant que
                  l'invite n'a pas reecrit.
                </p>
              ) : null}

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {quickReplies.length === 0 ? (
                    <span className="text-[11px] text-text/60">Aucune reponse rapide.</span>
                  ) : (
                    quickReplies.map(reply => (
                      <button
                        key={reply.id}
                        type="button"
                        className="rounded-full border border-primary/15 bg-white px-3 py-1 text-[11px]"
                        onClick={() => setMessage(reply.text)}
                      >
                        {reply.text}
                      </button>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-[1fr,auto] gap-2">
                  <Input
                    className="text-xs"
                    placeholder="Ajouter une reponse rapide..."
                    value={newQuickReply}
                    onChange={e => setNewQuickReply(e.target.value)}
                  />
                  <Button type="button" className="px-3 py-2 text-xs" onClick={addQuickReply}>
                    Ajouter
                  </Button>
                </div>
                {quickReplies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map(reply => (
                      <button
                        key={`remove-${reply.id}`}
                        type="button"
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] text-red-600"
                        onClick={() => removeQuickReply(reply.id)}
                      >
                        Supprimer: {reply.text}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <form
                onSubmit={sendMessage}
                className="grid grid-cols-[1fr,auto] gap-2 items-start"
              >
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
                  placeholder="Ecrire un message..."
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button className="px-4 py-2" disabled={sending}>
                  {sending ? "Envoi..." : "Envoyer"}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
