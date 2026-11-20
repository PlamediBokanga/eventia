"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/config";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";
import { normalizePublicUrl } from "@/lib/url";

type DrinkOption = { id: number; name: string; category: "ALCOHOLIC" | "SOFT" };
type GiftItem = { id: number; title: string; description?: string | null; url: string; isCashFund: boolean };
type MemoryItem = { id: number; mediaType: "IMAGE" | "VIDEO"; mediaUrl: string; caption?: string | null; uploadedByName?: string | null; createdAt: string };
type GuestbookMessage = { id: number; message: string; createdAt: string; guestName?: string | null };
type GuestStatus = "PENDING" | "CONFIRMED" | "CANCELED";

export type InvitationData = {
  invitation: { token: string; respondedAt: string | null; openedAt?: string | null; openCount?: number; invitationUrl?: string; qrCodeUrl?: string; mapsUrl?: string; googleCalendarUrl?: string };
  guest: { id: number; fullName: string; status: GuestStatus; plusOneCount?: number; allergies?: string | null; mealPreference?: string | null };
  event: { id: number; name: string; type: string; dateTime: string; location: string; address?: string | null; details?: string | null; program?: string | null; invitationMessage?: string | null; coverImageUrl?: string | null; hostNames?: string | null; logoUrl?: string | null; themePreset?: string | null; primaryColor?: string | null; accentColor?: string | null; fontFamily?: string | null; animationStyle?: string | null };
  programItems?: { id: number; timeLabel: string; title: string; description?: string | null; order: number }[];
  guestbookMessages?: GuestbookMessage[];
  drinks: DrinkOption[];
  gifts?: GiftItem[];
  memories?: MemoryItem[];
  choices?: { drinkOptionId: number; quantity: number; drinkOption: DrinkOption }[];
};

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function toIcsStamp(date: Date) {
  const p = (v: number) => String(v).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
}
function formatCountdown(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "C’est aujourd’hui";
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;
  if (days > 0) return `Plus que ${days} jour${days > 1 ? "s" : ""}, ${hours} h ${minutes} min`;
  if (hours > 0) return `Plus que ${hours} h ${minutes} min`;
  return `Plus que ${minutes} min`;
}
function splitAddress(value?: string | null) {
  if (!value) return { main: "", note: "" };
  const parts = value.split(/\n+/).map(p => p.trim()).filter(Boolean);
  return parts.length <= 1 ? { main: parts[0] ?? "", note: "" } : { main: parts[0], note: parts.slice(1).join(" ") };
}
function buildMapLinks(mapsUrl?: string | null, location?: string | null, address?: string | null) {
  const query = [location, address].filter(Boolean).join(", ").trim();
  const encoded = encodeURIComponent(query || location || address || "");
  return {
    google: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    apple: `https://maps.apple.com/?q=${encoded}`,
    waze: `https://waze.com/ul?q=${encoded}&navigate=yes`
  };
}
function buildIcsContent(event: InvitationData["event"]) {
  const start = new Date(event.dateTime);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const location = escapeIcsText([event.location, event.address].filter(Boolean).join(" - "));
  const description = escapeIcsText(event.details || event.program || event.invitationMessage || "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EVENTIA//Invitation//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@eventia`,
    `DTSTAMP:${toIcsStamp(new Date())}`,
    `DTSTART:${toIcsStamp(start)}`,
    `DTEND:${toIcsStamp(end)}`,
    `SUMMARY:${escapeIcsText(event.name)}`,
    `LOCATION:${location}`,
    description ? `DESCRIPTION:${description}` : null,
    "END:VEVENT",
    "END:VCALENDAR"
  ].filter(Boolean).join("\r\n");
}
function getTimelineIcon(title: string, index: number) {
  const value = `${title} ${index}`.toLowerCase();
  if (value.includes("accueil") || value.includes("welcome")) return "✨";
  if (value.includes("repas") || value.includes("dinner") || value.includes("souper")) return "🍽️";
  if (value.includes("dance") || value.includes("bal") || value.includes("party")) return "🎶";
  if (value.includes("speech") || value.includes("discours") || value.includes("word")) return "🎤";
  if (value.includes("photo") || value.includes("memory") || value.includes("souvenir")) return "📸";
  return index % 2 === 0 ? "•" : "◦";
}

