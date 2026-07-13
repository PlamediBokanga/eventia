"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { InviteSteps } from "@/components/layout/InviteSteps";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";

type ChatMessage = {
  id: number;
  senderType: "HOST" | "GUEST";
  senderName: string;
  message: string;
  createdAt: string;
};

type InvitationData = {
  guest: {
    fullName: string;
  };
  event: {
    name: string;
    themePreset?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
    animationStyle?: string | null;
  };
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function InviteChatPage({ params }: { params: { token: string } }) {
  const [meta, setMeta] = useState<InvitationData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function loadMeta() {
    try {
      const res = await fetch(`${API_URL}/invitations/${params.token}`);
      if (!res.ok) return;
      setMeta((await res.json()) as InvitationData);
    } catch {
      setInfo("Impossible de charger les informations de l'invitation.");
    }
  }

  async function loadChat() {
    try {
      const res = await fetch(`${API_URL}/invitations/${params.token}/chat`);
      if (!res.ok) {
        setInfo("Chargement du chat impossible.");
        return;
      }
      setMessages((await res.json()) as ChatMessage[]);
    } catch {
      setInfo("Connexion au chat impossible pour le moment.");
    }
  }

  useEffect(() => {
    async function init() {
      try {
        await Promise.all([loadMeta(), loadChat()]);
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, [params.token]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadChat();
    }, 7000);
    return () => window.clearInterval(id);
  }, [params.token]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setInfo("Veuillez saisir un message.");
      return;
    }
    setSending(true);
    setInfo(null);
    try {
      const res = await fetch(`${API_URL}/invitations/${params.token}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) {
        setInfo("Envoi impossible.");
        return;
      }
      setText("");
      await loadChat();
    } finally {
      setSending(false);
    }
  }

  const title = useMemo(() => {
    if (!meta) return "Chat";
    return `Chat - ${meta.event.name}`;
  }, [meta]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-4 ${getInvitationAnimationClass(meta?.event.animationStyle)}`}
        style={getInvitationThemeStyle(meta?.event)}
      >
        <InviteSteps token={params.token} current="chat" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Conversation invitee</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">{title}</h1>
              {meta ? (
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Echangez directement avec l'organisateur dans un espace clair, rapide et mobile-first.
                  Vous etes connecte(e) comme {meta.guest.fullName}.
                </p>
              ) : (
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Retrouvez les messages de l'organisateur et repondez sans quitter votre invitation.
                </p>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Messages</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{messages.length}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Statut</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Temps reel</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 shadow-sm text-white">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Rafraichissement</p>
                <p className="mt-1 text-lg font-semibold">7 sec</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mur de discussion</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Messages recents</h2>
            </div>
            <Link href={`/invite/${params.token}/guestbook`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">
              Livre d'or
            </Link>
          </div>

          <div className="mt-4 max-h-[460px] space-y-3 overflow-auto pr-1">
            {loading ? (
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">Chargement...</div>
            ) : messages.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                Aucun message pour le moment.
              </div>
            ) : (
              messages.map(message => {
                const isHost = message.senderType === "HOST";
                return (
                  <article
                    key={message.id}
                    className={`max-w-[92%] rounded-[24px] border px-4 py-4 shadow-sm ${
                      isHost
                        ? "mr-auto border-slate-200 bg-white"
                        : "ml-auto border-slate-950/10 bg-slate-950 text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.22em]">
                      <span className={isHost ? "text-slate-500" : "text-white/60"}>
                        {message.senderType === "HOST" ? "Organisateur" : "Vous"}
                      </span>
                      <span className={isHost ? "text-slate-400" : "text-white/55"}>{formatTime(message.createdAt)}</span>
                    </div>
                    <p className={`mt-3 text-sm leading-6 ${isHost ? "text-slate-700" : "text-white/90"}`}>
                      {message.message}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Reponse rapide</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Envoyer un message</h2>
          </div>
          <form onSubmit={sendMessage} className="mt-4 space-y-3">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={4}
              className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              placeholder="Ecrire votre message..."
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(e as unknown as React.FormEvent);
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>Appuyez sur Entrer pour envoyer, Shift+Entrer pour aller a la ligne.</span>
              <button type="submit" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:opacity-60" disabled={sending}>
                {sending ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link href={`/invite/${params.token}/invitation`} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5">
            Retour invitation
          </Link>
          <Link href={`/invite/${params.token}/guestbook`} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-center text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5">
            Aller au livre d'or
          </Link>
        </section>

        {info ? (
          <div className="rounded-[20px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            {info}
          </div>
        ) : null}
      </div>
    </main>
  );
}
