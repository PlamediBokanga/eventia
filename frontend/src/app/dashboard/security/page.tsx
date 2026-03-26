"use client";

import { Header } from "@/components/layout/Header";

export default function DashboardSecurityPage() {
  return (
    <main className="space-y-4">
      <Header title="Securite" />
      <section className="card p-4 max-w-2xl space-y-4">
        <div className="space-y-1">
          <h2 className="title-4">Protection du compte</h2>
          <p className="text-body-muted">
            Renforcez la securite de votre compte organisateur et gardez le controle sur les acces.
          </p>
        </div>

        <div className="rounded-xl border border-primary/10 bg-background/60 p-3 space-y-2 text-small">
          <div className="flex items-center justify-between">
            <span>Mot de passe</span>
            <a href="/dashboard/settings" className="btn-ghost px-3 py-1 text-xs">
              Modifier
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span>Authentification renforcee</span>
            <span className="text-textSecondary">Bientot disponible</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Sessions actives</span>
            <span className="text-textSecondary">Gestion avancee bientot</span>
          </div>
        </div>

        <p className="text-small">
          Pour toute alerte de securite, contactez support@eventia.app.
        </p>
      </section>
    </main>
  );
}
