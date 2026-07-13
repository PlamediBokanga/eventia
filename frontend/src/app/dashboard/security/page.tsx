"use client";

import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function DashboardSecurityPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.08),transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-3 py-4 md:px-6 md:py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-5">
        <Header title="Securite" />

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">Protection du compte</p>
              <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">Securiser l'acces organisateur</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Modifiez votre mot de passe, controlez les sessions actives et gardez une vue claire sur les signaux de securite importants.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Mot de passe</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Protege</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Sessions</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Controlees</p>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-950 px-4 py-3 text-white shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Alerte</p>
                <p className="mt-1 text-lg font-semibold">Activee</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Actions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Renforcer la protection</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Mot de passe</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Gardez un mot de passe fort et renouvelez-le depuis l'espace profil et parametres.
                </p>
                <Link href="/dashboard/settings" className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 transition hover:-translate-y-0.5">
                  Aller aux parametres
                </Link>
              </div>
              <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Auth renforcee</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  La base est prete pour l'authentification a deux facteurs et les verifications supplementaires.
                </p>
                <span className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white">Bientot disponible</span>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-2xl shadow-slate-200/60 backdrop-blur-xl md:p-6 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Sessions</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Acces actifs</h2>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Appareil principal</p>
              <p className="mt-1 text-slate-600">Gerez les connexions en cours depuis la page profil & parametres.</p>
            </div>
            <div className="rounded-[20px] border border-slate-200/80 bg-slate-50 px-4 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Recommandation</p>
              <p className="mt-1 text-slate-600">Déconnectez tous les appareils quand vous partagez un poste ou après une suspicion d'accès.</p>
            </div>
            <p className="text-sm text-slate-600">
              Pour toute alerte de securite, contactez support@eventia.app.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
