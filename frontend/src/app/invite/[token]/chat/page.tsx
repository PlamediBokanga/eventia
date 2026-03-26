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

export default function InviteChatPage({ params }: { params: { token: string } }) {
  const [meta, setMeta] = useState<InvitationData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function loadMeta() {
    const res = await fetch(`${API_URL}/invitations/${params.token}`);
    if (!res.ok) return;
    setMeta((await res.json()) as InvitationData);
  }

  async function loadChat() {
    const res = await fetch(`${API_URL}/invitations/${params.token}/chat`);
    if (!res.ok) return;
    setMessages((await res.json()) as ChatMessage[]);
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
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div
        className={`max-w-xl w-full card p-6 space-y-4 invite-skin ${getInvitationAnimationClass(meta?.event.animationStyle)}`}
        style={getInvitationThemeStyle(meta?.event)}
      >
        <InviteSteps token={params.token} current="chat" />
        <h1 className="title-3 invite-title">{title}</h1>
        {meta ? (
          <p className="text-body-muted">
            Echangez directement avec l'organisateur. Vous etes connecte(e) comme {meta.guest.fullName}.
          </p>
        ) : null}

        <div className="rounded-2xl border border-primary/10 bg-background/60 p-3 max-h-[360px] overflow-auto space-y-3">
          {loading ? (
            <p className="text-small">Chargement...</p>
          ) : messages.length === 0 ? (
            <p className="text-small">Aucun message pour le moment.</p>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                  message.senderType === "HOST"
                    ? "mr-auto bg-white/70"
                    : "ml-auto bg-primary/10"
                }`}
              >
                <p className="font-semibold">{message.senderType === "HOST" ? "Organisateur" : "Vous"}</p>
                <p className="whitespace-pre-wrap text-body-muted">{message.message}</p>
                <p className="text-[10px] text-text/60">
                  {new Date(message.createdAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="grid grid-cols-[1fr,auto] gap-2 items-start">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
            placeholder="Ecrire votre message..."
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(e as unknown as React.FormEvent);
              }
            }}
          />
          <button type="submit" className="btn-primary px-4 py-2" disabled={sending}>
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </form>

        <div className="flex gap-2">
          <Link href={`/invite/${params.token}/invitation`} className="btn-ghost">
            Retour invitation
          </Link>
          <Link href={`/invite/${params.token}/guestbook`} className="btn-ghost">
            Aller au livre d'or
          </Link>
        </div>

        {info ? <p className="text-small">{info}</p> : null}
      </div>
    </main>
  );
}
