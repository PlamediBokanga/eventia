"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { InviteSteps } from "@/components/layout/InviteSteps";
import type { InvitationData } from "@/components/InvitationClient";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";
import { normalizePublicUrl } from "@/lib/url";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
  const memories = data?.memories ?? [];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-4 ${getInvitationAnimationClass(data?.event.animationStyle)}`}
        style={getInvitationThemeStyle(data?.event)}
      >
        <InviteSteps token={params.token} current="guestbook" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Livre d'or premium</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Laissez une trace elegante</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Partagez un message chaleureux, ajoutez un souvenir photo ou video, et nourrissez la memoire de l'evenement avec une presentation claire et moderne.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Messages</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{visibleMessages.length}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Souvenirs</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{memories.length}</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 shadow-sm text-white">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Etat</p>
                <p className="mt-1 text-lg font-semibold">Actif</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl space-y-4 md:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Message</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ecrire dans le livre d'or</h2>
            </div>
            <textarea
              className="min-h-[150px] w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={400}
              placeholder="Exemple: Merci pour l'invitation, nous vous souhaitons une merveilleuse celebration..."
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>{remaining} caracteres restants</span>
              <div className="flex flex-wrap gap-2">
                <Link href={`/invite/${params.token}/invitation`} className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:-translate-y-0.5">
                  Retour invitation
                </Link>
                <Link href={`/invite/${params.token}/chat`} className="rounded-full border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-900 transition hover:-translate-y-0.5">
                  Aller au chat
                </Link>
              </div>
            </div>
            <button
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:opacity-60"
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Envoi..." : "Envoyer mon message"}
            </button>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Album</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Photo et video</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto,1fr]">
              <select
                className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-900 outline-none"
                value={mediaType}
                onChange={e => setMediaType(e.target.value as "IMAGE" | "VIDEO")}
              >
                <option value="IMAGE">Photo</option>
                <option value="VIDEO">Video (lien)</option>
              </select>
              <input
                className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-900 outline-none"
                value={mediaUrl}
                onChange={e => setMediaUrl(e.target.value)}
                placeholder="Lien media (https://...)"
              />
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,auto]">
              <input
                className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-900 outline-none"
                value={mediaCaption}
                onChange={e => setMediaCaption(e.target.value)}
                placeholder="Legende (optionnel)"
              />
              <label className="cursor-pointer rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">
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
            <button
              className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:opacity-60"
              onClick={publishMemory}
              disabled={loading}
            >
              Publier le souvenir
            </button>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Mur public</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Messages recents</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {visibleMessages.length} message(s)
            </span>
          </div>
          {visibleMessages.length === 0 ? (
            <div className="mt-4 rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              Soyez le premier a laisser un message.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {visibleMessages.map(item => (
                <article key={item.id} className="rounded-[22px] border border-slate-200/80 bg-slate-50 px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-900">{item.guestName ?? "Invite anonyme"}</span>
                    <span>{formatDateTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.message}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        {memories.length > 0 ? (
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Galerie</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Souvenirs partages</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {memories.map(item => (
                <article key={item.id} className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
                  {item.mediaType === "IMAGE" ? (
                    <img
                      src={normalizePublicUrl(item.mediaUrl)}
                      alt={item.caption || "Souvenir"}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-slate-950 text-sm font-semibold text-white">
                      Video
                    </div>
                  )}
                  <div className="p-4">
                    {item.caption ? <p className="text-sm leading-6 text-slate-700">{item.caption}</p> : null}
                    <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {item.uploadedByName || "Invite"}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {message ? (
          <div className="rounded-[20px] border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
