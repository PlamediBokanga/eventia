"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { InvitationData } from "@/components/InvitationClient";
import { InviteSteps } from "@/components/layout/InviteSteps";
import { SafeHtml } from "@/components/ui/SafeHtml";
import { getInvitationAnimationClass, getInvitationThemeStyle } from "@/lib/invitationTheme";
import { normalizePublicUrl } from "@/lib/url";

function formatCountdown(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "C'est aujourd'hui";

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
  const parts = value.split(/\n+/).map(part => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { main: parts[0] ?? "", note: "" };
  return { main: parts[0], note: parts.slice(1).join(" ") };
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

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function toIcsStamp(date: Date) {
  const p = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}T${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}Z`;
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

export function InviteLandingClient({ data, token }: { data: InvitationData; token: string }) {
  const [showCover, setShowCover] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const coverImageUrl = normalizePublicUrl(data.event.coverImageUrl);
  const logoUrl = normalizePublicUrl(data.event.logoUrl);
  const eventDate = new Date(data.event.dateTime);
  const addressParts = splitAddress(data.event.address);
  const mapLinks = buildMapLinks(data.invitation.mapsUrl, data.event.location, data.event.address);
  const dateText = Number.isNaN(eventDate.getTime())
    ? data.event.dateTime
    : eventDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  const timeText = Number.isNaN(eventDate.getTime())
    ? ""
    : eventDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const countdownText = useMemo(() => {
    if (!now || Number.isNaN(eventDate.getTime())) return "";
    return formatCountdown(eventDate, new Date(now));
  }, [eventDate, now]);

  const primaryHref = `/invite/${token}/invitation`;
  const guestStatusLabel =
    data.guest.status === "CONFIRMED"
      ? "Pr?sence confirm?e"
      : data.guest.status === "CANCELED"
        ? "Pr?sence refus?e"
        : "R?ponse attendue";

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  function downloadIcs() {
    if (typeof window === "undefined") return;
    const blob = new Blob([buildIcsContent(data.event)], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.event.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-event.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-3 pb-40 sm:px-4 md:px-6 md:py-8 md:pb-8">
      <div
        className={`overflow-hidden rounded-[32px] border border-white/40 bg-white/82 shadow-2xl shadow-slate-200/60 ${getInvitationAnimationClass(data.event.animationStyle)}`}
        style={{ ...getInvitationThemeStyle(data.event), backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }}
      >
        <div className="relative isolate">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_45%),linear-gradient(135deg,rgba(15,23,42,0.4),rgba(15,23,42,0.05))]" />
          <div className="relative h-[24rem] sm:h-[28rem]">
            {coverImageUrl ? (
              <img src={coverImageUrl} alt={`Photo de ${data.event.name}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 text-white">
                <div className="max-w-xl px-6 text-center">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">Annonce officielle</p>
                  <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">{data.event.hostNames || data.event.name}</h1>
                  {countdownText ? (
                    <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
                      {countdownText}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

            {logoUrl ? (
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/85 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-md">
                <img src={logoUrl} alt="Logo evenement" className="h-8 w-auto max-w-[150px] object-contain" />
              </div>
            ) : null}

            <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-md">
              {data.event.type || "Evenement premium"}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <div className="max-w-3xl space-y-3 text-white">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">Votre invitation</p>
                <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">{data.event.hostNames || data.event.name}</h1>
                <p className="max-w-2xl text-sm text-white/85 sm:text-lg">
                  {dateText} {timeText ? `- ${timeText}` : ""} . {data.event.location}
                </p>
                {countdownText ? (
                  <div className="inline-flex rounded-full border border-white/15 bg-white/12 px-4 py-2 text-sm text-white/90 backdrop-blur-md">
                    {countdownText}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{guestStatusLabel}</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{data.guest.fullName}</span>
                  {addressParts.main ? (
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">{addressParts.main}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <InviteSteps token={token} current="landing" />

          <div
            className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-lg shadow-slate-200/40"
            style={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Aper?u rapide</p>
                <p className="text-base leading-7 text-slate-700 sm:text-lg">
                  Bonjour <span className="font-semibold text-slate-900">{data.guest.fullName}</span>, voici votre espace d'invitation EVENTIA.
                </p>
                {data.event.invitationMessage ? (
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700">
                    <SafeHtml html={data.event.invitationMessage} />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2 sm:w-[280px]">
                <Link href={primaryHref} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                  Ouvrir l'invitation
                </Link>
                <button
                  type="button"
                  onClick={() => setShowCover(true)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Voir la couverture
                </button>
                <button
                  type="button"
                  onClick={() => setShowActions(v => !v)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {showActions ? "Masquer les actions" : "Actions rapides"}
                </button>
              </div>
            </div>

            {showActions ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <a href={mapLinks.google} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md">
                  Itin?raire Google Maps
                </a>
                <a href={mapLinks.apple} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md">
                  Ouvrir dans Apple Maps
                </a>
                <button type="button" onClick={downloadIcs} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md">
                  Ajouter au calendrier
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3" style={{ animation: "fadeInUp 0.6s ease both" }}>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Date</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{dateText}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Lieu</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{data.event.location}</p>
              {addressParts.note ? <p className="mt-1 text-sm italic text-slate-500">{addressParts.note}</p> : null}
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Invit?</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{data.guest.fullName}</p>
            </div>
          </div>

          <div id="invitation-preview" className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-lg shadow-slate-200/40">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Acc?s direct</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Passez ? l'invitation compl?te</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Vous pouvez consulter les d?tails, confirmer votre pr?sence et acc?der ? tous les modules interactifs.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                Voir mon invitation
              </Link>
              <a
                href="#invitation-preview"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                Aper?u d?taill?
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/30 bg-white/78 px-3 py-3 shadow-[0_-10px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-2xl flex-col gap-2">
          <a
            href={primaryHref}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition active:scale-[0.99]"
          >
            Ouvrir l'invitation
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowCover(true)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition active:scale-[0.99]"
            >
              Voir la couverture
            </button>
            <a
              href={primaryHref}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition active:scale-[0.99]"
            >
              Details complets
            </a>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <a href={mapLinks.google} target="_blank" rel="noreferrer" className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-slate-700">
              GPS
            </a>
            <button type="button" onClick={downloadIcs} className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-slate-700">
              Calendrier
            </button>
            <a href={primaryHref} className="rounded-2xl border border-slate-200 bg-white px-2 py-2 text-center text-slate-700">
              D?tails
            </a>
          </div>
        </div>
      </div>

      {showCover && coverImageUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setShowCover(false)}
            className="absolute inset-0"
          />
          <div className="relative z-10 w-full max-w-4xl">
            <img
              src={coverImageUrl}
              alt={`Photo de ${data.event.name}`}
              className="max-h-[85vh] w-full rounded-2xl object-contain bg-black"
            />
            <button
              type="button"
              onClick={() => setShowCover(false)}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-text shadow-sm"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
