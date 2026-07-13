"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { EventPicker } from "@/components/layout/EventPicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { authFetch, getSelectedEventId, setSelectedEventId, type EventItem } from "@/lib/dashboard";

export default function DashboardNotificationsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(
    "Rappel : Vous etes invite(e) a l'evenement {event} le {date}. Lieu: {location}."
  );

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 md:gap-5">
        <Header title="Notifications" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Automatisation</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Notifications et rappels</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Configurez les messages envoyes avant l'evenement, gardez vos canaux clairs, et preparez l'envoi manuel ou automatique.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Rappels</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Planifies</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Canaux</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">WhatsApp / SMS</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Mode</p>
                <p className="mt-1 text-lg font-semibold">MVP</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1fr,1.4fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Evenement</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Choisir le contexte</h2>
            </div>
            {loading ? (
              <p className="text-sm text-slate-600">Chargement...</p>
            ) : events.length === 0 ? (
              <EmptyState
                title="Aucun evenement"
                description="Creez un evenement pour configurer les notifications."
              />
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

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-4">
            {!selectedEvent ? (
              <p className="text-sm text-slate-600">Selectionnez un evenement.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Rappels automatiques</p>
                  <h2 className="text-2xl font-semibold text-slate-900">Programmation des messages</h2>
                  <p className="text-sm leading-6 text-slate-600">
                    Definissez les rappels, le contenu et les canaux pour rester en contact avec vos invites avant le jour J.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    "7 jours avant",
                    "3 jours avant",
                    "1 jour avant",
                    "Jour J"
                  ].map(label => (
                    <label key={label} className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50 px-4 py-3">
                      <span>{label}</span>
                      <input type="checkbox" defaultChecked className="accent-slate-900" />
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-600">Message</label>
                  <textarea
                    className="w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    rows={5}
                    value={template}
                    onChange={e => setTemplate(e.target.value)}
                  />
                  <p className="text-sm text-slate-500">
                    Variables: {"{event}"} {"{date}"} {"{location}"} {"{name}"}
                  </p>
                </div>

                <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 p-4 space-y-3">
                  <p className="font-semibold text-slate-900">Canaux disponibles (MVP)</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      "WhatsApp",
                      "SMS"
                    ].map(label => (
                      <label key={label} className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2">
                        <input type="checkbox" defaultChecked className="accent-slate-900" />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">
                    L'envoi automatique sera active via API apres la phase MVP.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="rounded-2xl px-5 py-3 text-sm" disabled>
                    Activer les notifications
                  </Button>
                  <Button type="button" variant="ghost" className="rounded-2xl px-5 py-3 text-sm">
                    Envoi manuel
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
