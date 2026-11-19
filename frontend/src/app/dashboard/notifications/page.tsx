"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

const DEFAULT_TEMPLATE =
  "Bonjour {name}, nous vous rappelons votre invitation à {event}, le {date}. Lieu : {location}. Au plaisir de vous y retrouver !";

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "la date de l’événement";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
}

export default function DashboardNotificationsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const res = await authFetch("/events");
        if (!res.ok) throw new Error("events_load_failed");
        const data = (await res.json()) as EventItem[];
        if (!active) return;
        setEvents(data);
        if (data.length > 0) {
          const savedId = getSelectedEventId();
          const chosen = (savedId && data.find(event => event.id === savedId)) || data[0];
          setSelectedEvent(chosen);
          setSelectedEventId(chosen.id);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => { active = false; };
  }, []);

  const preview = useMemo(() => {
    if (!selectedEvent) return "Sélectionnez un événement pour prévisualiser le rappel.";
    return template
      .replaceAll("{name}", "[Prénom de l’invité]")
      .replaceAll("{event}", selectedEvent.name)
      .replaceAll("{date}", formatEventDate(selectedEvent.dateTime))
      .replaceAll("{location}", selectedEvent.location || selectedEvent.address || "lieu à confirmer");
  }, [selectedEvent, template]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    window.setTimeout(() => setCopyState("idle"), 2500);
  }

  return (
    <main className="space-y-6 pb-8 font-sans">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Header
          title="Notifications"
          description="Préparez vos rappels et retrouvez les outils d’envoi liés à vos événements."
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contexte</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">Événement concerné</h2>
            </div>
            <div className="w-full md:max-w-md">
              {loading ? (
                <div className="h-11 animate-pulse rounded-xl bg-slate-100" role="status">Chargement des événements…</div>
              ) : error ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-900" role="alert">
                  Impossible de charger les événements. Actualisez la page pour réessayer.
                </p>
              ) : events.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Aucun événement disponible.</p>
              ) : (
                <EventPicker
                  events={events}
                  selectedEventId={selectedEvent?.id}
                  onSelect={event => {
                    setSelectedEvent(event);
                    setSelectedEventId(event.id);
                    setCopyState("idle");
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {!loading && !error && events.length === 0 ? (
          <EmptyState title="Commencez par créer un événement" description="Les rappels et messages sont associés à un événement." />
        ) : selectedEvent ? (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Rappel manuel</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Préparez votre message</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Personnalisez le texte, vérifiez l’aperçu puis copiez-le. L’envoi ciblé et les liens WhatsApp/SMS sont disponibles dans la gestion des invités.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="notification-template" className="text-sm font-medium text-slate-800">Modèle du rappel</label>
                <textarea
                  id="notification-template"
                  className="min-h-36 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
                  value={template}
                  onChange={event => { setTemplate(event.target.value); setCopyState("idle"); }}
                />
                <p className="text-xs leading-5 text-slate-500">
                  Variables disponibles : <code className="rounded bg-slate-100 px-1">{"{name}"}</code>, <code className="rounded bg-slate-100 px-1">{"{event}"}</code>, <code className="rounded bg-slate-100 px-1">{"{date}"}</code> et <code className="rounded bg-slate-100 px-1">{"{location}"}</code>.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Aperçu</h3>
                  <span className="text-xs text-slate-500">{selectedEvent.name}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{preview}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" className="min-h-11 w-full sm:w-auto" onClick={() => void copyMessage()} disabled={!preview.trim()}>
                  {copyState === "copied" ? "Message copié" : "Copier le message"}
                </Button>
                {copyState === "error" ? <p className="text-sm font-medium text-rose-800" role="alert">Copie indisponible. Vérifiez les permissions du navigateur.</p> : null}
                {copyState === "copied" ? <p className="text-sm font-medium text-emerald-800" role="status">Le texte est prêt à être partagé.</p> : null}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Prochaine étape</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Choisissez vos destinataires</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Depuis Invités, vous pouvez filtrer les personnes à relancer, choisir WhatsApp, SMS ou e-mail, puis préparer les messages personnalisés.
                </p>
                <Link
                  href="/dashboard/guests"
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-200 sm:w-auto"
                >
                  Ouvrir la gestion des invités
                </Link>
              </section>

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">i</span>
                  <div>
                    <h2 className="text-sm font-semibold text-amber-950">Automatisation non activée</h2>
                    <p className="mt-1 text-sm leading-6 text-amber-900">
                      Les rappels programmés et l’envoi automatique par SMS ou WhatsApp ne sont pas configurés. Aucun message ne partira sans action de votre part.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}
