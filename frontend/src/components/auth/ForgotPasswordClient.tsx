"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/config";
import { AuthShell } from "@/components/auth/AuthShell";

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
        headers: {
          "Content-Type": "application/json"
        },
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
      title="Mot de passe oublié ?"
      description="Demandez un lien de reinitialisation pour reprendre l'acces a votre compte organisateur."
      sideTitle="Un flux de recuperation plus clair et plus rassurant."
      sideCopy="Le parcours de reset est pensé pour rester simple, tout en gardant une base propre pour l'envoi d'email de production."
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

        {message ? (
          <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        {resetUrl ? (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">Lien de reinitialisation disponible</p>
            <a href={resetUrl} className="mt-2 block break-all font-medium text-emerald-700 underline">
              {resetUrl}
            </a>
          </div>
        ) : null}

        <button className="btn-primary w-full justify-center py-3 text-sm" type="submit" disabled={loading}>
          {loading ? "Preparation..." : "Envoyer le lien"}
        </button>
      </form>
    </AuthShell>
  );
}
