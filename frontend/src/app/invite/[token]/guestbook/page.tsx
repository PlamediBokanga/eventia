"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { InviteSteps } from "@/components/layout/InviteSteps";
import type { InvitationData } from "@/components/InvitationClient";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";
import { normalizePublicUrl } from "@/lib/url";

export default function InviteGuestbookPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<InvitationData | null>(null);
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_URL}/invitations/${params.token}`);
      if (!res.ok) return;
      setData((await res.json()) as InvitationData);
    }
    void load();
  }, [params.token]);

  async function refreshInvitation() {
    const res = await fetch(`${API_URL}/invitations/${params.token}`);
    if (!res.ok) return;
    setData((await res.json()) as InvitationData);
  }

  async function submit() {
    if (!text.trim()) {
      setMessage("Veuillez ecrire un message.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/invitations/${params.token}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(payload?.message ?? "Envoi impossible.");
        return;
      }
      setText("");
      setMessage("Merci pour votre message.");
      await refreshInvitation();
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file: File) {
    setLoading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${API_URL}/invitations/${params.token}/upload-media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(payload?.message ?? "Upload photo impossible.");
        return;
      }
      const payload = (await res.json()) as { url: string };
      setMediaType("IMAGE");
      setMediaUrl(payload.url);
      setMessage("Image telechargee, vous pouvez publier.");
    } finally {
      setLoading(false);
    }
  }

  async function publishMemory() {
    if (!mediaUrl.trim()) {
      setMessage("Ajoutez un lien media ou telechargez une image.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/invitations/${params.token}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType,
          mediaUrl,
          caption: mediaCaption || null
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;
        setMessage(payload?.message ?? "Publication du souvenir impossible.");
        return;
      }
      setMediaUrl("");
      setMediaCaption("");
      setMessage("Souvenir publie.");
      await refreshInvitation();
    } finally {
      setLoading(false);
    }
  }

  const remaining = 400 - text.length;
  const visibleMessages = useMemo(() => data?.guestbookMessages ?? [], [data?.guestbookMessages]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-6">
      <div
        className={`max-w-xl w-full card p-6 space-y-4 invite-skin ${getInvitationAnimationClass(data?.event.animationStyle)}`}
        style={getInvitationThemeStyle(data?.event)}
      >
        <InviteSteps token={params.token} current="guestbook" />
        <h1 className="title-3 invite-title">Livre d'or</h1>
        <p className="text-body-muted">Partagez un mot chaleureux avec l'organisateur.</p>
        <textarea
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
          rows={5}
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={400}
          placeholder="Exemple: Merci pour l'invitation, nous avons hate d'etre avec vous..."
        />
        <p className="text-small">{remaining} caracteres restants</p>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Envoi..." : "Envoyer mon message"}
          </button>
          <Link href={`/invite/${params.token}/invitation`} className="btn-ghost">
            Retour
          </Link>
          <Link href={`/invite/${params.token}/chat`} className="btn-ghost">
            Chat
          </Link>
        </div>

        <div className="rounded-2xl border border-primary/10 bg-background/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-body-muted font-medium">Messages des invites</p>
            <span className="text-xs text-text/60">{visibleMessages.length} messages</span>
          </div>
          {visibleMessages.length === 0 ? (
            <p className="text-small text-text/70">Soyez le premier a laisser un message.</p>
          ) : (
            <div className="space-y-2">
              {visibleMessages.map(item => (
                <div key={item.id} className="rounded-xl border border-primary/10 bg-white/80 p-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-text/60">
                    <span className="font-semibold text-text">{item.guestName ?? "Invite anonyme"}</span>
                    <span>
                      {new Date(item.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-primary/10 bg-background/60 p-3 space-y-2">
          <p className="text-body-muted font-medium">Album photo/video</p>
          <div className="grid grid-cols-1 sm:grid-cols-[auto,1fr] gap-2">
            <select
              className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={mediaType}
              onChange={e => setMediaType(e.target.value as "IMAGE" | "VIDEO")}
            >
              <option value="IMAGE">Photo</option>
              <option value="VIDEO">Video (lien)</option>
            </select>
            <input
              className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder="Lien media (https://...)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-2">
            <input
              className="rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs"
              value={mediaCaption}
              onChange={e => setMediaCaption(e.target.value)}
              placeholder="Legende (optionnel)"
            />
            <label className="btn-ghost px-3 py-2 text-xs cursor-pointer text-center">
              Telecharger photo
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <button className="btn-ghost" onClick={publishMemory} disabled={loading}>
            Publier le souvenir
          </button>
          {data?.memories?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.memories.map(item => (
                <div key={item.id} className="rounded-lg border border-primary/10 bg-white/70 p-2">
                  {item.mediaType === "IMAGE" ? (
                    <img
                      src={normalizePublicUrl(item.mediaUrl)}
                      alt={item.caption || "Souvenir"}
                      className="h-28 w-full rounded object-cover"
                    />
                  ) : (
                    <a
                      href={normalizePublicUrl(item.mediaUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline text-small"
                    >
                      Ouvrir la video
                    </a>
                  )}
                  {item.caption ? <p className="mt-1 text-small">{item.caption}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        {message ? <p className="text-small">{message}</p> : null}
      </div>
    </main>
  );
}