function entranceStyle(index: number) {
  return { animationDelay: `${120 + index * 110}ms`, animationFillMode: "both" as const };
}

export function InvitationClient({ initial, mode = "full" }: { initial: InvitationData; mode?: "full" | "invitation-only" }) {
  const [guestStatus, setGuestStatus] = useState<GuestStatus>(initial.guest.status);
  const [selectedDrinks, setSelectedDrinks] = useState<number[]>(initial.choices?.map(c => c.drinkOptionId) ?? []);
  const [message, setMessage] = useState("");
  const [plusOneCount, setPlusOneCount] = useState<number>(initial.guest.plusOneCount ?? 0);
  const [allergies, setAllergies] = useState(initial.guest.allergies ?? "");
  const [mealPreference, setMealPreference] = useState(initial.guest.mealPreference ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [memoryUrl, setMemoryUrl] = useState("");
  const [memoryCaption, setMemoryCaption] = useState("");
  const [memoryType, setMemoryType] = useState<"IMAGE" | "VIDEO">("IMAGE");
  const [memories, setMemories] = useState<MemoryItem[]>(initial.memories ?? []);
  const [loadingAction, setLoadingAction] = useState<"confirm" | "cancel" | "guestbook" | "drinks" | null>(null);
  const [showCover, setShowCover] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [qrReady, setQrReady] = useState(false);
  const coverImageUrl = normalizePublicUrl(initial.event.coverImageUrl);
  const logoUrl = normalizePublicUrl(initial.event.logoUrl);
  const qrCodeUrl = normalizePublicUrl(initial.invitation.qrCodeUrl);
  const eventDate = new Date(initial.event.dateTime);
  const programItems = initial.programItems ?? [];
  const heroTitle = initial.event.hostNames || initial.event.name;
  const isCorporateEvent = useMemo(() => /conference|corporate|business|meeting|seminar|gala|workshop|forum/i.test([initial.event.type, initial.event.name, initial.event.themePreset].filter(Boolean).join(" ")), [initial.event.name, initial.event.themePreset, initial.event.type]);
  const addressParts = splitAddress(initial.event.address);
  const mapLinks = buildMapLinks(initial.invitation.mapsUrl, initial.event.location, initial.event.address);
  const dateLabel = Number.isNaN(eventDate.getTime()) ? initial.event.dateTime : eventDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = Number.isNaN(eventDate.getTime()) ? "" : eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const countdownText = useMemo(() => (!now || Number.isNaN(eventDate.getTime()) ? "" : formatCountdown(eventDate, new Date(now))), [eventDate, now]);
  const isConfirmed = guestStatus === "CONFIRMED";

  useEffect(() => {
    setQrReady(true);
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  async function callPost(path: string, body?: unknown) {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? `Erreur API ${res.status}`);
    }
    return res.json();
  }

  function downloadIcs() {
    if (typeof window === "undefined") return;
    const blob = new Blob([buildIcsContent(initial.event)], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${initial.event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-event.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }

  function downloadInvitationPdf() {
    if (typeof window === "undefined") return;
    window.open(`${API_URL}/invitations/${initial.invitation.token}/pdf`, "_blank", "noopener,noreferrer");
  }

  async function handleConfirm() {
    try {
      setLoadingAction("confirm");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/confirm`, { plusOneCount, allergies, mealPreference });
      setGuestStatus("CONFIRMED");
      setFeedback("Merci. Votre présence est confirmée.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible de confirmer pour le moment. Réessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleCancel() {
    try {
      setLoadingAction("cancel");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/cancel`, { plusOneCount, allergies, mealPreference });
      setGuestStatus("CANCELED");
      setFeedback("Votre absence a bien été enregistrée.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d’enregistrer l’annulation. Réessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleGuestbook() {
    if (!message.trim()) {
      setFeedback("Veuillez écrire un message avant de l’envoyer.");
      return;
    }
    try {
      setLoadingAction("guestbook");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/guestbook`, { message });
      setFeedback("Votre message a bien été envoyé.");
      setMessage("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d’enregistrer votre message. Réessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  function toggleDrink(drinkId: number) {
    setSelectedDrinks(prev => (prev.includes(drinkId) ? prev.filter(id => id !== drinkId) : [...prev, drinkId]));
  }

  async function handleSaveDrinks() {
    try {
      setLoadingAction("drinks");
      setFeedback(null);
      await callPost(`/invitations/${initial.invitation.token}/drinks`, {
        choices: selectedDrinks.map(id => ({ drinkOptionId: id, quantity: 1 }))
      });
      setFeedback("Vos préférences de boissons ont été enregistrées.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d’enregistrer vos boissons. Réessayez plus tard.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleUploadMemoryImage(file: File) {
    try {
      setLoadingAction("guestbook");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      const payload = (await callPost(`/invitations/${initial.invitation.token}/upload-media`, { fileName: file.name, dataUrl })) as { url: string };
      setMemoryUrl(payload.url);
      setMemoryType("IMAGE");
      setFeedback("Image téléchargée. Ajoutez une légende puis publiez.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Upload photo souvenir impossible.");
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleAddMemory() {
    if (!memoryUrl.trim()) {
      setFeedback("Ajoutez un lien média ou téléchargez une image.");
      return;
    }
    try {
      setLoadingAction("guestbook");
      const memory = (await callPost(`/invitations/${initial.invitation.token}/memories`, {
        mediaType: memoryType,
        mediaUrl: memoryUrl.trim(),
        caption: memoryCaption || null
      })) as MemoryItem;
      setMemories(prev => [memory, ...prev]);
      setMemoryUrl("");
      setMemoryCaption("");
      setFeedback("Souvenir ajouté.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Impossible d’ajouter ce souvenir.");
    } finally {
      setLoadingAction(null);
    }
  }

  const programTimeline =
    programItems.length > 0
      ? programItems
      : initial.event.program || initial.event.details
        ? [{ id: 0, timeLabel: timeLabel || "Programme", title: initial.event.program ? "Programme de l’événement" : "Informations", description: initial.event.program || initial.event.details || null, order: 0 }]
        : [];

  const shellTheme = isCorporateEvent
    ? "border-white/10 bg-slate-950/80 text-white shadow-black/20"
    : "border-white/70 bg-white/85 text-slate-900 shadow-slate-200/60";

  return (
    <div
      className={`invite-skin ${getInvitationAnimationClass(initial.event.animationStyle)} page-enter relative isolate space-y-5 pb-36 md:pb-10`}
      style={getInvitationThemeStyle(initial.event)}
    >
      <div className={`overflow-hidden rounded-[32px] border ${shellTheme} ring-1 ring-white/25 invite-anim-soft`} style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
        <div className="relative isolate">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.5),rgba(15,23,42,0.1))]" />
          <div className="relative h-[28rem] md:h-[32rem]">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt={`Photo de ${initial.event.name}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 text-white">
                <div className="max-w-2xl px-6 text-center">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Invitation officielle</p>
                  <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">{heroTitle}</h1>
                  {countdownText ? <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/95 backdrop-blur-md">{countdownText}</div> : null}
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/42 to-transparent" />
            {logoUrl ? (
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/85 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
                <img src={logoUrl} alt="Logo de l’événement" className="h-8 w-auto max-w-[150px] object-contain" />
              </div>
            ) : null}
            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-md">
              {isCorporateEvent ? "Corporate premium" : "Experience premium"}
            </div>
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
              <div className="max-w-4xl space-y-3 text-white">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">{initial.event.type || "Événement"}</p>
                <h1 className="text-3xl font-semibold leading-tight md:text-6xl">{heroTitle}</h1>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/92">
                  {dateLabel ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{dateLabel}</span> : null}
                  {timeLabel ? <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{timeLabel}</span> : null}
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{initial.event.location}</span>
                </div>
                <p className="max-w-2xl text-sm text-white/92 md:text-lg">{initial.event.name}</p>
                {countdownText ? <div className="inline-flex rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm text-white/95 backdrop-blur-md">{countdownText}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid gap-5 ${mode === "invitation-only" ? "lg:grid-cols-1" : "lg:grid-cols-[1.2fr,0.8fr]"}`}>
        <div className="space-y-5">
          <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#526b5c]">Invitation personnelle</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950 md:text-3xl">Cher(e) {initial.guest.fullName},</h2>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${isConfirmed ? "bg-emerald-50 text-emerald-800" : guestStatus === "CANCELED" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"}`}>
                {guestStatus === "PENDING" ? "Réponse attendue" : guestStatus === "CONFIRMED" ? "Présence confirmée" : "Absence signalée"}
              </span>
            </div>
            <p className="mt-3 text-base leading-7 text-slate-700 md:text-lg">
              Vous êtes invité(e) à partager <span className="font-semibold text-slate-950">{initial.event.name}</span> avec {heroTitle}.
            </p>
            {initial.event.invitationMessage ? (
              <div className="mt-4 min-w-0 w-full max-w-full overflow-visible rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 text-base leading-8 text-slate-700 [overflow-wrap:anywhere] [&_*]:max-w-full [&_*]:whitespace-normal [&_*]:[overflow-wrap:anywhere] [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
                <SafeHtml html={initial.event.invitationMessage} />
              </div>
            ) : <p className="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5 text-sm leading-7 text-slate-700">Nous serions heureux de vous compter parmi nous pour ce moment spécial.</p>}
          </div>

          <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#526b5c]">À retenir</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Date et lieu</h2>
              </div>
              {countdownText ? <p className="w-fit rounded-full border border-[#d9e4dc] bg-[#f3f7f3] px-3 py-1.5 text-xs font-semibold text-[#43584b]">{countdownText}</p> : null}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quand</p>
                <p className="mt-2 text-base font-semibold capitalize text-slate-950">{dateLabel}</p>
                {timeLabel ? <p className="mt-1 text-sm text-slate-700">À {timeLabel}</p> : null}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Où</p>
                <p className="mt-2 text-base font-semibold text-slate-950">{initial.event.location}</p>
                {addressParts.main ? <p className="mt-1 text-sm text-slate-700">{addressParts.main}</p> : <p className="mt-1 text-sm text-slate-500">Adresse à confirmer</p>}
                {addressParts.note ? <p className="mt-2 text-sm italic text-slate-600">Repère : {addressParts.note}</p> : null}
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={downloadIcs} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#526b5c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#43584b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c] focus-visible:ring-offset-2">Ajouter à mon calendrier</button>
              <details className="group relative">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c] focus-visible:ring-offset-2">Ouvrir l’itinéraire</summary>
                <div className="absolute left-0 top-full z-20 mt-2 grid w-52 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <a href={mapLinks.google} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">Google Maps</a>
                  <a href={mapLinks.apple} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">Apple Plans</a>
                  <a href={mapLinks.waze} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50">Waze</a>
                </div>
              </details>
              <a href={`${API_URL}/invitations/${initial.invitation.token}/pdf`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#526b5c] focus-visible:ring-offset-2">Télécharger l’invitation en PDF</a>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Programme</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Déroulé de l’événement</h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{programTimeline.length} étapes</div>
            </div>
            {programTimeline.length > 0 ? (
              <div className="mt-5 space-y-4">
                {programTimeline.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-[56px,1fr] gap-3">
                    <div className="flex flex-col items-center pt-1">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-sm">{getTimelineIcon(item.title, index)}</div>
                      {index < programTimeline.length - 1 ? <div className="mt-2 h-full w-px border-l-2 border-dashed border-slate-300" /> : null}
                    </div>
                    <div className="rounded-[22px] border border-slate-200/80 bg-white/96 px-4 py-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">{item.timeLabel}</p>
                      <h3 className="mt-1 text-base font-semibold text-slate-900">{item.title}</h3>
                      {item.description ? <p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-700">Le programme détaillé sera communiqué par l’organisateur.</p>
            )}
          </div>
        </div>
        <div className="space-y-5">
          <div id="invitation-qr" className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Entrée à l’événement</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Votre pass d’entrée</h2>
                <p className="mt-2 text-sm text-slate-700">{isConfirmed ? "Le pass est disponible. Présentez ce code à l’entrée pour un accès rapide." : "Confirmez votre présence pour générer votre pass d’accès."}</p>
              </div>
              {isConfirmed ? <button type="button" onClick={downloadInvitationPdf} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">Télécharger PDF</button> : null}
            </div>
            <div className="mt-5 flex justify-center">
              {isConfirmed ? (
                <div className={`transition-all duration-700 ${qrReady ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                  {qrCodeUrl ? <img src={qrCodeUrl} alt="QR invitation" className="h-44 w-44 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm" /> : <div className="flex h-44 w-44 items-center justify-center rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-600 text-sm font-semibold text-white">{initial.invitation.token.slice(0, 12)}</div>}
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Confirmez d’abord votre présence</p>
                  <p className="mt-2 text-sm text-slate-700">Le QR code apparaîtra après validation de votre réponse.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">RSVP</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Confirmer votre présence</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-700">Statut</p>
                <p className={`mt-1 text-sm font-semibold ${guestStatus === "CONFIRMED" ? "text-emerald-600" : guestStatus === "CANCELED" ? "text-rose-600" : "text-amber-600"}`}>{guestStatus === "PENDING" && "En attente"}{guestStatus === "CONFIRMED" && "Confirmé"}{guestStatus === "CANCELED" && "Annulé"}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">Indiquez votre réponse et, si nécessaire, vos préférences pour l’organisation de l’événement.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-800">
                Nombre d’accompagnants
                <span className="mt-1 block text-xs font-normal text-slate-500">En plus de vous-même</span>
                <input aria-label="Nombre d’accompagnants en plus de vous" type="number" min={0} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#526b5c] focus:ring-2 focus:ring-[#526b5c]/20" value={plusOneCount} onChange={e => setPlusOneCount(Math.max(0, Number(e.target.value) || 0))} />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Préférence de repas <span className="font-normal text-slate-500">(facultatif)</span>
                <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#526b5c] focus:ring-2 focus:ring-[#526b5c]/20" value={mealPreference} onChange={e => setMealPreference(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-800 sm:col-span-2">
                Allergies ou restrictions alimentaires <span className="font-normal text-slate-500">(facultatif)</span>
                <input className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#526b5c] focus:ring-2 focus:ring-[#526b5c]/20" value={allergies} onChange={e => setAllergies(e.target.value)} />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleConfirm} disabled={loadingAction === "confirm"}>{loadingAction === "confirm" ? "Confirmation..." : "Je confirme ma présence"}</button>
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={handleCancel} disabled={loadingAction === "cancel"}>{loadingAction === "cancel" ? "Enregistrement..." : "Je ne pourrai pas venir"}</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={downloadIcs} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">Ajouter au calendrier</button>
              <a href={mapLinks.google} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">Ouvrir GPS</a>
              <a href={`/invite/${initial.invitation.token}/guestbook`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">Livre d’or</a>
              <a href={`/invite/${initial.invitation.token}/chat`} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">Chat</a>
            </div>
          </div>
          {mode === "full" && initial.drinks.length > 0 && (
            <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Préférences</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choix de boissons</h2>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {initial.drinks.map(drink => {
                  const active = selectedDrinks.includes(drink.id);
                  return (
                    <button key={drink.id} type="button" onClick={() => toggleDrink(drink.id)} className={`rounded-2xl border px-4 py-3 text-left transition ${active ? "border-slate-900 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{drink.name}</span>
                        <span className="text-[10px] uppercase tracking-[0.18em] text-current/60">{drink.category === "ALCOHOLIC" ? "Alcoolisée" : "Sans alcool"}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60" onClick={handleSaveDrinks} disabled={loadingAction === "drinks"}>{loadingAction === "drinks" ? "Enregistrement..." : "Enregistrer mes boissons"}</button>
            </div>
          )}

          {mode === "full" && (initial.gifts?.length ?? 0) > 0 && (
            <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Cadeaux et contributions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Liste de cadeaux</h2>
              <div className="mt-4 space-y-3">
                {initial.gifts?.map(gift => (
                  <a key={gift.id} href={gift.url} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md">
                    <p className="text-sm font-semibold text-slate-900">{gift.title}</p>
                    {gift.description ? <p className="mt-1 text-sm text-slate-700">{gift.description}</p> : null}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-700">{gift.isCashFund ? "Cagnotte" : "Cadeau"}</p>
                  </a>
                ))}
              </div>
            </div>
          )}

          {mode === "full" && (
            <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Galerie médias</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Album photo et vidéo</h2>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[auto,1fr]">
                <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" value={memoryType} onChange={e => setMemoryType(e.target.value as "IMAGE" | "VIDEO") }>
                  <option value="IMAGE">Photo</option>
                  <option value="VIDEO">Vidéo</option>
                </select>
                <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" value={memoryUrl} onChange={e => setMemoryUrl(e.target.value)} placeholder="Lien média (https://…)" />
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr,auto]">
                <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900" value={memoryCaption} onChange={e => setMemoryCaption(e.target.value)} placeholder="Légende (facultatif)" />
                <label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5">
                  Télécharger une photo
                  <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (!file) return; void handleUploadMemoryImage(file); e.target.value = ""; }} />
                </label>
              </div>
              <button type="button" className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60" onClick={handleAddMemory} disabled={loadingAction === "guestbook"}>{loadingAction === "guestbook" ? "Publication..." : "Publier le souvenir"}</button>
              {memories.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {memories.map(item => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                      {item.mediaType === "IMAGE" ? <img src={normalizePublicUrl(item.mediaUrl)} alt={item.caption || "Souvenir"} className="h-32 w-full rounded-xl object-cover" /> : <a href={normalizePublicUrl(item.mediaUrl)} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-900 underline">Ouvrir la vidéo</a>}
                      {item.caption ? <p className="mt-2 text-sm text-slate-700">{item.caption}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-700">Aucun souvenir publié pour le moment.</p>
              )}
            </div>
          )}

          {mode === "full" && (
            <div className="rounded-[28px] border border-white/60 bg-white/94 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-700">Livre d’or</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Laisser un mot</h2>
              <textarea className="mt-4 w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Laissez un mot aux organisateurs…" />
              <div className="mt-3 flex justify-end">
                <button type="button" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:opacity-60" onClick={handleGuestbook} disabled={loadingAction === "guestbook"}>{loadingAction === "guestbook" ? "Envoi..." : "Envoyer le message"}</button>
              </div>
            </div>
          )}

          {feedback ? <div className="rounded-[24px] border border-white/60 bg-white/96 px-4 py-3 text-sm text-slate-700 shadow-sm backdrop-blur-xl" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>{feedback}</div> : null}
        </div>
      </div>
      <div className="fixed inset-x-3 bottom-4 z-50 md:hidden">
        <div className="rounded-[28px] border border-white/40 bg-white/96 p-3 shadow-2xl shadow-black/10 backdrop-blur-xl invite-anim-soft" style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", animation: "page-enter 0.35s ease-out both" }}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-700">RSVP rapide</p>
              <p className="mt-1 text-xs text-slate-700">{countdownText || dateLabel}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isConfirmed ? "bg-emerald-100 text-emerald-700" : guestStatus === "CANCELED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{guestStatus === "PENDING" && "En attente"}{guestStatus === "CONFIRMED" && "Confirmé"}{guestStatus === "CANCELED" && "Annulé"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition active:scale-[0.99] motion-safe:animate-pulse disabled:opacity-60" type="button" onClick={handleConfirm} disabled={loadingAction === "confirm"}>{loadingAction === "confirm" ? "…" : isConfirmed ? "Ouvrir le pass" : "Confirmer ma présence"}</button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition active:scale-[0.99] disabled:opacity-60" type="button" onClick={handleCancel} disabled={loadingAction === "cancel"}>{loadingAction === "cancel" ? "..." : "Je ne pourrai pas venir"}</button>
          </div>
        </div>
      </div>

      {showCover && coverImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button type="button" aria-label="Fermer" onClick={() => setShowCover(false)} className="absolute inset-0" />
          <div className="relative z-10 w-full max-w-4xl">
            <img src={coverImageUrl} alt={`Photo de ${initial.event.name}`} className="max-h-[85vh] w-full rounded-2xl object-contain bg-black" />
            <button type="button" onClick={() => setShowCover(false)} className="absolute right-4 top-4 rounded-full bg-white/94 px-3 py-1 text-xs font-semibold text-text shadow-sm">Fermer</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}





