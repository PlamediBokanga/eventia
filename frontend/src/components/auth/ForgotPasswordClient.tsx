"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/config";
import { AuthNotice, AuthPopup, AuthShell } from "@/components/auth/AuthShell";

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
        <AuthNotice
          variant="info"
          title="Recuperation de compte"
          message={
            <div className="space-y-2">
              <p className="leading-6 text-slate-700">
                Entrez l'adresse email associee au compte. Si elle existe, nous preparerons un lien de reinitialisation temporaire.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Jeton securise</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Expiration courte</div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">Popup dynamique</div>
              </div>
            </div>
          }
        />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-800">Adresse email du compte</label>
            <input
              type="email"
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@eventia.app"
              required
            />
          </div>

          <button className="btn-primary w-full justify-center py-3 text-sm shadow-[0_16px_30px_rgba(15,23,42,0.18)] transition-transform active:scale-[0.99]" type="submit" disabled={loading}>
            {loading ? "Preparation..." : "Envoyer le lien"}
          </button>
        </form>

        <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
          <p className="font-medium text-slate-900">Bon reflexe</p>
          <p className="mt-1 leading-6">
            Verifiez votre boite mail et le dossier spam. Le lien de reinitialisation reste temporaire pour proteger votre compte.
          </p>
        </div>

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