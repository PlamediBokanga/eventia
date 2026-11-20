"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/config";
import { AuthPopup, AuthShell } from "@/components/auth/AuthShell";

export function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setResetUrl(null);

    try {
      const res = await fetch(`${API_URL}/auth/password/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = (await res.json().catch(() => null)) as { message?: string; resetUrl?: string } | null;
      setMessage(data?.message || "Si un compte existe, un lien sera prepare.");
      if (data?.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      console.error(err);
      setMessage("Impossible de lancer la reinitialisation pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acces securise"
      title="Mot de passe oublie ?"
      description="Demandez un lien de reinitialisation pour reprendre l'acces a votre compte organisateur."
      sideTitle="Un flux de recuperation plus clair et plus rassurant."
      sideCopy="Le parcours de reset est pense pour rester simple, tout en gardant une base propre pour l'envoi d'email de production."
      sideStats={[
        { value: "30m", label: "Validite courte du jeton de reinitialisation" },
        { value: "Safe", label: "Mot de passe revalide avant mise a jour" },
        { value: "Link", label: "Lien testable en dev / staging" }
      ]}
      footer={
        <>
          Retour a la{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:text-accent">
            connexion
          </Link>
          .
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-600">
          Saisissez l'adresse e-mail associée à votre compte. Si elle est reconnue, vous recevrez les instructions de réinitialisation.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-800">Adresse e-mail</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>

          <button className="flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70" type="submit" disabled={loading}>
            {loading ? "Preparation..." : "Envoyer le lien"}
          </button>
        </form>

        <AuthPopup
          open={Boolean(message)}
          variant={resetUrl ? "success" : "info"}
          title={resetUrl ? "Lien de reinitialisation disponible" : "Demande prise en compte"}
          message={
            resetUrl
              ? "Utilisez ce lien pour ouvrir la page de changement de mot de passe."
              : message || "Votre demande a ete prise en compte."
          }
          primaryLabel={resetUrl ? "Ouvrir la reinitialisation" : "Fermer"}
          primaryHref={resetUrl || undefined}
          onPrimaryClick={resetUrl ? undefined : () => setMessage(null)}
          secondaryLabel={resetUrl ? "Retour a la connexion" : undefined}
          secondaryHref={resetUrl ? "/auth/login" : undefined}
          onClose={() => {
            setMessage(null);
            setResetUrl(null);
          }}
        />
      </div>
    </AuthShell>
  );
}
